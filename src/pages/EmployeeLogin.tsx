import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEmployeeAuth } from '@/contexts/EmployeeAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Mail, AlertCircle, ArrowLeft } from 'lucide-react';
import prodgLogo from '@/assets/prodg-logo.png';

export default function EmployeeLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useEmployeeAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await login(email, password);
      if (error) setError(error);
      else navigate('/hub');
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-foreground relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.5) 39px, rgba(255,255,255,0.5) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.5) 39px, rgba(255,255,255,0.5) 40px)',
        }} />
        <div className="relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="mono text-accent text-xs mb-6 uppercase tracking-[0.2em]">// authenticate</div>
            <h2 className="text-4xl font-bold text-background mb-4">PEER<br/>REVIEW_</h2>
            <p className="text-background/50 text-sm leading-relaxed max-w-sm mb-8">
              Sign in to give anonymous feedback to your teammates.
              Not for awards. For growth.
            </p>
            <div className="flex gap-2">
              {['Anonymous', 'Honest', 'Secure'].map(tag => (
                <span key={tag} className="mono text-[9px] uppercase tracking-[0.15em] px-3 py-1.5 border border-background/20 text-background/60">
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center relative p-4 sm:p-6 pt-16 sm:pt-6">
        <div className="absolute top-5 left-5">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8">
            <div className="flex items-center gap-2.5">
              <img src={prodgLogo} alt="ProDG" className="h-7 w-7" />
              <span className="text-2xl font-bold tracking-tight">ProDG</span>
            </div>
            <div className="mt-6" />
            <div className="label-mono mb-2">// sign_in</div>
            <h1 className="text-2xl font-bold mb-1">Welcome Back</h1>
            <p className="text-muted-foreground text-sm">ProDG 360° Peer Review</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="you@prodg.studio" value={email} onChange={e => setEmail(e.target.value)} className="pl-10 h-11 border-2" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 h-11 border-2" required />
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 p-3 bg-destructive/10 border-2 border-destructive/20 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
              </motion.div>
            )}

            <Button type="submit" disabled={loading} className="w-full h-11 font-bold uppercase tracking-wider text-xs">
              {loading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
              ) : 'Sign In'}
            </Button>
          </form>

          <div className="mt-8 space-y-3 text-center">
            <Link to="/find-account" className="text-sm text-foreground hover:text-accent font-medium block mono text-xs">
              First time? Find your account →
            </Link>
            <Link to="/admin" className="text-xs text-muted-foreground hover:text-foreground block">
              Admin access →
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
