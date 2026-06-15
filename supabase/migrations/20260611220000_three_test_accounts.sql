-- Three separate test accounts (one role each), random display names, fixed emails.

INSERT INTO public.employees (name, email, subsidiary_id, is_pm, department)
SELECT v.name, lower(v.email), s.id, v.is_pm, v.department
FROM (
  VALUES
    ('Morgan Ellison', 'alfred@prodg.studio', false, 'Admin'),
    ('Jordan Okonkwo', 'binfred.ke@gmail.com', true, 'Project Management'),
    ('Casey Rivers', 'alfred@frontierfinance.org', false, 'Engineering')
) AS v(name, email, is_pm, department)
JOIN public.subsidiaries s ON s.name = 'ProDG'
WHERE NOT EXISTS (
  SELECT 1 FROM public.employees e
  WHERE lower(e.email) = lower(v.email) AND e.subsidiary_id = s.id
);

UPDATE public.employees e
SET name = v.name, is_pm = v.is_pm, department = v.department
FROM (
  VALUES
    ('Morgan Ellison', 'alfred@prodg.studio', false, 'Admin'),
    ('Jordan Okonkwo', 'binfred.ke@gmail.com', true, 'Project Management'),
    ('Casey Rivers', 'alfred@frontierfinance.org', false, 'Engineering')
) AS v(name, email, is_pm, department)
JOIN public.subsidiaries s ON s.name = 'ProDG'
WHERE lower(e.email) = lower(v.email) AND e.subsidiary_id = s.id;

-- alfred@prodg.studio — admin only
DELETE FROM public.user_roles ur
USING public.profiles p
WHERE ur.user_id = p.id AND lower(p.email) = 'alfred@prodg.studio' AND ur.role = 'pm';

INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::public.app_role
FROM public.profiles p
WHERE lower(p.email) = 'alfred@prodg.studio'
ON CONFLICT (user_id, role) DO NOTHING;

-- binfred.ke@gmail.com — PM only
DELETE FROM public.user_roles ur
USING public.profiles p
WHERE ur.user_id = p.id AND lower(p.email) = 'binfred.ke@gmail.com' AND ur.role = 'admin';

INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'pm'::public.app_role
FROM public.profiles p
WHERE lower(p.email) = 'binfred.ke@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- alfred@frontierfinance.org — developer only
DELETE FROM public.user_roles ur
USING public.profiles p
WHERE ur.user_id = p.id
  AND lower(p.email) = 'alfred@frontierfinance.org'
  AND ur.role IN ('admin', 'pm');
