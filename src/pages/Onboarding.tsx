import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Search } from 'lucide-react';
import TypewriterText from '@/components/TypewriterText';

export default function Onboarding() {
  const [slide, setSlide] = useState(0);
  const navigate = useNavigate();

  const next = () => setSlide(s => Math.min(s + 1, 2));
  const prev = () => setSlide(s => Math.max(s - 1, 0));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 sm:px-10 py-4 border-b-2 border-foreground/10">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold tracking-tight">ProDG</span>
          <span className="hidden sm:block label-mono border-l-2 border-foreground/10 pl-3">
            360° Peer Review
          </span>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="border-2 border-foreground px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] hover:bg-foreground hover:text-background transition-colors"
        >
          Sign In
        </button>
      </header>

      {/* Progress */}
      <div className="px-6 sm:px-10 py-3">
        <div className="max-w-3xl mx-auto flex gap-1">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={`h-[3px] flex-1 transition-colors duration-300 ${
                i <= slide ? 'bg-foreground' : 'bg-foreground/10'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex items-center justify-center px-6 pb-28 pt-8">
        <AnimatePresence mode="wait">
          {slide === 0 && <SlideWelcome key="w" />}
          {slide === 1 && <SlideHow key="h" />}
          {slide === 2 && <SlideStart key="s" navigate={navigate} />}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t-2 border-foreground/10 py-5 flex items-center justify-center gap-6">
        <button
          onClick={prev}
          disabled={slide === 0}
          className="w-10 h-10 border-2 border-foreground/20 flex items-center justify-center disabled:opacity-20 hover:bg-foreground hover:text-background transition-colors disabled:hover:bg-transparent disabled:hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex gap-2 items-center">
          {[0, 1, 2].map(i => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`h-2 transition-all duration-300 ${
                i === slide ? 'w-8 bg-foreground' : i < slide ? 'w-2 bg-foreground/40' : 'w-2 bg-foreground/15'
              }`}
            />
          ))}
        </div>

        <button
          onClick={slide === 2 ? () => navigate('/login') : next}
          className="w-10 h-10 border-2 border-foreground flex items-center justify-center hover:bg-foreground hover:text-background transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ─── Slide 1: Welcome ─── */
function SlideWelcome() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="max-w-3xl w-full"
    >
      <div className="label-mono mb-6">// peer_review</div>

      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] mb-2">
        NOT AWARDS.
      </h1>
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] mb-2 text-muted-foreground">
        NOT RANKINGS.
      </h1>
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] mb-8">
        <TypewriterText
          texts={['GROWTH_', 'HONESTY_', 'EACH OTHER_']}
          speed={80}
          deleteSpeed={40}
          pauseDuration={3000}
          hideCursor
        />
        <span className="inline-block w-[3px] h-[0.75em] bg-accent ml-1 animate-pulse" />
      </h1>

      <p className="text-muted-foreground text-base sm:text-lg max-w-xl leading-relaxed mb-10">
        ProDG 360° is a peer evaluation tool for teams that build together.
        Honest, anonymous feedback — so everyone can level up.
      </p>

      <div className="flex flex-wrap gap-2">
        {['Anonymous', 'Peer-to-Peer', 'Growth-Focused'].map(tag => (
          <span
            key={tag}
            className="mono text-[10px] uppercase tracking-[0.15em] px-3 py-2 border-2 border-foreground/10 bg-card font-medium"
          >
            {tag}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Slide 2: How It Works ─── */
function SlideHow() {
  const steps = [
    { num: '01', title: 'PICK', desc: 'Choose the people you\'ve worked with closely enough to give honest feedback.' },
    { num: '02', title: 'LOCK', desc: 'Lock them into your review box. No second-guessing — commit to your selections.' },
    { num: '03', title: 'REVIEW', desc: 'Give each person real, anonymous feedback on collaboration, reliability, and growth.' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="max-w-3xl w-full"
    >
      <div className="label-mono mb-6">// how_it_works</div>

      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.05] mb-10">
        PICK → LOCK → REVIEW
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {steps.map((step, i) => (
          <motion.div
            key={step.num}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.1, duration: 0.3 }}
            className="border-2 border-foreground/10 p-5 hover:border-foreground/30 transition-colors group"
          >
            <div className="mono text-accent text-xs font-bold mb-3">{step.num}</div>
            <h3 className="text-lg font-bold mb-2">{step.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Slide 3: Get Started ─── */
function SlideStart({ navigate }: { navigate: (path: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="max-w-2xl w-full"
    >
      <div className="label-mono mb-6">// get_started</div>

      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.05] mb-4">
        <TypewriterText
          texts={['YOUR VOICE_', 'RAW FEEDBACK_', 'REAL GROWTH_']}
          speed={80}
          deleteSpeed={40}
          pauseDuration={3000}
          hideCursor
        />
        <span className="inline-block w-[3px] h-[0.75em] bg-accent ml-1 animate-pulse" />
      </h1>

      <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-lg mb-10">
        This isn't about looking good. It's about helping each other get better.
        Sign in and start reviewing your peers — anonymously and honestly.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <button
          onClick={() => navigate('/login')}
          className="border-2 border-foreground bg-foreground text-background px-8 py-3 font-bold uppercase tracking-[0.1em] text-sm hover:shadow-[4px_4px_0px_0px] hover:shadow-accent hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all flex items-center gap-2 justify-center"
        >
          Sign In <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => navigate('/find-account')}
          className="border-2 border-foreground/30 px-8 py-3 font-bold uppercase tracking-[0.1em] text-sm hover:border-foreground hover:shadow-[4px_4px_0px_0px] hover:shadow-foreground/20 hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all flex items-center gap-2 justify-center"
        >
          <Search className="w-4 h-4" /> Find My Account
        </button>
      </div>

      <div className="flex items-center gap-4 mono text-[10px] text-muted-foreground uppercase tracking-[0.15em]">
        <span>Team Members Only</span>
        <span className="w-1 h-1 bg-foreground/20" />
        <span>Anonymous & Encrypted</span>
      </div>
    </motion.div>
  );
}
