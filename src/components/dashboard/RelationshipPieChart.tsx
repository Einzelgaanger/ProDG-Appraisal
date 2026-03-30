import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';

interface RelationshipPieChartProps {
  distribution: Record<string, number>;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--chart-3))',
  'hsl(var(--success))',
  'hsl(var(--chart-5))',
];

function shortenLabel(label: string): string {
  const l = label.toLowerCase();
  if (l.includes('direct report')) return 'Direct Report';
  if (l.includes('executive in charge')) return 'Executive';
  if (l.includes('worked a few times')) return 'Occasional';
  if (l.includes('not have direct')) return 'No Direct';
  if (label === 'Colleague') return 'Colleague';
  if (label.length <= 16) return label;
  return label.slice(0, 16) + '…';
}

export default function RelationshipPieChart({ distribution }: RelationshipPieChartProps) {
  const data = Object.entries(distribution)
    .filter(([_, count]) => count > 0)
    .map(([name, value]) => ({
      name: shortenLabel(name),
      fullName: name,
      value,
    }));

  const total = data.reduce((acc, item) => acc + item.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-card p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-chart-3/20">
          <Users className="w-5 h-5 text-chart-3" />
        </div>
        <div>
          <h3 className="font-semibold">Reviewer Relationships</h3>
          <p className="text-xs text-muted-foreground">{total} reviews by relationship type</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* Chart area has a stable height so it won't jump when adjacent cards expand/collapse */}
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ payload }) => {
                  if (!payload || !payload[0]) return null;
                  const item = payload[0].payload as { fullName: string; value: number };
                  const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0';
                  return (
                    <div className="glass-card p-3 shadow-xl max-w-xs">
                      <p className="font-medium text-sm">{item.fullName}</p>
                      <p className="text-lg font-bold text-primary">{item.value}</p>
                      <p className="text-xs text-muted-foreground">{percentage}% of reviews</p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Custom legend: scrollable + predictable height (prevents overlap/cutoff) */}
        <div className="max-h-24 overflow-y-auto scrollbar-thin pr-1">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {data.map((item, index) => (
              <div key={`${item.fullName}-${index}`} className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-xs text-muted-foreground truncate">{item.name}</span>
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
