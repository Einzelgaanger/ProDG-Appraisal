import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEmployeeAuth } from '@/contexts/EmployeeAuthContext';
import { supabase } from '@/integrations/supabase/client';
import VGGHeader from '@/components/VGGHeader';
import { Button } from '@/components/ui/button';
import {
  Trophy, Medal, Award, ArrowLeft, Loader2, Star, Users,
} from 'lucide-react';

interface RankedEmployee {
  employee_id: string;
  name: string;
  subsidiary: string;
  avgScore: number;
  totalReviews: number;
}

export default function WallOfFame() {
  const { profile, logout } = useEmployeeAuth();
  const navigate = useNavigate();
  const [rankings, setRankings] = useState<RankedEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRankings();
  }, []);

  const loadRankings = async () => {
    try {
      // Get all employees with subsidiary names
      const { data: employees } = await supabase
        .from('employees')
        .select('id, name, subsidiaries(name)');

      if (!employees) return;

      // Get all survey responses with answers
      const { data: responses } = await supabase
        .from('survey_responses')
        .select('employee_id, survey_answers(score)');

      if (!responses) return;

      // Aggregate scores per employee
      const scoreMap: Record<string, { scores: number[]; count: number }> = {};
      responses.forEach((r: any) => {
        if (!scoreMap[r.employee_id]) scoreMap[r.employee_id] = { scores: [], count: 0 };
        scoreMap[r.employee_id].count++;
        r.survey_answers?.forEach((a: any) => {
          if (a.score) scoreMap[r.employee_id].scores.push(a.score);
        });
      });

      // Build rankings
      const ranked: RankedEmployee[] = employees
        .filter((e: any) => scoreMap[e.id]?.scores.length > 0)
        .map((e: any) => {
          const data = scoreMap[e.id];
          return {
            employee_id: e.id,
            name: e.name,
            subsidiary: e.subsidiaries?.name || 'Unknown',
            avgScore: parseFloat(
              (data.scores.reduce((a, b) => a + b, 0) / data.scores.length).toFixed(2)
            ),
            totalReviews: data.count,
          };
        })
        .sort((a, b) => b.avgScore - a.avgScore);

      setRankings(ranked);
    } catch (err) {
      console.error('Rankings error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Trophy className="w-5 h-5 text-warning" />;
    if (rank === 1) return <Medal className="w-5 h-5 text-muted-foreground" />;
    if (rank === 2) return <Award className="w-5 h-5 text-primary" />;
    return <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-muted-foreground">{rank + 1}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <VGGHeader
        subtitle="Wall of Fame"
        onLogout={handleLogout}
        maxWidth="max-w-3xl"
        actions={
          <Button variant="outline" size="sm" asChild className="h-8 text-xs gap-1.5">
            <Link to="/my-dashboard">
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </Link>
          </Button>
        }
      />

      <main className="max-w-3xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl font-bold font-serif mb-2">Performance Rankings</h1>
          <p className="text-muted-foreground text-sm">
            Top performers based on peer review scores across all competencies.
          </p>
        </motion.div>

        {/* Top 3 podium */}
        {rankings.length >= 3 && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[1, 0, 2].map((idx) => {
              const person = rankings[idx];
              const isFirst = idx === 0;
              return (
                <motion.div
                  key={person.employee_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + idx * 0.1 }}
                  className={`glass-panel p-5 text-center ${isFirst ? 'sm:-mt-4 border-primary/30 bg-primary/5' : ''}`}
                >
                  <div className="mb-3">{getRankIcon(idx)}</div>
                  <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center ${
                    isFirst ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    <span className="font-bold text-sm">{person.name.split(' ').map(n => n[0]).join('')}</span>
                  </div>
                  <p className="text-sm font-semibold truncate">{person.name}</p>
                  <p className="text-xs text-muted-foreground mb-2">{person.subsidiary}</p>
                  <div className="flex items-center justify-center gap-1">
                    <Star className="w-3 h-3 text-primary" />
                    <span className="text-sm font-bold text-primary">{person.avgScore}</span>
                    <span className="text-xs text-muted-foreground">/5</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    <Users className="w-3 h-3 inline mr-0.5" />{person.totalReviews} reviews
                  </p>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Full list */}
        <div className="glass-panel divide-y divide-border">
          {rankings.map((person, i) => {
            const isMe = person.employee_id === profile?.employee_id;
            return (
              <motion.div
                key={person.employee_id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
                className={`flex items-center gap-4 px-5 py-3.5 ${isMe ? 'bg-primary/5' : ''}`}
              >
                <div className="w-8 flex-shrink-0 text-center">
                  {getRankIcon(i)}
                </div>
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {person.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {person.name}
                    {isMe && <span className="ml-1.5 text-xs text-primary font-normal">(You)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{person.subsidiary}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-primary" />
                    <span className="text-sm font-bold">{person.avgScore}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{person.totalReviews} reviews</p>
                </div>
              </motion.div>
            );
          })}
          {rankings.length === 0 && (
            <div className="p-12 text-center">
              <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">No Rankings Yet</h2>
              <p className="text-muted-foreground text-sm">
                Rankings will appear once reviews are submitted.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
