CREATE TABLE public.growth_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  insight TEXT NOT NULL,
  context_hash TEXT NOT NULL,
  resource_count INTEGER NOT NULL DEFAULT 0,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.growth_insights ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_growth_insights_user_generated ON public.growth_insights (user_id, generated_at DESC);
CREATE INDEX idx_growth_insights_employee_generated ON public.growth_insights (employee_id, generated_at DESC);
CREATE INDEX idx_growth_insights_context_hash ON public.growth_insights (context_hash);

CREATE POLICY "Users can view their own growth insights"
ON public.growth_insights
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all growth insights"
ON public.growth_insights
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage growth insights"
ON public.growth_insights
FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_growth_insights_updated_at
BEFORE UPDATE ON public.growth_insights
FOR EACH ROW
EXECUTE FUNCTION public.update_app_feedback_updated_at();