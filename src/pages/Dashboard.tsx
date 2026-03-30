import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppraisalData } from '@/hooks/useAppraisalData';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeAuth } from '@/contexts/EmployeeAuthContext';
import { useNavigate } from 'react-router-dom';
import StatsCard from '@/components/dashboard/StatsCard';
import ManagerLeaderboard from '@/components/dashboard/ManagerLeaderboard';
import CompetencyRadar from '@/components/dashboard/CompetencyRadar';
import ScoreDistributionChart from '@/components/dashboard/ScoreDistributionChart';
import RelationshipPieChart from '@/components/dashboard/RelationshipPieChart';
import FeedbackThemes from '@/components/dashboard/FeedbackThemes';
import ManagerDetailPanel from '@/components/dashboard/ManagerDetailPanel';
import FilterPanel from '@/components/dashboard/FilterPanel';
import ExportButton from '@/components/dashboard/ExportButton';
import AIChatPanel from '@/components/dashboard/AIChatPanel';
import VGGHeader from '@/components/VGGHeader';
import { Button } from '@/components/ui/button';
import { ManagerSummary } from '@/types/appraisal';
import { BarChart3, Users, Trophy, Target, Zap, Loader2, ClipboardList } from 'lucide-react';

export default function Dashboard() {
  const { logout: legacyLogout } = useAuth();
  const { logout: employeeLogout } = useEmployeeAuth();
  const navigate = useNavigate();
  const {
    responses, managerSummaries, competencyScores, relationshipDistribution,
    scoreDistribution, feedbackThemes, overallStats, uniqueManagers,
    uniqueRelationships, loading, error, filters, setFilters
  } = useAppraisalData();

  const [selectedManager, setSelectedManager] = useState<ManagerSummary | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const dataContext = useMemo(() => {
    if (!managerSummaries.length) return '';
    
    // Build comprehensive context with ALL available data
    const allManagerData = managerSummaries.map(m => 
      `• ${m.manager_name}: Overall ${m.overall_score.toFixed(2)}/4.0, Team Leadership ${m.avg_team_leadership.toFixed(2)}, Results ${m.avg_results_orientation.toFixed(2)}, Culture ${m.avg_cultural_fit.toFixed(2)}, Reviews: ${m.total_responses}`
    ).join('\n');
    
    const relationshipData = Object.entries(relationshipDistribution)
      .map(([rel, count]) => `• ${rel}: ${count} reviews`)
      .join('\n');
    
    const scoreData = Object.entries(scoreDistribution)
      .map(([score, count]) => `• Score ${score}: ${count} occurrences`)
      .join('\n');
    
    const feedbackData = {
      stopDoing: feedbackThemes.stopDoing.slice(0, 15).map(f => `• ${f}`).join('\n'),
      startDoing: feedbackThemes.startDoing.slice(0, 15).map(f => `• ${f}`).join('\n'),
      continueDoing: feedbackThemes.continueDoing.slice(0, 15).map(f => `• ${f}`).join('\n'),
    };

    return `=== VGG 360° PERFORMANCE REVIEW DATA ===

SUMMARY STATISTICS:
• Total Responses: ${overallStats.totalResponses}
• Total Managers Evaluated: ${overallStats.totalManagers}
• Organization Average Score: ${overallStats.avgOverallScore}/4.0 (${((overallStats.avgOverallScore/4)*100).toFixed(0)}% performance)
• Top Performer: ${overallStats.topPerformer} with ${overallStats.topScore.toFixed(2)}/4.0

COMPETENCY BREAKDOWN (Organization-wide):
${competencyScores.map(c => `• ${c.name}: ${c.score.toFixed(2)}/4.0 (${((c.score/4)*100).toFixed(0)}%)`).join('\n')}

ALL MANAGERS - DETAILED SCORES:
${allManagerData}

REVIEWER RELATIONSHIP DISTRIBUTION:
${relationshipData}

SCORE FREQUENCY DISTRIBUTION:
${scoreData}

QUALITATIVE FEEDBACK - STOP DOING (Areas for Improvement):
${feedbackData.stopDoing || '• No feedback available'}

QUALITATIVE FEEDBACK - START DOING (Recommendations):
${feedbackData.startDoing || '• No feedback available'}

QUALITATIVE FEEDBACK - CONTINUE DOING (Strengths):
${feedbackData.continueDoing || '• No feedback available'}`;
  }, [managerSummaries, overallStats, competencyScores, relationshipDistribution, scoreDistribution, feedbackThemes]);

  const handleLogout = async () => { legacyLogout(); await employeeLogout(); navigate('/'); };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <VGGHeader
        subtitle="Performance Intelligence"
        onLogout={handleLogout}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => navigate('/appraisal')} className="gap-2 h-8 text-xs">
              <ClipboardList className="w-3.5 h-3.5" /> 360° Appraisal
            </Button>
            <FilterPanel filters={filters} setFilters={setFilters} uniqueManagers={uniqueManagers} uniqueRelationships={uniqueRelationships} />
            <ExportButton managers={managerSummaries} responses={responses} />
            <Button onClick={() => setChatOpen(true)} size="sm" className="gap-2 h-8 text-xs">
              <Zap className="w-3.5 h-3.5" /> Analytics Copilot
            </Button>
          </>
        }
      />

      <main className="container mx-auto px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatsCard title="Total Responses" value={overallStats.totalResponses} icon={Users} variant="default" delay={0} />
          <StatsCard title="Managers Evaluated" value={overallStats.totalManagers} icon={Target} variant="primary" delay={0.1} />
          <StatsCard title="Average Score" value={`${overallStats.avgOverallScore}/4.0`} subtitle={`${((overallStats.avgOverallScore/4)*100).toFixed(0)}% performance`} icon={BarChart3} variant="accent" delay={0.2} />
          <StatsCard title="Top Performer" value={overallStats.topPerformer} subtitle={`Score: ${overallStats.topScore.toFixed(2)}`} icon={Trophy} variant="success" delay={0.3} />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-1"><ManagerLeaderboard managers={managerSummaries} onSelectManager={setSelectedManager} selectedManager={selectedManager?.manager_name} /></div>
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-start">
              <CompetencyRadar competencies={competencyScores} />
              <ScoreDistributionChart distribution={scoreDistribution} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-start">
              <RelationshipPieChart distribution={relationshipDistribution} />
              <FeedbackThemes themes={feedbackThemes} />
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {selectedManager && <ManagerDetailPanel manager={selectedManager} onClose={() => setSelectedManager(null)} />}
      </AnimatePresence>
      <AIChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} dataContext={dataContext} />
    </div>
  );
}