
-- Insert sample organizations
INSERT INTO public.organizations (name, slug, subscription_plan, subscription_status, settings)
VALUES
  ('Acme Corp', 'acme-corp', 'ENTERPRISE', 'ACTIVE', '{"theme": "dark", "notifications": true}'),
  ('Globex Corporation', 'globex', 'PRO', 'ACTIVE', '{"theme": "light", "notifications": false}'),
  ('Soylent Corp', 'soylent', 'FREE', 'ACTIVE', '{"theme": "system", "notifications": true}')
ON CONFLICT (slug) DO NOTHING;
