import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';
import { CompetencyScore } from '@/types/appraisal';
import { motion } from 'framer-motion';
import { Target } from 'lucide-react';

interface CompetencyRadarProps {
  competencies: CompetencyScore[];
  title?: string;
}

// Custom tick component that wraps text to 2 lines
const CustomTick = ({ payload, x, y, textAnchor, ...rest }: any) => {
  const words = payload.value.split(' ');
  const maxCharsPerLine = 12;
  
  // Split into lines
  const lines: string[] = [];
  let currentLine = '';
  
  words.forEach((word: string) => {
    if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });
  if (currentLine) lines.push(currentLine);
  
  // Limit to 2 lines max
  const displayLines = lines.slice(0, 2);
  if (lines.length > 2) {
    displayLines[1] = displayLines[1].slice(0, 10) + '...';
  }

  return (
    <g transform={`translate(${x},${y})`}>
      {displayLines.map((line, index) => (
        <text
          key={index}
          x={0}
          y={index * 12 - (displayLines.length - 1) * 6}
          textAnchor={textAnchor}
          style={{ fill: 'hsl(var(--muted-foreground))' }}
          fontSize={10}
        >
          {line}
        </text>
      ))}
    </g>
  );
};

export default function CompetencyRadar({ competencies, title = 'Competency Overview' }: CompetencyRadarProps) {
  const data = competencies.map(c => ({
    subject: c.name,
    fullName: c.name,
    score: c.score,
    percentage: c.percentage,
    fullMark: 4,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="glass-card p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-accent/20">
          <Target className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">Average scores across all competencies</p>
        </div>
      </div>

      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} margin={{ top: 30, right: 50, bottom: 30, left: 50 }}>
            <PolarGrid 
              stroke="hsl(var(--border))" 
              strokeOpacity={0.3}
            />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={<CustomTick />}
              tickLine={false}
            />
            <PolarRadiusAxis 
              angle={30} 
              domain={[0, 4]} 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              axisLine={false}
            />
            <Radar
              name="Score"
              dataKey="score"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Tooltip
              content={({ payload }) => {
                if (!payload || !payload[0]) return null;
                const data = payload[0].payload;
                return (
                  <div className="glass-card p-3 shadow-xl">
                    <p className="font-medium text-sm">{data.fullName}</p>
                    <p className="text-primary text-lg font-bold">{data.score.toFixed(2)}/4.00</p>
                    <p className="text-xs text-muted-foreground">{data.percentage}% of max score</p>
                  </div>
                );
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
