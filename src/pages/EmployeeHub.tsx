import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useEmployeeAuth } from '@/contexts/EmployeeAuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import VGGHeader from '@/components/VGGHeader';
import {
  CheckCircle2, ChevronRight, ChevronLeft, Send, Loader2, Shield,
  BarChart3, Users, Search, X, Lock, Plus, Minus, ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

interface Employee { id: string; name: string; role: string | null; department: string | null; subsidiary_id: string; email: string | null; }
interface Category { id: string; name: string; sort_order: number; }
interface Question { id: string; category_id: string; question_text: string; question_type: string; sort_order: number; }
interface PoolPerson { key: string; name: string; email: string | null; primaryEmployeeId: string; primarySubsidiaryId: string; }
interface CategoryScore { category: string; myScore: number; orgAvg: number; }

const SCALE_OPTIONS = [
  { value: 1, label: 'Rarely' },
  { value: 2, label: 'Sometimes' },
  { value: 3, label: 'Often' },
  { value: 4, label: 'Usually' },
  { value: 5, label: 'Consistently' },
];

const pageT = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.15 } };

export default function EmployeeHub() {
  const { user, profile, isAdmin, logout } = useEmployeeAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'review';

  // Review flow
  const [phase, setPhase] = useState<'pool' | 'box' | 'questions' | 'person-done'>('pool');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [lockedPeople, setLockedPeople] = useState<PoolPerson[]>([]);
  const [currentPersonIdx, setCurrentPersonIdx] = useState(0);
  const [currentCatIdx, setCurrentCatIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [poolSearch, setPoolSearch] = useState('');

  // Data
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedReviews, setCompletedReviews] = useState<Set<string>>(new Set());

  // Dashboard
  const [myScores, setMyScores] = useState<CategoryScore[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [dashLoading, setDashLoading] = useState(true);

  // Team pulse
  const [teamData, setTeamData] = useState<{ totalReviews: number; avgScore: number; categories: { name: string; avg: number }[] }>({ totalReviews: 0, avgScore: 0, categories: [] });
  const [teamLoading, setTeamLoading] = useState(true);

  // Load data
  useEffect(() => {
    (async () => {
      try {
        const [empRes, catRes, qRes] = await Promise.all([
          supabase.from('employees').select('*').order('name'),
          supabase.from('survey_categories').select('*').order('sort_order'),
          supabase.from('survey_questions').select('*').order('sort_order'),
        ]);
        if (empRes.data) setAllEmployees(empRes.data);
        if (catRes.data) setCategories(catRes.data);
        if (qRes.data) setQuestions(qRes.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, []);

  // Load completions
  useEffect(() => {
    if (user) {
      supabase.from('review_completions').select('employee_id').eq('reviewer_id', user.id)
        .then(({ data }) => { if (data) setCompletedReviews(new Set(data.map(d => d.employee_id))); });
    }
  }, [user]);

  // Deduplicated pool
  const poolPeople = useMemo(() => {
    const seen = new Map<string, PoolPerson>();
    allEmployees.forEach(emp => {
      const key = emp.email?.toLowerCase() || emp.name.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.set(key, { key, name: emp.name, email: emp.email, primaryEmployeeId: emp.id, primarySubsidiaryId: emp.subsidiary_id });
      }
    });
    // Remove self
    const myEmail = profile?.email?.toLowerCase();
    if (myEmail) seen.delete(myEmail);
    return Array.from(seen.values());
  }, [allEmployees, profile]);

  const filteredPool = useMemo(() => {
    if (!poolSearch.trim()) return poolPeople;
    const q = poolSearch.toLowerCase();
    return poolPeople.filter(p => p.name.toLowerCase().includes(q) || (p.email && p.email.toLowerCase().includes(q)));
  }, [poolPeople, poolSearch]);

  const toggleSelect = (key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const lockIn = () => {
    const people = poolPeople.filter(p => selectedKeys.has(p.key));
    setLockedPeople(people);
    setPhase('box');
  };

  const startReview = (idx: number) => {
    setCurrentPersonIdx(idx);
    setCurrentCatIdx(0);
    setAnswers({});
    setPhase('questions');
  };

  const currentCat = categories[currentCatIdx];
  const currentQuestions = currentCat ? questions.filter(q => q.category_id === currentCat.id) : [];
  const totalScored = questions.filter(q => q.question_type === 'scored').length;
  const answeredScored = questions.filter(q => q.question_type === 'scored' && answers[q.id] !== undefined).length;
  const progress = totalScored > 0 ? (answeredScored / totalScored) * 100 : 0;
  const isCatComplete = () => currentQuestions.every(q => q.question_type === 'open_ended' || answers[q.id] !== undefined);

  const handleSubmit = async () => {
    const person = lockedPeople[currentPersonIdx];
    if (!person) return;
    setSubmitting(true);
    try {
      const { data, error: e1 } = await supabase
        .from('survey_responses')
        .insert({ employee_id: person.primaryEmployeeId, subsidiary_id: person.primarySubsidiaryId })
        .select('id').single();
      if (e1) throw e1;
      const rows = Object.entries(answers).map(([qid, val]) => ({
        response_id: data.id, question_id: qid,
        score: typeof val === 'number' ? val : null,
        text_answer: typeof val === 'string' ? val : null,
      }));
      const { error: e2 } = await supabase.from('survey_answers').insert(rows);
      if (e2) throw e2;
      // Mark completion
      if (user) await supabase.from('review_completions').insert({ reviewer_id: user.id, employee_id: person.primaryEmployeeId });
      setCompletedReviews(prev => { const n = new Set(prev); n.add(person.primaryEmployeeId); return n; });
      setPhase('person-done');
      toast.success('Feedback recorded.');
    } catch (err) { console.error(err); toast.error('Failed to submit.'); }
    finally { setSubmitting(false); }
  };

  // Dashboard data
  useEffect(() => {
    if (activeTab === 'growth' && user && profile?.employee_id) loadDashboard();
  }, [activeTab, user, profile]);

  const loadDashboard = async () => {
    if (!profile?.employee_id) return;
    setDashLoading(true);
    try {
      const { data: myResp } = await supabase.from('survey_responses').select('id').eq('employee_id', profile.employee_id);
      if (myResp?.length) {
        const ids = myResp.map(r => r.id);
        const [{ data: myAns }, { data: allAns }] = await Promise.all([
          supabase.from('survey_answers').select('score, survey_questions(survey_categories(name))').in('response_id', ids).not('score', 'is', null),
          supabase.from('survey_answers').select('score, survey_questions(survey_categories(name))').not('score', 'is', null),
        ]);
        const myCat: Record<string, number[]> = {};
        const orgCat: Record<string, number[]> = {};
        (myAns as any[])?.forEach(a => { const c = a.survey_questions?.survey_categories?.name; if (c && a.score) { (myCat[c] ??= []).push(a.score); } });
        (allAns as any[])?.forEach(a => { const c = a.survey_questions?.survey_categories?.name; if (c && a.score) { (orgCat[c] ??= []).push(a.score); } });
        setMyScores(Object.keys(myCat).map(c => ({
          category: c,
          myScore: +(myCat[c].reduce((a, b) => a + b, 0) / myCat[c].length).toFixed(2),
          orgAvg: orgCat[c] ? +(orgCat[c].reduce((a, b) => a + b, 0) / orgCat[c].length).toFixed(2) : 0,
        })));
        setTotalReviews(myResp.length);
      }
    } catch (err) { console.error(err); }
    finally { setDashLoading(false); }
  };

  // Team pulse
  useEffect(() => {
    if (activeTab === 'pulse') loadTeamPulse();
  }, [activeTab]);

  const loadTeamPulse = async () => {
    setTeamLoading(true);
    try {
      const { data: responses } = await supabase.from('survey_responses').select('id');
      const { data: allAns } = await supabase.from('survey_answers').select('score, survey_questions(survey_categories(name))').not('score', 'is', null);
      const catScores: Record<string, number[]> = {};
      (allAns as any[])?.forEach(a => { const c = a.survey_questions?.survey_categories?.name; if (c && a.score) { (catScores[c] ??= []).push(a.score); } });
      const cats = Object.entries(catScores).map(([name, scores]) => ({ name, avg: +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) }));
      const allScores = Object.values(catScores).flat();
      setTeamData({
        totalReviews: responses?.length || 0,
        avgScore: allScores.length ? +(allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2) : 0,
        categories: cats,
      });
    } catch (err) { console.error(err); }
    finally { setTeamLoading(false); }
  };

  const overallScore = useMemo(() => myScores.length ? +(myScores.reduce((s, c) => s + c.myScore, 0) / myScores.length).toFixed(2) : 0, [myScores]);
  const orgOverall = useMemo(() => myScores.length ? +(myScores.reduce((s, c) => s + c.orgAvg, 0) / myScores.length).toFixed(2) : 0, [myScores]);

  const allLocked = lockedPeople.every(p => completedReviews.has(p.primaryEmployeeId));

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <VGGHeader
        subtitle={profile?.name}
        onLogout={async () => { await logout(); navigate('/'); }}
        maxWidth="max-w-4xl"
        actions={
          <>
            {isAdmin && (
              <Button variant="outline" size="sm" asChild className="h-8 text-xs gap-1.5">
                <Link to="/admin"><Shield className="w-3.5 h-3.5" /> Admin</Link>
              </Button>
            )}
            <div className="hidden sm:flex items-center gap-1.5 label-mono px-2">
              <Lock className="w-3 h-3" /> Anonymous
            </div>
          </>
        }
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4">
        <Tabs value={activeTab} onValueChange={t => setSearchParams({ tab: t })}>
          <TabsList className="grid w-full grid-cols-3 h-11">
            <TabsTrigger value="review" className="gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider">
              <Users className="w-3.5 h-3.5" /> Review
            </TabsTrigger>
            <TabsTrigger value="growth" className="gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider">
              <BarChart3 className="w-3.5 h-3.5" /> My Growth
            </TabsTrigger>
            <TabsTrigger value="pulse" className="gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider">
              <ClipboardList className="w-3.5 h-3.5" /> Team Pulse
            </TabsTrigger>
          </TabsList>

          {/* ═══ REVIEW TAB ═══ */}
          <TabsContent value="review" className="mt-4">
            <AnimatePresence mode="wait">

              {/* POOL PHASE */}
              {phase === 'pool' && (
                <motion.div key="pool" {...pageT}>
                  <div className="border-2 border-foreground/10 p-5 sm:p-6 mb-4">
                    <div className="label-mono mb-2">// select_peers</div>
                    <h2 className="text-xl font-bold mb-1">Pick Your People</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      Choose teammates you've worked with closely enough to give honest, helpful feedback.
                      This isn't about scoring — it's about helping each other grow.
                    </p>
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Search by name or email..." value={poolSearch} onChange={e => setPoolSearch(e.target.value)} className="pl-10 h-10 border-2" />
                      {poolSearch && (
                        <button onClick={() => setPoolSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-muted-foreground" /></button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-24">
                    {filteredPool.map(person => {
                      const selected = selectedKeys.has(person.key);
                      const reviewed = completedReviews.has(person.primaryEmployeeId);
                      return (
                        <button
                          key={person.key}
                          onClick={() => !reviewed && toggleSelect(person.key)}
                          disabled={reviewed}
                          className={`relative p-4 border-2 text-left transition-all duration-150 group ${
                            reviewed
                              ? 'border-foreground/5 bg-muted/50 opacity-50 cursor-not-allowed'
                              : selected
                              ? 'border-accent bg-accent/5 shadow-[3px_3px_0px_0px] shadow-accent -translate-x-0.5 -translate-y-0.5'
                              : 'border-foreground/10 bg-card hover:border-foreground/30'
                          }`}
                        >
                          <div className={`w-10 h-10 flex items-center justify-center font-bold text-sm mb-2 ${
                            selected ? 'bg-accent text-accent-foreground' : reviewed ? 'bg-muted text-muted-foreground' : 'bg-foreground text-background'
                          }`}>
                            {person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div className="text-sm font-bold truncate">{person.name}</div>
                          {person.email && <div className="mono text-[9px] text-muted-foreground truncate mt-0.5">{person.email}</div>}
                          {reviewed && <div className="mono text-[9px] text-accent mt-1">✓ REVIEWED</div>}
                          {selected && !reviewed && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-accent flex items-center justify-center">
                              <CheckCircle2 className="w-3 h-3 text-accent-foreground" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Bottom bar */}
                  {selectedKeys.size > 0 && (
                    <motion.div
                      initial={{ y: 100 }}
                      animate={{ y: 0 }}
                      className="fixed bottom-0 left-0 right-0 bg-foreground text-background border-t-2 border-accent py-4 px-6 flex items-center justify-between z-30"
                    >
                      <div>
                        <span className="text-lg font-bold">{selectedKeys.size}</span>
                        <span className="mono text-xs ml-2 text-background/60 uppercase tracking-wider">people selected</span>
                      </div>
                      <button onClick={lockIn} className="bg-accent text-accent-foreground px-6 py-2.5 font-bold uppercase tracking-[0.1em] text-sm flex items-center gap-2 hover:shadow-[3px_3px_0px_0px] hover:shadow-background/30 transition-all">
                        <Lock className="w-4 h-4" /> Lock In
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* BOX PHASE */}
              {phase === 'box' && (
                <motion.div key="box" {...pageT}>
                  <div className="border-2 border-foreground/10 p-5 sm:p-6 mb-4">
                    <button onClick={() => { setPhase('pool'); setLockedPeople([]); }} className="label-mono mb-3 flex items-center gap-1 hover:text-foreground">
                      <ChevronLeft className="w-3 h-3" /> back to pool
                    </button>
                    <div className="flex items-center gap-2 mb-1">
                      <Lock className="w-4 h-4" />
                      <h2 className="text-xl font-bold">YOUR REVIEW BOX</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {allLocked
                        ? 'All reviews complete! You can go back to select more people.'
                        : `${lockedPeople.length} people locked in. Click someone to start their review.`
                      }
                    </p>
                  </div>

                  <div className="space-y-2">
                    {lockedPeople.map((person, idx) => {
                      const done = completedReviews.has(person.primaryEmployeeId);
                      return (
                        <button
                          key={person.key}
                          onClick={() => !done && startReview(idx)}
                          disabled={done}
                          className={`w-full flex items-center justify-between p-4 border-2 text-left transition-all ${
                            done
                              ? 'border-accent/30 bg-accent/5 cursor-not-allowed'
                              : 'border-foreground/10 bg-card hover:border-foreground/30 hover:shadow-[3px_3px_0px_0px] hover:shadow-foreground/10 hover:-translate-x-0.5 hover:-translate-y-0.5'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 flex items-center justify-center font-bold text-sm ${done ? 'bg-accent/20 text-accent' : 'bg-foreground text-background'}`}>
                              {person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <span className={`font-bold text-sm ${done ? 'line-through text-muted-foreground' : ''}`}>{person.name}</span>
                              {person.email && <span className="mono text-[9px] text-muted-foreground block">{person.email}</span>}
                            </div>
                          </div>
                          {done ? (
                            <span className="mono text-[10px] text-accent font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> DONE
                            </span>
                          ) : (
                            <span className="mono text-[10px] text-muted-foreground group-hover:text-foreground">REVIEW →</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {allLocked && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-2 border-accent p-8 mt-6 text-center">
                      <div className="text-3xl mb-2">✓</div>
                      <h3 className="text-lg font-bold mb-1">ALL REVIEWS COMPLETE</h3>
                      <p className="text-sm text-muted-foreground mb-4">Thank you for your honest feedback. You're helping the team grow.</p>
                      <button onClick={() => { setPhase('pool'); setLockedPeople([]); setSelectedKeys(new Set()); }} className="mono text-xs text-accent hover:underline">
                        ← Select more people to review
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* QUESTIONS PHASE */}
              {phase === 'questions' && currentCat && (
                <motion.div key={`q-${currentCatIdx}`} {...pageT}>
                  <div className="border-2 border-foreground/10 p-5 sm:p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="label-mono">// reviewing</div>
                      <span className="mono text-xs bg-foreground text-background px-2 py-1 font-bold">
                        {currentCatIdx + 1}/{categories.length}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold mb-0.5">{currentCat.name}</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      For: <span className="font-bold text-foreground">{lockedPeople[currentPersonIdx]?.name}</span>
                    </p>

                    {/* Progress */}
                    <div className="flex justify-between text-[10px] mono text-muted-foreground mb-2">
                      <span>Progress</span>
                      <span className="text-accent font-bold">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1 bg-foreground/10 mb-6">
                      <motion.div className="h-full bg-accent" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
                    </div>

                    {/* Scale legend */}
                    {currentCat.sort_order < 8 && (
                      <div className="flex flex-wrap gap-3 mb-6 p-3 border border-foreground/10 mono text-[10px] text-muted-foreground">
                        {SCALE_OPTIONS.map(s => (
                          <span key={s.value} className="flex items-center gap-1.5">
                            <span className="w-5 h-5 bg-foreground/10 text-foreground flex items-center justify-center font-bold">{s.value}</span>
                            {s.label}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Questions */}
                    <div className="space-y-6">
                      {currentQuestions.map((q, qi) => (
                        <motion.div key={q.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: qi * 0.03 }} className="p-4 border border-foreground/10">
                          <p className="text-sm font-medium mb-3">
                            <span className="mono text-[10px] text-accent mr-2">{String(qi + 1).padStart(2, '0')}</span>
                            {q.question_text}
                          </p>
                          {q.question_type === 'scored' ? (
                            <div className="flex gap-1.5">
                              {SCALE_OPTIONS.map(s => (
                                <button
                                  key={s.value}
                                  onClick={() => setAnswers(prev => ({ ...prev, [q.id]: s.value }))}
                                  className={`flex-1 py-3 border-2 text-center transition-all duration-150 ${
                                    answers[q.id] === s.value
                                      ? 'bg-foreground text-background border-foreground shadow-[2px_2px_0px_0px] shadow-accent -translate-x-0.5 -translate-y-0.5'
                                      : 'border-foreground/10 hover:border-foreground/30'
                                  }`}
                                >
                                  <div className="text-sm font-bold">{s.value}</div>
                                  <div className="mono text-[8px] mt-0.5 hidden sm:block opacity-70">{s.label}</div>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <Textarea
                              placeholder="Be honest. Be helpful. Be specific."
                              value={(answers[q.id] as string) || ''}
                              onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                              className="border-2 border-foreground/10 min-h-[100px] text-sm resize-none focus:border-accent focus:ring-1 focus:ring-accent/20"
                            />
                          )}
                        </motion.div>
                      ))}
                    </div>

                    {/* Nav */}
                    <div className="flex justify-between mt-8 pt-5 border-t-2 border-foreground/10">
                      <Button variant="outline" onClick={() => { if (currentCatIdx === 0) setPhase('box'); else setCurrentCatIdx(p => p - 1); }} className="gap-1.5 border-2 font-bold uppercase text-xs tracking-wider">
                        <ChevronLeft className="w-4 h-4" /> Back
                      </Button>
                      {currentCatIdx < categories.length - 1 ? (
                        <Button onClick={() => setCurrentCatIdx(p => p + 1)} disabled={!isCatComplete()} className="gap-1.5 font-bold uppercase text-xs tracking-wider">
                          Next <ChevronRight className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button onClick={handleSubmit} disabled={submitting || answeredScored < totalScored} className="gap-1.5 font-bold uppercase text-xs tracking-wider">
                          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          Submit
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* PERSON DONE */}
              {phase === 'person-done' && (
                <motion.div key="done" {...pageT}>
                  <div className="border-2 border-accent p-10 text-center max-w-md mx-auto">
                    <div className="w-16 h-16 bg-accent/10 border-2 border-accent flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-accent" />
                    </div>
                    <div className="label-mono mb-2">// recorded</div>
                    <h2 className="text-xl font-bold mb-2">FEEDBACK SAVED</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Your anonymous review of {lockedPeople[currentPersonIdx]?.name} has been recorded.
                    </p>
                    <button
                      onClick={() => { setPhase('box'); setAnswers({}); setCurrentCatIdx(0); }}
                      className="border-2 border-foreground bg-foreground text-background px-6 py-3 font-bold uppercase tracking-[0.1em] text-sm hover:shadow-[3px_3px_0px_0px] hover:shadow-accent transition-all"
                    >
                      Continue →
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* ═══ MY GROWTH TAB ═══ */}
          <TabsContent value="growth" className="mt-4">
            <motion.div {...pageT}>
              {dashLoading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : myScores.length === 0 ? (
                <div className="border-2 border-foreground/10 p-10 text-center">
                  <div className="label-mono mb-2">// no_data</div>
                  <h3 className="text-lg font-bold mb-2">No Reviews Yet</h3>
                  <p className="text-sm text-muted-foreground">Once your peers review you, your growth data will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="border-2 border-foreground/10 p-5">
                      <div className="label-mono mb-1">Your Score</div>
                      <div className="text-3xl font-bold">{overallScore}<span className="text-sm text-muted-foreground">/5</span></div>
                    </div>
                    <div className="border-2 border-foreground/10 p-5">
                      <div className="label-mono mb-1">Team Average</div>
                      <div className="text-3xl font-bold">{orgOverall}<span className="text-sm text-muted-foreground">/5</span></div>
                    </div>
                    <div className="border-2 border-foreground/10 p-5">
                      <div className="label-mono mb-1">Reviews Received</div>
                      <div className="text-3xl font-bold">{totalReviews}</div>
                    </div>
                  </div>

                  {myScores.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="border-2 border-foreground/10 p-5">
                        <div className="label-mono mb-3">Radar</div>
                        <ResponsiveContainer width="100%" height={280}>
                          <RadarChart data={myScores}>
                            <PolarGrid stroke="hsl(var(--foreground) / 0.1)" />
                            <PolarAngleAxis dataKey="category" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                            <Radar name="You" dataKey="myScore" fill="hsl(var(--accent))" fillOpacity={0.3} stroke="hsl(var(--accent))" strokeWidth={2} />
                            <Radar name="Team" dataKey="orgAvg" fill="hsl(var(--foreground))" fillOpacity={0.1} stroke="hsl(var(--foreground))" strokeWidth={1} strokeDasharray="4 4" />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="border-2 border-foreground/10 p-5">
                        <div className="label-mono mb-3">Breakdown</div>
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={myScores} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--foreground) / 0.08)" />
                            <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 10 }} />
                            <YAxis type="category" dataKey="category" width={100} tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Bar dataKey="myScore" fill="hsl(var(--accent))" name="You" />
                            <Bar dataKey="orgAvg" fill="hsl(var(--foreground) / 0.2)" name="Team" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </TabsContent>

          {/* ═══ TEAM PULSE TAB ═══ */}
          <TabsContent value="pulse" className="mt-4">
            <motion.div {...pageT}>
              {teamLoading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : (
                <div className="space-y-4">
                  <div className="border-2 border-foreground/10 p-5 sm:p-6">
                    <div className="label-mono mb-2">// team_pulse</div>
                    <h2 className="text-xl font-bold mb-1">Aggregate Team Insights</h2>
                    <p className="text-sm text-muted-foreground">
                      Anonymous, aggregate data. No individual names or rankings — just how we're doing as a team.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="border-2 border-foreground/10 p-5">
                      <div className="label-mono mb-1">Team Average</div>
                      <div className="text-3xl font-bold">{teamData.avgScore}<span className="text-sm text-muted-foreground">/5</span></div>
                    </div>
                    <div className="border-2 border-foreground/10 p-5">
                      <div className="label-mono mb-1">Total Reviews</div>
                      <div className="text-3xl font-bold">{teamData.totalReviews}</div>
                    </div>
                  </div>

                  {teamData.categories.length > 0 && (
                    <div className="border-2 border-foreground/10 p-5">
                      <div className="label-mono mb-3">Category Averages</div>
                      <ResponsiveContainer width="100%" height={Math.max(200, teamData.categories.length * 50)}>
                        <BarChart data={teamData.categories} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--foreground) / 0.08)" />
                          <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 10 }} />
                          <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Bar dataKey="avg" fill="hsl(var(--accent))" name="Average" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
