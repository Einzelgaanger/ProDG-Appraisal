import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Loader2, Brain, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatMessage, InsightSuggestion } from '@/types/appraisal';
import { cn } from '@/lib/utils';
import { supabasePublishableKey, supabaseUrl } from '@/lib/supabase';

const INSIGHT_SUGGESTIONS_ROW1: InsightSuggestion[] = [
  { id: '1', question: 'Who are the top 3 performing managers?', category: 'performance' },
  { id: '2', question: 'Which manager has the best team leadership score?', category: 'leadership' },
  { id: '3', question: 'What are the most common improvement areas?', category: 'feedback' },
  { id: '4', question: 'Compare Demola Idowu vs Dotun Adekunle', category: 'comparison' },
];

const INSIGHT_SUGGESTIONS_ROW2: InsightSuggestion[] = [
  { id: '5', question: 'Which managers need cultural fit improvement?', category: 'culture' },
  { id: '6', question: 'What should managers stop doing most?', category: 'feedback' },
  { id: '7', question: 'Who received the most reviews?', category: 'performance' },
  { id: '8', question: 'Average score by relationship type?', category: 'comparison' },
  { id: '9', question: 'Show results orientation breakdown', category: 'performance' },
];

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  dataContext: string;
}

// Keep markdown formatting for rich display
const formatResponse = (text: string): string => {
  return text.replace(/\n{3,}/g, '\n\n').trim();
};

// Marquee row component for endless scrolling
const MarqueeRow = ({ 
  suggestions, 
  direction = 'left', 
  speed = 25,
  onSelect 
}: { 
  suggestions: InsightSuggestion[]; 
  direction?: 'left' | 'right'; 
  speed?: number;
  onSelect: (question: string) => void;
}) => {
  // Duplicate suggestions for seamless loop
  const items = [...suggestions, ...suggestions, ...suggestions];
  
  return (
    <div className="relative overflow-hidden py-2">
      <motion.div
        className="flex gap-3"
        animate={{
          x: direction === 'left' ? ['0%', '-33.33%'] : ['-33.33%', '0%'],
        }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: 'loop',
            duration: speed,
            ease: 'linear',
          },
        }}
      >
        {items.map((suggestion, idx) => (
          <button
            key={`${suggestion.id}-${idx}`}
            onClick={() => onSelect(suggestion.question)}
            className="flex-shrink-0 px-4 py-3 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/40 
              hover:border-primary/50 hover:bg-primary/10 hover:scale-[1.02] 
              transition-all duration-200 cursor-pointer group whitespace-nowrap"
          >
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              {suggestion.question}
            </span>
          </button>
        ))}
      </motion.div>
    </div>
  );
};

export default function AIChatPanel({ isOpen, onClose, dataContext }: AIChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabasePublishableKey}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          dataContext,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices?.[0]?.delta?.content;
              if (content) {
                assistantContent += content;
                setMessages(prev => prev.map(m => 
                  m.id === assistantMessage.id ? { ...m, content: formatResponse(assistantContent) } : m
                ));
              }
            } catch {}
          }
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 400 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 400 }}
          className="fixed inset-y-0 right-0 w-full max-w-md bg-background border-l border-border shadow-2xl z-50 flex flex-col"
        >
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Analytics Copilot</h3>
                <p className="text-xs text-muted-foreground">Ask anything about the data</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Animated Suggestions - Always visible when no messages */}
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col justify-center overflow-hidden">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center px-6 mb-6"
              >
                <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <MessageCircle className="w-7 h-7 text-primary" />
                </div>
                <h4 className="text-lg font-medium mb-1">What would you like to know?</h4>
                <p className="text-sm text-muted-foreground">Click any suggestion or type your question</p>
              </motion.div>

              {/* Marquee Suggestions - 2 rows with opposite directions */}
              <div className="space-y-1">
                <MarqueeRow 
                  suggestions={INSIGHT_SUGGESTIONS_ROW1} 
                  direction="left" 
                  speed={30}
                  onSelect={sendMessage} 
                />
                <MarqueeRow 
                  suggestions={INSIGHT_SUGGESTIONS_ROW2} 
                  direction="right" 
                  speed={35}
                  onSelect={sendMessage} 
                />
              </div>
            </div>
          )}

          {/* Messages - Only show when there are messages */}
          {messages.length > 0 && (
            <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn('chat-bubble', msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai')}
                >
                  {msg.role === 'assistant' ? (
                    <div 
                      className="text-sm leading-relaxed prose prose-sm prose-invert max-w-none
                        prose-strong:text-primary prose-strong:font-semibold
                        prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-2
                        prose-p:my-2 prose-ul:my-2 prose-ol:my-2
                        prose-li:my-0.5"
                      dangerouslySetInnerHTML={{ 
                        __html: msg.content
                          .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                          .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                          .replace(/^### (.+)$/gm, '<h4>$1</h4>')
                          .replace(/^## (.+)$/gm, '<h3>$1</h3>')
                          .replace(/^# (.+)$/gm, '<h2>$1</h2>')
                          .replace(/^\d+\.\s+(.+)$/gm, '<li class="list-decimal ml-4">$1</li>')
                          .replace(/^[•\-]\s+(.+)$/gm, '<li class="list-disc ml-4">$1</li>')
                          .replace(/\n/g, '<br />')
                      }}
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  )}
                </motion.div>
              ))}
              {loading && messages[messages.length - 1]?.role === 'user' && (
                <div className="chat-bubble chat-bubble-ai flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Analyzing...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-border">
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about the appraisal data..."
                className="flex-1"
                disabled={loading}
              />
              <Button type="submit" disabled={loading || !input.trim()} size="icon">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
