-- Production lockdown for the PM-evaluates-developers model.
-- Tightens RLS on survey writes and reads; removes legacy peer-review form content.

-- Helper: employee_id linked to the signed-in auth user (via profiles).
CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT employee_id FROM public.profiles WHERE id = auth.uid();
$$;

-- ── survey_responses: drop permissive policies ──────────────────────────────
DROP POLICY IF EXISTS "Anyone can insert survey responses" ON public.survey_responses;
DROP POLICY IF EXISTS "Authenticated can read survey responses" ON public.survey_responses;

CREATE POLICY "PMs and admins can insert survey responses"
ON public.survey_responses
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'pm')
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can read all survey responses"
ON public.survey_responses
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "PMs can read survey responses"
ON public.survey_responses
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'pm'));

CREATE POLICY "Developers can read own survey responses"
ON public.survey_responses
FOR SELECT
TO authenticated
USING (employee_id = public.current_employee_id());

-- ── survey_answers: drop permissive policies ────────────────────────────────
DROP POLICY IF EXISTS "Anyone can insert survey answers" ON public.survey_answers;
DROP POLICY IF EXISTS "Authenticated can read survey answers" ON public.survey_answers;

CREATE POLICY "PMs and admins can insert survey answers"
ON public.survey_answers
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'pm')
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can read all survey answers"
ON public.survey_answers
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "PMs can read survey answers"
ON public.survey_answers
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'pm'));

CREATE POLICY "Developers can read own survey answers"
ON public.survey_answers
FOR SELECT
TO authenticated
USING (
  response_id IN (
    SELECT id FROM public.survey_responses
    WHERE employee_id = public.current_employee_id()
  )
);

-- ── review_completions: PM-only inserts ─────────────────────────────────────
DROP POLICY IF EXISTS "Users can insert own completions" ON public.review_completions;

CREATE POLICY "PMs can insert own completions"
ON public.review_completions
FOR INSERT
TO authenticated
WITH CHECK (
  reviewer_id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'pm')
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- ── Legacy peer-review form cleanup (PM appraisal categories only) ──────────
-- Cascades to questions and any answers tied to those questions.
DELETE FROM public.survey_categories
WHERE name NOT IN (
  'Code Quality & Technical Standards',
  'Delivery & Reliability',
  'Collaboration & Communication'
);
