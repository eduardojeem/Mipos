-- Migration: Add organization_id to sales table for SaaS multitenancy
-- Date: 2026-02-06
-- Description: Adds organization_id to sales table and creates necessary indexes

-- 1. Add organization_id column to sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS organization_id VARCHAR(255);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_org_date ON sales(organization_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_org_user ON sales(organization_id, user_id);

-- 3. Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_organization') THEN
    ALTER TABLE sales ADD CONSTRAINT fk_sales_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. Update existing records with organization_id from user
DO $$
DECLARE
  default_org_id VARCHAR(255);
BEGIN
  -- Try to get organization from users table
  UPDATE sales s
  SET organization_id = u.organization_id
  FROM users u
  WHERE s.user_id = u.id AND s.organization_id IS NULL AND u.organization_id IS NOT NULL;
  
  -- For any remaining NULL values, use first organization
  SELECT id INTO default_org_id FROM organizations LIMIT 1;
  
  IF default_org_id IS NOT NULL THEN
    UPDATE sales SET organization_id = default_org_id WHERE organization_id IS NULL;
  END IF;
END $$;

-- 5. Make organization_id NOT NULL
ALTER TABLE sales ALTER COLUMN organization_id SET NOT NULL;

-- 6. Add comment for documentation
COMMENT ON COLUMN sales.organization_id IS 'Organization that owns this sale';

-- 7. Verify migration
SELECT 
  'sales' as table_name,
  COUNT(*) as total_records,
  COUNT(organization_id) as with_org_id,
  COUNT(DISTINCT organization_id) as unique_orgs
FROM sales;
