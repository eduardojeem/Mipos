-- Seed de usuarios y sesiones para pruebas en /admin/sessions

BEGIN;

-- Usuarios demo
WITH demo_users(id, email, name) AS (
  VALUES
    ('11111111-1111-4111-8111-111111111111', 'admin1@example.com', 'Admin Uno'),
    ('22222222-2222-4222-8222-222222222222', 'admin2@example.com', 'Admin Dos'),
    ('33333333-3333-4333-8333-333333333333', 'user1@example.com',  'Usuario Uno'),
    ('44444444-4444-4444-8444-444444444444', 'user2@example.com',  'Usuario Dos'),
    ('55555555-5555-4555-8555-555555555555', 'user3@example.com',  'Usuario Tres')
)
INSERT INTO public.users (id, email, full_name)
SELECT id::uuid, email, name FROM demo_users
ON CONFLICT (id) DO NOTHING;

-- Sesiones demo (activas y expiradas)
INSERT INTO public.user_sessions (
  id,
  user_id,
  supabase_session_id,
  ip_address,
  user_agent,
  is_active,
  last_activity,
  created_at,
  expires_at
) VALUES
  (gen_random_uuid(), '11111111-1111-4111-8111-111111111111'::uuid, gen_random_uuid()::text, '192.168.1.10', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0', true,  now() - interval '5 minutes',  now() - interval '1 hour',  now() + interval '7 days'),
  (gen_random_uuid(), '22222222-2222-4222-8222-222222222222'::uuid, gen_random_uuid()::text, '192.168.1.11', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) Safari/17.0', true,  now() - interval '10 minutes', now() - interval '2 hours', now() + interval '6 days'),
  (gen_random_uuid(), '33333333-3333-4333-8333-333333333333'::uuid, gen_random_uuid()::text, '192.168.1.12', 'Mozilla/5.0 (Linux; Android 12) Mobile Chrome/119.0', true,  now() - interval '2 minutes',  now() - interval '30 minutes', now() + interval '5 days'),
  (gen_random_uuid(), '44444444-4444-4444-8444-444444444444'::uuid, gen_random_uuid()::text, '192.168.1.13', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0) Mobile Safari/17.0', true,  now() - interval '1 minutes',  now() - interval '10 minutes', now() + interval '3 days'),
  (gen_random_uuid(), '55555555-5555-4555-8555-555555555555'::uuid, gen_random_uuid()::text, '192.168.1.14', 'Mozilla/5.0 (iPad; CPU OS 16_0) Tablet Safari/17.0', true,  now() - interval '15 minutes', now() - interval '3 hours',  now() + interval '2 days'),
  (gen_random_uuid(), '11111111-1111-4111-8111-111111111111'::uuid, gen_random_uuid()::text, '10.0.0.1',     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/121.0', false, now() - interval '1 day',     now() - interval '8 days',  now() - interval '1 days'),
  (gen_random_uuid(), '22222222-2222-4222-8222-222222222222'::uuid, gen_random_uuid()::text, '10.0.0.2',     'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) Safari/16.0',   false, now() - interval '2 days',    now() - interval '9 days',  now() - interval '2 days'),
  (gen_random_uuid(), '33333333-3333-4333-8333-333333333333'::uuid, gen_random_uuid()::text, '10.0.0.3',     'Mozilla/5.0 (Linux; Android 11) Mobile Chrome/118.0',        false, now() - interval '3 days',    now() - interval '10 days', now() - interval '3 days'),
  (gen_random_uuid(), '44444444-4444-4444-8444-444444444444'::uuid, gen_random_uuid()::text, '10.0.0.4',     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/120.0',       false, now() - interval '4 days',    now() - interval '11 days', now() - interval '4 days'),
  (gen_random_uuid(), '55555555-5555-4555-8555-555555555555'::uuid, gen_random_uuid()::text, '10.0.0.5',     'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0) Mobile Safari/16.0',false, now() - interval '5 days',    now() - interval '12 days', now() - interval '5 days');

COMMIT;
