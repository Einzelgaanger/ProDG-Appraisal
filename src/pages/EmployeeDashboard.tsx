import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEmployeeAuth } from '@/contexts/EmployeeAuthContext';
import { supabase } from '@/integrations/supabase/client';
import VGGHeader from '@/components/VGGHeader';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3, Users, Trophy, ClipboardList, Loader2,
  Lock, Star,
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

interface CategoryScore {
  category: string;
  myScore: number;
  orgAvg: number;
}

export default function EmployeeDashboard() {
  const { user, profile, logout } = useEmployeeAuth();
  const navigate = useNavigate();
  const [myScores, setMyScores] = useState<CategoryScore[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [completedReviews, setCompletedReviews] = useState(0);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [loading, setLoading] = useState(true);
  const [gateBlocked, setGateBlocked] = useState(false);

  useEffect(() => {
    if (!user || !profile?.employee_id) return;
    loadDashboardData();
  }, [user, profile]);

  const loadDashboardData = async () => {
    if (!profile?.employee_id || !user) return;
    try {
      // Check review completions (gate)
      const [completionsRes, employeesRes] = await Promise.all([
        supabase.from('review_completions').select('id').eq('reviewer_id', user.id),
        supabase.from('employees').select('id'),
      ]);

      const completed = completionsRes.data?.length || 0;
      const total = (employeesRes.data?.length || 1) - 1; // exclude self
      setCompletedReviews(completed);
      setTotalEmployees(total);

      if (completed < total && total > 0) {
        setGateBlocked(true);
        setLoading(false);
        return;
      }

      // Load my scores
      const { data: myResponses } = await supabase
        .from('survey_responses')
        .select('id')
        .eq('employee_id', profile.employee_id);

      if (myResponses?.length) {
        const responseIds = myResponses.map((r) => r.id);

        const { data: myAnswers } = await supabase
          .from('survey_answers')
          .select('score, survey_questions(question_text, survey_categories(name))')
          .in('response_id', responseIds)
          .not('score', 'is', null);

        // Load all answers for org averages
        const { data: allAnswers } = await supabase
          .from('survey_answers')
          .select('score, survey_questions(survey_categories(name))')
          .not('score', 'is', null);

        // Aggregate by category
        const myCatScores: Record<string, number[]> = {};
        const orgCatScores: Record<string, number[]> = {};

        (myAnswers as any[])?.forEach((a) => {
          const cat = a.survey_questions?.survey_categories?.name;
          if (cat && a.score) {
            if (!myCatScores[cat]) myCatScores[cat] = [];
            myCatScores[cat].push(a.score);
          }
        });

        (allAnswers as any[])?.forEach((a) => {
          const cat = a.survey_questions?.survey_categories?.name;
          if (cat && a.score) {
            if (!orgCatScores[cat]) orgCatScores[cat] = [];
            orgCatScores[cat].push(a.score);
          }
        });

        const categories = Object.keys(myCatScores);
        const scores = categories.map((cat) => ({
          category: cat,
          myScore: parseFloat(
            (myCatScores[cat].reduce((a, b) => a + b, 0) / myCatScores[cat].length).toFixed(2)
          ),
          orgAvg: orgCatScores[cat]
            ? parseFloat(
                (orgCatScores[cat].reduce((a, b) => a + b, 0) / orgCatScores[cat].length).toFixed(2)
              )
            : 0,
        }));

        setMyScores(scores);
        setTotalReviews(myResponses.length);
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const overallScore = useMemo(() => {
    if (!myScores.length) return 0;
    return parseFloat(
      (myScores.reduce((sum, s) => sum + s.myScore, 0) / myScores.length).toFixed(2)
    );
  }, [myScores]);

  const orgOverall = useMemo(() => {
    if (!myScores.length) return 0;
    return parseFloat(
      (myScores.reduce((sum, s) => sum + s.orgAvg, 0) / myScores.length).toFixed(2)
    );
  }, [myScores]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Gate: must complete reviews first
  if (gateBlocked) {
    const pct = totalEmployees > 0 ? Math.round((completedReviews / totalEmployees) * 100) : 0;
    return (
      <div className="min-h-screen bg-background">
        <VGGHeader subtitle="My Dashboard" onLogout={handleLogout} maxWidth="max-w-3xl" />
        <div className="flex items-center justify-center px-6 py-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full glass-panel p-8 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <Lock className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold tracking-tight mb-2">Complete Your Reviews First</h1>
            <p className="text-muted-foreground text-sm mb-6">
              You need to review all your colleagues before accessing your personal dashboard.
            </p>
            <div className="mb-2 flex justify-between text-xs text-muted-foreground">
              <span>{completedReviews} of {totalEmployees} reviewed</span>
              <span>{pct}%</span>
            </div>
            <Progress value={pct} className="mb-6" />
            <Button onClick={() => navigate('/survey')} className="gap-2 h-11">
              <ClipboardList className="w-4 h-4" /> Continue Reviewing
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <VGGHeader
        userName={profile?.name}
        subtitle="My Dashboard"
        onLogout={handleLogout}
        actions={
          <>
            <Button variant="outline" size="sm" asChild className="h-8 text-xs gap-1.5">
              <Link to="/wall-of-fame">
                <Trophy className="w-3.5 h-3.5" /> Rankings
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="h-8 text-xs gap-1.5">
              <Link to="/survey">
                <ClipboardList className="w-3.5 h-3.5" /> Survey
              </Link>
            </Button>
          </>
        }
      />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Star className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Your Overall Score</p>
                <p className="text-2xl font-bold text-foreground">{overallScore}<span className="text-sm font-normal text-muted-foreground">/5</span></p>
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Organisation Average</p>
                <p className="text-2xl font-bold text-foreground">{orgOverall}<span className="text-sm font-normal text-muted-foreground">/5</span></p>
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reviews Received</p>
                <p className="text-2xl font-bold text-foreground">{totalReviews}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {myScores.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar Chart */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-panel p-6">
              <h2 className="text-sm font-semibold mb-4">Competency Overview</h2>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={myScores}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Radar name="You" dataKey="myScore" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
                  <Radar name="Org Avg" dataKey="orgAvg" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.05} strokeWidth={1} strokeDasharray="4 4" />
                </RadarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 justify-center mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-primary rounded" /> You</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-muted-foreground rounded border-dashed" /> Org Average</span>
              </div>
            </motion.div>

            {/* Bar Chart */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-panel p-6">
              <h2 className="text-sm font-semibold mb-4">Score Comparison by Category</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={myScores} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis dataKey="category" type="category" width={100} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="myScore" name="You" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="orgAvg" name="Org Avg" fill="hsl(var(--muted))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel p-12 text-center">
            <BarChart3 className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">No Results Yet</h2>
            <p className="text-muted-foreground text-sm">
              Your colleagues haven't submitted reviews for you yet. Check back later.
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}
