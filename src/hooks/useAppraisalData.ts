import { useState, useEffect, useMemo } from 'react';
import { processExcelData, calculateManagerSummaries, getCompetencyBreakdown, getRelationshipDistribution, getScoreDistribution, extractFeedbackThemes } from '@/lib/dataProcessor';
import { AppraisalResponse, ManagerSummary, FilterState } from '@/types/appraisal';

export function useAppraisalData() {
  const [responses, setResponses] = useState<AppraisalResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    managers: [],
    relationships: [],
    scoreRange: [1, 4],
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await processExcelData('/data/VGG_360_Reorganized.xlsx');
        setResponses(data);
        setError(null);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load appraisal data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredResponses = useMemo(() => {
    return responses.filter(response => {
      // Manager filter
      if (filters.managers.length > 0 && !filters.managers.includes(response.manager_name)) {
        return false;
      }
      
      // Relationship filter
      if (filters.relationships.length > 0 && response.relationship && !filters.relationships.includes(response.relationship)) {
        return false;
      }
      
      return true;
    });
  }, [responses, filters]);

  const managerSummaries = useMemo(() => {
    return calculateManagerSummaries(filteredResponses);
  }, [filteredResponses]);

  const competencyScores = useMemo(() => {
    return getCompetencyBreakdown(filteredResponses);
  }, [filteredResponses]);

  const relationshipDistribution = useMemo(() => {
    return getRelationshipDistribution(filteredResponses);
  }, [filteredResponses]);

  const scoreDistribution = useMemo(() => {
    return getScoreDistribution(filteredResponses);
  }, [filteredResponses]);

  const feedbackThemes = useMemo(() => {
    return extractFeedbackThemes(filteredResponses);
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