import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { AppraisalResponse } from '@/types/appraisal';

interface ReviewerBreakdownProps {
  responses: AppraisalResponse[];
}

export default function ReviewerBreakdown({ responses }: ReviewerBreakdownProps) {
  const relationshipCounts = responses.reduce((acc, r) => {
    const rel = r.relationship || 'Unknown';
    acc[rel] = (acc[rel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedRelationships = Object.entries(relationshipCounts)
    .sort((a, b) => b[1] - a[1]);

  const total = responses.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <h4 className="font-semibold mb-4 flex items-center gap-2">
        <Users className="w-4 h-4 text-muted-foreground" />
        Reviewer Breakdown
      </h4>
      <div className="space-y-3">
        {sortedRelationships.map(([rel, count]) => {
          const percentage = ((count / total) * 100).toFixed(0);
          return (
            <div key={rel} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground truncate max-w-[200px]">{rel}</span>
                <span className="font-medium">{count} ({percentage}%)</span>
              </div>
              <div className="h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="h-full bg-primary/70 rounded-full"
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
