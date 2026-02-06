-- Simple SQL migration for Cash SaaS compatibility
-- Execute this directly in your database

-- 1. Add organization_id columns
ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS organization_id VARCHAR(255);
ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS organization_id VARCHAR(255);
ALTER TABLE cash_counts ADD COLUMN IF NOT EXISTS organization_id VARCHAR(255);
ALTER TABLE cash_discrepancies ADD COLUMN IF NOT EXISTS organization_id VARCHAR(255);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_cash_sessions_org_status ON cash_sessions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_org_opened ON cash_sessions(organization_id, opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_movements_org_session ON cash_movements(organization_id, session_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_org_created ON cash_movements(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_counts_org_session ON cash_counts(organization_id, session_id);
CREATE INDEX IF NOT EXISTS idx_cash_discrepancies_org_session ON cash_discrepancies(organization_id, session_id);

-- 3. Add foreign keys (with conditional check)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_cash_sessions_organization') THEN
    ALTER TABLE cash_sessions ADD CONSTRAINT fk_cash_sessions_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_cash_movements_organization') THEN
    ALTER TABLE cash_movements ADD CONSTRAINT fk_cash_movements_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_cash_counts_organization') THEN
    ALTER TABLE cash_counts ADD CONSTRAINT fk_cash_counts_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_cash_discrepancies_organization') THEN
    ALTER TABLE cash_discrepancies ADD CONSTRAINT fk_cash_discrepancies_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. Update existing records with default organization
DO $$
DECLARE
  default_org_id VARCHAR(255);
BEGIN
  SELECT id INTO default_org_id FROM organizations LIMIT 1;
  
  IF default_org_id IS NOT NULL THEN
    UPDATE cash_sessions SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE cash_movements SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE cash_counts SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE cash_discrepancies SET organization_id = default_org_id WHERE organization_id IS NULL;
  END IF;
END $$;

-- 5. Make organization_id NOT NULL
ALTER TABLE cash_sessions ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE cash_movements ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE cash_counts ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE cash_discrepancies ALTER COLUMN organization_id SET NOT NULL;

-- 6. Verify migration
SELECT 
  'cash_sessions' as table_name,
  COUNT(*) as total_records,
  COUNT(organization_id) as with_org_id
FROM cash_sessions
UNION ALL
SELECT 
  'cash_movements',
  COUNT(*),
  COUNT(organization_id)
FROM cash_movements
UNION ALL
SELECT 
  'cash_counts',
  COUNT(*),
  COUNT(organization_id)
FROM cash_counts
UNION ALL
SELECT 
  'cash_discrepancies',
  COUNT(*),
  COUNT(organization_id)
FROM cash_discrepancies;
