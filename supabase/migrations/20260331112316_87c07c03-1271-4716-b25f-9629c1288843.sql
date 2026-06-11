
-- Drop the unique email constraint since people can be in multiple projects
DROP INDEX IF EXISTS idx_employees_email;

-- Insert subsidiaries (idempotent — skips names already seeded by earlier migrations)
INSERT INTO subsidiaries (id, name)
SELECT v.id, v.name
FROM (VALUES
  ('a0000001-0000-0000-0000-000000000001'::uuid, 'SME Project'),
  ('a0000001-0000-0000-0000-000000000002'::uuid, 'POE'),
  ('a0000001-0000-0000-0000-000000000003'::uuid, 'DealRoom'),
  ('a0000001-0000-0000-0000-000000000004'::uuid, 'Baobab'),
  ('a0000001-0000-0000-0000-000000000005'::uuid, 'PeopleTrak'),
  ('a0000001-0000-0000-0000-000000000006'::uuid, 'PI'),
  ('a0000001-0000-0000-0000-000000000007'::uuid, 'Resrv'),
  ('a0000001-0000-0000-0000-000000000008'::uuid, 'EduTech'),
  ('a0000001-0000-0000-0000-000000000009'::uuid, 'DANI'),
  ('a0000001-0000-0000-0000-00000000000a'::uuid, 'RICC'),
  ('a0000001-0000-0000-0000-00000000000b'::uuid, 'BoxCommerce'),
  ('a0000001-0000-0000-0000-00000000000c'::uuid, 'General')
) AS v(id, name)
WHERE NOT EXISTS (SELECT 1 FROM subsidiaries s WHERE s.name = v.name);

-- Insert employees for each project (resolve subsidiary by name so re-runs are safe)
INSERT INTO employees (name, email, subsidiary_id)
SELECT v.name, v.email, s.id
FROM (VALUES
  ('Jude Ocomil', 'ocomilj@gmail.com', 'SME Project'),
  ('Lance Munyao', 'munyaolance1@gmail.com', 'SME Project'),
  ('Winstone Were', 'stoniedev@gmail.com', 'SME Project'),
  ('Jerome Mahia', 'jerome@prodg.studio', 'SME Project'),

  ('Mugambi Rintaugu', 'mugambirintaugu@gmail.com', 'POE'),
  ('Emmanuel Langat', 'mannuehkipkirui@gmail.com', 'POE'),
  ('Kelvin Maritim', 'kelvin.maritim0@gmail.com', 'POE'),

  ('Nathan Mbugua', 'nathan@prodg.studio', 'DealRoom'),
  ('Emmanuel Omondi', 'emmanuelnomondi@gmail.com', 'DealRoom'),

  ('Nathan Mbugua', 'nathan@prodg.studio', 'Baobab'),
  ('Mugambi Rintaugu', 'mugambirintaugu@gmail.com', 'Baobab'),
  ('Wayne Asava', 'wayne@prodg.studio', 'Baobab'),

  ('Nathan Mbugua', 'nathan@prodg.studio', 'PeopleTrak'),
  ('Arabella Fanisheba', 'arabella@prodg.studio', 'PeopleTrak'),
  ('Alloys Amasakha', 'alloys.amasakha@prodg.studio', 'PeopleTrak'),
  ('Myles Johnson', 'mylesadebayo2021@gmail.com', 'PeopleTrak'),

  ('Nathan Mbugua', 'nathan@prodg.studio', 'PI'),
  ('Franklin Karanja', 'franklinkaranja774@gmail.com', 'PI'),
  ('Alloys Amasakha', 'alloys.amasakha@prodg.studio', 'PI'),
  ('Venessa Nalugala', 'venessa@prodg.studio', 'PI'),

  ('David Ngahu', 'davengahu007@gmail.com', 'Resrv'),
  ('Makena Wahu', 'makenawahu@gmail.com', 'Resrv'),
  ('Noella Spitz', 'noella@prodg.studio', 'Resrv'),

  ('Venessa Nalugala', 'venessa@prodg.studio', 'EduTech'),
  ('Franklin Karanja', 'franklinkaranja774@gmail.com', 'EduTech'),

  ('Alloys Amasakha', 'alloys.amasakha@prodg.studio', 'DANI'),
  ('Winstone Were', 'stoniedev@gmail.com', 'DANI'),
  ('Franklin Karanja', 'franklinkaranja774@gmail.com', 'DANI'),
  ('Venessa Nalugala', 'venessa@prodg.studio', 'DANI'),

  ('Jude Ocomil', 'ocomilj@gmail.com', 'RICC'),
  ('Wayne Williams', 'waynewilliams2028@gmail.com', 'RICC'),
  ('Nathan Mbugua', 'nathan@prodg.studio', 'RICC'),

  ('Jerome Mahia', 'jerome@prodg.studio', 'BoxCommerce'),
  ('Kelvin Maritim', 'kelvin.maritim0@gmail.com', 'BoxCommerce'),

  ('Wayne Asava', 'wayne@prodg.studio', 'General'),
  ('Venessa Nalugala', 'venessa@prodg.studio', 'General'),
  ('Wayne Williams', 'waynewilliams2028@gmail.com', 'General'),
  ('Alfred Maweu', 'alfred@prodg.studio', 'General'),
  ('Ann Kamau', 'ann@prodg.studio', 'General'),
  ('Mitch Ngugi', 'mitch@prodg.studio', 'General'),
  ('Abdul Rehmtulla', 'abdul@prodg.studio', 'General')
) AS v(name, email, subsidiary_name)
JOIN subsidiaries s ON s.name = v.subsidiary_name
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE lower(e.email) = lower(v.email)
    AND e.subsidiary_id = s.id
);
