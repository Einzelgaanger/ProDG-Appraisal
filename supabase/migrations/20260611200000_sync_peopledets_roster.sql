-- Sync ProDG roster from PeopleDets (Arabella PDF): admins, PMs, developers + phones.

ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS phone text;

INSERT INTO public.subsidiaries (name)
SELECT 'ProDG'
WHERE NOT EXISTS (SELECT 1 FROM public.subsidiaries WHERE name = 'ProDG');

INSERT INTO public.employees (name, email, phone, subsidiary_id, is_pm, department)
SELECT v.name, lower(v.email), v.phone, s.id, v.is_pm, v.department
FROM (
  VALUES
    ('Wayne Asava', 'wayne@prodg.studio', '+254706788314', false, 'Admin'),
    ('Noella Spitz', 'noella@prodg.studio', '+447852432181', false, 'Admin'),
    ('Abdul Rehmtulla', 'abdul@prodg.studio', '+254718066189', false, 'Admin'),
    ('Arabella Fanisheba', 'arabella@prodg.studio', '+254746853020', false, 'Admin'),
    ('Alfred', 'alfred@prodg.studio', NULL, true, 'Admin'),
    ('Alfiema', 'binfred.ke@gmail.com', NULL, true, 'Admin'),
    ('Jerome Mahia', 'jerome@prodg.studio', '+254796109942', true, 'Project Management'),
    ('Sumeiya Abdulle', 'sumeiya@prodg.studio', '+254794543523', true, 'Project Management'),
    ('Venessa Chebukwa', 'venessa@prodg.studio', '+254759890740', true, 'Project Management'),
    ('Nathan Mbugua', 'nathan@prodg.studio', '+254706446072', true, 'Project Management'),
    ('Wayne Williams', 'waynewilliams2028@gmail.com', '+254798609919', false, 'Engineering'),
    ('Jude Ocomi', 'ocomilj@gmail.com', '+254797437715', false, 'Engineering'),
    ('Munyao Lance', 'munyaolance1@gmail.com', '+254789885193', false, 'Engineering'),
    ('Winstone Were', 'stoniedev@gmail.com', '+254729291438', false, 'Engineering'),
    ('Mugambi Rintaugu', 'mugambirintaugu@gmail.com', '+254797118655', false, 'Engineering'),
    ('Kelvin Maritim', 'kelvin.maritim0@gmail.com', '+254797106604', false, 'Engineering'),
    ('Emmanuel Langat', 'mannuehkipkirui@gmail.com', '+254743520021', false, 'Engineering'),
    ('Emmanuel N. Omondi', 'emmanuelnomondi@gmail.com', '+254705307520', false, 'Engineering'),
    ('Myles Adebayo Johnson', 'mylesadebayo2021@gmail.com', '+254790518867', false, 'Engineering'),
    ('Franklin Karanja', 'franklinkaranja774@gmail.com', '+254706249104', false, 'Engineering'),
    ('Alloys Amasakha', 'alloys@eutopiantech.com', '+254797690422', false, 'Engineering'),
    ('Dave Ngahu', 'davengahu007@gmail.com', '+254712269707', false, 'Engineering'),
    ('Makena Wahu', 'makenawahu@gmail.com', '+254783782877', false, 'Engineering'),
    ('Cornelius Mutisya', 'corneliusmutisya11@gmail.com', '+254791063211', false, 'Engineering')
) AS v(name, email, phone, is_pm, department)
JOIN public.subsidiaries s ON s.name = 'ProDG'
WHERE NOT EXISTS (
  SELECT 1 FROM public.employees e
  WHERE lower(e.email) = lower(v.email) AND e.subsidiary_id = s.id
);

