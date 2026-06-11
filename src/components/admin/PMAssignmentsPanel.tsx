import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Save, Trash2, Users, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileRow { id: string; name: string; email: string; }
interface EmployeeRow { id: string; name: string; email: string | null; is_pm: boolean | null; }
interface AssignmentRow { id: string; pm_user_id: string; employee_id: string; group_name: string; }

type GroupKey = string;

function groupKey(pmId: string, name: string): GroupKey {
  return `${pmId}::${name.trim().toLowerCase()}`;
}

export default function PMAssignmentsPanel({
  prodgSubsidiaryId,
  onSaved,
}: {
  prodgSubsidiaryId?: string | null;
  onSaved?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pmProfiles, setPmProfiles] = useState<ProfileRow[]>([]);
  const [developers, setDevelopers] = useState<EmployeeRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [selectedPmId, setSelectedPmId] = useState('');
  const [activeGroupName, setActiveGroupName] = useState('');
  const [groupNameInput, setGroupNameInput] = useState('');
  const [selectedDevIds, setSelectedDevIds] = useState<Set<string>>(new Set());
  const [devSearch, setDevSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [rolesRes, assignRes] = await Promise.all([
        supabase.from('user_roles').select('user_id').eq('role', 'pm'),
        supabase.from('pm_developer_assignments').select('id, pm_user_id, employee_id, group_name'),
      ]);

      let empQuery = supabase.from('employees').select('id, name, email, is_pm').order('name');
      if (prodgSubsidiaryId) {
        empQuery = empQuery.eq('subsidiary_id', prodgSubsidiaryId);
      }
      const empRes = await empQuery;

      const pmUserIds = (rolesRes.data ?? []).map(r => r.user_id);
      let profiles: ProfileRow[] = [];
      if (pmUserIds.length) {
        const { data } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', pmUserIds)
          .order('name');
        profiles = (data ?? []) as ProfileRow[];
      }

      setPmProfiles(profiles);
      setDevelopers((empRes.data ?? []).filter(e => !e.is_pm) as EmployeeRow[]);
      setAssignments((assignRes.data ?? []) as AssignmentRow[]);
      if (!selectedPmId && profiles.length) setSelectedPmId(profiles[0].id);
    } catch (err) {
      console.error(err);
      toast.error('Could not load assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [prodgSubsidiaryId]);

  const pmGroups = useMemo(() => {
    const map = new Map<string, { name: string; devIds: string[] }>();
    assignments
      .filter(a => a.pm_user_id === selectedPmId)
      .forEach(a => {
        const existing = map.get(a.group_name);
        if (existing) existing.devIds.push(a.employee_id);
        else map.set(a.group_name, { name: a.group_name, devIds: [a.employee_id] });
      });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [assignments, selectedPmId]);

  const assignmentCountByDev = useMemo(() => {
    const counts = new Map<string, number>();
    assignments.forEach(a => {
      counts.set(a.employee_id, (counts.get(a.employee_id) ?? 0) + 1);
    });
    return counts;
  }, [assignments]);

  useEffect(() => {
    if (!activeGroupName) {
      setGroupNameInput('');
      setSelectedDevIds(new Set());
      return;
    }
    setGroupNameInput(activeGroupName);
    const ids = assignments
      .filter(a => a.pm_user_id === selectedPmId && a.group_name === activeGroupName)
      .map(a => a.employee_id);
    setSelectedDevIds(new Set(ids));
  }, [activeGroupName, selectedPmId, assignments]);

  const filteredDevs = useMemo(() => {
    if (!devSearch.trim()) return developers;
    const q = devSearch.toLowerCase();
    return developers.filter(d =>
      d.name.toLowerCase().includes(q) || (d.email && d.email.toLowerCase().includes(q))
    );
  }, [developers, devSearch]);

  const toggleDev = (id: string) => {
    setSelectedDevIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const startNewGroup = () => {
    setActiveGroupName('');
    setGroupNameInput('');
    setSelectedDevIds(new Set());
  };

  const saveGroup = async () => {
    if (!selectedPmId) return;
    const name = groupNameInput.trim();
    if (!name) {
      toast.error('Enter a project / group name');
      return;
    }
    if (!selectedDevIds.size) {
      toast.error('Select at least one developer');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (activeGroupName && activeGroupName !== name) {
        const { error } = await supabase
          .from('pm_developer_assignments')
          .delete()
          .eq('pm_user_id', selectedPmId)
          .eq('group_name', activeGroupName);
        if (error) throw error;
      } else if (activeGroupName) {
        const { error } = await supabase
          .from('pm_developer_assignments')
          .delete()
          .eq('pm_user_id', selectedPmId)
          .eq('group_name', activeGroupName);
        if (error) throw error;
      }

      const rows = Array.from(selectedDevIds).map(employee_id => ({
        pm_user_id: selectedPmId,
        employee_id,
        group_name: name,
        assigned_by: user?.id ?? null,
      }));

      const { error: insError } = await supabase.from('pm_developer_assignments').insert(rows);
      if (insError) throw insError;

      supabase.functions
        .invoke('notify-pm-assignment', {
          body: {
            pmUserId: selectedPmId,
            groupName: name,
            developerIds: Array.from(selectedDevIds),
          },
        })
        .catch(err => console.error('notify-pm-assignment failed', err));

      toast.success(`Locked in "${name}" — PM notified`);
      setActiveGroupName(name);
      await load();
      onSaved?.();
    } catch (err) {
      console.error(err);
      toast.error('Could not save group');
    } finally {
      setSaving(false);
    }
  };

  const deleteGroup = async (name: string) => {
    if (!selectedPmId || !confirm(`Remove group "${name}" and all its assignments?`)) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('pm_developer_assignments')
        .delete()
        .eq('pm_user_id', selectedPmId)
        .eq('group_name', name);
      if (error) throw error;
      if (activeGroupName === name) startNewGroup();
      toast.success('Group removed');
      await load();
    } catch (err) {
      console.error(err);
      toast.error('Could not delete group');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading assignments…
      </div>
    );
  }

  if (!pmProfiles.length) {
    return (
      <div className="glass-panel p-8 text-center">
        <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <h3 className="font-bold mb-2">No PM accounts yet</h3>
        <p className="text-sm text-muted-foreground">
          Run <code className="text-xs">npm run seed:users</code> or provision PMs via bulk-create-users, then return here.
        </p>
      </div>
    );
  }

  const selectedPm = pmProfiles.find(p => p.id === selectedPmId);

  return (
    <div className="space-y-4">
      <div className="glass-panel p-5">
        <div className="label-mono mb-2 text-accent">// pm_assignments</div>
        <h3 className="text-lg font-bold mb-1">Name projects & lock in developers</h3>
        <p className="text-sm text-muted-foreground">
          Each lock-in is a <strong>named project group</strong> (e.g. RICC, DealRoom).
          The same developer can sit under multiple PMs or multiple projects.
          When a PM completes a review, admins are notified to review and release the PDF to the developer when ready.
        </p>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-4">
        <div className="glass-panel p-4 space-y-3">
          <label className="text-xs font-bold uppercase tracking-wide">Project manager</label>
          <Select value={selectedPmId} onValueChange={v => { setSelectedPmId(v); startNewGroup(); }}>
            <SelectTrigger className="border-2">
              <SelectValue placeholder="Select PM" />
            </SelectTrigger>
            <SelectContent>
              {pmProfiles.map(pm => (
                <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedPm && <p className="text-xs text-muted-foreground mono">{selectedPm.email}</p>}

          <div className="pt-3 border-t border-foreground/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase">Groups</span>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={startNewGroup}>
                <Plus className="w-3 h-3" /> New
              </Button>
            </div>
            {pmGroups.length === 0 ? (
              <p className="text-xs text-muted-foreground">No groups yet for this PM.</p>
            ) : (
              pmGroups.map(g => (
                <div
                  key={groupKey(selectedPmId, g.name)}
                  className={`flex items-center justify-between gap-2 p-2 border-2 cursor-pointer transition-colors ${
                    activeGroupName === g.name ? 'border-accent bg-accent/5' : 'border-foreground/10 hover:border-foreground/25'
                  }`}
                  onClick={() => setActiveGroupName(g.name)}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate flex items-center gap-1">
                      <FolderOpen className="w-3.5 h-3.5 shrink-0" /> {g.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{g.devIds.length} developer{g.devIds.length === 1 ? '' : 's'}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={e => { e.stopPropagation(); deleteGroup(g.name); }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-panel p-4 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide block mb-2">Project / group name</label>
            <Input
              placeholder="e.g. RICC, DealRoom, Baobab…"
              value={groupNameInput}
              onChange={e => setGroupNameInput(e.target.value)}
              className="border-2 font-bold"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              This name appears on the developer&apos;s PDF and email (not the PM&apos;s name).
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-sm font-bold">Developers in this group</span>
              <Input
                placeholder="Search…"
                value={devSearch}
                onChange={e => setDevSearch(e.target.value)}
                className="max-w-[200px] h-8 text-sm border-2"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-2 max-h-[360px] overflow-y-auto pr-1">
              {filteredDevs.map(dev => {
                const on = selectedDevIds.has(dev.id);
                const otherCount = assignmentCountByDev.get(dev.id) ?? 0;
                const inOtherGroups = otherCount > 0 && !on;
                return (
                  <button
                    key={dev.id}
                    type="button"
                    onClick={() => toggleDev(dev.id)}
                    className={`text-left p-3 border-2 transition-colors ${
                      on ? 'border-accent bg-accent/5' : 'border-foreground/10 hover:border-foreground/25'
                    }`}
                  >
                    <p className="text-sm font-bold truncate">{dev.name}</p>
                    {dev.email && <p className="text-[10px] text-muted-foreground truncate mono">{dev.email}</p>}
                    {inOtherGroups && (
                      <Badge variant="secondary" className="mt-1 text-[9px]">
                        also in {otherCount} other group{otherCount === 1 ? '' : 's'}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <Button onClick={saveGroup} disabled={saving} className="gap-2 font-bold uppercase text-xs">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Lock in group
          </Button>
        </div>
      </div>
    </div>
  );
}
