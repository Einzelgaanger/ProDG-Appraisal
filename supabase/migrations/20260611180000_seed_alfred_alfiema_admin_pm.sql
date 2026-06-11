-- Alfred + Alfiema: admin and PM roles under ProDG.

INSERT INTO public.employees (name, email, subsidiary_id, is_pm, department)
SELECT v.name, lower(v.email), s.id, v.is_pm, v.department
FROM (
  VALUES
    ('Alfred', 'alfred@prodg.studio', true, 'Admin'),
    ('Alfiema', 'binfred.ke@gmail.com', true, 'Admin')
) AS v(name, email, is_pm, department)
JOIN public.subsidiaries s ON s.name = 'ProDG'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.employees e
  WHERE lower(e.email) = lower(v.email)
    AND e.subsidiary_id = s.id
);

UPDATE public.employees e
SET
  name = v.name,
  is_pm = v.is_pm,
  department = v.department
FROM (
  VALUES
    ('Alfred', 'alfred@prodg.studio', true, 'Admin'),
    ('Alfiema', 'binfred.ke@gmail.com', true, 'Admin')
) AS v(name, email, is_pm, department)
JOIN public.subsidiaries s ON s.name = 'ProDG'
WHERE lower(e.email) = lower(v.email)
  AND e.subsidiary_id = s.id;

INSERT INTO public.user_roles (user_id, role)
SELECT p.id, r.role::public.app_role
FROM public.profiles p
CROSS JOIN (VALUES ('admin'), ('pm')) AS r(role)
WHERE lower(p.email) IN ('alfred@prodg.studio', 'binfred.ke@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;
