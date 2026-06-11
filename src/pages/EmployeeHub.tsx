import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useEmployeeAuth } from '@/contexts/EmployeeAuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import HubAppShell, { type HubTabId } from '@/components/layout/HubAppShell';
import { HubMainSkeleton, QuickBusyBar, TeamPulseSkeleton } from '@/components/loading/ContentSkeletons';
import { useProgressiveBusy } from '@/hooks/useProgressiveBusy';
import {
  CheckCircle2, ChevronRight, ChevronLeft, Send,
  Lock,
} from 'lucide-react';
import AppFeedbackDialog from '@/components/AppFeedbackDialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

interface Employee { id: string; name: string; role: string | null; department: string | null; subsidiary_id: string; email: string | null; is_pm: boolean | null; }
interface Category { id: string; name: string; sort_order: number; }
interface Question { id: string; category_id: string; question_text: string; question_type: string; sort_order: number; }
interface PoolPerson {
  key: string;
  assignmentId: string;
  groupName: string;
  name: string;
  email: string | null;
  primaryEmployeeId: string;
  primarySubsidiaryId: string;
}


const SCALE_OPTIONS = [
  { value: 1, label: 'Lacking' },
  { value: 2, label: 'Below' },
  { value: 3, label: 'Meets' },
  { value: 4, label: 'Strong' },
  { value: 5, label: 'Exemplary' },
];

const pageT = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.15 } };

