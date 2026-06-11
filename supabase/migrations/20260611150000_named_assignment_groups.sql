-- Named project groups: same developer can sit under multiple PMs / projects.
-- Each PM review is tied to one assignment row; PDF + email include the project name (not the PM).

ALTER TABLE public.pm_developer_assignments
  ADD COLUMN IF NOT EXISTS group_name text NOT NULL DEFAULT 'General';

ALTER TABLE public.pm_developer_assignments
  DROP CONSTRAINT IF EXISTS pm_developer_assignments_pm_user_id_employee_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pm_assignments_pm_employee_group
  ON public.pm_developer_assignments (pm_user_id, employee_id, group_name);

ALTER TABLE public.survey_responses
  ADD COLUMN IF NOT EXISTS assignment_id uuid REFERENCES public.pm_developer_assignments(id) ON DELETE SET NULL;

ALTER TABLE public.survey_responses
  ADD COLUMN IF NOT EXISTS reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.review_completions
  ADD COLUMN IF NOT EXISTS assignment_id uuid REFERENCES public.pm_developer_assignments(id) ON DELETE CASCADE;

ALTER TABLE public.review_completions
  DROP CONSTRAINT IF EXISTS review_completions_reviewer_id_employee_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_review_completions_assignment
  ON public.review_completions (reviewer_id, assignment_id)
  WHERE assignment_id IS NOT NULL;

-- Legacy rows without assignment_id (should not occur going forward).
CREATE UNIQUE INDEX IF NOT EXISTS idx_review_completions_legacy
  ON public.review_completions (reviewer_id, employee_id)
  WHERE assignment_id IS NULL;
