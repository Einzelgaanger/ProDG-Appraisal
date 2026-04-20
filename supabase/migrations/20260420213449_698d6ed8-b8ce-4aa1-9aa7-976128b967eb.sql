DROP TRIGGER IF EXISTS trg_notify_review_milestone ON public.review_completions;
CREATE TRIGGER trg_notify_review_milestone
AFTER INSERT ON public.review_completions
FOR EACH ROW
EXECUTE FUNCTION public.notify_review_milestone();