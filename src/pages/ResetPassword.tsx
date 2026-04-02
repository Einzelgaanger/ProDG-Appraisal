import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import prodgLogo from '@/assets/prodg-logo.png';

type Phase = 'checking' | 'invalid' | 'form' | 'success';

export default function ResetPassword() {
  const [phase, setPhase] = useState<Phase>('checking');
  const [invalidMessage, setInvalidMessage] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        if (timer) clearTimeout(timer);
        setPhase('form');
      }
    });

    void (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');

        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (cancelled) return;
          if (exErr) {
            setInvalidMessage(exErr.message);
            setPhase('invalid');
            return;
          }
          window.history.replaceState({}, document.title, url.pathname);
          setPhase('form');
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (session) {
          setPhase('form');
          return;
        }

        timer = setTimeout(async () => {
          if (cancelled) return;
          const { data: { session: s2 } } = await supabase.auth.getSession();
          if (cancelled) return;
          if (s2) {
            setPhase('form');
          } else {
            setInvalidMessage(
              'This reset link is invalid or has expired. Please request a new one.'
            );
            setPhase('invalid');
          }
        }, 2200);
      } catch (e) {
        if (!cancelled) {
          setInvalidMessage(e instanceof Error ? e.message : 'Verification failed.');
          setPhase('invalid');
        }
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: e } = await supabase.auth.updateUser({ password });
      if (e) throw e;
      setPhase('success');
      await supabase.auth.signOut();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  if (phase === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm w-full border-2 border-foreground/10 bg-card p-8 text-center"
        >
          <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Password updated</h1>
          <p className="text-muted-foreground text-sm mb-6">
            You can sign in with your new password.
          </p>
          <Button onClick={() => navigate('/login')} className="w-full">
            Go to sign in
          </Button>
        </motion.div>
      </div>
    );
  }

  if (phase === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
        <div className="max-w-sm w-full border-2 border-foreground/10 bg-card p-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-4" />
          <h1 className="text-lg font-semibold mb-2">Verifying your link</h1>
          <p className="text-muted-foreground text-sm">
            Confirming your password reset…
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'invalid') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-10">
        <div className="max-w-md w-full border-2 border-destructive/20 bg-destructive/5 p-8 text-center">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-4" />
          <h1 className="text-lg font-semibold mb-2">Link not valid</h1>
          <p className="text-muted-foreground text-sm mb-6">{invalidMessage}</p>
          <Button asChild className="w-full">
            <Link to="/find-account">Request a new reset link</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b-2 border-foreground/10 px-4 py-4 sm:py-5 flex items-center justify-center gap-2.5 shrink-0">
        <img src={prodgLogo} alt="" className="h-8 w-8 sm:h-9 sm:w-9" width={36} height={36} />
        <span className="text-lg sm:text-xl font-bold tracking-tight">ProDG</span>
        <span className="text-[10px] sm:text-xs text-muted-foreground border-l border-foreground/15 pl-2.5 ml-0.5 uppercase tracking-wider hidden min-[380px]:inline">
          360° Review
        </span>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="border-2 border-foreground/10 bg-card p-6 sm:p-8">
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
                <Lock className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-semibold">Set a new password</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Choose a strong password you have not used elsewhere.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm">New password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11 border-2"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-sm">Confirm password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="Re-enter password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="pl-10 h-11 border-2"
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border-2 border-destructive/20 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full h-11 font-semibold">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save password'}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
