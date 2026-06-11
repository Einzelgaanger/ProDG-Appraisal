import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeAuth } from '@/contexts/EmployeeAuthContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PMAssignmentsPanel from '@/components/admin/PMAssignmentsPanel';
import AdminReleasePanel from '@/components/admin/AdminReleasePanel';
import { AppraisalAdminSkeleton, QuickBusyBar } from '@/components/loading/ContentSkeletons';
import { useProgressiveBusy } from '@/hooks/useProgressiveBusy';
import { LogOut, UserCog, Send, RefreshCw, FolderOpen, Clock } from 'lucide-react';
import prodgLogo from '@/assets/prodg-logo.png';

interface ResponseRow {
  id: string;
  employee_id: string;
  subsidiary_id: string;
  assignment_id: string | null;
  reviewer_id: string | null;
  created_at: string;
  released_at: string | null;
}
interface AssignmentRow { id: string; group_name: string; pm_user_id: string; }
interface ProfileRow { id: string; name: string; }
interface AnswerRow { id: string; response_id: string; question_id: string; score: number | null; text_answer: string | null; }
interface EmployeeRow { id: string; name: string; role: string | null; department: string | null; subsidiary_id: string; }
interface CategoryRow { id: string; name: string; sort_order: number; }
interface QuestionRow { id: string; category_id: string; question_text: string; question_type: string; sort_order: number; }

const PRODG_SUBSIDIARY = 'ProDG';

