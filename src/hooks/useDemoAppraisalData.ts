import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppraisalResponse, ManagerSummary, FilterState, CompetencyScore, FeedbackThemes } from '@/types/appraisal';

export function useDemoAppraisalData() {
  const [responses, setResponses] = useState<AppraisalResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    managers: [],
    relationships: [],
    scoreRange: [1, 4],
  });

  useEffect(() => {
    const loadDemoData = async () => {
      try {
        setLoading(true);
        
        const { data, error: fetchError } = await supabase
          .from('demo_appraisal_responses')
          .select('*')
          .order('manager_name', { ascending: true });
        
        if (fetchError) throw fetchError;
        
        // Transform to match AppraisalResponse type
        const transformedData: AppraisalResponse[] = (data || []).map(row => ({
          id: row.id,
          manager_name: row.manager_name,
          relationship: row.relationship,
          response_number: row.response_number,
          timestamp: row.timestamp,
          created_at: row.created_at,
          empowers_team_score: row.empowers_team_score,
          final_say_score: row.final_say_score,
          mentors_coaches_score: row.mentors_coaches_score,
          effective_direction_score: row.effective_direction_score,
          establishes_rapport_score: row.establishes_rapport_score,
          sets_clear_goals_score: row.sets_clear_goals_score,
          open_to_ideas_score: row.open_to_ideas_score,
          sense_of_urgency_score: row.sense_of_urgency_score,
          analyzes_change_score: row.analyzes_change_score,
          confidence_integrity_score: row.confidence_integrity_score,
          patient_humble_score: row.patient_humble_score,
          flat_collaborative_score: row.flat_collaborative_score,
          approachable_score: row.approachable_score,
          stop_doing: row.stop_doing,
          start_doing: row.start_doing,
          continue_doing: row.continue_doing,
          results_orientation_comments: row.results_orientation_comments,
          cultural_fit_comments: row.cultural_fit_comments,
          team_leadership_comments: row.team_leadership_comments,
        }));
        
        setResponses(transformedData);
        setError(null);
      } catch (err) {
        console.error('Error loading demo data:', err);
        setError('Failed to load demo data');
      } finally {
        setLoading(false);
      }
    };

    loadDemoData();
  }, []);

  const filteredResponses = useMemo(() => {
    return responses.filter(response => {
      if (filters.managers.length > 0 && !filters.managers.includes(response.manager_name)) {
        return false;
      }
      if (filters.relationships.length > 0 && response.relationship && !filters.relationships.includes(response.relationship)) {
        return false;
      }
      return true;
    });
  }, [responses, filters]);

  const managerSummaries = useMemo((): ManagerSummary[] => {
    const managerGroups = new Map<string, AppraisalResponse[]>();
    
    filteredResponses.forEach(response => {
      const existing = managerGroups.get(response.manager_name) || [];
      existing.push(response);
      managerGroups.set(response.manager_name, existing);
    });

    const summaries: ManagerSummary[] = [];
    
    managerGroups.forEach((responses, managerName) => {
      const teamLeadershipScores: number[] = [];
      const resultsOrientationScores: number[] = [];
      const culturalFitScores: number[] = [];
      
      responses.forEach(r => {
        // Team Leadership competencies
        [r.empowers_team_score, r.mentors_coaches_score, r.effective_direction_score, 
         r.establishes_rapport_score, r.sets_clear_goals_score].forEach(s => {
          if (s != null) teamLeadershipScores.push(s);
        });
        
        // Results Orientation competencies
        [r.open_to_ideas_score, r.sense_of_urgency_score, r.analyzes_change_score, 
         r.final_say_score].forEach(s => {
          if (s != null) resultsOrientationScores.push(s);
        });
        
        // Cultural Fit competencies
        [r.confidence_integrity_score, r.patient_humble_score, r.flat_collaborative_score, 
         r.approachable_score].forEach(s => {
          if (s != null) culturalFitScores.push(s);
        });
      });

      const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      
      const avgTeamLeadership = avg(teamLeadershipScores);
      const avgResultsOrientation = avg(resultsOrientationScores);
      const avgCulturalFit = avg(culturalFitScores);
      const overallScore = avg([avgTeamLeadership, avgResultsOrientation, avgCulturalFit].filter(s => s > 0));

      summaries.push({
        manager_name: managerName,
        total_responses: responses.length,
        avg_team_leadership: parseFloat(avgTeamLeadership.toFixed(2)),
        avg_results_orientation: parseFloat(avgResultsOrientation.toFixed(2)),
        avg_cultural_fit: parseFloat(avgCulturalFit.toFixed(2)),
        overall_score: parseFloat(overallScore.toFixed(2)),
        responses: responses,
      });
    });

    return summaries.sort((a, b) => b.overall_score - a.overall_score);
  }, [filteredResponses]);

  const competencyScores = useMemo((): CompetencyScore[] => {
    const competencies = [
      { key: 'empowers_team_score', name: 'Empowers Team' },
      { key: 'mentors_coaches_score', name: 'Mentors & Coaches' },
      { key: 'effective_direction_score', name: 'Effective Direction' },
      { key: 'establishes_rapport_score', name: 'Establishes Rapport' },
      { key: 'sets_clear_goals_score', name: 'Sets Clear Goals' },
      { key: 'open_to_ideas_score', name: 'Open to Ideas' },
      { key: 'sense_of_urgency_score', name: 'Sense of Urgency' },
      { key: 'analyzes_change_score', name: 'Analyzes Change' },
      { key: 'final_say_score', name: 'Final Say' },
      { key: 'confidence_integrity_score', name: 'Confidence & Integrity' },
      { key: 'patient_humble_score', name: 'Patient & Humble' },
      { key: 'flat_collaborative_score', name: 'Flat & Collaborative' },
      { key: 'approachable_score', name: 'Approachable' },
    ];

    return competencies.map(comp => {
      const scores = filteredResponses
        .map(r => (r as any)[comp.key])
        .filter((s): s is number => s != null);
      
      const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const maxScore = 5;
      const percentage = (avg / maxScore) * 100;
      
      return {
        name: comp.name,
        score: parseFloat(avg.toFixed(2)),
        maxScore,
        percentage: parseFloat(percentage.toFixed(1)),
      };
    });
  }, [filteredResponses]);

  const relationshipDistribution = useMemo((): Record<string, number> => {
    const distribution: Record<string, number> = {};
    
    filteredResponses.forEach(r => {
      if (r.relationship) {
        distribution[r.relationship] = (distribution[r.relationship] || 0) + 1;
      }
    });
    
    return distribution;
  }, [filteredResponses]);

  const scoreDistribution = useMemo((): Record<string, number> => {
    const distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    
    const scoreKeys = [
      'empowers_team_score', 'mentors_coaches_score', 'effective_direction_score',
      'establishes_rapport_score', 'sets_clear_goals_score', 'open_to_ideas_score',
      'sense_of_urgency_score', 'analyzes_change_score', 'final_say_score',
      'confidence_integrity_score', 'patient_humble_score', 'flat_collaborative_score',
      'approachable_score'
    ];
    
    filteredResponses.forEach(r => {
      scoreKeys.forEach(key => {
        const score = (r as any)[key];
        if (score != null && score >= 1 && score <= 5) {
          distribution[score.toString()] = (distribution[score.toString()] || 0) + 1;
        }
      });
    });
    
    return distribution;
  }, [filteredResponses]);

  const feedbackThemes = useMemo((): FeedbackThemes => {
    const stopDoing: string[] = [];
    const startDoing: string[] = [];
    const continueDoing: string[] = [];
    
    const seen = new Set<string>();
    
    filteredResponses.forEach(r => {
      if (r.stop_doing) {
        const normalized = r.stop_doing.toLowerCase().trim();
        if (!seen.has(normalized)) {
          seen.add(normalized);
          stopDoing.push(r.stop_doing.trim());
        }
      }
      if (r.start_doing) {
        const normalized = r.start_doing.toLowerCase().trim();
        if (!seen.has(normalized)) {
          seen.add(normalized);
          startDoing.push(r.start_doing.trim());
        }
      }
      if (r.continue_doing) {
        const normalized = r.continue_doing.toLowerCase().trim();
        if (!seen.has(normalized)) {
          seen.add(normalized);
          continueDoing.push(r.continue_doing.trim());
        }
      }
    });
    
    return { stopDoing, startDoing, continueDoing };
  }, [filteredResponses]);

  const uniqueManagers = useMemo(() => {
    return [...new Set(responses.map(r => r.manager_name))].sort();
  }, [responses]);

  const uniqueRelationships = useMemo(() => {
    return [...new Set(responses.map(r => r.relationship).filter(Boolean))] as string[];
  }, [responses]);

  const overallStats = useMemo(() => {
    const allScores = managerSummaries.map(m => m.overall_score).filter(s => s > 0);
    const avgOverall = allScores.length > 0 
      ? allScores.reduce((a, b) => a + b, 0) / allScores.length 
      : 0;
    
    return {
      totalResponses: filteredResponses.length,
      totalManagers: managerSummaries.length,
      avgOverallScore: parseFloat(avgOverall.toFixed(2)),
      topPerformer: managerSummaries[0]?.manager_name || 'N/A',
      topScore: managerSummaries[0]?.overall_score || 0,
    };
  }, [filteredResponses, managerSummaries]);

  return {
    responses: filteredResponses,
    allResponses: responses,
    managerSummaries,
    competencyScores,
    relationshipDistribution,
    scoreDistribution,
    feedbackThemes,
    overallStats,
    uniqueManagers,
    uniqueRelationships,
    loading,
    error,
    filters,
    setFilters,
  };
}
