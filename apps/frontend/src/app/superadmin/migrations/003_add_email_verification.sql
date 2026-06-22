-- Migration: Add email verification system
-- Description: Support email verification for new signups
-- Created: 2026-06-22

-- 1. Update organizations table to track email verification
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{"emailVerified": false}';

-- Create index for email verified queries
CREATE INDEX IF NOT EXISTS idx_organizations_email_verified
ON organizations USING GIN ((settings->'emailVerified'));

-- 2. Update users table to track email verification
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_email_verified
ON users(email_verified);

-- 3. Create email verification codes table (for alternative code-based flow)
CREATE TABLE IF NOT EXISTS email_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code VARCHAR(6) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  verified_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '24 hours'),

  CONSTRAINT valid_code CHECK (code ~ '^\d{6}$'),
  UNIQUE(user_id, code)
);

CREATE INDEX IF NOT EXISTS idx_verification_codes_user
ON email_verification_codes(user_id);

CREATE INDEX IF NOT EXISTS idx_verification_codes_user_code
ON email_verification_codes(user_id, code);

CREATE INDEX IF NOT EXISTS idx_verification_codes_expires
ON email_verification_codes(expires_at);

-- 4. Create email verification tokens table (for token-based flow via Supabase Auth)
-- Note: Supabase Auth handles the actual tokens, this is just for tracking
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  verified_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '24 hours'),

  UNIQUE(user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_verification_tokens_org
ON email_verification_tokens(organization_id);

CREATE INDEX IF NOT EXISTS idx_verification_tokens_expires
ON email_verification_tokens(expires_at);

-- 5. Create function to clean up expired verification codes
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM email_verification_codes
  WHERE expires_at < now()
  AND verified_at IS NULL;

  DELETE FROM email_verification_tokens
  WHERE expires_at < now()
  AND verified_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- 6. Create function to mark organization as email verified
CREATE OR REPLACE FUNCTION mark_organization_email_verified(org_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE organizations
  SET settings = jsonb_set(
    COALESCE(settings, '{}'),
    '{emailVerified}',
    'true'
  )
  WHERE id = org_id;

  UPDATE users
  SET email_verified = true
  WHERE organization_id = org_id;

  -- Cleanup verification codes for this org
  DELETE FROM email_verification_tokens
  WHERE organization_id = org_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to auto-cleanup expired codes daily
CREATE OR REPLACE FUNCTION trigger_cleanup_expired_codes()
RETURNS TRIGGER AS $$
BEGIN
  -- This would be called periodically (daily) to clean up expired codes
  PERFORM cleanup_expired_verification_codes();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Note: Schedule this cleanup with pg_cron or your application scheduler
-- SELECT cron.schedule('cleanup-verification-codes', '0 0 * * *', 'SELECT cleanup_expired_verification_codes()');

-- 8. Add verification status to organizations view
-- (If you have a view for organization details, add the email_verified field)

COMMENT ON TABLE email_verification_codes IS 'Store verification codes for email confirmation (6-digit codes, 24h expiration)';
COMMENT ON TABLE email_verification_tokens IS 'Track email verification tokens from Supabase Auth';
COMMENT ON FUNCTION cleanup_expired_verification_codes() IS 'Remove expired, unverified codes (schedule daily)';
COMMENT ON FUNCTION mark_organization_email_verified(UUID) IS 'Mark organization and user as email verified';