export default function AppraisalAdmin() {
  const { logout: legacyLogout } = useAuth();
  const { logout: employeeLogout, profile } = useEmployeeAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const adminTab = searchParams.get('tab') === 'release' ? 'release' : 'assignments';

  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [reviewerProfiles, setReviewerProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [prodgSubsidiaryId, setProdgSubsidiaryId] = useState<string | null>(null);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const { data: sub } = await supabase
        .from('subsidiaries')
        .select('id')
        .eq('name', PRODG_SUBSIDIARY)
        .maybeSingle();

      const subsidiaryId = sub?.id ?? null;
      setProdgSubsidiaryId(subsidiaryId);

      const employeeQuery = subsidiaryId
        ? supabase.from('employees').select('*').eq('subsidiary_id', subsidiaryId).order('name')
        : supabase.from('employees').select('*').order('name');

      const responseQuery = subsidiaryId
        ? supabase.from('survey_responses').select('*').eq('subsidiary_id', subsidiaryId).order('created_at', { ascending: false })
        : supabase.from('survey_responses').select('*').order('created_at', { ascending: false });

      const [resRes, empRes, catRes, qRes, assignRes] = await Promise.all([
        responseQuery,
        employeeQuery,
        supabase.from('survey_categories').select('*').order('sort_order'),
        supabase.from('survey_questions').select('*').order('sort_order'),
        supabase.from('pm_developer_assignments').select('id, group_name, pm_user_id'),
      ]);

      const responseRows = (resRes.data ?? []) as ResponseRow[];
      setResponses(responseRows);
      setEmployees((empRes.data ?? []) as EmployeeRow[]);
      setCategories((catRes.data ?? []) as CategoryRow[]);
      setQuestions((qRes.data ?? []) as QuestionRow[]);
      setAssignments((assignRes.data ?? []) as AssignmentRow[]);

      if (responseRows.length) {
        const responseIds = responseRows.map((r) => r.id);
        const { data: ansData } = await supabase.from('survey_answers').select('*').in('response_id', responseIds);
        setAnswers((ansData ?? []) as AnswerRow[]);

        const reviewerIds = [...new Set(responseRows.map((r) => r.reviewer_id).filter(Boolean))] as string[];
        if (reviewerIds.length) {
          const { data: profs } = await supabase.from('profiles').select('id, name').in('id', reviewerIds);
          setReviewerProfiles((profs ?? []) as ProfileRow[]);
        } else {
          setReviewerProfiles([]);
        }
      } else {
        setAnswers([]);
        setReviewerProfiles([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    const channel = supabase
      .channel('admin-release-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'survey_responses' }, () => {
        loadAllData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const pendingReleaseCount = useMemo(
    () => responses.filter((r) => !r.released_at).length,
    [responses],
  );

  const assignmentGroupCount = useMemo(() => {
    const keys = new Set(assignments.map((a) => `${a.pm_user_id}::${a.group_name}`));
    return keys.size;
  }, [assignments]);

  const releasedCount = useMemo(
    () => responses.filter((r) => r.released_at).length,
    [responses],
  );

  const loadProgress = useProgressiveBusy(loading, { quickAfterMs: 100, heavyAfterMs: 340 });

  const setAdminTab = (tab: 'assignments' | 'release') => {
    setSearchParams(tab === 'release' ? { tab: 'release' } : {});
  };

  const handleSignOut = async () => {
    legacyLogout();
    await employeeLogout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {loadProgress.showQuickPulse && loading && <QuickBusyBar />}
      {loading && loadProgress.showHeavySkeleton ? (
        <AppraisalAdminSkeleton />
      ) : loading ? (
        <div className="min-h-[70vh]" aria-busy="true" />
      ) : (
        <>
          <header className="sticky top-0 z-50 border-b-2 border-foreground/10 bg-background/95 backdrop-blur-sm">
            <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <img src={prodgLogo} alt="" className="h-9 w-9" />
                <div>
                  <p className="text-lg font-bold tracking-tight">ProDG Admin</p>
                  <p className="label-mono text-[10px] text-muted-foreground">
                    Assign PMs · Release developer PDFs
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {profile?.name && (
                  <span className="mono hidden text-[10px] text-muted-foreground sm:inline">{profile.name}</span>
                )}
                <Button variant="outline" size="sm" onClick={loadAllData} className="gap-1 border-2">
                  <RefreshCw className="h-3 w-3" /> Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-1 border-2">
                  <LogOut className="h-3 w-3" /> Sign out
                </Button>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: 'Project groups', value: assignmentGroupCount, icon: FolderOpen },
                { label: 'Pending release', value: pendingReleaseCount, icon: Clock },
                { label: 'Released PDFs', value: releasedCount, icon: Send },
                { label: 'ProDG roster', value: employees.length, icon: UserCog },
              ].map((stat) => (
                <div key={stat.label} className="border-2 border-foreground/10 bg-card p-4">
                  <stat.icon className="mb-2 h-4 w-4 text-accent" />
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="mono text-[10px] text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            {!prodgSubsidiaryId && (
              <div className="border-2 border-destructive/30 bg-destructive/5 p-4 text-sm">
                ProDG subsidiary not found in the database. Run migrations or contact support.
              </div>
            )}

            <Tabs value={adminTab} onValueChange={(v) => setAdminTab(v as 'assignments' | 'release')}>
              <TabsList className="grid h-auto min-h-10 w-full max-w-md grid-cols-2 border-2 border-foreground/10 bg-card p-1">
                <TabsTrigger value="assignments" className="gap-1.5 text-xs font-bold uppercase tracking-wide">
                  <UserCog className="h-3.5 w-3.5" /> Assign
                </TabsTrigger>
                <TabsTrigger value="release" className="gap-1.5 text-xs font-bold uppercase tracking-wide">
                  <Send className="h-3.5 w-3.5" /> Release
                  {pendingReleaseCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 px-1 text-[9px]">{pendingReleaseCount}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="assignments" className="mt-4">
                <PMAssignmentsPanel prodgSubsidiaryId={prodgSubsidiaryId} onSaved={loadAllData} />
              </TabsContent>

              <TabsContent value="release" className="mt-4">
                <AdminReleasePanel
                  responses={responses}
                  employees={employees}
                  assignments={assignments}
                  reviewerProfiles={reviewerProfiles}
                  answers={answers}
                  questions={questions}
                  categories={categories}
                  onReleased={loadAllData}
                />
              </TabsContent>
            </Tabs>
          </main>
        </>
      )}
    </div>
  );
}
