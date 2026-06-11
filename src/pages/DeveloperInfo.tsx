import { useNavigate } from 'react-router-dom';
import { Mail, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEmployeeAuth } from '@/contexts/EmployeeAuthContext';
import prodgLogo from '@/assets/prodg-logo.png';

export default function DeveloperInfo() {
  const navigate = useNavigate();
  const { profile, logout } = useEmployeeAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full border-2 border-foreground/10 p-8 text-center">
        <img src={prodgLogo} alt="" className="h-10 w-10 mx-auto mb-4" />
        <div className="label-mono mb-2">// appraisal_delivery</div>
        <h1 className="text-xl font-bold mb-3">Check your email</h1>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          {profile?.name ? `Hi ${profile.name}, ` : ''}
          After your PM completes your appraisal, an <strong>admin reviews the results</strong> and releases your report when ready.
          You will receive a <strong>PDF download link by email</strong> — no login required.
        </p>
        <div className="flex items-start gap-2 p-3 mb-6 border border-foreground/10 bg-foreground/[0.02] text-left text-xs text-muted-foreground">
          <Mail className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Look for an email from ProDG Performance Appraisal once your report has been released.
            Your reviewer is never named in the PDF.
          </span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button variant="outline" className="border-2" onClick={() => navigate('/')}>
            Back home
          </Button>
          <Button variant="ghost" className="gap-2" onClick={async () => { await logout(); navigate('/'); }}>
            <LogOut className="w-4 h-4" /> Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
