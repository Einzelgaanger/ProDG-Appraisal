import { useState, useEffect, useCallback } from 'react';
import prodgLogo from '@/assets/prodg-logo.png';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useEmployeeAuth } from '@/contexts/EmployeeAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, ArrowLeft, CheckCircle2, AlertCircle, Loader2, Mail } from 'lucide-react';

interface EmployeeResult {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  department: string | null;
}

const normalizeSearchText = (value: string) =>
  value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

const compactSearchText = (value: string) => value.replace(/[^a-z0-9]/g, '');

export default function FindAccount() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<EmployeeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [employeeIndex, setEmployeeIndex] = useState<EmployeeResult[] | null>(null);
  const { resetPassword } = useEmployeeAuth();
  const navigate = useNavigate();

  const fetchEmployeeIndex = useCallback(async () => {
    if (employeeIndex) return employeeIndex;
    const { data, error: err } = await supabase
      .from('employees')
      .select('id, name, role, email, department')
      .order('name')
      .limit(1000);
    if (err) throw err;
    // Deduplicate by email
    const seen = new Set<string>();
    const unique = (data || []).filter(e => {
      const key = e.email?.toLowerCase() || e.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    setEmployeeIndex(unique as EmployeeResult[]);
    return unique as EmployeeResult[];
  }, [employeeIndex]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) { setResults([]); setHasSearched(false); setError(''); return; }

    const timeout = setTimeout(async () => {
      setSearching(true); setError('');
      try {
        const employees = await fetchEmployeeIndex();
        const normalizedQuery = normalizeSearchText(query);
        const compactQuery = compactSearchText(normalizedQuery);
        const tokens = normalizedQuery.split(' ').filter(Boolean);
        const filtered = employees.filter(emp => {
          const searchable = normalizeSearchText(`${emp.name} ${emp.email ?? ''}`);
          const compactSearchable = compactSearchText(searchable);
          return tokens.every(t => searchable.includes(t)) || (compactQuery.length >= 2 && compactSearchable.includes(compactQuery));
        }).slice(0, 50);
        setResults(filtered);
        setHasSearched(true);
      } catch { setError('Search failed.'); }
      finally { setSearching(false); }
    }, 250);
    return () => clearTimeout(timeout);
  }, [searchQuery, fetchEmployeeIndex]);

  const handleSendReset = async (employee: EmployeeResult) => {
    if (!employee.email) { setError('No email on file. Contact admin.'); return; }
    setSending(true); setError('');
    try {
      const { error } = await resetPassword(employee.email);
      if (error) throw new Error(error);
      setSent(true);
      setSentTo(employee.email.replace(/(.{3})(.*)(@.*)/, '$1***$3'));
    } catch { setError('Failed to send. Try again.'); }
    finally { setSending(false); }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-sm w-full text-center">
          <div className="w-16 h-16 border-2 border-accent bg-accent/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-2xl font-bold mb-2">CHECK YOUR EMAIL</h1>
          <p className="text-muted-foreground text-sm mb-1">Password reset link sent to</p>
          <p className="mono text-sm font-bold mb-6">{sentTo}</p>
          <div className="border-2 border-foreground/10 p-4 mb-8 text-left">
            <div className="label-mono mb-2">// next_steps</div>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>Open the email and click the reset link</li>
              <li>Set a new password</li>
              <li>Sign in with your new password</li>
            </ol>
          </div>
          <Button onClick={() => navigate('/login')} className="w-full h-11 font-bold uppercase tracking-wider text-xs">
            Go to Sign In
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="border-b-2 border-foreground/10 px-4 py-4 flex items-center gap-3 bg-card/50 shrink-0">
        <img src={prodgLogo} alt="" className="h-9 w-9" />
        <div className="min-w-0 text-left">
          <p className="font-bold text-base leading-tight">ProDG</p>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Find account</p>
        </div>
      </div>
      <div className="flex-1 flex items-start sm:items-center justify-center relative p-4 sm:p-6 pt-4 pb-12">
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-1.5 text-muted-foreground hover:text-foreground h-9">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md pt-12 sm:pt-8">
        <div className="mb-8">
          <div className="label-mono mb-2">// find_account</div>
          <h1 className="text-xl sm:text-2xl font-bold mb-1">Find your account</h1>
          <p className="text-muted-foreground text-sm">Search by name or email to locate your profile.</p>
        </div>

        <div className="space-y-3 mb-4">
          <Label htmlFor="search" className="text-sm font-medium">Name or Email</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="search" placeholder="e.g. Jane Doe" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 h-11 border-2" autoFocus />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
          </div>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 p-3 bg-destructive/10 border-2 border-destructive/20 text-destructive text-sm mb-4">
            <AlertCircle className="w-4 h-4" />{error}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {hasSearched && results.length === 0 && !searching && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-8">
              <p className="text-sm text-muted-foreground">No matching profiles found.</p>
            </motion.div>
          )}

          {results.length > 0 && (
            <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p className="label-mono mb-3">{results.length} result{results.length !== 1 ? 's' : ''}</p>
              <div className="max-h-[340px] overflow-y-auto space-y-1.5 pr-1">
                {results.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => handleSendReset(emp)}
                    disabled={sending}
                    className="w-full flex items-center justify-between p-4 border-2 border-foreground/10 bg-card hover:border-foreground/30 hover:shadow-[3px_3px_0px_0px] hover:shadow-foreground/10 hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all text-left group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-foreground text-background flex items-center justify-center flex-shrink-0 font-bold text-sm">
                        {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <span className="font-medium text-sm block truncate">{emp.name}</span>
                        {emp.email && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3" />{emp.email}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="mono text-[10px] text-accent opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ml-2">
                      THAT'S ME →
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 text-center">
          <Link to="/login" className="mono text-xs text-foreground hover:text-accent">
            Already have a password? Sign in →
          </Link>
        </div>
      </motion.div>
      </div>
    </div>
  );
}
