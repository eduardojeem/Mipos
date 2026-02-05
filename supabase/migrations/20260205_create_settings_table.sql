-- Migration: Create settings table with organization support
-- Date: 2026-02-05
-- Purpose: Create settings table for organization-scoped configuration

-- ============================================================================
-- STEP 1: Create settings table
-- ============================================================================

CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: one key per organization
  CONSTRAINT settings_org_key_unique UNIQUE(organization_id, key)
);

-- ============================================================================
-- STEP 2: Create indexes for performance
-- ============================================================================

-- Index for organization-based queries
CREATE INDEX IF NOT EXISTS idx_settings_org_id ON settings(organization_id);

-- Composite index for the most common query pattern
CREATE INDEX IF NOT EXISTS idx_settings_org_key ON settings(organization_id, key);

-- Index for key-based lookups (less common but still useful)
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- ============================================================================
-- STEP 3: Create helper functions (if not already exist)
-- ============================================================================

-- Function to check if current user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'SUPER_ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's organization IDs
CREATE OR REPLACE FUNCTION get_my_org_ids()
RETURNS UUID[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 4: Enable RLS on settings table
-- ============================================================================

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: Create RLS policies
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "settings_read_tenant" ON settings;
DROP POLICY IF EXISTS "settings_insert_admin" ON settings;
DROP POLICY IF EXISTS "settings_update_admin" ON settings;
DROP POLICY IF EXISTS "settings_delete_admin" ON settings;

-- Users can read settings from their organizations
-- Super admins can read all settings
CREATE POLICY "settings_read_tenant"
ON settings FOR SELECT
USING (
  is_super_admin() OR
  organization_id IN (SELECT unnest(get_my_org_ids()))
);

-- Admins can insert settings for their organizations
-- Super admins can insert for any organization
CREATE POLICY "settings_insert_admin"
ON settings FOR INSERT
WITH CHECK (
  is_super_admin() OR
  organization_id IN (SELECT unnest(get_my_org_ids()))
);

-- Admins can update settings for their organizations
-- Super admins can update any organization's settings
CREATE POLICY "settings_update_admin"
ON settings FOR UPDATE
USING (
  is_super_admin() OR
  organization_id IN (SELECT unnest(get_my_org_ids()))
);

-- Admins can delete settings for their organizations
-- Super admins can delete any organization's settings
CREATE POLICY "settings_delete_admin"
ON settings FOR DELETE
USING (
  is_super_admin() OR
  organization_id IN (SELECT unnest(get_my_org_ids()))
);

-- ============================================================================
-- STEP 6: Create default business_config for each organization
-- ============================================================================

-- Insert default business_config for all existing organizations
INSERT INTO settings (key, value, organization_id, created_at, updated_at)
SELECT 
  'business_config' as key,
  '{
    "businessName": "Mi Empresa",
    "contact": {
      "email": "",
      "phone": "",
      "website": ""
    },
    "address": {
      "street": "",
      "city": "",
      "state": "",
      "country": "Paraguay",
      "zipCode": ""
    },
    "storeSettings": {
      "currency": "PYG",
      "currencySymbol": "₲",
      "taxRate": 0.10,
      "lowStockThreshold": 10,
      "enableInventoryTracking": true,
      "enableBarcodeScanner": false,
      "printReceipts": true,
      "enableCashDrawer": false
    },
    "regional": {
      "timezone": "America/Asuncion",
      "language": "es-PY",
      "locale": "es-PY"
    },
    "branding": {
      "primaryColor": "#2563eb",
      "logo": "",
      "favicon": ""
    },
    "systemSettings": {
      "autoBackup": true,
      "backupFrequency": "daily",
      "maxUsers": 50,
      "sessionTimeout": 30,
      "enableLogging": true,
      "logLevel": "info",
      "security": {
        "requireStrongPasswords": true,
        "enableTwoFactor": false,
        "maxLoginAttempts": 5,
        "lockoutDuration": 15
      },
      "email": {
        "provider": "smtp",
        "smtpHost": "",
        "smtpPort": 587,
        "smtpUser": "",
        "smtpPassword": ""
      }
    },
    "notifications": {
      "emailNotifications": false,
      "pushNotifications": false,
      "smsNotifications": false
    },
    "legalInfo": {
      "ruc": "",
      "businessType": "",
      "taxId": ""
    },
    "legalDocuments": {
      "termsUrl": "",
      "privacyUrl": ""
    },
    "carousel": {
      "enabled": false,
      "autoplay": true,
      "transitionSeconds": 5,
      "transitionMs": 500,
      "ratio": 2.5,
      "images": []
    },
    "homeOffersCarousel": {
      "enabled": true,
      "autoplay": true,
      "intervalSeconds": 5,
      "transitionMs": 500,
      "ratio": 2.5
    }
  }'::jsonb as value,
  o.id as organization_id,
  NOW() as created_at,
  NOW() as updated_at
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM settings s 
  WHERE s.key = 'business_config' 
  AND s.organization_id = o.id
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show table structure
DO $$
DECLARE
  table_exists BOOLEAN;
  total_orgs INTEGER;
  total_settings INTEGER;
  orgs_with_config INTEGER;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'settings'
  ) INTO table_exists;
  
  IF table_exists THEN
    RAISE NOTICE '✓ Settings table created successfully';
    
    -- Count organizations
    SELECT COUNT(*) INTO total_orgs FROM organizations;
    RAISE NOTICE '  Total organizations: %', total_orgs;
    
    -- Count settings
    SELECT COUNT(*) INTO total_settings FROM settings;
    RAISE NOTICE '  Total settings records: %', total_settings;
    
    -- Count organizations with business_config
    SELECT COUNT(DISTINCT organization_id) INTO orgs_with_config 
    FROM settings 
    WHERE key = 'business_config';
    RAISE NOTICE '  Organizations with business_config: %', orgs_with_config;
    
    IF orgs_with_config = total_orgs THEN
      RAISE NOTICE '✓ All organizations have default business_config';
    ELSE
      RAISE WARNING '⚠ Some organizations missing business_config';
    END IF;
  ELSE
    RAISE EXCEPTION '✗ Settings table was not created';
  END IF;
END $$;

-- Show sample data
SELECT 
  s.key,
  s.organization_id,
  o.name as organization_name,
  s.created_at
FROM settings s
LEFT JOIN organizations o ON s.organization_id = o.id
ORDER BY s.created_at DESC
LIMIT 5;

-- Show RLS policies
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies
WHERE tablename = 'settings'
ORDER BY policyname;