UPDATE public.employees e
SET name = v.name, phone = v.phone, is_pm = v.is_pm, department = v.department
FROM (
  VALUES
    ('Wayne Asava', 'wayne@prodg.studio', '+254706788314', false, 'Admin'),
    ('Noella Spitz', 'noella@prodg.studio', '+447852432181', false, 'Admin'),
    ('Abdul Rehmtulla', 'abdul@prodg.studio', '+254718066189', false, 'Admin'),
    ('Arabella Fanisheba', 'arabella@prodg.studio', '+254746853020', false, 'Admin'),
    ('Alfred', 'alfred@prodg.studio', NULL, true, 'Admin'),
    ('Alfiema', 'binfred.ke@gmail.com', NULL, true, 'Admin'),
    ('Jerome Mahia', 'jerome@prodg.studio', '+254796109942', true, 'Project Management'),
    ('Sumeiya Abdulle', 'sumeiya@prodg.studio', '+254794543523', true, 'Project Management'),
    ('Venessa Chebukwa', 'venessa@prodg.studio', '+254759890740', true, 'Project Management'),
    ('Nathan Mbugua', 'nathan@prodg.studio', '+254706446072', true, 'Project Management'),
    ('Wayne Williams', 'waynewilliams2028@gmail.com', '+254798609919', false, 'Engineering'),
    ('Jude Ocomi', 'ocomilj@gmail.com', '+254797437715', false, 'Engineering'),
    ('Munyao Lance', 'munyaolance1@gmail.com', '+254789885193', false, 'Engineering'),
    ('Winstone Were', 'stoniedev@gmail.com', '+254729291438', false, 'Engineering'),
    ('Mugambi Rintaugu', 'mugambirintaugu@gmail.com', '+254797118655', false, 'Engineering'),
    ('Kelvin Maritim', 'kelvin.maritim0@gmail.com', '+254797106604', false, 'Engineering'),
    ('Emmanuel Langat', 'mannuehkipkirui@gmail.com', '+254743520021', false, 'Engineering'),
    ('Emmanuel N. Omondi', 'emmanuelnomondi@gmail.com', '+254705307520', false, 'Engineering'),
    ('Myles Adebayo Johnson', 'mylesadebayo2021@gmail.com', '+254790518867', false, 'Engineering'),
    ('Franklin Karanja', 'franklinkaranja774@gmail.com', '+254706249104', false, 'Engineering'),
    ('Alloys Amasakha', 'alloys@eutopiantech.com', '+254797690422', false, 'Engineering'),
    ('Dave Ngahu', 'davengahu007@gmail.com', '+254712269707', false, 'Engineering'),
    ('Makena Wahu', 'makenawahu@gmail.com', '+254783782877', false, 'Engineering'),
    ('Cornelius Mutisya', 'corneliusmutisya11@gmail.com', '+254791063211', false, 'Engineering')
) AS v(name, email, phone, is_pm, department)
JOIN public.subsidiaries s ON s.name = 'ProDG'
WHERE lower(e.email) = lower(v.email) AND e.subsidiary_id = s.id;

-- Admin roles (when auth profile exists)
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::public.app_role
FROM public.profiles p
WHERE lower(p.email) IN (
  'wayne@prodg.studio', 'noella@prodg.studio', 'abdul@prodg.studio', 'arabella@prodg.studio',
  'alfred@prodg.studio', 'binfred.ke@gmail.com'
)
ON CONFLICT (user_id, role) DO NOTHING;

-- PM roles (when auth profile exists)
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'pm'::public.app_role
FROM public.profiles p
WHERE lower(p.email) IN (
  'jerome@prodg.studio', 'sumeiya@prodg.studio', 'venessa@prodg.studio', 'nathan@prodg.studio',
  'alfred@prodg.studio', 'binfred.ke@gmail.com'
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Developers must not carry admin/PM app roles
DELETE FROM public.user_roles ur
USING public.profiles p
WHERE ur.user_id = p.id
  AND ur.role IN ('admin', 'pm')
  AND lower(p.email) IN (
    'waynewilliams2028@gmail.com', 'ocomilj@gmail.com', 'munyaolance1@gmail.com',
    'stoniedev@gmail.com', 'mugambirintaugu@gmail.com', 'kelvin.maritim0@gmail.com',
    'mannuehkipkirui@gmail.com', 'emmanuelnomondi@gmail.com', 'mylesadebayo2021@gmail.com',
    'franklinkaranja774@gmail.com', 'alloys@eutopiantech.com', 'davengahu007@gmail.com',
    'makenawahu@gmail.com', 'corneliusmutisya11@gmail.com'
  );

-- Pure admins (not dual-role) should not have PM role
DELETE FROM public.user_roles ur
USING public.profiles p
WHERE ur.user_id = p.id AND ur.role = 'pm'
  AND lower(p.email) IN (
    'wayne@prodg.studio', 'noella@prodg.studio', 'abdul@prodg.studio', 'arabella@prodg.studio'
  );

-- Pure PMs should not have admin role
DELETE FROM public.user_roles ur
USING public.profiles p
WHERE ur.user_id = p.id AND ur.role = 'admin'
  AND lower(p.email) IN (
    'jerome@prodg.studio', 'sumeiya@prodg.studio', 'venessa@prodg.studio', 'nathan@prodg.studio'
  );
