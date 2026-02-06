-- Add branding column to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{}'::jsonb;

-- Update existing rows with default branding
UPDATE public.organizations
SET branding = '{}'::jsonb
WHERE branding IS NULL;

-- Ensure RLS policies allow updating branding field
-- (existing policies should already allow this if they use FOR ALL or FOR UPDATE)

-- Grant permissions for branding column
GRANT UPDATE (branding) ON public.organizations TO authenticated;

-- Add comment for documentation
COMMENT ON COLUMN public.organizations.branding IS 'JSONB field for organization branding settings including logo, colors, and other visual configurations';

-- Create index for better performance on branding queries
CREATE INDEX IF NOT EXISTS idx_organizations_branding ON public.organizations USING GIN (branding);

-- Add default branding structure for new organizations
CREATE OR REPLACE FUNCTION public.set_default_organization_branding()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.branding IS NULL OR NEW.branding = '{}'::jsonb THEN
    NEW.branding = jsonb_build_object(
      'logo', null,
      'primaryColor', '#2563eb',
      'secondaryColor', '#64748b',
      'backgroundColor', '#ffffff',
      'textColor', '#0f172a',
      'accentColor', '#f59e0b',
      'gradientStart', '#2563eb',
      'gradientEnd', '#1e40af'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for default branding
DROP TRIGGER IF EXISTS trg_set_default_branding ON public.organizations;
CREATE TRIGGER trg_set_default_branding
  BEFORE INSERT OR UPDATE OF branding ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_default_organization_branding();