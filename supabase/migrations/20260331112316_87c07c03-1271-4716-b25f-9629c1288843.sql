
-- Drop the unique email constraint since people can be in multiple projects
DROP INDEX IF EXISTS idx_employees_email;

-- Insert subsidiaries
INSERT INTO subsidiaries (id, name) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'SME Project'),
  ('a0000001-0000-0000-0000-000000000002', 'POE'),
  ('a0000001-0000-0000-0000-000000000003', 'DealRoom'),
  ('a0000001-0000-0000-0000-000000000004', 'Baobab'),
  ('a0000001-0000-0000-0000-000000000005', 'PeopleTrak'),
  ('a0000001-0000-0000-0000-000000000006', 'PI'),
  ('a0000001-0000-0000-0000-000000000007', 'Resrv'),
  ('a0000001-0000-0000-0000-000000000008', 'EduTech'),
  ('a0000001-0000-0000-0000-000000000009', 'DANI'),
  ('a0000001-0000-0000-0000-00000000000a', 'RICC'),
  ('a0000001-0000-0000-0000-00000000000b', 'BoxCommerce'),
  ('a0000001-0000-0000-0000-00000000000c', 'General');

-- Insert employees for each project
INSERT INTO employees (name, email, subsidiary_id) VALUES
  ('Jude Ocomil', 'ocomilj@gmail.com', 'a0000001-0000-0000-0000-000000000001'),
  ('Lance Munyao', 'munyaolance1@gmail.com', 'a0000001-0000-0000-0000-000000000001'),
  ('Winstone Were', 'stoniedev@gmail.com', 'a0000001-0000-0000-0000-000000000001'),
  ('Jerome Mahia', 'jerome@prodg.studio', 'a0000001-0000-0000-0000-000000000001'),

  ('Mugambi Rintaugu', 'mugambirintaugu@gmail.com', 'a0000001-0000-0000-0000-000000000002'),
  ('Emmanuel Langat', 'mannuehkipkirui@gmail.com', 'a0000001-0000-0000-0000-000000000002'),
  ('Kelvin Maritim', 'kelvin.maritim0@gmail.com', 'a0000001-0000-0000-0000-000000000002'),

  ('Nathan Mbugua', 'nathan@prodg.studio', 'a0000001-0000-0000-0000-000000000003'),
  ('Emmanuel Omondi', 'emmanuelnomondi@gmail.com', 'a0000001-0000-0000-0000-000000000003'),

  ('Nathan Mbugua', 'nathan@prodg.studio', 'a0000001-0000-0000-0000-000000000004'),
  ('Mugambi Rintaugu', 'mugambirintaugu@gmail.com', 'a0000001-0000-0000-0000-000000000004'),
  ('Wayne Asava', 'wayne@prodg.studio', 'a0000001-0000-0000-0000-000000000004'),

  ('Nathan Mbugua', 'nathan@prodg.studio', 'a0000001-0000-0000-0000-000000000005'),
  ('Arabella Fanisheba', 'arabella@prodg.studio', 'a0000001-0000-0000-0000-000000000005'),
  ('Alloys Amasakha', 'alloys.amasakha@prodg.studio', 'a0000001-0000-0000-0000-000000000005'),
  ('Myles Johnson', 'mylesadebayo2021@gmail.com', 'a0000001-0000-0000-0000-000000000005'),

  ('Nathan Mbugua', 'nathan@prodg.studio', 'a0000001-0000-0000-0000-000000000006'),
  ('Franklin Karanja', 'franklinkaranja774@gmail.com', 'a0000001-0000-0000-0000-000000000006'),
  ('Alloys Amasakha', 'alloys.amasakha@prodg.studio', 'a0000001-0000-0000-0000-000000000006'),
  ('Venessa Nalugala', 'venessa@prodg.studio', 'a0000001-0000-0000-0000-000000000006'),

  ('David Ngahu', 'davengahu007@gmail.com', 'a0000001-0000-0000-0000-000000000007'),
  ('Makena Wahu', 'makenawahu@gmail.com', 'a0000001-0000-0000-0000-000000000007'),
  ('Noella Spitz', 'noella@prodg.studio', 'a0000001-0000-0000-0000-000000000007'),

  ('Venessa Nalugala', 'venessa@prodg.studio', 'a0000001-0000-0000-0000-000000000008'),
  ('Franklin Karanja', 'franklinkaranja774@gmail.com', 'a0000001-0000-0000-0000-000000000008'),

  ('Alloys Amasakha', 'alloys.amasakha@prodg.studio', 'a0000001-0000-0000-0000-000000000009'),
  ('Winstone Were', 'stoniedev@gmail.com', 'a0000001-0000-0000-0000-000000000009'),
  ('Franklin Karanja', 'franklinkaranja774@gmail.com', 'a0000001-0000-0000-0000-000000000009'),
  ('Venessa Nalugala', 'venessa@prodg.studio', 'a0000001-0000-0000-0000-000000000009'),

  ('Jude Ocomil', 'ocomilj@gmail.com', 'a0000001-0000-0000-0000-00000000000a'),
  ('Wayne Williams', 'waynewilliams2028@gmail.com', 'a0000001-0000-0000-0000-00000000000a'),
  ('Nathan Mbugua', 'nathan@prodg.studio', 'a0000001-0000-0000-0000-00000000000a'),

  ('Jerome Mahia', 'jerome@prodg.studio', 'a0000001-0000-0000-0000-00000000000b'),
  ('Kelvin Maritim', 'kelvin.maritim0@gmail.com', 'a0000001-0000-0000-0000-00000000000b'),

  ('Wayne Asava', 'wayne@prodg.studio', 'a0000001-0000-0000-0000-00000000000c'),
  ('Venessa Nalugala', 'venessa@prodg.studio', 'a0000001-0000-0000-0000-00000000000c'),
  ('Wayne Williams', 'waynewilliams2028@gmail.com', 'a0000001-0000-0000-0000-00000000000c'),
  ('Alfred Maweu', 'alfred@prodg.studio', 'a0000001-0000-0000-0000-00000000000c'),
  ('Ann Kamau', 'ann@prodg.studio', 'a0000001-0000-0000-0000-00000000000c'),
  ('Mitch Ngugi', 'mitch@prodg.studio', 'a0000001-0000-0000-0000-00000000000c'),
  ('Abdul Rehmtulla', 'abdul@prodg.studio', 'a0000001-0000-0000-0000-00000000000c');
