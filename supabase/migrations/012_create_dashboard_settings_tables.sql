-- Create companies table
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    rfc VARCHAR(20),
    industry VARCHAR(100) NOT NULL,
    size VARCHAR(20) CHECK (size IN ('micro', 'small', 'medium', 'large')),
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#2563EB',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for companies
CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_companies_industry ON companies(industry);

-- Create plan_subscriptions table
CREATE TABLE plan_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    plan_type VARCHAR(20) DEFAULT 'free' CHECK (plan_type IN ('free', 'premium', 'enterprise')),
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE DEFAULT (CURRENT_DATE + INTERVAL '1 month'),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for plan_subscriptions
CREATE INDEX idx_plan_subscriptions_company_id ON plan_subscriptions(company_id);
CREATE INDEX idx_plan_subscriptions_active ON plan_subscriptions(is_active) WHERE is_active = true;
CREATE UNIQUE INDEX idx_plan_subscriptions_company_active ON plan_subscriptions(company_id) WHERE is_active = true;

-- Create usage_limits table
CREATE TABLE usage_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES plan_subscriptions(id) ON DELETE CASCADE,
    feature_type VARCHAR(50) NOT NULL,
    limit_value INTEGER NOT NULL,
    current_usage INTEGER DEFAULT 0,
    period VARCHAR(20) DEFAULT 'monthly' CHECK (period IN ('daily', 'weekly', 'monthly')),
    reset_date DATE DEFAULT (CURRENT_DATE + INTERVAL '1 month'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for usage_limits
CREATE INDEX idx_usage_limits_subscription_id ON usage_limits(subscription_id);
CREATE INDEX idx_usage_limits_feature ON usage_limits(feature_type);
CREATE UNIQUE INDEX idx_usage_limits_subscription_feature ON usage_limits(subscription_id, feature_type);

-- Create user_company_associations table to link users to companies
CREATE TABLE user_company_associations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'manager', 'employee')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for user_company_associations
CREATE INDEX idx_user_company_user_id ON user_company_associations(user_id);
CREATE INDEX idx_user_company_company_id ON user_company_associations(company_id);
CREATE UNIQUE INDEX idx_user_company_unique ON user_company_associations(user_id, company_id);

-- Grant permissions
GRANT SELECT ON companies TO anon;
GRANT ALL PRIVILEGES ON companies TO authenticated;
GRANT SELECT ON plan_subscriptions TO anon;
GRANT ALL PRIVILEGES ON plan_subscriptions TO authenticated;
GRANT SELECT ON usage_limits TO anon;
GRANT ALL PRIVILEGES ON usage_limits TO authenticated;
GRANT SELECT ON user_company_associations TO anon;
GRANT ALL PRIVILEGES ON user_company_associations TO authenticated;