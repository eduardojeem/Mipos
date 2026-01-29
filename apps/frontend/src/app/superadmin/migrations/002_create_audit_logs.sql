-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  user_id UUID,
  user_email TEXT,
  organization_id UUID,
  organization_name TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  severity TEXT NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON audit_logs(organization_id, created_at DESC);

-- Add comment
COMMENT ON TABLE audit_logs IS 'Audit trail for all critical system actions';

-- Helper function to create audit log
CREATE OR REPLACE FUNCTION create_audit_log(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_user_email TEXT DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_organization_name TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT 'INFO'
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    action,
    entity_type,
    entity_id,
    user_id,
    user_email,
    organization_id,
    organization_name,
    metadata,
    ip_address,
    user_agent,
    severity
  ) VALUES (
    p_action,
    p_entity_type,
    p_entity_id,
    p_user_id,
    p_user_email,
    p_organization_id,
    p_organization_name,
    p_metadata,
    p_ip_address,
    p_user_agent,
    p_severity
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Add automatic audit logging for organizations table
CREATE OR REPLACE FUNCTION log_organization_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM create_audit_log(
      'organization.created',
      'organization',
      NEW.id::TEXT,
      NULL,
      NULL,
      NEW.id,
      NEW.name,
      jsonb_build_object(
        'name', NEW.name,
        'slug', NEW.slug,
        'plan', NEW.subscription_plan
      ),
      NULL,
      NULL,
      'INFO'
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM create_audit_log(
      'organization.updated',
      'organization',
      NEW.id::TEXT,
      NULL,
      NULL,
      NEW.id,
      NEW.name,
      jsonb_build_object(
        'changes', jsonb_build_object(
          'old_name', OLD.name,
          'new_name', NEW.name,
          'old_plan', OLD.subscription_plan,
          'new_plan', NEW.subscription_plan
        )
      ),
      NULL,
      NULL,
      CASE WHEN OLD.subscription_plan != NEW.subscription_plan THEN 'WARNING' ELSE 'INFO' END
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM create_audit_log(
      'organization.deleted',
      'organization',
      OLD.id::TEXT,
      NULL,
      NULL,
      OLD.id,
      OLD.name,
      jsonb_build_object(
        'name', OLD.name,
        'slug', OLD.slug
      ),
      NULL,
      NULL,
      'CRITICAL'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for organizations (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    DROP TRIGGER IF EXISTS audit_organization_changes ON organizations;
    CREATE TRIGGER audit_organization_changes
      AFTER INSERT OR UPDATE OR DELETE ON organizations
      FOR EACH ROW
      EXECUTE FUNCTION log_organization_changes();
  END IF;
END $$;
