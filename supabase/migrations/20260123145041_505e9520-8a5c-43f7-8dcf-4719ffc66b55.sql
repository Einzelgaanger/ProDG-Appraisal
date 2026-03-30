-- Create demo tables that mirror the production tables
-- Demo appraisal responses table
CREATE TABLE public.demo_appraisal_responses (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    manager_name text NOT NULL,
    relationship text,
    response_number integer,
    timestamp timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    
    -- Score fields (1-5 scale)
    empowers_team_score integer,
    final_say_score integer,
    mentors_coaches_score integer,
    effective_direction_score integer,
    establishes_rapport_score integer,
    sets_clear_goals_score integer,
    open_to_ideas_score integer,
    sense_of_urgency_score integer,
    analyzes_change_score integer,
    confidence_integrity_score integer,
    patient_humble_score integer,
    flat_collaborative_score integer,
    approachable_score integer,
    
    -- Qualitative feedback
    stop_doing text,
    start_doing text,
    continue_doing text,
    results_orientation_comments text,
    cultural_fit_comments text,
    team_leadership_comments text
);

-- Demo manager summaries table
CREATE TABLE public.demo_manager_summaries (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    manager_name text NOT NULL UNIQUE,
    total_responses integer DEFAULT 0,
    avg_team_leadership numeric,
    avg_results_orientation numeric,
    avg_cultural_fit numeric,
    overall_score numeric,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.demo_appraisal_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_manager_summaries ENABLE ROW LEVEL SECURITY;

-- Create PUBLIC read policies (no auth required for demo)
CREATE POLICY "Public can read demo appraisal data"
ON public.demo_appraisal_responses
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Public can read demo manager summaries"
ON public.demo_manager_summaries
FOR SELECT
TO anon, authenticated
USING (true);