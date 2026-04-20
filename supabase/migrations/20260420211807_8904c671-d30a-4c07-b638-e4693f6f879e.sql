CREATE TABLE IF NOT EXISTS public.app_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  page TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_feedback'
      AND policyname = 'Users can create their own app feedback'
  ) THEN
    CREATE POLICY "Users can create their own app feedback"
    ON public.app_feedback
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_feedback'
      AND policyname = 'Users can read their own app feedback'
  ) THEN
    CREATE POLICY "Users can read their own app feedback"
    ON public.app_feedback
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_feedback'
      AND policyname = 'Admins can update app feedback'
  ) THEN
    CREATE POLICY "Admins can update app feedback"
    ON public.app_feedback
    FOR UPDATE
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.update_app_feedback_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_app_feedback_updated_at ON public.app_feedback;
CREATE TRIGGER update_app_feedback_updated_at
BEFORE UPDATE ON public.app_feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_app_feedback_updated_at();

DROP TRIGGER IF EXISTS trg_notify_review_milestone ON public.review_completions;
CREATE TRIGGER trg_notify_review_milestone
AFTER INSERT ON public.review_completions
FOR EACH ROW
EXECUTE FUNCTION public.notify_review_milestone();

CREATE INDEX IF NOT EXISTS idx_app_feedback_created_at ON public.app_feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_feedback_status ON public.app_feedback (status);
CREATE INDEX IF NOT EXISTS idx_app_feedback_user_id ON public.app_feedback (user_id);