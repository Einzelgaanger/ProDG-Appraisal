-- Add department column to employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS department text;

-- Add new subsidiaries that don't exist yet
INSERT INTO subsidiaries (name) 
SELECT name FROM (VALUES 
  ('Advancly'), ('Argon Bluechip'), ('Avitech'), ('Bursery'), 
  ('Fleap'), ('PeopleOS'), ('Technest Solicitors'), ('Trips'), 
  ('VGG Manco'), ('VGN')
) AS new_subs(name)
WHERE NOT EXISTS (SELECT 1 FROM subsidiaries WHERE subsidiaries.name = new_subs.name);