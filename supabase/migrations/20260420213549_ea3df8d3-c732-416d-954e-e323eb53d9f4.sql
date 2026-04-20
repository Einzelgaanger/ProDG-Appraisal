DROP POLICY IF EXISTS "Signed-in users can insert survey responses" ON public.survey_responses;
CREATE POLICY "Signed-in users can insert survey responses"
ON public.survey_responses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Signed-in users can insert survey answers" ON public.survey_answers;
CREATE POLICY "Signed-in users can insert survey answers"
ON public.survey_answers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);