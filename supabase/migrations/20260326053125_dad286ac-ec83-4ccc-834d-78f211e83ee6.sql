
-- Add email column to employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS email text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_email ON public.employees(email) WHERE email IS NOT NULL;

-- Profiles table linking auth users to employees
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  department text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- Review completions tracking (gates dashboard access)
CREATE TABLE IF NOT EXISTS public.review_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  completed_at timestamptz DEFAULT now(),
  UNIQUE(reviewer_id, employee_id)
);

ALTER TABLE public.review_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own completions" ON public.review_completions
  FOR SELECT TO authenticated USING (reviewer_id = auth.uid());

CREATE POLICY "Users can insert own completions" ON public.review_completions
  FOR INSERT TO authenticated WITH CHECK (reviewer_id = auth.uid());
