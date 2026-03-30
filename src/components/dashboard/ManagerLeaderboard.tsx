import { motion } from 'framer-motion';
import { ManagerSummary } from '@/types/appraisal';
import { cn } from '@/lib/utils';
import { Trophy, TrendingUp, Users, ChevronRight } from 'lucide-react';

interface ManagerLeaderboardProps {
  managers: ManagerSummary[];
  onSelectManager: (manager: ManagerSummary) => void;
  selectedManager?: string | null;
}

function getScoreColor(score: number): string {
  if (score >= 3.5) return 'text-success';
  if (score >= 2.5) return 'text-primary';
  if (score >= 2) return 'text-warning';
  return 'text-destructive';
}

function getScoreBg(score: number): string {
  if (score >= 3.5) return 'bg-success/15 border-success/20';
  if (score >= 2.5) return 'bg-primary/15 border-primary/20';
  if (score >= 2) return 'bg-warning/15 border-warning/20';
  return 'bg-destructive/15 border-destructive/20';
}

function getRankBadge(rank: number) {
  if (rank === 1) return { icon: '🥇', class: 'bg-yellow-500/15 text-yellow-600' };
  if (rank === 2) return { icon: '🥈', class: 'bg-gray-400/15 text-gray-500' };
  if (rank === 3) return { icon: '🥉', class: 'bg-orange-500/15 text-orange-500' };
  return { icon: rank.toString(), class: 'bg-muted text-muted-foreground' };
}

export default function ManagerLeaderboard({
  managers,
  onSelectManager,
  selectedManager,
}: ManagerLeaderboardProps) {
  return (
    <div className="glass-panel overflow-hidden">
      <div className="p-6 border-b border-border/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/15">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold">Manager Leaderboard</h3>
              <p className="text-xs text-muted-foreground font-medium">{managers.length} managers ranked</p>
            </div>
          </div>
          <TrendingUp className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>

      <div className="max-h-[500px] overflow-y-auto scrollbar-thin">
        {managers.map((manager, index) => {
          const rank = getRankBadge(index + 1);
          const isSelected = selectedManager === manager.manager_name;
          
          return (
            <motion.div
              key={manager.manager_name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSelectManager(manager)}
              className={cn(
                'flex items-center gap-4 p-4 cursor-pointer transition-all duration-200 border-l-[3px]',
                'hover:bg-muted/50',
                isSelected 
                  ? 'bg-primary/[0.06] border-l-primary' 
                  : 'border-l-transparent'
              )}
            >
              <div className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold',
                rank.class
              )}>
                {index < 3 ? rank.icon : rank.icon}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate text-sm">{manager.manager_name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                  <Users className="w-3 h-3" />
                  <span>{manager.total_responses} reviews</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className={cn(
                    'text-lg font-extrabold',
                    getScoreColor(manager.overall_score)
                  )}>
                    {manager.overall_score.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium">Overall</p>
                </div>
                <div className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center border',
                  getScoreBg(manager.overall_score)
                )}>
                  <span className={cn('text-xs font-bold', getScoreColor(manager.overall_score))}>
                    {((manager.overall_score / 4) * 100).toFixed(0)}%
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
