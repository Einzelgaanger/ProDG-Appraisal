export interface AppraisalResponse {
  id: string;
  timestamp: string | null;
  response_number: number | null;
  manager_name: string;
  relationship: string | null;
  mentors_coaches_score: number | null;
  effective_direction_score: number | null;
  establishes_rapport_score: number | null;
  sets_clear_goals_score: number | null;
  open_to_ideas_score: number | null;
  team_leadership_comments: string | null;
  sense_of_urgency_score: number | null;
  analyzes_change_score: number | null;
  confidence_integrity_score: number | null;
  results_orientation_comments: string | null;
  patient_humble_score: number | null;
  flat_collaborative_score: number | null;
  approachable_score: number | null;
  empowers_team_score: number | null;
  final_say_score: number | null;
  cultural_fit_comments: string | null;
  stop_doing: string | null;
  start_doing: string | null;
  continue_doing: string | null;
  created_at: string | null;
}

export interface ManagerSummary {
  manager_name: string;
  total_responses: number;
  avg_team_leadership: number;
  avg_results_orientation: number;
  avg_cultural_fit: number;
  overall_score: number;
  responses: AppraisalResponse[];
}

export interface CompetencyScore {
  name: string;
  score: number;
  maxScore: number;
  percentage: number;
}

export interface InsightSuggestion {
  id: string;
  question: string;
  category: 'performance' | 'leadership' | 'culture' | 'feedback' | 'comparison';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export type RelationshipType = 
  | 'I am his/her direct report'
  | 'He/she is the executive in charge of my team'
  | 'I have worked a few times with this Manager'
  | 'I do not have direct relationship with him'
  | 'Colleague'
  | string;

export interface FilterState {
  managers: string[];
  relationships: string[];
  scoreRange: [number, number];
}

export interface FeedbackThemes {
  stopDoing: string[];
  startDoing: string[];
  continueDoing: string[];
}