import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, XCircle, PlusCircle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeedbackThemesProps {
  themes: {
    stopDoing: string[];
    startDoing: string[];
    continueDoing: string[];
  };
  managerName?: string;
}

export default function FeedbackThemes({ themes, managerName }: FeedbackThemesProps) {
  const [expanded, setExpanded] = useState<'stop' | 'start' | 'continue' | null>('continue');

  const sections = [
    {
      key: 'stop' as const,
      title: 'Stop Doing',
      icon: XCircle,
      items: themes.stopDoing,
      color: 'destructive',
      bgClass: 'bg-destructive/10 border-destructive/30',
      iconClass: 'text-destructive',
    },
    {
      key: 'start' as const,
      title: 'Start Doing',
      icon: PlusCircle,
      items: themes.startDoing,
      color: 'primary',
      bgClass: 'bg-primary/10 border-primary/30',
      iconClass: 'text-primary',
    },
    {
      key: 'continue' as const,
      title: 'Continue Doing',
      icon: CheckCircle,
      items: themes.continueDoing,
      color: 'success',
      bgClass: 'bg-success/10 border-success/30',
      iconClass: 'text-success',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden"
    >
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/20">
            <MessageSquare className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="font-semibold">
              {managerName ? `Feedback for ${managerName}` : 'Qualitative Feedback'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {themes.stopDoing.length + themes.startDoing.length + themes.continueDoing.length} feedback items
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border/50">
        {sections.map((section) => (
          <div key={section.key}>
            <button
              onClick={() => setExpanded(expanded === section.key ? null : section.key)}
              className={cn(
                'w-full flex items-center justify-between p-4 transition-colors',
                'hover:bg-secondary/30',
                expanded === section.key && section.bgClass
              )}
            >
              <div className="flex items-center gap-3">
                <section.icon className={cn('w-5 h-5', section.iconClass)} />
                <span className="font-medium">{section.title}</span>
                <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                  {section.items.length}
                </span>
              </div>
              {expanded === section.key ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            <AnimatePresence>
              {expanded === section.key && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
                    {section.items.slice(0, 20).map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="p-3 rounded-lg bg-secondary/30 text-sm text-foreground/90"
                      >
                        {item}
                      </motion.div>
                    ))}
                    {section.items.length > 20 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        + {section.items.length - 20} more items
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </motion.div>
  );
}