export default function EmployeeHub() {
  const { user, profile, logout, isPM, isAdmin } = useEmployeeAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  // Hub is PM-only (developers get PDF by email).
  const allowedTabs: HubTabId[] = ['review', 'pulse'];
  const requestedTab: HubTabId =
    rawTab === 'pulse' || rawTab === 'review' ? rawTab : 'review';
  const activeTab: HubTabId = allowedTabs.includes(requestedTab) ? requestedTab : 'review';

  useEffect(() => {
    if (!rawTab) return;
    if (!allowedTabs.includes(rawTab as HubTabId)) {
      setSearchParams({ tab: 'review' }, { replace: true });
    }
  }, [rawTab, setSearchParams]);

  const [phase, setPhase] = useState<'box' | 'questions' | 'person-done'>('box');
  const [lockedPeople, setLockedPeople] = useState<PoolPerson[]>([]);
  const [assignedEmployeeIds, setAssignedEmployeeIds] = useState<string[]>([]);
  const [currentPersonIdx, setCurrentPersonIdx] = useState(0);
  const [currentCatIdx, setCurrentCatIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});

  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedReviews, setCompletedReviews] = useState<Set<string>>(new Set()); // assignment ids


  // Team pulse
  const [teamData, setTeamData] = useState<{ totalReviews: number; avgScore: number; categories: { name: string; avg: number }[] }>({ totalReviews: 0, avgScore: 0, categories: [] });
  const [teamLoading, setTeamLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [catRes, qRes] = await Promise.all([
          supabase.from('survey_categories').select('*').order('sort_order'),
          supabase.from('survey_questions').select('*').order('sort_order'),
        ]);
        if (catRes.data) setCategories(catRes.data);
        if (qRes.data) setQuestions(qRes.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (!user || (!isPM && !isAdmin)) return;
    (async () => {
      const { data, error } = await supabase
        .from('pm_developer_assignments')
        .select('id, group_name, employee_id, employees(id, name, email, subsidiary_id, is_pm)')
        .eq('pm_user_id', user.id)
        .order('group_name');
      if (error) {
        console.error(error);
        return;
      }
      const people: PoolPerson[] = [];
      const ids: string[] = [];
      (data ?? []).forEach((row: { id: string; group_name: string; employee_id: string; employees: Employee | null }) => {
        const emp = row.employees;
        if (!emp || emp.is_pm) return;
        ids.push(emp.id);
        people.push({
          key: row.id,
          assignmentId: row.id,
          groupName: row.group_name,
          name: emp.name,
          email: emp.email,
          primaryEmployeeId: emp.id,
          primarySubsidiaryId: emp.subsidiary_id,
        });
      });
      setAssignedEmployeeIds(ids);
      setLockedPeople(people);
    })();
  }, [user, isPM, isAdmin]);

  useEffect(() => {
    if (user) {
      supabase.from('review_completions').select('assignment_id, employee_id').eq('reviewer_id', user.id)
        .then(({ data }) => {
          if (data) {
            setCompletedReviews(new Set(
              data.map(d => d.assignment_id ?? `legacy:${d.employee_id}`),
            ));
          }
        });
    }
  }, [user]);

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
    if (!isPM && !isAdmin) {
      toast.error('Only project managers can submit appraisals.');
      return;
    }
    const person = lockedPeople[currentPersonIdx];
    if (!person || !user) return;
    const snapshot = { ...answers };
    const employeeId = person.primaryEmployeeId;
    const assignmentId = person.assignmentId;

    setCompletedReviews(prev => {
      const n = new Set(prev);
      n.add(assignmentId);
      return n;
    });
    setPhase('person-done');
    toast.success('Feedback recorded.');

    try {
      const { data, error: e1 } = await supabase
        .from('survey_responses')
        .insert({
          employee_id: person.primaryEmployeeId,
          subsidiary_id: person.primarySubsidiaryId,
          assignment_id: assignmentId,
          reviewer_id: user.id,
        })
        .select('id').single();
      if (e1) throw e1;
      const rows = Object.entries(snapshot).map(([qid, val]) => ({
        response_id: data.id, question_id: qid,
        score: typeof val === 'number' ? val : null,
        text_answer: typeof val === 'string' ? val : null,
      }));
      const { error: e2 } = await supabase.from('survey_answers').insert(rows);
      if (e2) throw e2;
      await supabase.from('review_completions').insert({
        reviewer_id: user.id,
        employee_id: employeeId,
        assignment_id: assignmentId,
      });
      supabase.functions
        .invoke('notify-appraisal-submitted', { body: { employeeId, responseId: data.id, assignmentId } })
        .catch(err => console.error('notify-appraisal-submitted failed', err));
    } catch (err) {
      console.error(err);
      setCompletedReviews(prev => {
        const n = new Set(prev);
        n.delete(assignmentId);
        return n;
      });
      setAnswers(snapshot);
      setPhase('questions');
      toast.error('Could not save. Please try again.');
    }
  };


  // Team pulse
  useEffect(() => {
    if (activeTab === 'pulse') loadTeamPulse();
  }, [activeTab, assignedEmployeeIds]);

  const loadTeamPulse = async () => {
    if (!assignedEmployeeIds.length) {
      setTeamData({ totalReviews: 0, avgScore: 0, categories: [] });
      setTeamLoading(false);
      return;
    }
    setTeamLoading(true);
    try {
      const { data: responses } = await supabase
        .from('survey_responses')
        .select('id')
        .in('employee_id', assignedEmployeeIds);
      const responseIds = (responses ?? []).map(r => r.id);
      if (!responseIds.length) {
        setTeamData({ totalReviews: 0, avgScore: 0, categories: [] });
        return;
      }
      const { data: allAns } = await supabase
        .from('survey_answers')
        .select('score, response_id, survey_questions(survey_categories(name))')
        .in('response_id', responseIds)
        .not('score', 'is', null);
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


  const allLocked = lockedPeople.length > 0 && lockedPeople.every(p => completedReviews.has(p.assignmentId));

  const peopleByGroup = useMemo(() => {
    const map = new Map<string, { groupName: string; items: { person: PoolPerson; idx: number }[] }>();
    lockedPeople.forEach((person, idx) => {
      const entry = map.get(person.groupName) ?? { groupName: person.groupName, items: [] };
      entry.items.push({ person, idx });
      map.set(person.groupName, entry);
    });
    return Array.from(map.values()).sort((a, b) => a.groupName.localeCompare(b.groupName));
  }, [lockedPeople]);

  const loadProgress = useProgressiveBusy(loading, { quickAfterMs: 90, heavyAfterMs: 360 });
  const pulseProgress = useProgressiveBusy(teamLoading && activeTab === 'pulse', {
    quickAfterMs: 100,
    heavyAfterMs: 420,
  });

  if (loading) {
    return (
      <HubAppShell
        activeTab={activeTab}
        onTabChange={tab => setSearchParams({ tab })}
        isPM={isPM}
        userName={profile?.name}
        userEmail={profile?.email}
        onLogout={async () => { await logout(); navigate('/'); }}
      >
        {loadProgress.showQuickPulse && <QuickBusyBar />}
        {loadProgress.showHeavySkeleton ? <HubMainSkeleton /> : <div className="min-h-[45vh]" aria-hidden />}
      </HubAppShell>
    );
  }

  return (
    <HubAppShell
      activeTab={activeTab}
      onTabChange={tab => setSearchParams({ tab })}
      isPM={isPM}
      userName={profile?.name}
      userEmail={profile?.email}
      onLogout={async () => { await logout(); navigate('/'); }}
    >
      <div className="mb-3 flex justify-end">
        <AppFeedbackDialog userId={user?.id} page={activeTab} />
      </div>
          {/* ═══ APPRAISE TAB ═══ */}
          {activeTab === 'review' && (
            <AnimatePresence mode="wait">

              {/* BOX PHASE — admin-assigned roster */}
              {phase === 'box' && (
                <motion.div key="box" {...pageT}>
                  <div className="border-2 border-foreground/10 p-5 sm:p-6 mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Lock className="w-4 h-4" />
                      <h2 className="text-xl font-bold">YOUR ASSIGNED DEVELOPERS</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {lockedPeople.length === 0
                        ? 'No developers have been assigned to you yet. Contact an admin to lock in your appraisal roster.'
                        : allLocked
                        ? 'All assigned appraisals are complete. Admins have been notified per project group and will release PDFs when ready.'
                        : `${lockedPeople.length} appraisal${lockedPeople.length === 1 ? '' : 's'} across ${peopleByGroup.length} project group${peopleByGroup.length === 1 ? '' : 's'}. Click to start.`
                      }
                    </p>
                  </div>

                  <div className="space-y-6">
                    {peopleByGroup.map(group => (
                      <div key={group.groupName}>
                        <div className="label-mono mb-2 text-accent">// {group.groupName}</div>
                        <div className="space-y-2">
                          {group.items.map(({ person, idx }) => {
                            const done = completedReviews.has(person.assignmentId);
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
                                    <CheckCircle2 className="w-3.5 h-3.5" /> SUBMITTED
                                  </span>
                                ) : (
                                  <span className="mono text-[10px] text-muted-foreground">APPRAISE →</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {allLocked && lockedPeople.length > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-2 border-accent p-8 mt-6 text-center">
                      <div className="text-3xl mb-2">✓</div>
                      <h3 className="text-lg font-bold mb-1">ALL APPRAISALS COMPLETE</h3>
                      <p className="text-sm text-muted-foreground">Thank you. Admins are emailed once each project group is fully reviewed, then release reports to developers when ready.</p>
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
                      <div className="label-mono">// appraising</div>
                      <span className="mono text-xs bg-foreground text-background px-2 py-1 font-bold">
                        {currentCatIdx + 1}/{categories.length}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold mb-0.5">{currentCat.name}</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      For: <span className="font-bold text-foreground">{lockedPeople[currentPersonIdx]?.name}</span>
                      {lockedPeople[currentPersonIdx]?.groupName && (
                        <span className="text-muted-foreground"> · Project: {lockedPeople[currentPersonIdx].groupName}</span>
                      )}
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
                        <Button onClick={handleSubmit} disabled={answeredScored < totalScored} className="gap-1.5 font-bold uppercase text-xs tracking-wider">
                          <Send className="w-4 h-4" />
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
                    <h2 className="text-xl font-bold mb-2">APPRAISAL SAVED</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Your appraisal of {lockedPeople[currentPersonIdx]?.name}
                      {lockedPeople[currentPersonIdx]?.groupName ? ` (${lockedPeople[currentPersonIdx].groupName})` : ''} has been saved.
                      Admins are notified once every developer in that project group is reviewed. PDFs go to developers after admin release — your identity is not shown.
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
          )}

          {/* ═══ TEAM PULSE TAB ═══ */}
          {activeTab === 'pulse' && (
            <motion.div {...pageT} className="relative">
              {pulseProgress.showQuickPulse && <QuickBusyBar />}
              {pulseProgress.showHeavySkeleton && teamLoading ? (
                <TeamPulseSkeleton />
              ) : (
                <div className={cn('space-y-4', teamLoading && pulseProgress.showQuickPulse && 'opacity-75 transition-opacity')}>
                  <div className="border-2 border-foreground/10 p-5 sm:p-6">
                    <div className="label-mono mb-2">// team_pulse</div>
                    <h2 className="text-xl font-bold mb-1">Your Team at a Glance</h2>
                    <p className="text-sm text-muted-foreground">
                      Aggregate scores for developers assigned to you. Individual names are not shown in developer PDFs.
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
          )}
    </HubAppShell>
  );
}
