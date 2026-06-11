-- Canonical ProDG appraisal roster (developers, PMs, admins) from PeopleDets + PM Wiki.
-- One employee row per person under subsidiary "ProDG". Idempotent.

INSERT INTO public.subsidiaries (name)
SELECT 'ProDG'
WHERE NOT EXISTS (SELECT 1 FROM public.subsidiaries WHERE name = 'ProDG');

INSERT INTO public.employees (name, email, subsidiary_id, is_pm, department)
SELECT v.name, lower(v.email), s.id, v.is_pm, v.department
FROM (
  VALUES
    -- Admins
    ('Wayne Asava', 'wayne@prodg.studio', false, 'Admin'),
    ('Noella Spitz', 'noella@prodg.studio', false, 'Admin'),
    ('Abdul Rehmtulla', 'abdul@prodg.studio', false, 'Admin'),
    ('Arabella Fanisheba', 'arabella@prodg.studio', false, 'Admin'),
    -- PMs
    ('Jerome Mahia', 'jerome@prodg.studio', true, 'Project Management'),
    ('Sumeiya Abdulle', 'sumeiya@prodg.studio', true, 'Project Management'),
    ('Venessa Chebukwa', 'venessa@prodg.studio', true, 'Project Management'),
    ('Nathan Mbugua', 'nathan@prodg.studio', true, 'Project Management'),
    -- Developers
    ('Wayne Williams', 'waynewilliams2028@gmail.com', false, 'Engineering'),
    ('Jude Ocomi', 'ocomilj@gmail.com', false, 'Engineering'),
    ('Munyao Lance', 'munyaolance1@gmail.com', false, 'Engineering'),
    ('Winstone Were', 'stoniedev@gmail.com', false, 'Engineering'),
    ('Mugambi Rintaugu', 'mugambirintaugu@gmail.com', false, 'Engineering'),
    ('Kelvin Maritim', 'kelvin.maritim0@gmail.com', false, 'Engineering'),
    ('Emmanuel Langat', 'mannuehkipkirui@gmail.com', false, 'Engineering'),
    ('Emmanuel N. Omondi', 'emmanuelnomondi@gmail.com', false, 'Engineering'),
    ('Myles Adebayo Johnson', 'mylesadebayo2021@gmail.com', false, 'Engineering'),
    ('Franklin Karanja', 'franklinkaranja774@gmail.com', false, 'Engineering'),
    ('Alloys Amasakha', 'alloys@eutopiantech.com', false, 'Engineering'),
    ('Dave Ngahu', 'davengahu007@gmail.com', false, 'Engineering'),
    ('Makena Wahu', 'makenawahu@gmail.com', false, 'Engineering'),
    ('Cornelius Mutisya', 'corneliusmutisya11@gmail.com', false, 'Engineering')
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
    ('Wayne Asava', 'wayne@prodg.studio', false, 'Admin'),
    ('Noella Spitz', 'noella@prodg.studio', false, 'Admin'),
    ('Abdul Rehmtulla', 'abdul@prodg.studio', false, 'Admin'),
    ('Arabella Fanisheba', 'arabella@prodg.studio', false, 'Admin'),
    ('Jerome Mahia', 'jerome@prodg.studio', true, 'Project Management'),
    ('Sumeiya Abdulle', 'sumeiya@prodg.studio', true, 'Project Management'),
    ('Venessa Chebukwa', 'venessa@prodg.studio', true, 'Project Management'),
    ('Nathan Mbugua', 'nathan@prodg.studio', true, 'Project Management'),
    ('Wayne Williams', 'waynewilliams2028@gmail.com', false, 'Engineering'),
    ('Jude Ocomi', 'ocomilj@gmail.com', false, 'Engineering'),
    ('Munyao Lance', 'munyaolance1@gmail.com', false, 'Engineering'),
    ('Winstone Were', 'stoniedev@gmail.com', false, 'Engineering'),
    ('Mugambi Rintaugu', 'mugambirintaugu@gmail.com', false, 'Engineering'),
    ('Kelvin Maritim', 'kelvin.maritim0@gmail.com', false, 'Engineering'),
    ('Emmanuel Langat', 'mannuehkipkirui@gmail.com', false, 'Engineering'),
    ('Emmanuel N. Omondi', 'emmanuelnomondi@gmail.com', false, 'Engineering'),
    ('Myles Adebayo Johnson', 'mylesadebayo2021@gmail.com', false, 'Engineering'),
    ('Franklin Karanja', 'franklinkaranja774@gmail.com', false, 'Engineering'),
    ('Alloys Amasakha', 'alloys@eutopiantech.com', false, 'Engineering'),
    ('Dave Ngahu', 'davengahu007@gmail.com', false, 'Engineering'),
    ('Makena Wahu', 'makenawahu@gmail.com', false, 'Engineering'),
    ('Cornelius Mutisya', 'corneliusmutisya11@gmail.com', false, 'Engineering')
) AS v(name, email, is_pm, department)
JOIN public.subsidiaries s ON s.name = 'ProDG'
WHERE lower(e.email) = lower(v.email)
  AND e.subsidiary_id = s.id;

-- Promote admin roles for profiles that already exist (auth users created separately).
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::public.app_role
FROM public.profiles p
WHERE lower(p.email) IN (
  'wayne@prodg.studio',
  'noella@prodg.studio',
  'abdul@prodg.studio',
  'arabella@prodg.studio'
)
ON CONFLICT (user_id, role) DO NOTHING;

-- PM roles for existing auth users.
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'pm'::public.app_role
FROM public.profiles p
WHERE lower(p.email) IN (
  'jerome@prodg.studio',
  'sumeiya@prodg.studio',
  'venessa@prodg.studio',
  'nathan@prodg.studio'
)
ON CONFLICT (user_id, role) DO NOTHING;
