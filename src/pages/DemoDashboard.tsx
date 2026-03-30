import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDemoAppraisalData } from '@/hooks/useDemoAppraisalData';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ManagerSummary } from '@/types/appraisal';
import { BarChart3, Users, Trophy, Target, Zap, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DemoDashboard() {
  const {
    responses, managerSummaries, competencyScores, relationshipDistribution,
    scoreDistribution, feedbackThemes, overallStats, uniqueManagers,
    uniqueRelationships, loading, error, filters, setFilters
  } = useDemoAppraisalData();

  const [selectedManager, setSelectedManager] = useState<ManagerSummary | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const dataContext = useMemo(() => {
    if (!managerSummaries.length) return '';
    
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

    return `=== DEMO 360° PERFORMANCE REVIEW DATA ===

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Demo Banner */}
      <div className="bg-amber-500/15 border-b border-amber-500/30">
        <div className="container mx-auto px-4 py-2 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
          <Badge variant="outline" className="bg-amber-500/20 text-amber-700 border-amber-500/50">
            DEMO MODE
          </Badge>
          <span className="text-xs sm:text-sm text-amber-700 text-center">
            Demonstration with sample data. Names and feedback are fictional.
          </span>
          <Link to="/">
            <Button variant="link" size="sm" className="text-amber-700 hover:text-amber-900">
              Go to Login →
            </Button>
          </Link>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold">360° Analytics Demo</h1>
            <p className="text-xs text-muted-foreground">Performance Intelligence Platform</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterPanel filters={filters} setFilters={setFilters} uniqueManagers={uniqueManagers} uniqueRelationships={uniqueRelationships} />
            <ExportButton managers={managerSummaries} responses={responses} />
            <Button onClick={() => setChatOpen(true)} size="sm" className="gap-2">
              <Zap className="w-4 h-4" /> Analytics Copilot
            </Button>
          </div>
        </div>
      </header>

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
