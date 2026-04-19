import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase, supabaseUrl, supabasePublishableKey } from '@/lib/supabase';
import prodgLogo from '@/assets/prodg-logo.png';

type Phase = 'checking' | 'valid' | 'already' | 'invalid' | 'submitting' | 'done' | 'error';

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [phase, setPhase] = useState<Phase>('checking');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setPhase('invalid');
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: supabasePublishableKey } }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setPhase('invalid');
          return;
        }
        if (data?.valid) setPhase('valid');
        else if (data?.reason === 'already_unsubscribed') setPhase('already');
        else setPhase('invalid');
      } catch {
        setPhase('invalid');
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setPhase('submitting');
    try {
      const { data, error } = await supabase.functions.invoke('handle-email-unsubscribe', {
        body: { token },
      });
      if (error) throw error;
      if (data?.success) setPhase('done');
      else if (data?.reason === 'already_unsubscribed') setPhase('already');
      else {
        setErrMsg('Could not unsubscribe. Try again.');
        setPhase('error');
      }
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Something went wrong.');
      setPhase('error');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b-2 border-foreground/10 px-4 py-4 flex items-center justify-center gap-2.5 shrink-0">
        <img src={prodgLogo} alt="" className="h-8 w-8" />
        <span className="text-lg font-bold tracking-tight">ProDG</span>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md border-2 border-foreground/10 bg-card p-6 sm:p-8 text-center"
        >
          {phase === 'checking' && (
            <>
              <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-4" />
              <h1 className="text-lg font-semibold">Verifying your link…</h1>
            </>
          )}

          {phase === 'valid' && (
            <>
              <Mail className="w-10 h-10 text-primary mx-auto mb-4" />
              <h1 className="text-xl font-semibold mb-2">Unsubscribe from ProDG emails?</h1>
              <p className="text-muted-foreground text-sm mb-6">
                You will stop receiving review milestone notifications.
                Account-related emails (password resets, etc.) will still be delivered.
              </p>
              <Button onClick={confirm} className="w-full">Confirm unsubscribe</Button>
            </>
          )}

          {phase === 'submitting' && (
            <>
              <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-4" />
              <h1 className="text-lg font-semibold">Updating your preferences…</h1>
            </>
          )}

          {phase === 'done' && (
            <>
              <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-4" />
              <h1 className="text-xl font-semibold mb-2">You're unsubscribed</h1>
              <p className="text-muted-foreground text-sm mb-6">
                We won't send you any more notification emails.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/">Back to ProDG</Link>
              </Button>
            </>
          )}

          {phase === 'already' && (
            <>
              <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-4" />
              <h1 className="text-xl font-semibold mb-2">Already unsubscribed</h1>
              <p className="text-muted-foreground text-sm mb-6">
                This address is already opted out — nothing to do.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/">Back to ProDG</Link>
              </Button>
            </>
          )}

          {(phase === 'invalid' || phase === 'error') && (
            <>
              <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-4" />
              <h1 className="text-xl font-semibold mb-2">Link not valid</h1>
              <p className="text-muted-foreground text-sm mb-6">
                {errMsg || 'This unsubscribe link is invalid or has expired.'}
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/">Back to ProDG</Link>
              </Button>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
