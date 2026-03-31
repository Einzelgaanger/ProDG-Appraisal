import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp,
  AlertTriangle, Rocket, Repeat, MessageSquare, Zap, Shield, Star,
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import type { User } from '@supabase/supabase-js';

interface Category { id: string; name: string; sort_order: number; }
interface Question { id: string; category_id: string; question_text: string; question_type: string; sort_order: number; }
interface Profile { employee_id: string | null; name: string; email: string; }
interface CategoryScore { category: string; myScore: number; orgAvg: number; }
interface QuestionDetail { question: string; myScore: number; orgAvg: number; delta: number; }
interface FeedbackItem { text: string; }

interface GrowthTabProps {
  user: User | null;
  profile: Profile | null;
  categories: Category[];
  questions: Question[];
}

const pageT = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.15 } };

export default function GrowthTab({ user, profile, categories, questions }: GrowthTabProps) {
  const [loading, setLoading] = useState(true);
  const [catScores, setCatScores] = useState<CategoryScore[]>([]);
  const [questionDetails, setQuestionDetails] = useState<Record<string, QuestionDetail[]>>({});
  const [totalReviews, setTotalReviews] = useState(0);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [feedbackTab, setFeedbackTab] = useState<'stop' | 'start' | 'continue'>('continue');

  // Open-ended feedback
  const [stopFeedback, setStopFeedback] = useState<FeedbackItem[]>([]);
  const [startFeedback, setStartFeedback] = useState<FeedbackItem[]>([]);
  const [continueFeedback, setContinueFeedback] = useState<FeedbackItem[]>([]);

  useEffect(() => {
    if (user && profile?.employee_id) loadGrowthData();
  }, [user, profile]);

  const loadGrowthData = async () => {
    if (!profile?.employee_id) return;
    setLoading(true);
    try {
      // Get my responses
      const { data: myResp } = await supabase
        .from('survey_responses')
        .select('id')
        .eq('employee_id', profile.employee_id);

      if (!myResp?.length) { setLoading(false); return; }
      setTotalReviews(myResp.length);

      const responseIds = myResp.map(r => r.id);

      // Batch fetch - my answers and org answers
      const [myAnsRes, orgAnsRes] = await Promise.all([
        supabase.from('survey_answers')
          .select('score, text_answer, question_id')
          .in('response_id', responseIds),
        supabase.from('survey_answers')
          .select('score, question_id')
          .not('score', 'is', null)
          .limit(5000),
      ]);

      const myAnswers = myAnsRes.data || [];
      const orgAnswers = orgAnsRes.data || [];

      // Build question lookup
      const qMap = new Map(questions.map(q => [q.id, q]));
      const catMap = new Map(categories.map(c => [c.id, c]));

      // Aggregate per-question scores
      const myQScores: Record<string, number[]> = {};
      const orgQScores: Record<string, number[]> = {};

      myAnswers.forEach(a => {
        if (a.score != null) {
          (myQScores[a.question_id] ??= []).push(a.score);
        }
      });
      orgAnswers.forEach(a => {
        if (a.score != null) {
          (orgQScores[a.question_id] ??= []).push(a.score);
        }
      });

      // Build per-category scores and per-question details
      const catAgg: Record<string, { my: number[]; org: number[] }> = {};
      const qDetails: Record<string, QuestionDetail[]> = {};

      questions.filter(q => q.question_type === 'scored').forEach(q => {
        const cat = catMap.get(q.category_id);
        if (!cat) return;

        const myScoreArr = myQScores[q.id] || [];
        const orgScoreArr = orgQScores[q.id] || [];
        const myAvg = myScoreArr.length ? myScoreArr.reduce((a, b) => a + b, 0) / myScoreArr.length : 0;
        const orgAvg = orgScoreArr.length ? orgScoreArr.reduce((a, b) => a + b, 0) / orgScoreArr.length : 0;

        if (!catAgg[cat.name]) catAgg[cat.name] = { my: [], org: [] };
        if (myAvg > 0) catAgg[cat.name].my.push(myAvg);
        if (orgAvg > 0) catAgg[cat.name].org.push(orgAvg);

        if (!qDetails[cat.name]) qDetails[cat.name] = [];
        qDetails[cat.name].push({
          question: q.question_text.replace(/^How (effectively|well|significantly|actively|willing|responsive|professional|dependable|proactive) (does|do|is|are) (this person|they) /i, ''),
          myScore: +myAvg.toFixed(2),
          orgAvg: +orgAvg.toFixed(2),
          delta: +(myAvg - orgAvg).toFixed(2),
        });
      });

      setCatScores(Object.entries(catAgg).map(([cat, { my, org }]) => ({
        category: cat,
        myScore: my.length ? +(my.reduce((a, b) => a + b, 0) / my.length).toFixed(2) : 0,
        orgAvg: org.length ? +(org.reduce((a, b) => a + b, 0) / org.length).toFixed(2) : 0,
      })));
      setQuestionDetails(qDetails);

      // Open-ended feedback
      const openQs = questions.filter(q => q.question_type === 'open_ended');
      const stopQ = openQs.find(q => q.question_text.toLowerCase().includes('stop'));
      const startQ = openQs.find(q => q.question_text.toLowerCase().includes('start'));
      const continueQ = openQs.find(q => q.question_text.toLowerCase().includes('continue'));

      const textAnswers = myAnswers.filter(a => a.text_answer && a.text_answer.trim());
      
      const dedup = (items: string[]) => {
        const seen = new Set<string>();
        return items.filter(t => {
          const k = t.toLowerCase().trim();
          if (seen.has(k) || k.length < 3) return false;
          seen.add(k);
          return true;
        }).map(t => ({ text: t }));
      };

      if (stopQ) setStopFeedback(dedup(textAnswers.filter(a => a.question_id === stopQ.id).map(a => a.text_answer!)));
      if (startQ) setStartFeedback(dedup(textAnswers.filter(a => a.question_id === startQ.id).map(a => a.text_answer!)));
      if (continueQ) setContinueFeedback(dedup(textAnswers.filter(a => a.question_id === continueQ.id).map(a => a.text_answer!)));

    } catch (err) {
      console.error('Growth data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const overallScore = useMemo(() => {
    if (!catScores.length) return 0;
    return +(catScores.reduce((s, c) => s + c.myScore, 0) / catScores.length).toFixed(2);
  }, [catScores]);

  const orgOverall = useMemo(() => {
    if (!catScores.length) return 0;
    return +(catScores.reduce((s, c) => s + c.orgAvg, 0) / catScores.length).toFixed(2);
  }, [catScores]);

  // Find strongest and weakest
  const strongest = useMemo(() => {
    if (!catScores.length) return null;
    return [...catScores].sort((a, b) => b.myScore - a.myScore)[0];
  }, [catScores]);

  const weakest = useMemo(() => {
    if (!catScores.length) return null;
    return [...catScores].sort((a, b) => a.myScore - b.myScore)[0];
  }, [catScores]);

  const totalFeedback = stopFeedback.length + startFeedback.length + continueFeedback.length;

  const feedbackSections = [
    { key: 'stop' as const, label: 'STOP DOING', icon: AlertTriangle, items: stopFeedback, accent: 'text-red-500', bg: 'bg-red-500/10 border-red-500/30' },
    { key: 'start' as const, label: 'START DOING', icon: Rocket, items: startFeedback, accent: 'text-accent', bg: 'bg-accent/10 border-accent/30' },
    { key: 'continue' as const, label: 'KEEP DOING', icon: Repeat, items: continueFeedback, accent: 'text-green-500', bg: 'bg-green-500/10 border-green-500/30' },
  ];

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  if (!catScores.length) {
    return (
      <motion.div {...pageT}>
        <div className="border-2 border-foreground/10 p-10 text-center">
          <div className="label-mono mb-2">// awaiting_feedback</div>
          <h3 className="text-lg font-bold mb-2">No Reviews Yet</h3>
          <p className="text-sm text-muted-foreground">Once your peers review you, your growth insights will appear here.</p>
          <p className="text-xs text-muted-foreground mt-2">This is a safe space — all feedback is anonymous and aimed at helping you grow.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div {...pageT}>
      <div className="space-y-4">
        {/* Growth-oriented intro */}
        <div className="border-2 border-accent/30 bg-accent/5 p-4">
          <div className="label-mono text-accent mb-1">// your_growth_map</div>
          <p className="text-sm text-muted-foreground">
            This is your personal growth snapshot — built from anonymous peer feedback. 
            No awards, no rankings. Just honest signal to help you level up.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="border-2 border-foreground/10 p-4">
            <div className="label-mono mb-1 text-[9px]">Your Score</div>
            <div className="text-2xl font-bold">{overallScore}<span className="text-xs text-muted-foreground">/5</span></div>
            <div className="flex items-center gap-1 mt-1">
              {overallScore > orgOverall ? (
                <><TrendingUp className="w-3 h-3 text-green-500" /><span className="text-[10px] text-green-500 font-bold">+{(overallScore - orgOverall).toFixed(2)} vs team</span></>
              ) : overallScore < orgOverall ? (
                <><TrendingDown className="w-3 h-3 text-red-500" /><span className="text-[10px] text-red-500 font-bold">{(overallScore - orgOverall).toFixed(2)} vs team</span></>
              ) : (
                <><Minus className="w-3 h-3 text-muted-foreground" /><span className="text-[10px] text-muted-foreground">= team avg</span></>
              )}
            </div>
          </div>
          <div className="border-2 border-foreground/10 p-4">
            <div className="label-mono mb-1 text-[9px]">Team Average</div>
            <div className="text-2xl font-bold">{orgOverall}<span className="text-xs text-muted-foreground">/5</span></div>
          </div>
          <div className="border-2 border-foreground/10 p-4">
            <div className="label-mono mb-1 text-[9px]">Reviews</div>
            <div className="text-2xl font-bold">{totalReviews}</div>
          </div>
          <div className="border-2 border-foreground/10 p-4">
            <div className="label-mono mb-1 text-[9px]">Feedback Items</div>
            <div className="text-2xl font-bold">{totalFeedback}</div>
          </div>
        </div>

        {/* Strongest / Weakest callout */}
        {strongest && weakest && strongest.category !== weakest.category && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="border-2 border-green-500/30 bg-green-500/5 p-4 flex items-start gap-3">
              <div className="w-8 h-8 bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <Star className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <div className="label-mono text-green-500 text-[9px] mb-0.5">Strongest Area</div>
                <div className="text-sm font-bold">{strongest.category}</div>
                <div className="text-xs text-muted-foreground">{strongest.myScore}/5 — keep investing here</div>
              </div>
            </div>
            <div className="border-2 border-orange-500/30 bg-orange-500/5 p-4 flex items-start gap-3">
              <div className="w-8 h-8 bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <div className="label-mono text-orange-500 text-[9px] mb-0.5">Growth Opportunity</div>
                <div className="text-sm font-bold">{weakest.category}</div>
                <div className="text-xs text-muted-foreground">{weakest.myScore}/5 — focus area for levelling up</div>
              </div>
            </div>
          </div>
        )}

        {/* Radar + Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="border-2 border-foreground/10 p-5">
            <div className="label-mono mb-3">Competency Radar</div>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={catScores}>
                <PolarGrid stroke="hsl(var(--foreground) / 0.1)" />
                <PolarAngleAxis dataKey="category" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                <Radar name="You" dataKey="myScore" fill="hsl(var(--accent))" fillOpacity={0.3} stroke="hsl(var(--accent))" strokeWidth={2} />
                <Radar name="Team" dataKey="orgAvg" fill="hsl(var(--foreground))" fillOpacity={0.1} stroke="hsl(var(--foreground))" strokeWidth={1} strokeDasharray="4 4" />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="border-2 border-foreground/10 p-5">
            <div className="label-mono mb-3">Category Scores</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={catScores} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--foreground) / 0.08)" />
                <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="category" width={120} tick={{ fontSize: 9 }} />
                <Tooltip />
                <Bar dataKey="myScore" fill="hsl(var(--accent))" name="You" />
                <Bar dataKey="orgAvg" fill="hsl(var(--foreground) / 0.2)" name="Team" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Per-question drilldown */}
        <div className="border-2 border-foreground/10">
          <div className="p-4 border-b border-foreground/10">
            <div className="label-mono mb-1">// deep_dive</div>
            <h3 className="text-sm font-bold">Question-Level Breakdown</h3>
            <p className="text-xs text-muted-foreground">Click a category to see how you scored on each question vs the team.</p>
          </div>
          {Object.entries(questionDetails).map(([catName, details]) => {
            const isOpen = expandedCat === catName;
            const catScore = catScores.find(c => c.category === catName);
            return (
              <div key={catName}>
                <button
                  onClick={() => setExpandedCat(isOpen ? null : catName)}
                  className="w-full flex items-center justify-between p-4 border-b border-foreground/5 hover:bg-foreground/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold">{catName}</span>
                    {catScore && (
                      <span className="mono text-[10px] text-muted-foreground">
                        {catScore.myScore}/5
                        {catScore.myScore > catScore.orgAvg && <span className="text-green-500 ml-1">↑</span>}
                        {catScore.myScore < catScore.orgAvg && <span className="text-red-500 ml-1">↓</span>}
                      </span>
                    )}
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 space-y-2 bg-foreground/[0.02]">
                        {details.map((d, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 border border-foreground/5">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-foreground/80 capitalize">{d.question}</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <div className="flex-1 h-1.5 bg-foreground/5 relative overflow-hidden">
                                  <motion.div
                                    className="absolute inset-y-0 left-0 bg-accent"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(d.myScore / 5) * 100}%` }}
                                    transition={{ duration: 0.5, delay: i * 0.05 }}
                                  />
                                </div>
                                <span className="mono text-[10px] font-bold w-8 text-right">{d.myScore}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end flex-shrink-0">
                              <span className={`mono text-[10px] font-bold ${d.delta > 0 ? 'text-green-500' : d.delta < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                {d.delta > 0 ? '+' : ''}{d.delta}
                              </span>
                              <span className="mono text-[8px] text-muted-foreground">vs team</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Qualitative feedback */}
        {totalFeedback > 0 && (
          <div className="border-2 border-foreground/10">
            <div className="p-4 border-b border-foreground/10">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-bold">What Your Peers Said</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Anonymous feedback — use it as a mirror, not a scorecard. Growth happens here.
              </p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-foreground/10">
              {feedbackSections.map(s => (
                <button
                  key={s.key}
                  onClick={() => setFeedbackTab(s.key)}
                  className={`flex-1 p-3 text-center transition-all mono text-[10px] tracking-wider font-bold ${
                    feedbackTab === s.key
                      ? `${s.bg} ${s.accent}`
                      : 'hover:bg-foreground/[0.02] text-muted-foreground'
                  }`}
                >
                  <s.icon className={`w-3.5 h-3.5 mx-auto mb-1 ${feedbackTab === s.key ? s.accent : ''}`} />
                  {s.label}
                  <span className="ml-1 opacity-70">({s.items.length})</span>
                </button>
              ))}
            </div>

            {/* Feedback items */}
            <div className="p-4 max-h-[400px] overflow-y-auto">
              <AnimatePresence mode="wait">
                {feedbackSections.map(s => feedbackTab === s.key && (
                  <motion.div
                    key={s.key}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="space-y-2"
                  >
                    {s.items.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No feedback in this category yet.</p>
                    ) : (
                      s.items.map((item, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="p-3 border border-foreground/5 bg-foreground/[0.02] text-sm text-foreground/80"
                        >
                          "{item.text}"
                        </motion.div>
                      ))
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
