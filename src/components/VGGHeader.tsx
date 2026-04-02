import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, X } from 'lucide-react';
import prodgLogo from '@/assets/prodg-logo.png';

interface VGGHeaderProps {
  subtitle?: string;
  userName?: string;
  onLogout?: () => void;
  actions?: React.ReactNode;
  maxWidth?: string;
}

export default function VGGHeader({ subtitle, userName, onLogout, actions, maxWidth = 'max-w-5xl' }: VGGHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="border-b-2 border-foreground/10 bg-background sticky top-0 z-20">
      <div className={`${maxWidth} mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2`}>
        <div className="flex items-center gap-3 min-w-0">
          <img src={prodgLogo} alt="ProDG" className="h-6 w-6" />
          <span className="text-base sm:text-lg font-bold tracking-tight">ProDG</span>
          <span className="hidden sm:block label-mono border-l-2 border-foreground/10 pl-3">
            360° Peer Review
          </span>
          {(subtitle || userName) && (
            <>
              <span className="hidden sm:block text-muted-foreground">·</span>
              <span className="hidden sm:block text-xs text-muted-foreground truncate">
                {subtitle || userName}
              </span>
            </>
          )}
        </div>

        <div className="hidden md:flex items-center gap-2">
          {actions}
          {onLogout && (
            <Button variant="ghost" size="icon" onClick={onLogout} className="h-9 w-9 text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="flex md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="h-9 w-9 shrink-0">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t-2 border-foreground/10 bg-background px-3 py-3 space-y-2">
          <div className="grid gap-2 [&>*]:w-full [&>*]:justify-start">{actions}</div>
          {onLogout && (
            <Button variant="outline" size="sm" onClick={onLogout} className="w-full gap-2 mt-2">
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          )}
        </div>
      )}
    </header>
  );
}
