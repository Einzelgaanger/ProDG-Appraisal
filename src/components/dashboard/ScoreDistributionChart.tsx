import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';

interface ScoreDistributionChartProps {
  distribution: Record<number, number>;
}

const scoreLabels: Record<number, string> = {
  1: 'Never',
  2: 'Sometimes',
  3: 'Most times',
  4: 'Always',
};

const scoreColors: Record<number, string> = {
  1: 'hsl(var(--destructive))',
  2: 'hsl(var(--warning))',
  3: 'hsl(var(--primary))',
  4: 'hsl(var(--success))',
};

export default function ScoreDistributionChart({ distribution }: ScoreDistributionChartProps) {
  const data = Object.entries(distribution).map(([score, count]) => ({
    score: parseInt(score),
    label: scoreLabels[parseInt(score)],
    count,
    color: scoreColors[parseInt(score)],
  }));

  const total = Object.values(distribution).reduce((a, b) => a + b, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-card p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/20">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Score Distribution</h3>
          <p className="text-xs text-muted-foreground">{total.toLocaleString()} total ratings</p>
        </div>
      </div>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="horizontal">
            <XAxis 
              dataKey="label" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={({ payload }) => {
                if (!payload || !payload[0]) return null;
                const data = payload[0].payload;
                const percentage = ((data.count / total) * 100).toFixed(1);
                return (
                  <div className="glass-card p-3 shadow-xl">
                    <p className="font-medium text-sm">{data.label}</p>
                    <p className="text-lg font-bold" style={{ color: data.color }}>
                      {data.count.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">{percentage}% of total</p>
                  </div>
                );
              }}
              cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-4">
        {data.map((item) => (
          <div key={item.score} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}