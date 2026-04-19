-- 1. Track which milestones we've already notified about
CREATE TABLE IF NOT EXISTS public.review_milestones_notified (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  review_count INTEGER NOT NULL,
  notified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, review_count)
);

ALTER TABLE public.review_milestones_notified ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages milestone notifications"
  ON public.review_milestones_notified
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 2. Trigger: after each review completion, if the employee just hit an even
-- milestone we haven't notified about yet, call the send-transactional-email edge fn.
CREATE OR REPLACE FUNCTION public.notify_review_milestone()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_employee RECORD;
  v_profile_id UUID;
  v_supabase_url TEXT;
  v_anon_key TEXT;
BEGIN
  -- Count total reviews this employee has now received
  SELECT COUNT(*) INTO v_count
  FROM public.review_completions
  WHERE employee_id = NEW.employee_id;

  -- Only fire on even multiples of 2
  IF v_count < 2 OR (v_count % 2) <> 0 THEN
    RETURN NEW;
  END IF;

  -- Insert milestone marker; if duplicate, bail (already notified)
  BEGIN
    INSERT INTO public.review_milestones_notified (employee_id, review_count)
    VALUES (NEW.employee_id, v_count);
  EXCEPTION WHEN unique_violation THEN
    RETURN NEW;
  END;

  -- Get employee + their profile/auth email
  SELECT e.id, e.name, e.email INTO v_employee
  FROM public.employees e
  WHERE e.id = NEW.employee_id;

  IF v_employee.email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Read project URL + anon key from vault (set by setup_email_infra)
  BEGIN
    SELECT decrypted_secret INTO v_supabase_url
    FROM vault.decrypted_secrets WHERE name = 'project_url';
    SELECT decrypted_secret INTO v_anon_key
    FROM vault.decrypted_secrets WHERE name = 'anon_key';
  EXCEPTION WHEN OTHERS THEN
    v_supabase_url := NULL;
  END;

  -- Fallback to hardcoded values if vault entries missing
  IF v_supabase_url IS NULL THEN
    v_supabase_url := 'https://sfwltphcerfsfyrtiwwk.supabase.co';
  END IF;
  IF v_anon_key IS NULL THEN
    v_anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmd2x0cGhjZXJmc2Z5cnRpd3drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4Njk3NjAsImV4cCI6MjA5MDQ0NTc2MH0.6Y6q3rRYIbR6RSy2CFqF_wKMtqqii2G3I2HQiiUaFoo';
  END IF;

  -- Fire-and-forget HTTP call to send-transactional-email
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-transactional-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_key
    ),
    body := jsonb_build_object(
      'templateName', 'review-milestone',
      'recipientEmail', v_employee.email,
      'idempotencyKey', 'review-milestone-' || v_employee.id || '-' || v_count,
      'templateData', jsonb_build_object(
        'name', v_employee.name,
        'reviewCount', v_count
      )
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block a review completion because of an email failure
  RAISE WARNING 'notify_review_milestone failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_review_milestone ON public.review_completions;
CREATE TRIGGER trg_notify_review_milestone
AFTER INSERT ON public.review_completions
FOR EACH ROW
EXECUTE FUNCTION public.notify_review_milestone();

-- 3. Promote the 5 named profiles to admin
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::public.app_role
FROM public.profiles p
WHERE LOWER(p.email) IN (
  'arabella@prodg.studio',
  'alfred@prodg.studio',
  'noella@prodg.studio',
  'wayne@prodg.studio',
  'mitch@prodg.studio'
)
ON CONFLICT (user_id, role) DO NOTHING;