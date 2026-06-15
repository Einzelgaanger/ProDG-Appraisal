-- Test accounts: Alfiema (binfred.ke@gmail.com) = admin + PM; Alfred = developer only.

-- Retire mistaken dual-role test login at alfred@prodg.studio
DELETE FROM public.user_roles ur
USING public.profiles p
WHERE ur.user_id = p.id
  AND lower(p.email) = 'alfred@prodg.studio';

DELETE FROM public.employees e
USING public.subsidiaries s
WHERE e.subsidiary_id = s.id
  AND s.name = 'ProDG'
  AND lower(e.email) = 'alfred@prodg.studio';

INSERT INTO public.employees (name, email, subsidiary_id, is_pm, department)
SELECT 'Alfred', 'alfred@frontierfinance.org', s.id, false, 'Engineering'
FROM public.subsidiaries s
WHERE s.name = 'ProDG'
  AND NOT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE lower(e.email) = 'alfred@frontierfinance.org'
      AND e.subsidiary_id = s.id
  );

UPDATE public.employees e
SET name = 'Alfred', is_pm = false, department = 'Engineering'
FROM public.subsidiaries s
WHERE e.subsidiary_id = s.id
  AND s.name = 'ProDG'
  AND lower(e.email) = 'alfred@frontierfinance.org';

DELETE FROM public.user_roles ur
USING public.profiles p
WHERE ur.user_id = p.id
  AND ur.role IN ('admin', 'pm')
  AND lower(p.email) = 'alfred@frontierfinance.org';

INSERT INTO public.user_roles (user_id, role)
SELECT p.id, r.role::public.app_role
FROM public.profiles p
CROSS JOIN (VALUES ('admin'), ('pm')) AS r(role)
WHERE lower(p.email) = 'binfred.ke@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

DELETE FROM public.user_roles ur
USING public.profiles p
WHERE ur.user_id = p.id
  AND ur.role = 'pm'
  AND lower(p.email) IN (
    'wayne@prodg.studio', 'noella@prodg.studio', 'abdul@prodg.studio', 'arabella@prodg.studio'
  );

DELETE FROM public.user_roles ur
USING public.profiles p
WHERE ur.user_id = p.id
  AND ur.role = 'admin'
  AND lower(p.email) IN (
    'jerome@prodg.studio', 'sumeiya@prodg.studio', 'venessa@prodg.studio', 'nathan@prodg.studio'
  );
