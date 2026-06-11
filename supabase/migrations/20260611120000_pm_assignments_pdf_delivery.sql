-- Admin-assigned PM → developer roster, PDF delivery tokens, scoped PM data access.

-- ── PM assignments (admin locks PMs to their developers) ───────────────────
CREATE TABLE IF NOT EXISTS public.pm_developer_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pm_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pm_user_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_pm_assignments_pm ON public.pm_developer_assignments(pm_user_id);
CREATE INDEX IF NOT EXISTS idx_pm_assignments_employee ON public.pm_developer_assignments(employee_id);

ALTER TABLE public.pm_developer_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage PM assignments" ON public.pm_developer_assignments;
CREATE POLICY "Admins manage PM assignments"
ON public.pm_developer_assignments
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "PMs read own assignments" ON public.pm_developer_assignments;
CREATE POLICY "PMs read own assignments"
ON public.pm_developer_assignments
FOR SELECT
TO authenticated
USING (pm_user_id = auth.uid());

-- ── PDF delivery (tokenized download — no login required) ─────────────────
CREATE TABLE IF NOT EXISTS public.appraisal_result_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  response_id uuid NOT NULL REFERENCES public.survey_responses(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appraisal_deliveries_token ON public.appraisal_result_deliveries(token);

ALTER TABLE public.appraisal_result_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages appraisal deliveries" ON public.appraisal_result_deliveries;
CREATE POLICY "Service role manages appraisal deliveries"
ON public.appraisal_result_deliveries
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ── Storage bucket for generated PDFs (private) ─────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'appraisal-pdfs',
  'appraisal-pdfs',
  false,
  5242880,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- ── Helpers for scoped PM access ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_assigned_pm_for_employee(_employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pm_developer_assignments a
    WHERE a.pm_user_id = auth.uid()
      AND a.employee_id = _employee_id
  );
$$;

-- ── Tighten PM read/insert to assigned developers only ──────────────────────
DROP POLICY IF EXISTS "PMs can read survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "PMs can read survey answers" ON public.survey_answers;
DROP POLICY IF EXISTS "PMs and admins can insert survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "PMs can insert own completions" ON public.review_completions;
DROP POLICY IF EXISTS "PMs read assigned survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "PMs read assigned survey answers" ON public.survey_answers;
DROP POLICY IF EXISTS "PMs insert survey responses for assigned developers" ON public.survey_responses;
DROP POLICY IF EXISTS "PMs insert completions for assigned developers" ON public.review_completions;
DROP POLICY IF EXISTS "PMs insert answers for assigned responses" ON public.survey_answers;

CREATE POLICY "PMs read assigned survey responses"
ON public.survey_responses
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'pm')
  AND public.is_assigned_pm_for_employee(employee_id)
);

CREATE POLICY "PMs read assigned survey answers"
ON public.survey_answers
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'pm')
  AND response_id IN (
    SELECT sr.id FROM public.survey_responses sr
    WHERE public.is_assigned_pm_for_employee(sr.employee_id)
  )
);

CREATE POLICY "PMs insert survey responses for assigned developers"
ON public.survey_responses
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR (
    public.has_role(auth.uid(), 'pm')
    AND public.is_assigned_pm_for_employee(employee_id)
  )
);

CREATE POLICY "PMs insert completions for assigned developers"
ON public.review_completions
FOR INSERT
TO authenticated
WITH CHECK (
  reviewer_id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin')
    OR (
      public.has_role(auth.uid(), 'pm')
      AND public.is_assigned_pm_for_employee(employee_id)
    )
  )
);

DROP POLICY IF EXISTS "PMs and admins can insert survey answers" ON public.survey_answers;

CREATE POLICY "PMs insert answers for assigned responses"
ON public.survey_answers
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR (
    public.has_role(auth.uid(), 'pm')
    AND response_id IN (
      SELECT sr.id FROM public.survey_responses sr
      WHERE public.is_assigned_pm_for_employee(sr.employee_id)
    )
  )
);
