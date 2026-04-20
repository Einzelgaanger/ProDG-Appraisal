import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEmployeeAuth } from '@/contexts/EmployeeAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Mail, AlertCircle, ShieldCheck } from 'lucide-react';
import prodgLogo from '@/assets/prodg-logo.png';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, logout } = useEmployeeAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await login(email, password);
      if (error) {
        setError(error);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      const { data: role } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id ?? '')
        .eq('role', 'admin')
        .maybeSingle();

      if (role) navigate('/appraisal');
      else {
        await logout();
        setError('This account is not an admin.');
      }
    } catch {
      setError('An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Mobile header - improved touch targets */}
      <div className="lg:hidden border-b-2 border-foreground/10 px-4 py-4 flex items-center gap-3 bg-card/50 shrink-0">
        <img src={prodgLogo} alt="" className="h-9 w-9" />
        <div className="min-w-0">
          <p className="font-bold text-base">ProDG</p>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Admin console</p>
        </div>
      </div>
      
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-[45%] bg-foreground relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.5) 39px, rgba(255,255,255,0.5) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.5) 39px, rgba(255,255,255,0.5) 40px)',
        }} />
        <div className="relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <ShieldCheck className="w-12 h-12 text-accent mb-6" />
            <h2 className="text-3xl font-bold text-background mb-3">ADMIN<br/>CONSOLE_</h2>
            <p className="text-background/50 text-sm leading-relaxed max-w-sm">
              Analytics dashboard, review management, and performance insights.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Main content - improved mobile spacing */}
      <div className="flex-1 flex items-start sm:items-center justify-center p-4 sm:p-6 py-6 sm:py-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          {/* Desktop logo */}
          <div className="hidden lg:block mb-8">
            <div className="flex items-center gap-2.5">
              <img src={prodgLogo} alt="ProDG" className="h-7 w-7" />
              <span className="text-2xl font-bold tracking-tight">ProDG</span>
            </div>
            <div className="mt-6" />
            <div className="label-mono mb-2">// admin</div>
            <h1 className="text-2xl font-bold mb-1">Administrator</h1>
            <p className="text-muted-foreground text-sm">ProDG 360° Review</p>
          </div>

          {/* Mobile header text */}
          <div className="lg:hidden mb-6">
            <div className="label-mono mb-2 text-xs">// admin</div>
            <h1 className="text-xl font-bold mb-1">Administrator</h1>
            <p className="text-muted-foreground text-sm">ProDG 360° Review</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="admin@prodg.studio" value={email} onChange={e => setEmail(e.target.value)} className="pl-10 h-12 border-2 text-base" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 h-12 border-2 text-base" required />
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 p-3 bg-destructive/10 border-2 border-destructive/20 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" />{error}
              </motion.div>
            )}

            <Button type="submit" disabled={loading} className="w-full h-12 font-bold uppercase tracking-wider text-xs sm:text-sm min-h-[48px]">
              {loading ? '...' : 'Sign In'}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
