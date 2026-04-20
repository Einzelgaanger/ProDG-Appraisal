import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import {
  Loader2, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp,
  AlertTriangle, Rocket, Repeat, MessageSquare, Zap, Star, Brain, Sparkles,
  HelpCircle,
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import type { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';

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

function renderInlineInsight(part: string, keyPrefix: string) {
  const urlParts = part.split(/(https?:\/\/[^\s)]+)/g);
  return urlParts.map((piece, i) => {
    if (/^https?:\/\//.test(piece)) {
      return (
        <a key={`${keyPrefix}-url-${i}`} href={piece} target="_blank" rel="noreferrer" className="font-semibold text-accent underline underline-offset-2 break-all">
          {piece.replace(/^https?:\/\//, '')}
        </a>
      );
    }
    return <span key={`${keyPrefix}-txt-${i}`}>{piece}</span>;
  });
}

function renderInsightMarkdown(text: string) {
  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    if (!line.trim()) return <div key={lineIdx} className="h-2" />;
    const boldParts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={lineIdx} className="text-sm text-foreground/90 mb-2 last:mb-0 leading-relaxed">
        {boldParts.map((part, i) => {
          const m = part.match(/^\*\*(.+)\*\*$/);
          if (m) return <strong key={i} className="font-semibold text-foreground">{m[1]}</strong>;
          return renderInlineInsight(part, `${lineIdx}-${i}`);
        })}
      </p>
    );
  });
}

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

  const [feedbackDateRange, setFeedbackDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [growthInsight, setGrowthInsight] = useState<string | null>(null);
  const [growthInsightLoading, setGrowthInsightLoading] = useState(false);
  const [growthInsightError, setGrowthInsightError] = useState<string | null>(null);
  const [growthInsightMeta, setGrowthInsightMeta] = useState<{ cached?: boolean; nextRefreshAt?: string; emailSent?: boolean } | null>(null);

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
        .select('id, created_at')
        .eq('employee_id', profile.employee_id);

      if (!myResp?.length) { setLoading(false); return; }
      setTotalReviews(myResp.length);

      const dates = myResp.map(r => new Date(r.created_at)).sort((a, b) => a.getTime() - b.getTime());
      if (dates.length) {
        setFeedbackDateRange({ from: dates[0], to: dates[dates.length - 1] });
      } else {
        setFeedbackDateRange(null);
      }

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

  const buildGrowthContextForAI = useCallback(() => {
    if (!catScores.length) return '';
    let s = '';
    s += `Overall: ${overallScore}/5 vs organisation average ${orgOverall}/5. Peer review responses received: ${totalReviews}.\n`;
    if (feedbackDateRange) {
      s += `Feedback window: ${feedbackDateRange.from.toLocaleDateString()} – ${feedbackDateRange.to.toLocaleDateString()}.\n`;
    }
    if (strongest && weakest) {
      s += `Relative strength: ${strongest.category} (${strongest.myScore}/5). Growth edge: ${weakest.category} (${weakest.myScore}/5).\n`;
    }
    s += `\nCategory scores (you vs team average):\n`;
    catScores.forEach(c => {
      s += `- ${c.category}: ${c.myScore} vs ${c.orgAvg}\n`;
    });
    s += `\nQuestion-level (you vs team, delta):\n`;
    Object.entries(questionDetails).forEach(([cat, details]) => {
      details.forEach(d => {
        s += `- [${cat}] ${d.question}: ${d.myScore} vs ${d.orgAvg} (delta ${d.delta})\n`;
      });
    });
    s += `\nSTOP DOING (anonymous peer comments):\n`;
    stopFeedback.forEach(x => {
      s += `- ${x.text}\n`;
    });
    s += `\nSTART DOING (anonymous peer comments):\n`;
    startFeedback.forEach(x => {
      s += `- ${x.text}\n`;
    });
    s += `\nKEEP DOING (anonymous peer comments):\n`;
    continueFeedback.forEach(x => {
      s += `- ${x.text}\n`;
    });
    return s.slice(0, 24000);
  }, [
    catScores,
    overallScore,
    orgOverall,
    totalReviews,
    feedbackDateRange,
    strongest,
    weakest,
    questionDetails,
    stopFeedback,
    startFeedback,
    continueFeedback,
  ]);

  const generateGrowthInsight = async (forceRefresh = false) => {
    const ctx = buildGrowthContextForAI();
    if (ctx.length < 20) return;
    setGrowthInsightLoading(true);
    setGrowthInsightError(null);
    try {
      const { data, error } = await supabase.functions.invoke('growth-insights', {
        body: { growthContext: ctx, forceRefresh },
      });
      if (error) {
        setGrowthInsightError(error.message);
        return;
      }
      const payload = data as { insight?: string; error?: string; cached?: boolean; nextRefreshAt?: string; emailSent?: boolean } | null;
      if (payload?.error) {
        setGrowthInsightError(payload.error);
        return;
      }
      if (!payload?.insight) {
        setGrowthInsightError('No insight returned. Is the growth-insights function deployed?');
        return;
      }
      setGrowthInsight(payload.insight);
      setGrowthInsightMeta({ cached: payload.cached, nextRefreshAt: payload.nextRefreshAt, emailSent: payload.emailSent });
    } catch (e) {
      setGrowthInsightError(e instanceof Error ? e.message : 'Could not generate insights');
    } finally {
      setGrowthInsightLoading(false);
    }
  };

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

        {/* How to read your scores — plain-English explainer */}
        <details className="border-2 border-foreground/10 group">
          <summary className="flex items-center justify-between p-3 sm:p-4 cursor-pointer list-none hover:bg-foreground/[0.02]">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-accent" />
              <span className="text-sm font-bold">How to read your scores</span>
            </div>
            <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="p-3 sm:p-4 pt-0 border-t border-foreground/10 space-y-3 text-xs sm:text-sm text-muted-foreground">
            <div>
              <p className="font-bold text-foreground mb-1">The 1–5 scale</p>
              <p>Every question is rated from <strong>1 (Rarely)</strong> to <strong>5 (Consistently)</strong>. Your score in a category is the average of all the answers your peers gave you in that category.</p>
            </div>
            <div>
              <p className="font-bold text-foreground mb-1">Example</p>
              <p>If peers rated you <span className="mono">3, 4, 2</span> on the three questions in <em>Communication</em>, your score is <span className="mono">(3 + 4 + 2) ÷ 3 = 3.0 / 5</span>.</p>
            </div>
            <div>
              <p className="font-bold text-foreground mb-1">"+0.5 vs team" — what it means</p>
              <p>That's how you compare to the team's average for the same category. <strong className="text-green-600">Green / +</strong> means you're above the team average; <strong className="text-red-600">red / −</strong> means below. It's not a competition — it's context so you can spot where to focus.</p>
            </div>
            <div>
              <p className="font-bold text-foreground mb-1">The radar chart</p>
              <p>Each corner is a competency. The wider the shape, the more balanced your strengths. A dent on one side = a clear area to grow.</p>
            </div>
            <div className="pt-2 border-t border-foreground/5 text-[11px]">
              <strong className="text-foreground">Reminder:</strong> All feedback is anonymous. You see the numbers and themes — never who said what.
            </div>
          </div>
        </details>

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

        {feedbackDateRange && (
          <p className="text-[11px] text-muted-foreground mono px-0.5">
            Feedback window:{' '}
            {feedbackDateRange.from.toDateString() === feedbackDateRange.to.toDateString()
              ? feedbackDateRange.from.toLocaleDateString()
              : `${feedbackDateRange.from.toLocaleDateString()} – ${feedbackDateRange.to.toLocaleDateString()}`}
          </p>
        )}

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

        {/* AI growth synthesis (edge function: growth-insights) */}
        <div className="border-2 border-accent/40 bg-gradient-to-br from-accent/[0.07] to-transparent p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 border-2 border-accent/50 bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Brain className="w-5 h-5 text-accent" />
              </div>
              <div>
                <div className="label-mono text-accent mb-0.5">// ai_growth_synthesis</div>
                <h3 className="text-sm font-bold flex items-center gap-2 flex-wrap">
                  Deeper insight
                  <Sparkles className="w-4 h-4 text-accent" />
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                  Connects your scores and anonymous comments to specific growth actions plus carefully chosen public articles, guides, or talks that match your profile.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant={growthInsight ? 'outline' : 'default'}
              size="sm"
              className="shrink-0 font-bold uppercase text-[10px] tracking-wider"
              disabled={growthInsightLoading}
              onClick={() => generateGrowthInsight(Boolean(growthInsight))}
            >
              {growthInsightLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Generating
                </>
              ) : growthInsight ? (
                'Regenerate'
              ) : (
                'Generate insight'
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground border-l-2 border-foreground/15 pl-3 mb-3">
            AI can misread nuance. Use this as a growth lens alongside your own judgment; suggested links refresh every 24 hours as feedback changes.
          </p>
          {growthInsightMeta?.nextRefreshAt && (
            <p className="text-[10px] text-muted-foreground border-l-2 border-accent/30 pl-3 mb-3">
              {growthInsightMeta.cached ? 'Showing your latest saved resource list.' : 'Fresh resource list generated.'} Next refresh: {new Date(growthInsightMeta.nextRefreshAt).toLocaleString()}.
              {growthInsightMeta.emailSent ? ' We also emailed you a reminder.' : ''}
            </p>
          )}
          {growthInsightError && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 p-3 mb-3">
              {growthInsightError}
              <p className="text-[10px] text-muted-foreground mt-2 font-normal">
                Please try again in a moment.
              </p>
            </div>
          )}
          {growthInsight && !growthInsightLoading && (
            <div className="border border-foreground/10 bg-background/80 p-4 text-left">
              {renderInsightMarkdown(growthInsight)}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
