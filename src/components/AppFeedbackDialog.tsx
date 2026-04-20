import { useState } from 'react';
import { MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AppFeedbackDialogProps {
  userId?: string;
  page?: string;
}

export default function AppFeedbackDialog({ userId, page = 'hub' }: AppFeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submitFeedback = async () => {
    const trimmed = message.trim();
    if (!userId || trimmed.length < 8) {
      toast.error('Please write a little more detail.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from('app_feedback').insert({
        user_id: userId,
        page,
        message: trimmed,
      });
      if (error) throw error;
      toast.success('Feedback sent. Thank you.');
      setMessage('');
      setOpen(false);
    } catch (error) {
      console.error('App feedback submit failed:', error);
      toast.error('Could not send feedback. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-2 font-bold uppercase tracking-[0.08em] text-[10px]">
          <MessageSquare className="h-3.5 w-3.5" /> Feedback for us
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-1.5rem)] border-2 border-foreground p-0 sm:max-w-lg sm:rounded-none">
        <DialogHeader className="border-b-2 border-foreground/10 p-5 text-left">
          <div className="label-mono mb-1">// help_improve_prodG</div>
          <DialogTitle className="text-xl uppercase">Tell us what to improve</DialogTitle>
          <DialogDescription>
            Share thoughts on the survey, scoring, wording, mobile experience, or anything that felt unclear.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 p-5">
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="What should we improve? Be honest and specific."
            className="min-h-[150px] resize-none border-2 text-sm focus:border-accent"
            maxLength={1200}
          />
          <div className="flex items-center justify-between gap-3">
            <span className="mono text-[10px] text-muted-foreground">{message.length}/1200</span>
            <Button onClick={submitFeedback} disabled={submitting || message.trim().length < 8} className="font-bold uppercase tracking-[0.08em] text-xs">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send feedback
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
