-- PM-evaluates-developers model
-- 1. Add a 'pm' (project manager) auth role used for route/tab gating.
-- 2. Flag which employees are PMs so they can be excluded from the developer pool.

-- Add the 'pm' role to the app_role enum (idempotent).
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'pm';

-- Flag PM employees. Developers are employees where is_pm = false.
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS is_pm boolean NOT NULL DEFAULT false;
