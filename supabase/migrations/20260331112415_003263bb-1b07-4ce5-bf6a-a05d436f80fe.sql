
INSERT INTO user_roles (user_id, role)
SELECT p.id, 'admin'
FROM profiles p
WHERE p.email = 'alfred@prodg.studio'
ON CONFLICT DO NOTHING;
