import { motion } from 'framer-motion';
import { ManagerSummary } from '@/types/appraisal';
import { getCompetencyBreakdown, extractFeedbackThemes } from '@/lib/dataProcessor';
import { X, Award, Users, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CompetencyRadar from './CompetencyRadar';
import FeedbackThemes from './FeedbackThemes';
import ReviewerBreakdown from './ReviewerBreakdown';
import { cn } from '@/lib/utils';

interface ManagerDetailPanelProps {
  manager: ManagerSummary;
  onClose: () => void;
}

function getScoreLabel(score: number): { label: string; class: string } {
  if (score >= 3.5) return { label: 'Excellent', class: 'score-excellent' };
  if (score >= 2.5) return { label: 'Good', class: 'score-good' };
  if (score >= 2) return { label: 'Average', class: 'score-average' };
  return { label: 'Needs Improvement', class: 'score-poor' };
}

export default function ManagerDetailPanel({ manager, onClose }: ManagerDetailPanelProps) {
  const competencies = getCompetencyBreakdown(manager.responses);
  const themes = extractFeedbackThemes(manager.responses);
  const scoreInfo = getScoreLabel(manager.overall_score);

  const categories = [
    { label: 'Team Leadership', score: manager.avg_team_leadership, icon: Users },
    { label: 'Results Orientation', score: manager.avg_results_orientation, icon: Target },
    { label: 'Cultural Fit', score: manager.avg_cultural_fit, icon: Award },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed inset-y-0 right-0 w-full max-w-2xl bg-background border-l border-border shadow-2xl z-50 overflow-y-auto"
    >
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-lg border-b border-border z-10">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">{manager.manager_name}</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className={cn('score-badge', scoreInfo.class)}>
                  {manager.overall_score.toFixed(2)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {scoreInfo.label} • {manager.total_responses} reviews
                </span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Category Scores */}
        <div className="grid grid-cols-3 gap-4">
          {categories.map((cat, index) => (
            <motion.div
              key={cat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-4 text-center"
            >
              <cat.icon className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs text-muted-foreground mb-1">{cat.label}</p>
              <p className={cn('text-xl font-bold', 
                cat.score >= 3 ? 'text-success' : 
                cat.score >= 2.5 ? 'text-primary' : 
                cat.score >= 2 ? 'text-warning' : 'text-destructive'
              )}>
                {cat.score.toFixed(2)}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Competency Radar */}
        <CompetencyRadar 
          competencies={competencies} 
          title={`${manager.manager_name}'s Competencies`}
        />

        {/* Two-column layout for Feedback and Reviewer Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Feedback Themes */}
          <FeedbackThemes themes={themes} managerName={manager.manager_name} />

          {/* Reviewer Breakdown - Independent component */}
          <ReviewerBreakdown responses={manager.responses} />
        </div>
      </div>
    </motion.div>
  );
}