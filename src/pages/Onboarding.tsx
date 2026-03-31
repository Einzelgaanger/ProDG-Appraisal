import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import TypewriterText from '@/components/TypewriterText';
import { Button } from '@/components/ui/button';
import {
  Search, Users, BarChart3, ChevronRight, ChevronLeft,
  Shield, ArrowRight, Award, CheckCircle2, Lock, Eye, Code2,
} from 'lucide-react';

const TRANSITION_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const HEADLINE_TYPE = {
  speed: 108,
  deleteSpeed: 52,
  pauseDuration: 4200,
} as const;

const SLIDE_ENTER = { duration: 0.65, ease: TRANSITION_EASE };
const BADGE_REVEAL = { delay: 0.12, duration: 0.55, ease: TRANSITION_EASE };
const SUBTITLE_REVEAL = { delay: 0.95, duration: 0.75, ease: TRANSITION_EASE };
const CARDS_REVEAL = { delay: 1.15, duration: 0.65, ease: TRANSITION_EASE };

export default function Onboarding() {
  const [slide, setSlide] = useState(0);
  const navigate = useNavigate();

  const next = useCallback(() => setSlide((s) => Math.min(s + 1, 2)), []);
  const prev = useCallback(() => setSlide((s) => Math.max(s - 1, 0)), []);

  const handleAutoAdvance = useCallback(() => {
    setSlide((s) => (s < 2 ? s + 1 : s));
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-primary/[0.03] blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-muted/[0.5] blur-3xl" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5">
        <div className="flex items-center gap-3">
          <span className="text-xl font-extrabold tracking-tight text-foreground">ProDG</span>
          <div className="hidden sm:block h-5 w-px bg-border" />
          <span className="hidden sm:block text-xs font-semibold text-muted-foreground tracking-widest uppercase">
            360° Review
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/login')} className="text-xs">
            Sign In
          </Button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="relative z-10 px-6 sm:px-10">
        <div className="max-w-2xl mx-auto flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-1 flex-1 rounded-full overflow-hidden bg-muted"
            >
              <motion.div
                initial={false}
                animate={{ width: i <= slide ? '100%' : '0%' }}
                transition={{ duration: 1.05, ease: TRANSITION_EASE }}
                className="h-full bg-primary rounded-full"
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Slide content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 pb-24 pt-8">
        <AnimatePresence mode="wait">
          {slide === 0 && <SlideWelcome key="welcome" onComplete={handleAutoAdvance} />}
          {slide === 1 && <SlideHowItWorks key="how" onComplete={handleAutoAdvance} />}
          {slide === 2 && <SlideGetStarted key="start" navigate={navigate} />}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-20 py-6 flex items-center justify-center gap-4 bg-background">
        <Button
          variant="outline"
          size="sm"
          onClick={prev}
          disabled={slide === 0}
          className="rounded-full h-10 w-10 p-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="flex gap-2.5 items-center">
          {['Welcome', 'How it works', 'Get started'].map((label, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className="flex items-center gap-1.5 group"
            >
              <div className={`h-2.5 rounded-full transition-all duration-300 ${
                i === slide
                  ? 'w-8 bg-primary'
                  : i < slide
                  ? 'w-2.5 bg-primary/40'
                  : 'w-2.5 bg-muted-foreground/20 group-hover:bg-muted-foreground/40'
              }`} />
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={slide === 2 ? () => navigate('/login') : next}
          className="rounded-full h-10 w-10 p-0"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

/* ─── Slide 1: Welcome ─── */
function SlideWelcome({ onComplete }: { onComplete: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={SLIDE_ENTER}
      className="max-w-3xl w-full text-center"
    >
      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={BADGE_REVEAL}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/8 border border-primary/15 text-primary text-xs font-semibold mb-8"
      >
        <Code2 className="w-3.5 h-3.5" />
        ProDG 360° Peer Review
      </motion.div>

      {/* Main heading */}
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground leading-[1.1] mb-6 min-h-[2.6em] sm:min-h-[2.4em]">
        <span className="block mb-2">Building</span>
        <TypewriterText
          texts={['Together.', 'Better.', 'Stronger.']}
          className="gradient-text"
          speed={HEADLINE_TYPE.speed}
          deleteSpeed={HEADLINE_TYPE.deleteSpeed}
          pauseDuration={HEADLINE_TYPE.pauseDuration}
          onCycleComplete={onComplete}
        />
      </h1>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SUBTITLE_REVEAL}
        className="max-w-lg mx-auto mb-10 text-muted-foreground text-base sm:text-lg leading-relaxed"
      >
        A peer review platform for dev teams—structured, anonymous feedback to help your community grow and ship better.
      </motion.p>

      {/* Feature cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={CARDS_REVEAL}
        className="flex flex-wrap gap-3 justify-center"
      >
        {[
          { icon: Lock, label: 'Anonymous & Secure' },
          { icon: Eye, label: 'Transparent Process' },
          { icon: BarChart3, label: 'Data-Driven Insights' },
        ].map(({ icon: Icon, label }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: CARDS_REVEAL.delay + 0.08 + i * 0.12, duration: 0.6, ease: TRANSITION_EASE }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-card border border-border/60 shadow-sm text-sm text-muted-foreground"
          >
            <Icon className="w-4 h-4 text-primary" />
            {label}
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

/* ─── Slide 2: How It Works ─── */
const STEPS = [
  {
    icon: Search,
    title: 'Find Your Profile',
    desc: 'Look up your name to locate your account and set up your credentials securely.',
    bg: 'bg-primary/5',
    iconBg: 'bg-primary/15',
    iconColor: 'text-primary',
  },
  {
    icon: Users,
    title: 'Review Your Teammates',
    desc: 'Provide honest, anonymous feedback across key competencies for your peers.',
    bg: 'bg-muted',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  {
    icon: BarChart3,
    title: 'View Your Insights',
    desc: 'Access your personal dashboard, see benchmarks, and track your progress.',
    bg: 'bg-primary/5',
    iconBg: 'bg-primary/15',
    iconColor: 'text-primary',
  },
];

function SlideHowItWorks({ onComplete }: { onComplete: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={SLIDE_ENTER}
      className="max-w-3xl w-full text-center"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={BADGE_REVEAL}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/8 border border-primary/15 text-primary text-xs font-semibold mb-8"
      >
        <Award className="w-3.5 h-3.5" />
        Simple 3-Step Process
      </motion.div>

      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground leading-[1.1] mb-4 min-h-[1.35em]">
        <TypewriterText
          texts={['How It Works', 'Your Journey Begins', 'Three Simple Steps']}
          className="text-foreground"
          speed={HEADLINE_TYPE.speed}
          deleteSpeed={HEADLINE_TYPE.deleteSpeed}
          pauseDuration={HEADLINE_TYPE.pauseDuration}
          onCycleComplete={onComplete}
        />
      </h1>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SUBTITLE_REVEAL}
        className="text-muted-foreground text-base sm:text-lg max-w-lg mx-auto mb-10 leading-relaxed"
      >
        From secure account setup to actionable insights—a streamlined flow for busy teams.
      </motion.p>

      {/* Step cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: CARDS_REVEAL.delay + i * 0.12, duration: 0.65, ease: TRANSITION_EASE }}
            className={`relative p-6 rounded-2xl ${step.bg} border border-border/40 text-left group hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}
          >
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-4">
              Step {i + 1}
            </div>
            <div className={`w-12 h-12 rounded-2xl ${step.iconBg} flex items-center justify-center mb-4`}>
              <step.icon className={`w-6 h-6 ${step.iconColor}`} />
            </div>
            <h3 className="text-base font-bold text-foreground mb-2">{step.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Slide 3: Get Started ─── */
function SlideGetStarted({ navigate }: { navigate: (path: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={SLIDE_ENTER}
      className="max-w-2xl w-full text-center"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={BADGE_REVEAL}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/8 border border-primary/15 text-primary text-xs font-semibold mb-8"
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        Secure & Confidential
      </motion.div>

      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground leading-[1.1] mb-4 min-h-[1.35em]">
        <TypewriterText
          texts={['Ready to Begin?', 'Let\'s Get Started.', 'Your Voice Matters.']}
          className="text-foreground"
          speed={HEADLINE_TYPE.speed}
          deleteSpeed={HEADLINE_TYPE.deleteSpeed}
          pauseDuration={HEADLINE_TYPE.pauseDuration}
        />
      </h1>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SUBTITLE_REVEAL}
        className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-lg mx-auto mb-10"
      >
        Sign in with your credentials or find your account. Your feedback stays anonymous and confidential.
      </motion.p>

      {/* CTA buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: CARDS_REVEAL.delay, duration: 0.65, ease: TRANSITION_EASE }}
        className="flex flex-col sm:flex-row gap-3 justify-center mb-8"
      >
        <Button size="lg" onClick={() => navigate('/login')} className="gap-2 px-8">
          Sign In <ArrowRight className="w-4 h-4" />
        </Button>
        <Button size="lg" variant="outline" onClick={() => navigate('/find-account')} className="gap-2 px-8">
          <Search className="w-4 h-4" /> Find My Account
        </Button>
      </motion.div>

      {/* Trust bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: CARDS_REVEAL.delay + 0.45, duration: 0.65, ease: TRANSITION_EASE }}
        className="flex items-center justify-center gap-6 text-xs text-muted-foreground"
      >
        <span className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" />
          Team Members Only
        </span>
        <span className="w-1 h-1 rounded-full bg-border" />
        <span className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" />
          Encrypted & Anonymous
        </span>
      </motion.div>
    </motion.div>
  );
}
