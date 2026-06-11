-- Track admin notifications per PM project group (not per developer submission).

CREATE TABLE IF NOT EXISTS public.pm_group_admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pm_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_name text NOT NULL,
  assignment_ids uuid[] NOT NULL,
  notified_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_group_admin_notif_lookup
  ON public.pm_group_admin_notifications (pm_user_id, group_name);

ALTER TABLE public.pm_group_admin_notifications ENABLE ROW LEVEL SECURITY;
