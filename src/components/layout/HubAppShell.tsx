import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { LogOut, Menu, Lock, Users, BarChart3, ClipboardList } from 'lucide-react';
import prodgLogo from '@/assets/prodg-logo.png';
import { cn } from '@/lib/utils';

export type HubTabId = 'review' | 'growth' | 'pulse';

type TabDef = { id: HubTabId; label: string; description: string; icon: typeof Users };

const PM_TABS: TabDef[] = [
  { id: 'review', label: 'Appraise', description: 'Evaluate developers', icon: Users },
  { id: 'pulse', label: 'Team Pulse', description: 'Team aggregates', icon: ClipboardList },
];

const DEVELOPER_TABS: TabDef[] = [
  { id: 'growth', label: 'My Results', description: 'Your appraisal', icon: BarChart3 },
];

export function tabsForRole(isPM: boolean): TabDef[] {
  return isPM ? PM_TABS : DEVELOPER_TABS;
}

interface HubAppShellProps {
  activeTab: HubTabId;
  onTabChange: (tab: HubTabId) => void;
  isPM?: boolean;
  userName?: string | null;
  userEmail?: string | null;
  onLogout: () => void;
  children: React.ReactNode;
}

function SidebarNav({
  activeTab,
  onSelect,
  tabs,
}: {
  activeTab: HubTabId;
  onSelect: (tab: HubTabId) => void;
  tabs: TabDef[];
}) {
  return (
    <nav className="flex flex-col gap-1 px-3 py-2" aria-label="Hub sections">
      {tabs.map(({ id, label, description, icon: Icon }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={cn(
              'flex w-full items-start gap-3 rounded-none border-2 px-3 py-3 text-left transition-colors',
              active
                ? 'border-foreground bg-foreground text-background shadow-[3px_3px_0px_0px] shadow-accent'
                : 'border-transparent bg-transparent text-foreground hover:border-foreground/20 hover:bg-card',
            )}
          >
            <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', active ? 'text-background' : 'text-muted-foreground')} />
            <span className="min-w-0">
              <span className="block text-sm font-bold uppercase tracking-wide">{label}</span>
              <span className={cn('mt-0.5 block text-[11px] leading-snug', active ? 'text-background/70' : 'text-muted-foreground')}>
                {description}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function SidebarBrandBlock() {
  return (
    <div className="border-b-2 border-foreground/10 px-5 py-5">
      <div className="flex items-center gap-3">
        <img src={prodgLogo} alt="" className="h-9 w-9" />
        <div className="min-w-0">
          <p className="text-lg font-bold tracking-tight">ProDG</p>
          <p className="label-mono text-[10px] text-muted-foreground">Performance Appraisal</p>
        </div>
      </div>
    </div>
  );
}

function SidebarUserBlock({ userName, userEmail }: { userName?: string | null; userEmail?: string | null }) {
  return (
    <div className="border-b-2 border-foreground/10 px-5 py-4">
      <p className="label-mono mb-1.5 text-[10px]">Signed in</p>
      <p className="truncate text-sm font-bold leading-tight">{userName || 'Member'}</p>
      {userEmail && (
        <p className="mono mt-1 truncate text-[10px] text-muted-foreground">{userEmail}</p>
      )}
    </div>
  );
}

function SidebarFooter({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="mt-auto border-t-2 border-foreground/10 px-5 py-4 space-y-3">
      <div className="flex items-center gap-2 label-mono text-[10px] text-muted-foreground">
        <Lock className="h-3 w-3" /> Anonymous feedback
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-full justify-center gap-2 border-2 font-bold uppercase text-xs tracking-wider"
        onClick={onLogout}
      >
        <LogOut className="h-4 w-4" /> Sign out
      </Button>
    </div>
  );
}

function SidebarColumn({
  activeTab,
  onTabChange,
  isPM,
  userName,
  userEmail,
  onLogout,
}: Omit<HubAppShellProps, 'children'>) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <SidebarBrandBlock />
      <SidebarUserBlock userName={userName} userEmail={userEmail} />
      <div className="min-h-0 flex-1 overflow-y-auto py-3">
        <SidebarNav activeTab={activeTab} onSelect={onTabChange} tabs={tabsForRole(!!isPM)} />
      </div>
      <SidebarFooter onLogout={onLogout} />
    </div>
  );
}

export default function HubAppShell({
  activeTab,
  onTabChange,
  isPM,
  userName,
  userEmail,
  onLogout,
  children,
}: HubAppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleTab = (tab: HubTabId) => {
    onTabChange(tab);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile top bar */}
      <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between gap-2 border-b-2 border-foreground/10 bg-background px-3 lg:hidden">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0 border-2"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex min-w-0 items-center gap-2">
          <img src={prodgLogo} alt="" className="h-7 w-7 shrink-0" />
          <div className="min-w-0 text-right">
            <p className="truncate text-sm font-bold">ProDG</p>
            {userName && <p className="truncate text-[10px] text-muted-foreground">{userName}</p>}
          </div>
        </div>
      </header>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-[min(100%,20rem)] border-r-2 border-foreground/10 p-0 sm:max-w-[20rem]"
        >
          <SheetTitle className="sr-only">Hub navigation</SheetTitle>
          <SidebarColumn
            activeTab={activeTab}
            onTabChange={handleTab}
            isPM={isPM}
            userName={userName}
            userEmail={userEmail}
            onLogout={onLogout}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-h-screen flex-col lg:flex-row">
        {/* Desktop sidebar */}
        <aside
          className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r-2 border-foreground/10 bg-card/30 lg:flex"
          aria-label="Hub navigation"
        >
          <SidebarColumn
            activeTab={activeTab}
            onTabChange={onTabChange}
            isPM={isPM}
            userName={userName}
            userEmail={userEmail}
            onLogout={onLogout}
          />
        </aside>

        <main className="min-w-0 flex-1 px-3 pb-8 pt-14 sm:px-6 lg:pb-10 lg:pt-6">
          <div className="mx-auto max-w-4xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
