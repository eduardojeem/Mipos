-- Migration: Complete Multi-Tenant Implementation
-- Date: 2026-02-14
-- Description: Add organizationId to remaining tables and create necessary indexes

-- Add organizationId to tables that don't have it yet (only if tables exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sales') THEN
        ALTER TABLE sales ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'loyalty_programs') THEN
        ALTER TABLE loyalty_programs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cash_sessions') THEN
        ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cash_movements') THEN
        ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cash_counts') THEN
        ALTER TABLE cash_counts ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cash_discrepancies') THEN
        ALTER TABLE cash_discrepancies ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
    END IF;
END $$;

-- Create indexes for performance (only if tables exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sales') THEN
        CREATE INDEX IF NOT EXISTS idx_sales_organization ON sales(organization_id);
        CREATE INDEX IF NOT EXISTS idx_sales_org_date ON sales(organization_id, date);
        CREATE INDEX IF NOT EXISTS idx_sales_org_user ON sales(organization_id, user_id);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products') THEN
        CREATE INDEX IF NOT EXISTS idx_products_organization ON products(organization_id);
        CREATE INDEX IF NOT EXISTS idx_products_org_active ON products(organization_id, is_active);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers') THEN
        CREATE INDEX IF NOT EXISTS idx_customers_organization ON customers(organization_id);
        CREATE INDEX IF NOT EXISTS idx_customers_org_active ON customers(organization_id, is_active);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'suppliers') THEN
        CREATE INDEX IF NOT EXISTS idx_suppliers_organization ON suppliers(organization_id);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'categories') THEN
        CREATE INDEX IF NOT EXISTS idx_categories_organization ON categories(organization_id);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'purchases') THEN
        CREATE INDEX IF NOT EXISTS idx_purchases_organization ON purchases(organization_id);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inventory_movements') THEN
        CREATE INDEX IF NOT EXISTS idx_inventory_movements_organization ON inventory_movements(organization_id);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'returns') THEN
        CREATE INDEX IF NOT EXISTS idx_returns_organization ON returns(organization_id);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'loyalty_programs') THEN
        CREATE INDEX IF NOT EXISTS idx_loyalty_programs_organization ON loyalty_programs(organization_id);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cash_sessions') THEN
        CREATE INDEX IF NOT EXISTS idx_cash_sessions_organization ON cash_sessions(organization_id);
        CREATE INDEX IF NOT EXISTS idx_cash_sessions_org_status ON cash_sessions(organization_id, status);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cash_movements') THEN
        CREATE INDEX IF NOT EXISTS idx_cash_movements_organization ON cash_movements(organization_id);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        CREATE INDEX IF NOT EXISTS idx_audit_logs_organization ON audit_logs(organization_id);
    END IF;
END $$;

-- Add comments for documentation (only if columns exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'organization_id') THEN
        COMMENT ON COLUMN sales.organization_id IS 'Organization that owns this sale (multi-tenant isolation)';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'organization_id') THEN
        COMMENT ON COLUMN products.organization_id IS 'Organization that owns this product (multi-tenant isolation)';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'organization_id') THEN
        COMMENT ON COLUMN customers.organization_id IS 'Organization that owns this customer (multi-tenant isolation)';
    END IF;
END $$;
