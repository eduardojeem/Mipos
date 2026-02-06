-- Migration: Add organization_id to cash tables for SaaS multitenancy
-- Date: 2026-02-06
-- Description: Adds organization_id to all cash-related tables and creates necessary indexes

-- 1. Add organization_id column to cash_sessions
ALTER TABLE cash_sessions 
ADD COLUMN IF NOT EXISTS organization_id VARCHAR(255);

-- 2. Add organization_id column to cash_movements
ALTER TABLE cash_movements 
ADD COLUMN IF NOT EXISTS organization_id VARCHAR(255);

-- 3. Add organization_id column to cash_counts
ALTER TABLE cash_counts 
ADD COLUMN IF NOT EXISTS organization_id VARCHAR(255);

-- 4. Add organization_id column to cash_discrepancies
ALTER TABLE cash_discrepancies 
ADD COLUMN IF NOT EXISTS organization_id VARCHAR(255);

-- 5. Create indexes for performance (organization_id + other common filters)
CREATE INDEX IF NOT EXISTS idx_cash_sessions_org_status 
ON cash_sessions(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_cash_sessions_org_opened 
ON cash_sessions(organization_id, opened_at DESC);

CREATE INDEX IF NOT EXISTS idx_cash_movements_org_session 
ON cash_movements(organization_id, session_id);

CREATE INDEX IF NOT EXISTS idx_cash_movements_org_created 
ON cash_movements(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cash_counts_org_session 
ON cash_counts(organization_id, session_id);

CREATE INDEX IF NOT EXISTS idx_cash_discrepancies_org_session 
ON cash_discrepancies(organization_id, session_id);

-- 6. Add foreign key constraints (with conditional check)
DO $$
BEGIN
  -- Add FK for cash_sessions
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_cash_sessions_organization'
  ) THEN
    ALTER TABLE cash_sessions 
    ADD CONSTRAINT fk_cash_sessions_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- Add FK for cash_movements
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_cash_movements_organization'
  ) THEN
    ALTER TABLE cash_movements 
    ADD CONSTRAINT fk_cash_movements_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- Add FK for cash_counts
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_cash_counts_organization'
  ) THEN
    ALTER TABLE cash_counts 
    ADD CONSTRAINT fk_cash_counts_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- Add FK for cash_discrepancies
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_cash_discrepancies_organization'
  ) THEN
    ALTER TABLE cash_discrepancies 
    ADD CONSTRAINT fk_cash_discrepancies_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 7. Update existing records with a default organization (if any exist)
-- Note: This should be customized based on your data migration strategy
-- Option A: Assign to first organization
DO $$
DECLARE
  default_org_id VARCHAR(255);
BEGIN
  -- Get the first organization ID
  SELECT id INTO default_org_id FROM organizations LIMIT 1;
  
  IF default_org_id IS NOT NULL THEN
    -- Update cash_sessions
    UPDATE cash_sessions 
    SET organization_id = default_org_id 
    WHERE organization_id IS NULL;
    
    -- Update cash_movements
    UPDATE cash_movements 
    SET organization_id = default_org_id 
    WHERE organization_id IS NULL;
    
    -- Update cash_counts
    UPDATE cash_counts 
    SET organization_id = default_org_id 
    WHERE organization_id IS NULL;
    
    -- Update cash_discrepancies
    UPDATE cash_discrepancies 
    SET organization_id = default_org_id 
    WHERE organization_id IS NULL;
  END IF;
END $$;

-- 8. Make organization_id NOT NULL after data migration
ALTER TABLE cash_sessions 
ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE cash_movements 
ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE cash_counts 
ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE cash_discrepancies 
ALTER COLUMN organization_id SET NOT NULL;

-- 9. Add comments for documentation
COMMENT ON COLUMN cash_sessions.organization_id IS 'Organization that owns this cash session';
COMMENT ON COLUMN cash_movements.organization_id IS 'Organization that owns this cash movement';
COMMENT ON COLUMN cash_counts.organization_id IS 'Organization that owns this cash count';
COMMENT ON COLUMN cash_discrepancies.organization_id IS 'Organization that owns this cash discrepancy';
