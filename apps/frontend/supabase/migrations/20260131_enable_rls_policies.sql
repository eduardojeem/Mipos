-- Migration: Enable Row Level Security for Multitenancy
-- Description: Implements RLS policies to ensure data isolation between organizations
-- Date: 2026-01-31
-- WARNING: This migration should be run AFTER ensuring all data has organization_id set
-- NOTE: This migration only applies RLS to tables that exist

-- ============================================================================
-- HELPER FUNCTION: Apply RLS to a table if it exists
-- ============================================================================

DO $$
DECLARE
  table_list text[] := ARRAY['sales', 'customers', 'products', 'orders', 'categories', 'suppliers', 'inventory_movements', 'promotions'];
  current_table text;
BEGIN
  FOREACH current_table IN ARRAY table_list
  LOOP
    -- Check if table exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables t
      WHERE t.table_schema = 'public' 
      AND t.table_name = current_table
    ) THEN
      -- Enable RLS
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', current_table);
      RAISE NOTICE 'RLS enabled on table: %', current_table;
      
      -- Drop existing policy if exists
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 
        'Users can only access their organization''s ' || current_table, 
        current_table
      );
      
      -- Create RLS policy
      EXECUTE format('
        CREATE POLICY %I
        ON %I
        FOR ALL
        USING (
          organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
          )
        )
        WITH CHECK (
          organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
          )
        )', 
        'Users can only access their organization''s ' || current_table,
        current_table
      );
      
      -- Create index for performance
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I(organization_id)', 
        'idx_' || current_table || '_organization_id',
        current_table
      );
      
      RAISE NOTICE 'RLS policy and index created for table: %', current_table;
    ELSE
      RAISE NOTICE 'Table % does not exist, skipping RLS', current_table;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- CREATE INDEXES ON organization_members FOR PERFORMANCE
-- ============================================================================

-- Index on organization_members for faster policy checks
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_user ON organization_members(organization_id, user_id);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check which tables have RLS enabled
DO $$
DECLARE
  tables_with_rls text[];
  tables_without_rls text[];
BEGIN
  -- Get tables with RLS
  SELECT array_agg(tablename)
  INTO tables_with_rls
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public'
    AND t.tablename IN ('sales', 'customers', 'products', 'orders', 'categories', 'suppliers', 'inventory_movements', 'promotions')
    AND c.relrowsecurity;
  
  -- Get tables without RLS
  SELECT array_agg(tablename)
  INTO tables_without_rls
  FROM pg_tables t
  LEFT JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public'
    AND t.tablename IN ('sales', 'customers', 'products', 'orders', 'categories', 'suppliers', 'inventory_movements', 'promotions')
    AND NOT c.relrowsecurity;
  
  RAISE NOTICE 'RLS enabled on tables: %', COALESCE(tables_with_rls::text, 'none');
  
  IF array_length(tables_without_rls, 1) > 0 THEN
    RAISE NOTICE 'RLS NOT enabled on existing tables: %', tables_without_rls;
  END IF;
END $$;

-- Count policies created
DO $$
DECLARE
  policy_count int;
BEGIN
  SELECT COUNT(*)
  INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('sales', 'customers', 'products', 'orders', 'categories', 'suppliers', 'inventory_movements', 'promotions');
  
  RAISE NOTICE 'Total RLS policies created: %', policy_count;
END $$;

-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================

-- This migration:
-- 1. Only applies RLS to tables that exist
-- 2. Skips non-existent tables (e.g., orders, suppliers, etc.)
-- 3. Creates policies dynamically for existing tables
--
-- Before applying in production:
-- 1. Backup your database
-- 2. Verify all records have organization_id:
--    SELECT COUNT(*) FROM sales WHERE organization_id IS NULL;
-- 3. Test with a non-admin user to ensure they can only see their org's data
-- 4. Test that SuperAdmin users still have appropriate access
