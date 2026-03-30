
-- Subsidiaries
CREATE TABLE public.subsidiaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.subsidiaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read subsidiaries" ON public.subsidiaries FOR SELECT TO anon, authenticated USING (true);

-- Employees
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subsidiary_id uuid REFERENCES public.subsidiaries(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  role text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read employees" ON public.employees FOR SELECT TO anon, authenticated USING (true);

-- Survey categories
CREATE TABLE public.survey_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.survey_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read survey categories" ON public.survey_categories FOR SELECT TO anon, authenticated USING (true);

-- Survey questions
CREATE TABLE public.survey_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.survey_categories(id) ON DELETE CASCADE NOT NULL,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'scored',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read survey questions" ON public.survey_questions FOR SELECT TO anon, authenticated USING (true);

-- Survey responses (one per submission)
CREATE TABLE public.survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  subsidiary_id uuid REFERENCES public.subsidiaries(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert survey responses" ON public.survey_responses FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can read survey responses" ON public.survey_responses FOR SELECT TO authenticated USING (true);

-- Survey answers (individual question answers)
CREATE TABLE public.survey_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid REFERENCES public.survey_responses(id) ON DELETE CASCADE NOT NULL,
  question_id uuid REFERENCES public.survey_questions(id) ON DELETE CASCADE NOT NULL,
  score integer,
  text_answer text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.survey_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert survey answers" ON public.survey_answers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can read survey answers" ON public.survey_answers FOR SELECT TO authenticated USING (true);

-- Enable realtime for monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE public.survey_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.survey_answers;
