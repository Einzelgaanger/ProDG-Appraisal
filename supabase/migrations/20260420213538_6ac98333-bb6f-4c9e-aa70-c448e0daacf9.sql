DROP POLICY IF EXISTS "Anyone can insert survey responses" ON public.survey_responses;
CREATE POLICY "Signed-in users can insert survey responses"
ON public.survey_responses
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can insert survey answers" ON public.survey_answers;
CREATE POLICY "Signed-in users can insert survey answers"
ON public.survey_answers
FOR INSERT
TO authenticated
WITH CHECK (true);