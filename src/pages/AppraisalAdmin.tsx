import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeAuth } from '@/contexts/EmployeeAuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AIChatPanel from '@/components/dashboard/AIChatPanel';
import VGGHeader from '@/components/VGGHeader';
import {
  BarChart3, Users, Building2, ClipboardCheck, ArrowLeft, RefreshCw,
  TrendingUp, Clock, ChevronDown, ChevronUp, Loader2, Zap, Search,
  Star, Target, Trophy, Activity, Brain
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend,
} from 'recharts';

interface ResponseRow { id: string; employee_id: string; subsidiary_id: string; created_at: string; }
interface AnswerRow { id: string; response_id: string; question_id: string; score: number | null; text_answer: string | null; }
interface EmployeeRow { id: string; name: string; role: string | null; department: string | null; subsidiary_id: string; }
interface SubsidiaryRow { id: string; name: string; }
interface CategoryRow { id: string; name: string; sort_order: number; }
interface QuestionRow { id: string; category_id: string; question_text: string; question_type: string; sort_order: number; }

const CHART_COLORS = [
  'hsl(0, 0%, 15%)', 'hsl(0, 0%, 35%)', 'hsl(0, 0%, 55%)',
  'hsl(0, 0%, 70%)', 'hsl(0, 65%, 50%)', 'hsl(0, 0%, 45%)',
  'hsl(0, 0%, 25%)', 'hsl(0, 0%, 60%)',
];

