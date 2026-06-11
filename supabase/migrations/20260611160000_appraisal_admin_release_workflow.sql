-- PM submit → admin notified; admin releases → developer gets PDF email.

ALTER TABLE public.survey_responses
  ADD COLUMN IF NOT EXISTS released_at timestamptz,
  ADD COLUMN IF NOT EXISTS released_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_notified_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_survey_responses_pending_release
  ON public.survey_responses (created_at DESC)
  WHERE released_at IS NULL;
