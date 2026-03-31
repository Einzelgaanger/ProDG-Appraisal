import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, X } from 'lucide-react';

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
    <header className="border-b border-border/60 bg-card/60 backdrop-blur-xl sticky top-0 z-20">
      <div className={`${maxWidth} mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between`}>
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-lg font-extrabold tracking-tight text-foreground">ProDG</span>
          <div className="hidden sm:block h-5 w-px bg-border flex-shrink-0" />
          <div className="hidden sm:block min-w-0">
            <p className="text-xs font-bold text-foreground tracking-tight leading-none">
              360° Review
            </p>
            {(subtitle || userName) && (
              <p className="text-[11px] text-muted-foreground leading-none mt-1 truncate">
                {subtitle || userName}
              </p>
            )}
          </div>
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2">
          {actions}
          {onLogout && (
            <Button variant="ghost" size="icon" onClick={onLogout} className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="flex md:hidden items-center gap-1.5">
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="h-9 w-9">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/40 bg-card/95 backdrop-blur-xl px-4 py-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            {actions}
          </div>
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
