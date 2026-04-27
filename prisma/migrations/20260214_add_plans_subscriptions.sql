-- Migration: Add Plans and Subscriptions for SaaS Billing
-- Date: 2026-02-14
-- Description: Create tables for subscription plans, subscriptions, invoices, and payments

-- Plans table
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  interval VARCHAR(20) NOT NULL CHECK (interval IN ('monthly', 'yearly', 'quarterly')),
  trial_days INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  features JSONB DEFAULT '[]'::jsonb,
  limits JSONB DEFAULT '{}'::jsonb, -- {users: 10, products: 1000, sales: -1, storage: 5}
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing', 'paused')),
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMP,
  trial_start TIMESTAMP,
  trial_end TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  due_date TIMESTAMP NOT NULL,
  paid_at TIMESTAMP,
  items JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  payment_method VARCHAR(50),
  payment_intent_id VARCHAR(255), -- Stripe/MercadoPago payment intent ID
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Organization quotas table (for tracking usage)
CREATE TABLE IF NOT EXISTS organization_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  users_count INTEGER DEFAULT 0,
  products_count INTEGER DEFAULT 0,
  sales_count INTEGER DEFAULT 0,
  storage_used BIGINT DEFAULT 0, -- in bytes
  api_calls_count INTEGER DEFAULT 0,
  period_start TIMESTAMP NOT NULL DEFAULT NOW(),
  period_end TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_subscriptions_organization ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_period ON subscriptions(current_period_end);
CREATE INDEX idx_invoices_organization ON invoices(organization_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_payments_organization ON payments(organization_id);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_organization_quotas_org ON organization_quotas(organization_id);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organization_quotas_updated_at BEFORE UPDATE ON organization_quotas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default plans
INSERT INTO plans (name, display_name, description, price, interval, features, limits) VALUES
('free', 'Plan Gratuito', 'Perfecto para empezar', 0.00, 'monthly', 
 '["1 usuario", "100 productos", "Ventas ilimitadas", "1GB almacenamiento"]'::jsonb,
 '{"users": 1, "products": 100, "sales": -1, "storage": 1}'::jsonb),
 
('starter', 'Plan Starter', 'Para pequeños negocios', 29.99, 'monthly',
 '["5 usuarios", "1000 productos", "Ventas ilimitadas", "5GB almacenamiento", "Reportes básicos"]'::jsonb,
 '{"users": 5, "products": 1000, "sales": -1, "storage": 5}'::jsonb),
 
('professional', 'Plan Professional', 'Para negocios en crecimiento', 79.99, 'monthly',
 '["20 usuarios", "10000 productos", "Ventas ilimitadas", "50GB almacenamiento", "Reportes avanzados", "API access"]'::jsonb,
 '{"users": 20, "products": 10000, "sales": -1, "storage": 50}'::jsonb),
 
('enterprise', 'Plan Enterprise', 'Para grandes empresas', 199.99, 'monthly',
 '["Usuarios ilimitados", "Productos ilimitados", "Ventas ilimitadas", "500GB almacenamiento", "Reportes avanzados", "API access", "Soporte prioritario"]'::jsonb,
 '{"users": -1, "products": -1, "sales": -1, "storage": 500}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Comments
COMMENT ON TABLE plans IS 'Subscription plans available for organizations';
COMMENT ON TABLE subscriptions IS 'Active subscriptions for organizations';
COMMENT ON TABLE invoices IS 'Invoices generated for subscriptions';
COMMENT ON TABLE payments IS 'Payment records for invoices';
COMMENT ON TABLE organization_quotas IS 'Usage tracking for organization limits';