export default function AppraisalAdmin() {
  const { logout: legacyLogout } = useAuth();
  const { logout: employeeLogout } = useEmployeeAuth();
  const navigate = useNavigate();
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [subsidiaries, setSubsidiaries] = useState<SubsidiaryRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubsidiary, setSelectedSubsidiary] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [adminTab, setAdminTab] = useState('overview');

  useEffect(() => {
    loadAllData();
    const channel = supabase
      .channel('admin-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'survey_responses' }, (payload) => {
        setResponses(prev => [payload.new as ResponseRow, ...prev]);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'survey_answers' }, (payload) => {
        setAnswers(prev => [...prev, payload.new as AnswerRow]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [resRes, ansRes, empRes, subRes, catRes, qRes] = await Promise.all([
        supabase.from('survey_responses').select('*').order('created_at', { ascending: false }),
        supabase.from('survey_answers').select('*'),
        supabase.from('employees').select('*').order('name'),
        supabase.from('subsidiaries').select('*').order('name'),
        supabase.from('survey_categories').select('*').order('sort_order'),
        supabase.from('survey_questions').select('*').order('sort_order'),
      ]);
      if (resRes.data) setResponses(resRes.data);
      if (ansRes.data) setAnswers(ansRes.data);
      if (empRes.data) setEmployees(empRes.data);
      if (subRes.data) setSubsidiaries(subRes.data);
      if (catRes.data) setCategories(catRes.data);
      if (qRes.data) setQuestions(qRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || 'Unknown';
  const getSubsidiaryName = (id: string) => subsidiaries.find(s => s.id === id)?.name || 'Unknown';
  const getQuestionText = (id: string) => questions.find(q => q.id === id)?.question_text || '';

  const filteredResponses = useMemo(() => {
    let filtered = responses;
    if (selectedSubsidiary !== 'all') filtered = filtered.filter(r => r.subsidiary_id === selectedSubsidiary);
    if (selectedEmployee) filtered = filtered.filter(r => r.employee_id === selectedEmployee);
    return filtered;
  }, [responses, selectedSubsidiary, selectedEmployee]);

  const filteredResponseIds = useMemo(() => new Set(filteredResponses.map(r => r.id)), [filteredResponses]);
  const filteredAnswers = useMemo(() => answers.filter(a => filteredResponseIds.has(a.response_id)), [answers, filteredResponseIds]);

  const totalResponses = filteredResponses.length;
  const uniqueReviewees = new Set(filteredResponses.map(r => r.employee_id)).size;
  const totalEmployees = employees.length;
  const participationRate = totalEmployees > 0 ? Math.round((uniqueReviewees / totalEmployees) * 100) : 0;

  const avgOverallScore = useMemo(() => {
    const scored = filteredAnswers.filter(a => a.score !== null);
    if (scored.length === 0) return 0;
    return scored.reduce((sum, a) => sum + (a.score || 0), 0) / scored.length;
  }, [filteredAnswers]);

  // Subsidiary breakdown
  const subsidiaryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredResponses.forEach(r => {
      const name = getSubsidiaryName(r.subsidiary_id);
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [filteredResponses, subsidiaries]);

  // Category averages
  const categoryAverages = useMemo(() => {
    const scoredCategories = categories.filter(c => c.sort_order < 8);
    return scoredCategories.map(cat => {
      const catQuestionIds = new Set(questions.filter(q => q.category_id === cat.id).map(q => q.id));
      const catAnswers = filteredAnswers.filter(a => catQuestionIds.has(a.question_id) && a.score !== null);
      const avg = catAnswers.length > 0 ? catAnswers.reduce((sum, a) => sum + (a.score || 0), 0) / catAnswers.length : 0;
      return { name: cat.name.split('&')[0].trim().substring(0, 18), fullName: cat.name, avg: parseFloat(avg.toFixed(2)), fullMark: 5 };
    });
  }, [filteredAnswers, categories, questions]);

  // Top employees
  const employeeLeaderboard = useMemo(() => {
    const counts: Record<string, { name: string; role: string; department: string; subsidiary: string; count: number; avgScore: number }> = {};
    filteredResponses.forEach(r => {
      const emp = employees.find(e => e.id === r.employee_id);
      if (!emp) return;
      if (!counts[r.employee_id]) {
        counts[r.employee_id] = {
          name: emp.name, role: emp.role || '', department: emp.department || '',
          subsidiary: getSubsidiaryName(emp.subsidiary_id), count: 0, avgScore: 0,
        };
      }
      counts[r.employee_id].count++;
    });
    Object.keys(counts).forEach(empId => {
      const empResponseIds = new Set(filteredResponses.filter(r => r.employee_id === empId).map(r => r.id));
      const empAnswers = answers.filter(a => empResponseIds.has(a.response_id) && a.score !== null);
      counts[empId].avgScore = empAnswers.length > 0
        ? parseFloat((empAnswers.reduce((s, a) => s + (a.score || 0), 0) / empAnswers.length).toFixed(2)) : 0;
    });
    let results = Object.values(counts).sort((a, b) => b.avgScore - a.avgScore);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      results = results.filter(e => e.name.toLowerCase().includes(q) || e.department.toLowerCase().includes(q));
    }
    return results;
  }, [filteredResponses, employees, answers, searchQuery]);

  // Response timeline (last 7 days)
  const responseTimeline = useMemo(() => {
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days[d.toISOString().split('T')[0]] = 0;
    }
    responses.forEach(r => {
      const day = r.created_at.split('T')[0];
      if (days[day] !== undefined) days[day]++;
    });
    return Object.entries(days).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }),
      responses: count,
    }));
  }, [responses]);

  // Score distribution
  const scoreDistribution = useMemo(() => {
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    filteredAnswers.forEach(a => { if (a.score && dist[a.score] !== undefined) dist[a.score]++; });
    return Object.entries(dist).map(([score, count]) => ({ score: `Score ${score}`, count }));
  }, [filteredAnswers]);

  // Department breakdown
  const departmentBreakdown = useMemo(() => {
    const deptCounts: Record<string, { responses: number; avgScore: number; scores: number[] }> = {};
    filteredResponses.forEach(r => {
      const emp = employees.find(e => e.id === r.employee_id);
      const dept = emp?.department || 'Unassigned';
      if (!deptCounts[dept]) deptCounts[dept] = { responses: 0, avgScore: 0, scores: [] };
      deptCounts[dept].responses++;
      const respAnswers = answers.filter(a => a.response_id === r.id && a.score !== null);
      respAnswers.forEach(a => deptCounts[dept].scores.push(a.score!));
    });
    return Object.entries(deptCounts).map(([dept, data]) => ({
      department: dept.substring(0, 20),
      responses: data.responses,
      avgScore: data.scores.length > 0 ? parseFloat((data.scores.reduce((a, b) => a + b, 0) / data.scores.length).toFixed(2)) : 0,
    })).sort((a, b) => b.responses - a.responses).slice(0, 12);
  }, [filteredResponses, employees, answers]);

  // AI data context
  const dataContext = useMemo(() => {
    if (!responses.length) return '';
    const topEmployees = employeeLeaderboard.slice(0, 20).map(e =>
      `• ${e.name} (${e.subsidiary}${e.department ? ', ' + e.department : ''}): Score ${e.avgScore}/5, ${e.count} reviews`
    ).join('\n');

    const catData = categoryAverages.map(c => `• ${c.fullName}: ${c.avg}/5`).join('\n');
    const subData = subsidiaryBreakdown.map(s => `• ${s.name}: ${s.count} responses`).join('\n');
    const deptData = departmentBreakdown.map(d => `• ${d.department}: ${d.responses} responses, avg ${d.avgScore}/5`).join('\n');

    // Get open-ended feedback
    const textAnswers = answers.filter(a => a.text_answer).slice(0, 30);
    const feedbackSample = textAnswers.map(a => {
      const qText = getQuestionText(a.question_id);
      return `• [${qText}]: "${a.text_answer}"`;
    }).join('\n');

    return `=== ProDG 360° REVIEW ANALYTICS ===

SUMMARY:
• Total Responses: ${totalResponses}
• People Reviewed: ${uniqueReviewees} of ${totalEmployees} employees
• Participation Rate: ${participationRate}%
• Organisation Average Score: ${avgOverallScore.toFixed(2)}/5.0

CATEGORY SCORES:
${catData}

TOP PERFORMERS:
${topEmployees}

RESPONSES BY SUBSIDIARY:
${subData}

RESPONSES BY DEPARTMENT:
${deptData}

SAMPLE QUALITATIVE FEEDBACK:
${feedbackSample || '• No text feedback yet'}`;
  }, [responses, employeeLeaderboard, categoryAverages, subsidiaryBreakdown, departmentBreakdown, answers]);

  const filteredEmployees = useMemo(() => {
    if (selectedSubsidiary === 'all') return employees;
    return employees.filter(e => e.subsidiary_id === selectedSubsidiary);
  }, [employees, selectedSubsidiary]);

  const getResponseAnswers = (responseId: string) => answers.filter(a => a.response_id === responseId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="gap-1 flex-shrink-0">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Button>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-primary flex items-center gap-2">
                360° Appraisal Monitor
                {totalResponses > 0 && (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Live
                  </Badge>
                )}
              </h1>
              <p className="text-xs text-muted-foreground">Real-time response tracking & analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={loadAllData} className="gap-1">
              <RefreshCw className="w-3 h-3" /> Refresh
            </Button>
            <Button onClick={() => setChatOpen(true)} size="sm" className="gap-2 h-8 text-xs">
              <Brain className="w-3.5 h-3.5" /> AI Copilot
            </Button>
            <Button variant="ghost" size="sm" onClick={async () => { legacyLogout(); await employeeLogout(); navigate('/'); }}>
              <span className="text-xs">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-start sm:items-center">
          <Select value={selectedSubsidiary} onValueChange={v => { setSelectedSubsidiary(v); setSelectedEmployee(null); }}>
            <SelectTrigger className="w-full sm:w-[200px] bg-secondary/50">
              <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All Subsidiaries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subsidiaries</SelectItem>
              {subsidiaries.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedEmployee || 'all'} onValueChange={v => setSelectedEmployee(v === 'all' ? null : v)}>
            <SelectTrigger className="w-full sm:w-[220px] bg-secondary/50">
              <Users className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {filteredEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total Responses', value: totalResponses, icon: ClipboardCheck, color: 'bg-primary/10 text-primary' },
            { label: 'People Reviewed', value: uniqueReviewees, icon: Users, color: 'bg-accent/10 text-accent' },
            { label: 'Total Employees', value: totalEmployees, icon: Target, color: 'bg-muted text-foreground' },
            { label: 'Participation', value: `${participationRate}%`, icon: Activity, color: 'bg-success/10 text-success' },
            { label: 'Avg Score', value: `${avgOverallScore.toFixed(2)}/5`, icon: TrendingUp, color: 'bg-primary/10 text-primary' },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-panel p-4">
              <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center mb-2`}>
                <stat.icon className="w-4 h-4" />
              </div>
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {totalResponses === 0 ? (
          <div className="glass-panel p-12 text-center">
            <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Responses Yet</h3>
            <p className="text-muted-foreground text-sm mb-4">Share the survey link to start collecting feedback.</p>
            <Button onClick={() => { navigator.clipboard.writeText(window.location.origin + '/hub'); }} className="bg-primary hover:bg-primary/90">
              Copy Survey Link
            </Button>
          </div>
        ) : (
          <Tabs value={adminTab} onValueChange={setAdminTab}>
            <TabsList className="grid w-full grid-cols-4 h-10">
              <TabsTrigger value="overview" className="text-xs gap-1.5"><BarChart3 className="w-3 h-3" /> Overview</TabsTrigger>
              <TabsTrigger value="people" className="text-xs gap-1.5"><Users className="w-3 h-3" /> People</TabsTrigger>
              <TabsTrigger value="trends" className="text-xs gap-1.5"><TrendingUp className="w-3 h-3" /> Trends</TabsTrigger>
              <TabsTrigger value="feed" className="text-xs gap-1.5"><Clock className="w-3 h-3" /> Live Feed</TabsTrigger>
            </TabsList>

            {/* ===== OVERVIEW TAB ===== */}
            <TabsContent value="overview" className="mt-4 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Subsidiary pie */}
                <div className="glass-panel p-5">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" /> Responses by Subsidiary
                  </h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={subsidiaryBreakdown} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, count }) => `${name}: ${count}`} labelLine>
                        {subsidiaryBreakdown.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Category radar */}
                <div className="glass-panel p-5">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-accent" /> Category Averages
                  </h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={categoryAverages}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                      <PolarRadiusAxis domain={[0, 5]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                      <Radar name="Average" dataKey="avg" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Score distribution */}
                <div className="glass-panel p-5">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" /> Score Distribution
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={scoreDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="score" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Department performance */}
                <div className="glass-panel p-5">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <Target className="w-4 h-4 text-accent" /> Department Performance
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={departmentBreakdown} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis dataKey="department" type="category" width={120} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="avgScore" name="Avg Score" fill="hsl(var(--accent))" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>

            {/* ===== PEOPLE TAB ===== */}
            <TabsContent value="people" className="mt-4">
              <div className="glass-panel p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-primary" /> Employee Leaderboard
                  </h3>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search employees..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 h-9 text-sm" />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium text-xs">#</th>
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium text-xs">Name</th>
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium text-xs">Department</th>
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium text-xs">Subsidiary</th>
                        <th className="text-center py-2 px-3 text-muted-foreground font-medium text-xs">Reviews</th>
                        <th className="text-center py-2 px-3 text-muted-foreground font-medium text-xs">Avg Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeeLeaderboard.map((emp, i) => (
                        <motion.tr
                          key={i}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          className="border-b border-border/20 hover:bg-secondary/30 transition-colors"
                        >
                          <td className="py-2.5 px-3">
                            {i < 3 ? (
                              <span className={`text-sm ${i === 0 ? 'text-warning' : i === 1 ? 'text-muted-foreground' : 'text-primary'}`}>
                                {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">{i + 1}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div>
                              <span className="font-medium text-sm">{emp.name}</span>
                              {emp.role && <span className="block text-[10px] text-muted-foreground">{emp.role}</span>}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground text-xs">{emp.department || '—'}</td>
                          <td className="py-2.5 px-3 text-muted-foreground text-xs">{emp.subsidiary}</td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge variant="secondary" className="text-[10px]">{emp.count}</Badge>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Star className="w-3 h-3 text-primary" />
                              <span className={`font-semibold text-sm ${
                                emp.avgScore >= 4 ? 'text-success' : emp.avgScore >= 3 ? 'text-primary' : emp.avgScore >= 2 ? 'text-warning' : 'text-destructive'
                              }`}>{emp.avgScore}</span>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* ===== TRENDS TAB ===== */}
            <TabsContent value="trends" className="mt-4 space-y-6">
              <div className="glass-panel p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" /> Response Timeline (Last 7 Days)
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={responseTimeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="responses" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Subsidiary comparison bar */}
                <div className="glass-panel p-5">
                  <h3 className="text-sm font-semibold mb-4">Subsidiary Response Volume</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={subsidiaryBreakdown.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="count" fill="hsl(var(--accent))" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Category comparison detailed */}
                <div className="glass-panel p-5">
                  <h3 className="text-sm font-semibold mb-4">Category Score Breakdown</h3>
                  <div className="space-y-3">
                    {categoryAverages.map((cat, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-[140px] truncate">{cat.fullName}</span>
                        <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(cat.avg / 5) * 100}%` }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                          />
                        </div>
                        <span className="text-xs font-bold w-10 text-right">{cat.avg}/5</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ===== LIVE FEED TAB ===== */}
            <TabsContent value="feed" className="mt-4">
              <div className="glass-panel p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-accent" /> Recent Responses
                  <Badge variant="secondary" className="text-[10px]">{filteredResponses.length} total</Badge>
                </h3>
                <div className="space-y-2 max-h-[65vh] overflow-y-auto scrollbar-thin">
                  {filteredResponses.slice(0, 50).map(r => {
                    const isExpanded = expandedResponse === r.id;
                    const responseAnswers = isExpanded ? getResponseAnswers(r.id) : [];
                    return (
                      <div key={r.id} className="border border-border/30 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setExpandedResponse(isExpanded ? null : r.id)}
                          className="w-full flex items-center justify-between p-3 hover:bg-secondary/30 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <div>
                              <span className="font-medium text-sm">{getEmployeeName(r.employee_id)}</span>
                              <span className="text-muted-foreground text-xs ml-2">{getSubsidiaryName(r.subsidiary_id)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {new Date(r.created_at).toLocaleDateString()} {new Date(r.created_at).toLocaleTimeString()}
                            </span>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </button>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="border-t border-border/30 p-3 bg-secondary/10"
                          >
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              {categories.filter(c => c.sort_order < 8).map(cat => {
                                const catQuestions = questions.filter(q => q.category_id === cat.id);
                                const catAnswered = responseAnswers.filter(a => catQuestions.some(q => q.id === a.question_id));
                                if (catAnswered.length === 0) return null;
                                const scored = catAnswered.filter(a => a.score);
                                const catAvg = scored.length > 0 ? scored.reduce((s, a) => s + (a.score || 0), 0) / scored.length : 0;
                                return (
                                  <div key={cat.id} className="flex items-center justify-between py-1 text-xs">
                                    <span className="text-muted-foreground">{cat.name}</span>
                                    <span className={`font-semibold ${
                                      catAvg >= 4 ? 'text-success' : catAvg >= 3 ? 'text-primary' : catAvg >= 2 ? 'text-warning' : 'text-destructive'
                                    }`}>{catAvg.toFixed(1)}/5</span>
                                  </div>
                                );
                              })}
                              {responseAnswers.filter(a => a.text_answer).map(a => (
                                <div key={a.id} className="mt-2 p-2 rounded bg-secondary/20 text-xs">
                                  <p className="text-muted-foreground mb-1">{getQuestionText(a.question_id)}</p>
                                  <p className="text-foreground">{a.text_answer}</p>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>

      <AIChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} dataContext={dataContext} />
    </div>
  );
}
