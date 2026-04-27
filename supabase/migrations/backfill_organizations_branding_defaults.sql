UPDATE public.organizations
SET branding = jsonb_build_object(
  'logo', NULL,
  'primaryColor', '#2563eb',
  'secondaryColor', '#64748b',
  'backgroundColor', '#ffffff',
  'textColor', '#0f172a',
  'accentColor', '#f59e0b',
  'gradientStart', '#2563eb',
  'gradientEnd', '#1e40af'
)
WHERE branding = '{}'::jsonb OR branding IS NULL;

