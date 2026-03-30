import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useEmployeeAuth } from '@/contexts/EmployeeAuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import VGGHeader from '@/components/VGGHeader';
import {
  CheckCircle2, ChevronRight, ChevronLeft,
  Building2, User, ClipboardList, Send, Loader2, Shield,
  BarChart3, Trophy, Star, Users, Search, X
} from 'lucide-react';
import { toast } from 'sonner';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

interface Subsidiary { id: string; name: string; }
interface Employee { id: string; name: string; role: string | null; department: string | null; subsidiary_id: string; email: string | null; }
interface Category { id: string; name: string; sort_order: number; }
interface Question { id: string; category_id: string; question_text: string; question_type: string; sort_order: number; }
interface CategoryScore { category: string; myScore: number; orgAvg: number; }
interface RankedEmployee { employee_id: string; name: string; subsidiary: string; avgScore: number; totalReviews: number; }

const SCALE_OPTIONS = [
  { value: 5, label: 'Most Likely' },
  { value: 4, label: 'Likely' },
  { value: 3, label: 'Neutral' },
  { value: 2, label: 'Unlikely' },
  { value: 1, label: 'Least Likely' },
];

const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2 },
};

export default function EmployeeHub() {
  const { user, profile, isAdmin, logout } = useEmployeeAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'survey';

  // Survey state
  const [step, setStep] = useState<'subsidiary' | 'employee' | 'questions' | 'submitted'>('subsidiary');
  const [subsidiaries, setSubsidiaries] = useState<Subsidiary[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedSubsidiary, setSelectedSubsidiary] = useState<Subsidiary | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completedEmployees, setCompletedEmployees] = useState<Set<string>>(new Set());
  const [employeeSearch, setEmployeeSearch] = useState('');

  // Dashboard state
  const [myScores, setMyScores] = useState<CategoryScore[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Rankings state
  const [rankings, setRankings] = useState<RankedEmployee[]>([]);
  const [rankingsLoading, setRankingsLoading] = useState(true);

  // All employees for department counts
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);

  // Load completions from database
  useEffect(() => {
    if (user) {
      supabase
        .from('review_completions')
        .select('employee_id')
        .eq('reviewer_id', user.id)
        .then(({ data }) => {
          if (data) setCompletedEmployees(new Set(data.map(d => d.employee_id)));
        });
    }
  }, [user]);

  const markEmployeeCompleted = async (employeeId: string) => {
    if (user) {
      await supabase.from('review_completions').insert({
        reviewer_id: user.id,
        employee_id: employeeId,
      });
    }
    setCompletedEmployees(prev => {
      const next = new Set(prev);
      next.add(employeeId);
      return next;
    });
  };

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [subRes, catRes, qRes, allEmpRes] = await Promise.all([
        supabase.from('subsidiaries').select('*').order('name'),
        supabase.from('survey_categories').select('*').order('sort_order'),
        supabase.from('survey_questions').select('*').order('sort_order'),
        supabase.from('employees').select('*').order('name'),
      ]);
      if (subRes.data) setSubsidiaries(subRes.data);
      if (catRes.data) setCategories(catRes.data);
      if (qRes.data) setQuestions(qRes.data);
      if (allEmpRes.data) setAllEmployees(allEmpRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // Load dashboard data
  useEffect(() => {
    if (activeTab === 'dashboard' && user && profile?.employee_id) {
      loadDashboardData();
    }
  }, [activeTab, user, profile]);

  const loadDashboardData = async () => {
    if (!profile?.employee_id || !user) return;
    setDashboardLoading(true);
    try {
      const { data: myResponses } = await supabase
        .from('survey_responses')
        .select('id')
        .eq('employee_id', profile.employee_id);

      if (myResponses?.length) {
        const responseIds = myResponses.map(r => r.id);
        const { data: myAnswers } = await supabase
          .from('survey_answers')
          .select('score, survey_questions(question_text, survey_categories(name))')
          .in('response_id', responseIds)
          .not('score', 'is', null);

        const { data: allAnswers } = await supabase
          .from('survey_answers')
          .select('score, survey_questions(survey_categories(name))')
          .not('score', 'is', null);

        const myCatScores: Record<string, number[]> = {};
        const orgCatScores: Record<string, number[]> = {};

        (myAnswers as any[])?.forEach(a => {
          const cat = a.survey_questions?.survey_categories?.name;
          if (cat && a.score) {
            if (!myCatScores[cat]) myCatScores[cat] = [];
            myCatScores[cat].push(a.score);
          }
        });

        (allAnswers as any[])?.forEach(a => {
          const cat = a.survey_questions?.survey_categories?.name;
          if (cat && a.score) {
            if (!orgCatScores[cat]) orgCatScores[cat] = [];
            orgCatScores[cat].push(a.score);
          }
        });

        const cats = Object.keys(myCatScores);
        setMyScores(cats.map(cat => ({
          category: cat,
          myScore: parseFloat((myCatScores[cat].reduce((a, b) => a + b, 0) / myCatScores[cat].length).toFixed(2)),
          orgAvg: orgCatScores[cat]
            ? parseFloat((orgCatScores[cat].reduce((a, b) => a + b, 0) / orgCatScores[cat].length).toFixed(2))
            : 0,
        })));
        setTotalReviews(myResponses.length);
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setDashboardLoading(false);
    }
  };

  // Load rankings
  useEffect(() => {
    if (activeTab === 'rankings') {
      loadRankings();
    }
  }, [activeTab]);

  const loadRankings = async () => {
    setRankingsLoading(true);
    try {
      const { data: emps } = await supabase.from('employees').select('id, name, subsidiaries(name)');
      const { data: responses } = await supabase.from('survey_responses').select('employee_id, survey_answers(score)');

      if (!emps || !responses) return;

      const scoreMap: Record<string, { scores: number[]; count: number }> = {};
      responses.forEach((r: any) => {
        if (!scoreMap[r.employee_id]) scoreMap[r.employee_id] = { scores: [], count: 0 };
        scoreMap[r.employee_id].count++;
        r.survey_answers?.forEach((a: any) => {
          if (a.score) scoreMap[r.employee_id].scores.push(a.score);
        });
      });

      const ranked: RankedEmployee[] = emps
        .filter((e: any) => scoreMap[e.id]?.scores.length > 0)
        .map((e: any) => ({
          employee_id: e.id,
          name: e.name,
          subsidiary: e.subsidiaries?.name || 'Unknown',
          avgScore: parseFloat((scoreMap[e.id].scores.reduce((a, b) => a + b, 0) / scoreMap[e.id].scores.length).toFixed(2)),
          totalReviews: scoreMap[e.id].count,
        }))
        .sort((a, b) => b.avgScore - a.avgScore);

      setRankings(ranked);
    } catch (err) { console.error(err); }
    finally { setRankingsLoading(false); }
  };

  // Realtime subscriptions for live data
  useEffect(() => {
    const channel = supabase
      .channel('employee-hub-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'survey_responses' }, () => {
        if (activeTab === 'dashboard') loadDashboardData();
        if (activeTab === 'rankings') loadRankings();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeTab]);

  const loadEmployees = async (subsidiaryId: string) => {
    const { data } = await supabase.from('employees').select('*').eq('subsidiary_id', subsidiaryId).order('name');
    if (data) setEmployees(data);
  };

  const handleSelectSubsidiary = (sub: Subsidiary) => {
    setSelectedSubsidiary(sub);
    loadEmployees(sub.id);
    setStep('employee');
    setEmployeeSearch('');
  };

  const handleSelectEmployee = (emp: Employee) => {
    setSelectedEmployee(emp);
    setStep('questions');
    setCurrentCategoryIndex(0);
  };

  const currentCategory = categories[currentCategoryIndex];
  const currentQuestions = currentCategory ? questions.filter(q => q.category_id === currentCategory.id) : [];

  const isCurrentCategoryComplete = () => {
    if (!currentCategory) return false;
    return currentQuestions.every(q => q.question_type === 'open_ended' || answers[q.id] !== undefined);
  };

  const totalScoredQuestions = questions.filter(q => q.question_type === 'scored').length;
  const answeredScoredQuestions = questions.filter(q => q.question_type === 'scored' && answers[q.id] !== undefined).length;
  const progress = totalScoredQuestions > 0 ? (answeredScoredQuestions / totalScoredQuestions) * 100 : 0;

  const handleSubmit = async () => {
    if (!selectedEmployee || !selectedSubsidiary) return;
    setSubmitting(true);
    try {
      const { data: responseData, error: responseError } = await supabase
        .from('survey_responses')
        .insert({ employee_id: selectedEmployee.id, subsidiary_id: selectedSubsidiary.id })
        .select('id')
        .single();
      if (responseError) throw responseError;

      const answerRows = Object.entries(answers).map(([questionId, value]) => ({
        response_id: responseData.id,
        question_id: questionId,
        score: typeof value === 'number' ? value : null,
        text_answer: typeof value === 'string' ? value : null,
      }));
      const { error: answersError } = await supabase.from('survey_answers').insert(answerRows);
      if (answersError) throw answersError;

      markEmployeeCompleted(selectedEmployee.id);
      setStep('submitted');
      toast.success('Response submitted successfully.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit. Please try again.');
    } finally { setSubmitting(false); }
  };

  // Department counts for the selected subsidiary
  const departmentCounts = useMemo(() => {
    const emps = selectedSubsidiary ? allEmployees.filter(e => e.subsidiary_id === selectedSubsidiary.id) : [];
    const counts: Record<string, number> = {};
    emps.forEach(e => {
      const dept = e.department || 'Unassigned';
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return counts;
  }, [selectedSubsidiary, allEmployees]);

  // Subsidiary employee counts
  const subsidiaryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allEmployees.forEach(e => { counts[e.subsidiary_id] = (counts[e.subsidiary_id] || 0) + 1; });
    return counts;
  }, [allEmployees]);

  // Filter employees by search
  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return employees;
    const q = employeeSearch.toLowerCase();
    return employees.filter(e =>
      e.name.toLowerCase().includes(q) ||
      (e.email && e.email.toLowerCase().includes(q)) ||
      (e.department && e.department.toLowerCase().includes(q))
    );
  }, [employees, employeeSearch]);

  // Group employees by department
  const employeesByDepartment = useMemo(() => {
    const groups: Record<string, Employee[]> = {};
    filteredEmployees.forEach(e => {
      const dept = e.department || 'Unassigned';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(e);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredEmployees]);

  const overallScore = useMemo(() => {
    if (!myScores.length) return 0;
    return parseFloat((myScores.reduce((s, c) => s + c.myScore, 0) / myScores.length).toFixed(2));
  }, [myScores]);

  const orgOverall = useMemo(() => {
    if (!myScores.length) return 0;
    return parseFloat((myScores.reduce((s, c) => s + c.orgAvg, 0) / myScores.length).toFixed(2));
  }, [myScores]);

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const handleLogout = async () => { await logout(); navigate('/'); };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Trophy className="w-5 h-5 text-warning" />;
    if (rank === 1) return <span className="text-muted-foreground font-bold">🥈</span>;
    if (rank === 2) return <span className="text-primary font-bold">🥉</span>;
    return <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-muted-foreground">{rank + 1}</span>;
  };

  const stepNumber = step === 'subsidiary' ? 1 : step === 'employee' ? 2 : step === 'questions' ? 3 : 4;

  return (
    <div className="min-h-screen bg-background">
      <VGGHeader
        subtitle={profile?.name}
        onLogout={handleLogout}
        maxWidth="max-w-4xl"
        actions={
          <>
            {isAdmin && (
              <Button variant="outline" size="sm" asChild className="h-8 text-xs gap-1.5 border-primary/30 text-primary">
                <Link to="/admin"><Shield className="w-3.5 h-3.5" /> Admin</Link>
              </Button>
            )}
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground px-2">
              <Shield className="w-3 h-3" />
              <span>Anonymous</span>
            </div>
          </>
        }
      />

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4">
        <Tabs value={activeTab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3 h-11">
            <TabsTrigger value="survey" className="gap-2 text-xs sm:text-sm">
              <ClipboardList className="w-3.5 h-3.5" /> Survey
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-2 text-xs sm:text-sm">
              <BarChart3 className="w-3.5 h-3.5" /> My Dashboard
            </TabsTrigger>
            <TabsTrigger value="rankings" className="gap-2 text-xs sm:text-sm">
              <Trophy className="w-3.5 h-3.5" /> Rankings
            </TabsTrigger>
          </TabsList>

          {/* ============ SURVEY TAB ============ */}
          <TabsContent value="survey" className="mt-4">
            {/* Step Indicator */}
            {step !== 'submitted' && (
              <div className="mb-4">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {['Company', 'Person', 'Questions'].map((label, i) => (
                    <div key={label} className="flex items-center gap-1.5 sm:gap-2 flex-1">
                      <div className={`w-8 h-8 rounded-xl text-xs font-bold flex items-center justify-center transition-all duration-300 shadow-sm ${
                        i + 1 < stepNumber ? 'bg-primary text-primary-foreground shadow-primary/20'
                        : i + 1 === stepNumber ? 'bg-primary text-primary-foreground shadow-primary/20'
                        : 'bg-muted text-muted-foreground'
                      }`}>
                        {i + 1 < stepNumber ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                      </div>
                      <span className={`text-xs hidden sm:block font-medium ${i + 1 <= stepNumber ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {label}
                      </span>
                      {i < 2 && <div className={`flex-1 h-0.5 rounded-full ${i + 1 < stepNumber ? 'bg-primary' : 'bg-border'}`} />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {step === 'questions' && (
              <div className="mb-4">
                <div className="flex justify-between text-[11px] text-muted-foreground mb-2 font-medium">
                  <span>Section {currentCategoryIndex + 1} of {categories.length} — {currentCategory?.name}</span>
                  <span className="text-primary font-bold">{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.4, ease: 'easeOut' }} />
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              {/* Step 1: Subsidiary */}
              {step === 'subsidiary' && (
                <motion.div key="subsidiary" {...pageTransition}>
                  <div className="glass-panel p-6 sm:p-8">
                    <div className="mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                        <Building2 className="w-6 h-6 text-primary" />
                      </div>
                      <h2 className="text-xl font-bold mb-1">Select Company</h2>
                      <p className="text-muted-foreground text-sm">Choose the subsidiary of the person you would like to review.</p>
                    </div>
                    <div className="grid gap-2.5">
                      {subsidiaries.map(sub => (
                        <button
                          key={sub.id}
                          onClick={() => handleSelectSubsidiary(sub)}
                          className="flex items-center justify-between p-4 rounded-2xl border-2 border-border bg-background hover:bg-muted/50 hover:border-primary/30 hover:shadow-md transition-all duration-200 text-left group"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-sm">{sub.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                              {subsidiaryCounts[sub.id] || 0} people
                            </Badge>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Employee with department badges */}
              {step === 'employee' && (
                <motion.div key="employee" {...pageTransition}>
                  <div className="glass-panel p-6 sm:p-8">
                    <button onClick={() => setStep('subsidiary')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors font-medium">
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    <div className="mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
                        <User className="w-6 h-6 text-accent" />
                      </div>
                      <h2 className="text-xl font-bold mb-1">Select Person to Review</h2>
                      <p className="text-muted-foreground text-sm">{selectedSubsidiary?.name}</p>
                    </div>

                    {/* Department badges */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {Object.entries(departmentCounts).map(([dept, count]) => (
                        <Badge key={dept} variant="outline" className="text-[10px] gap-1">
                          {dept} <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-bold">{count}</span>
                        </Badge>
                      ))}
                    </div>

                    {/* Search */}
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, email, or department..."
                        value={employeeSearch}
                        onChange={e => setEmployeeSearch(e.target.value)}
                        className="pl-10 h-10"
                      />
                      {employeeSearch && (
                        <button onClick={() => setEmployeeSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                          <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                      )}
                    </div>

                    <div className="max-h-[55vh] overflow-y-auto scrollbar-thin pr-1 space-y-4">
                      {employeesByDepartment.map(([dept, emps]) => (
                        <div key={dept}>
                          <div className="flex items-center gap-2 mb-2 sticky top-0 bg-card/95 backdrop-blur-sm py-1 z-10">
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{dept}</h3>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{emps.length}</Badge>
                          </div>
                          <div className="grid gap-1.5">
                            {emps.map(emp => {
                              const isCompleted = completedEmployees.has(emp.id);
                              return (
                                <button
                                  key={emp.id}
                                  onClick={() => !isCompleted && handleSelectEmployee(emp)}
                                  disabled={isCompleted}
                                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 text-left group ${
                                    isCompleted
                                      ? 'border-primary/15 bg-primary/[0.03] cursor-not-allowed opacity-60'
                                      : 'border-border bg-background hover:bg-muted/50 hover:border-primary/30 hover:shadow-sm'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                                      isCompleted ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                                    }`}>
                                      {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </div>
                                    <div>
                                      <span className={`font-medium text-sm block ${isCompleted ? 'text-muted-foreground line-through' : ''}`}>{emp.name}</span>
                                      {emp.role && <span className="text-xs text-muted-foreground">{emp.role}</span>}
                                    </div>
                                  </div>
                                  {isCompleted ? (
                                    <div className="flex items-center gap-1.5 text-primary">
                                      <span className="text-[10px] font-semibold">Reviewed</span>
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    </div>
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      {filteredEmployees.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          No employees match your search.
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Questions */}
              {step === 'questions' && currentCategory && (
                <motion.div key={`cat-${currentCategoryIndex}`} {...pageTransition}>
                  <div className="glass-panel p-6 sm:p-8">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <ClipboardList className="w-5 h-5 text-primary" />
                        </div>
                        <h2 className="text-lg font-bold">{currentCategory.name}</h2>
                      </div>
                      <span className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-xl font-bold">
                        {currentCategoryIndex + 1} / {categories.length}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-6 ml-[52px]">
                      Reviewing: <span className="text-foreground font-semibold">{selectedEmployee?.name}</span>
                      {selectedEmployee?.role && <span className="text-muted-foreground"> — {selectedEmployee.role}</span>}
                    </p>

                    {/* Scale Legend */}
                    {currentCategory.sort_order < 8 && (
                      <div className="flex flex-wrap gap-x-5 gap-y-2 mb-8 p-4 rounded-2xl bg-muted/40 border border-border/60 text-xs text-muted-foreground">
                        {SCALE_OPTIONS.map(s => (
                          <span key={s.value} className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-center leading-6 font-bold text-xs">{s.value}</span>
                            <span className="font-medium">{s.label}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="space-y-8">
                      {currentQuestions.map((q, qi) => (
                        <motion.div
                          key={q.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: qi * 0.05 }}
                          className="p-4 rounded-2xl bg-muted/20 border border-border/40"
                        >
                          <p className="text-sm leading-relaxed mb-4 font-medium">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-bold mr-2">{qi + 1}</span>
                            {q.question_text}
                          </p>
                          {q.question_type === 'scored' ? (
                            <div className="flex gap-2">
                              {SCALE_OPTIONS.map(s => (
                                <button
                                  key={s.value}
                                  onClick={() => setAnswers(prev => ({ ...prev, [q.id]: s.value }))}
                                  className={`flex-1 py-3 rounded-xl border-2 text-center transition-all duration-200 ${
                                    answers[q.id] === s.value
                                      ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 -translate-y-0.5'
                                      : 'border-border bg-background text-muted-foreground hover:bg-muted/50 hover:border-primary/30'
                                  }`}
                                >
                                  <div className="text-sm font-bold">{s.value}</div>
                                  <div className="text-[10px] mt-0.5 hidden sm:block opacity-80 font-medium">{s.label}</div>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <Textarea
                              placeholder="Share your thoughts..."
                              value={(answers[q.id] as string) || ''}
                              onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                              className="bg-background border-2 border-border rounded-xl min-h-[100px] text-sm resize-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all duration-200"
                            />
                          )}
                        </motion.div>
                      ))}
                    </div>

                    <div className="flex justify-between mt-8 pt-6 border-t border-border/60">
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (currentCategoryIndex === 0) setStep('employee');
                          else setCurrentCategoryIndex(prev => prev - 1);
                        }}
                        className="gap-1.5"
                      >
                        <ChevronLeft className="w-4 h-4" /> Previous
                      </Button>
                      {currentCategoryIndex < categories.length - 1 ? (
                        <Button
                          onClick={() => setCurrentCategoryIndex(prev => prev + 1)}
                          disabled={currentCategory.sort_order < 8 && !isCurrentCategoryComplete()}
                          className="gap-1.5"
                        >
                          Next Section <ChevronRight className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          onClick={handleSubmit}
                          disabled={submitting || answeredScoredQuestions < totalScoredQuestions}
                          className="gap-1.5"
                        >
                          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          Submit Response
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Submitted */}
              {step === 'submitted' && (
                <motion.div key="submitted" {...pageTransition}>
                  <div className="glass-panel p-10 sm:p-14 text-center max-w-md mx-auto">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, delay: 0.15 }}
                      className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-6"
                    >
                      <CheckCircle2 className="w-10 h-10 text-primary" />
                    </motion.div>
                    <h2 className="text-2xl font-bold mb-3">Thank You!</h2>
                    <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                      Your anonymous feedback has been recorded successfully.
                    </p>
                    <Button
                      size="lg"
                      onClick={() => {
                        setStep('subsidiary');
                        setSelectedSubsidiary(null);
                        setSelectedEmployee(null);
                        setAnswers({});
                        setCurrentCategoryIndex(0);
                      }}
                      className="gap-2"
                    >
                      Review Another Person <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* ============ DASHBOARD TAB ============ */}
          <TabsContent value="dashboard" className="mt-4">
            <motion.div {...pageTransition}>
              {dashboardLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Stats row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Star className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Your Overall Score</p>
                          <p className="text-2xl font-bold">{overallScore}<span className="text-sm font-normal text-muted-foreground">/5</span></p>
                        </div>
                      </div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                          <BarChart3 className="w-4 h-4 text-accent" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Organisation Average</p>
                          <p className="text-2xl font-bold">{orgOverall}<span className="text-sm font-normal text-muted-foreground">/5</span></p>
                        </div>
                      </div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Users className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Reviews Received</p>
                          <p className="text-2xl font-bold">{totalReviews}</p>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {myScores.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-muted-foreground rounded" /> Org Average</span>
                        </div>
                      </motion.div>

                      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-panel p-6">
                        <h2 className="text-sm font-semibold mb-4">Score Comparison by Category</h2>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={myScores} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                            <YAxis dataKey="category" type="category" width={100} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
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
                      <p className="text-muted-foreground text-sm">Your colleagues haven't submitted reviews for you yet. Check back later.</p>
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>
          </TabsContent>

          {/* ============ RANKINGS TAB ============ */}
          <TabsContent value="rankings" className="mt-4">
            <motion.div {...pageTransition}>
              {rankingsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <div>
                  <div className="text-center mb-6">
                    <h1 className="text-xl font-bold mb-1">Performance Rankings</h1>
                    <p className="text-muted-foreground text-sm">Top performers based on peer review scores.</p>
                  </div>

                  {/* Top 3 podium */}
                  {rankings.length >= 3 && (
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      {[1, 0, 2].map(idx => {
                        const person = rankings[idx];
                        const isFirst = idx === 0;
                        return (
                          <motion.div
                            key={person.employee_id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + idx * 0.1 }}
                            className={`glass-panel p-4 text-center ${isFirst ? 'sm:-mt-4 border-primary/30 bg-primary/5' : ''}`}
                          >
                            <div className="mb-2">{getRankIcon(idx)}</div>
                            <div className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center ${
                              isFirst ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                            }`}>
                              <span className="font-bold text-xs">{person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                            </div>
                            <p className="text-sm font-semibold truncate">{person.name}</p>
                            <p className="text-[10px] text-muted-foreground mb-1">{person.subsidiary}</p>
                            <div className="flex items-center justify-center gap-1">
                              <Star className="w-3 h-3 text-primary" />
                              <span className="text-sm font-bold text-primary">{person.avgScore}</span>
                              <span className="text-[10px] text-muted-foreground">/5</span>
                            </div>
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
                          transition={{ delay: 0.03 * Math.min(i, 20) }}
                          className={`flex items-center gap-4 px-4 py-3 ${isMe ? 'bg-primary/5' : ''}`}
                        >
                          <div className="w-7 flex-shrink-0 text-center">{getRankIcon(i)}</div>
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-semibold text-muted-foreground">{person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {person.name}
                              {isMe && <span className="ml-1.5 text-xs text-primary font-normal">(You)</span>}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{person.subsidiary}</p>
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
                        <p className="text-muted-foreground text-sm">Rankings will appear once reviews are submitted.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
