-- Seed the PM developer-appraisal form.
-- Three scored "core assessment" categories (1-5) plus the open-ended questions
-- from the Developer Performance Audit form.
--
-- Idempotent and additive: only inserts categories/questions that are not already
-- present (matched by name / exact text). It does NOT delete pre-existing survey
-- content. If older (peer-review) questions exist in the live tables and you want
-- the form to show ONLY these, remove the stale questions from the admin tooling.

-- Core assessment categories (scored sections shown in form order)
INSERT INTO public.survey_categories (name, sort_order)
SELECT v.name, v.sort_order
FROM (VALUES
  ('Code Quality & Technical Standards', 1),
  ('Delivery & Reliability', 2),
  ('Collaboration & Communication', 3)
) AS v(name, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.survey_categories c WHERE c.name = v.name
);

-- Questions for each category (scored = 1-5 rating, open_ended = free text)
INSERT INTO public.survey_questions (category_id, question_text, question_type, sort_order)
SELECT c.id, q.question_text, q.question_type, q.sort_order
FROM (VALUES
  ('Code Quality & Technical Standards',
   'Code quality & adherence to technical standards (1: Lacks standards → 5: Exemplary role model / elevates team standards).',
   'scored', 1),
  ('Code Quality & Technical Standards',
   'Note any specific technical strengths or recurring code quality issues observed in recent sprints. (Provide specific sprint examples or ticket references from Linear where relevant.)',
   'open_ended', 2),
  ('Delivery & Reliability',
   'Delivery & reliability against deadlines and scope (1: Rarely meets deadlines → 5: Extends beyond scope / always ahead of timeline).',
   'scored', 1),
  ('Delivery & Reliability',
   'How do they handle blockers? (Focus on communication timing regarding obstacles: Do they raise flags early, or do they suffer in silence until the deadline passes?)',
   'open_ended', 2),
  ('Collaboration & Communication',
   'Collaboration & communication (1: Ghost mode / poor visibility → 5: Proactive and crystal clear / enhances cross-functional alignment).',
   'scored', 1),
  ('Collaboration & Communication',
   'Rate the developer''s communication regarding ticket updates, pull request responses, and daily standups.',
   'open_ended', 2),
  ('Collaboration & Communication',
   'What is their greatest strength that they should keep leaning into?',
   'open_ended', 3),
  ('Collaboration & Communication',
   'Indicate any responsibilities and tasks currently assigned to this developer along with the projects they are currently working on.',
   'open_ended', 4)
) AS q(cat_name, question_text, question_type, sort_order)
JOIN public.survey_categories c ON c.name = q.cat_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.survey_questions sq
  WHERE sq.category_id = c.id AND sq.question_text = q.question_text
);
