-- Create table for storing appraisal responses
CREATE TABLE public.appraisal_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ,
    response_number INTEGER,
    manager_name TEXT NOT NULL,
    relationship TEXT,
    mentors_coaches_score INTEGER,
    effective_direction_score INTEGER,
    establishes_rapport_score INTEGER,
    sets_clear_goals_score INTEGER,
    open_to_ideas_score INTEGER,
    team_leadership_comments TEXT,
    sense_of_urgency_score INTEGER,
    analyzes_change_score INTEGER,
    confidence_integrity_score INTEGER,
    results_orientation_comments TEXT,
    patient_humble_score INTEGER,
    flat_collaborative_score INTEGER,
    approachable_score INTEGER,
    empowers_team_score INTEGER,
    final_say_score INTEGER,
    cultural_fit_comments TEXT,
    stop_doing TEXT,
    start_doing TEXT,
    continue_doing TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appraisal_responses ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all data
CREATE POLICY "Authenticated users can read appraisal data"
ON public.appraisal_responses
FOR SELECT
TO authenticated
USING (true);

-- Create manager summary view for quick analytics
CREATE TABLE public.manager_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_name TEXT UNIQUE NOT NULL,
    total_responses INTEGER DEFAULT 0,
    avg_team_leadership DECIMAL(3,2),
    avg_results_orientation DECIMAL(3,2),
    avg_cultural_fit DECIMAL(3,2),
    overall_score DECIMAL(3,2),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.manager_summaries ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read summaries
CREATE POLICY "Authenticated users can read manager summaries"
ON public.manager_summaries
FOR SELECT
TO authenticated
USING (true);