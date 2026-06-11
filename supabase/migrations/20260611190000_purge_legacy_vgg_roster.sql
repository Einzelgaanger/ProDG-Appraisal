-- Remove legacy VGG remix roster (566+ employees). ProDG subsidiary is the only roster.

DO $$
DECLARE
  prodg_id uuid;
BEGIN
  SELECT id INTO prodg_id FROM public.subsidiaries WHERE name = 'ProDG' LIMIT 1;
  IF prodg_id IS NULL THEN
    RAISE NOTICE 'ProDG subsidiary not found — skipping legacy purge';
    RETURN;
  END IF;

  DELETE FROM public.survey_answers sa
  USING public.survey_responses sr
  WHERE sa.response_id = sr.id
    AND sr.subsidiary_id IS DISTINCT FROM prodg_id;

  DELETE FROM public.survey_responses
  WHERE subsidiary_id IS DISTINCT FROM prodg_id;

  DELETE FROM public.review_completions rc
  USING public.employees e
  WHERE rc.employee_id = e.id
    AND e.subsidiary_id IS DISTINCT FROM prodg_id;

  DELETE FROM public.pm_developer_assignments pda
  USING public.employees e
  WHERE pda.employee_id = e.id
    AND e.subsidiary_id IS DISTINCT FROM prodg_id;

  DELETE FROM public.appraisal_result_deliveries ard
  USING public.employees e
  WHERE ard.employee_id = e.id
    AND e.subsidiary_id IS DISTINCT FROM prodg_id;

  UPDATE public.profiles p
  SET employee_id = NULL
  FROM public.employees e
  WHERE p.employee_id = e.id
    AND e.subsidiary_id IS DISTINCT FROM prodg_id;

  DELETE FROM public.employees
  WHERE subsidiary_id IS DISTINCT FROM prodg_id;

  DELETE FROM public.subsidiaries
  WHERE id IS DISTINCT FROM prodg_id;
END $$;
