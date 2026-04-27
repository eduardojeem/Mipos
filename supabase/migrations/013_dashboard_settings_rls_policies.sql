-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_company_associations ENABLE ROW LEVEL SECURITY;

-- Companies RLS Policies
CREATE POLICY "Users can view their own company" ON companies
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_company_associations
            WHERE user_company_associations.company_id = companies.id
            AND user_company_associations.user_id = auth.uid()
            AND user_company_associations.is_active = true
        )
    );

CREATE POLICY "Users can update their own company" ON companies
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_company_associations
            WHERE user_company_associations.company_id = companies.id
            AND user_company_associations.user_id = auth.uid()
            AND user_company_associations.role IN ('admin', 'manager')
            AND user_company_associations.is_active = true
        )
    );

CREATE POLICY "Admins can create companies" ON companies
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email_confirmed_at IS NOT NULL
        )
    );

-- Plan Subscriptions RLS Policies
CREATE POLICY "Users can view their company subscriptions" ON plan_subscriptions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_company_associations
            WHERE user_company_associations.company_id = plan_subscriptions.company_id
            AND user_company_associations.user_id = auth.uid()
            AND user_company_associations.is_active = true
        )
    );

CREATE POLICY "Admins can manage subscriptions" ON plan_subscriptions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_company_associations
            WHERE user_company_associations.company_id = plan_subscriptions.company_id
            AND user_company_associations.user_id = auth.uid()
            AND user_company_associations.role = 'admin'
            AND user_company_associations.is_active = true
        )
    );

-- Usage Limits RLS Policies
CREATE POLICY "Users can view their company usage limits" ON usage_limits
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_company_associations
            JOIN plan_subscriptions ON plan_subscriptions.company_id = user_company_associations.company_id
            WHERE plan_subscriptions.id = usage_limits.subscription_id
            AND user_company_associations.user_id = auth.uid()
            AND user_company_associations.is_active = true
        )
    );

CREATE POLICY "Admins can update usage limits" ON usage_limits
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_company_associations
            JOIN plan_subscriptions ON plan_subscriptions.company_id = user_company_associations.company_id
            WHERE plan_subscriptions.id = usage_limits.subscription_id
            AND user_company_associations.user_id = auth.uid()
            AND user_company_associations.role = 'admin'
            AND user_company_associations.is_active = true
        )
    );

-- User Company Associations RLS Policies
CREATE POLICY "Users can view their own associations" ON user_company_associations
    FOR SELECT
    USING (
        user_id = auth.uid()
    );

CREATE POLICY "Admins can manage company users" ON user_company_associations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_company_associations AS uca_admin
            WHERE uca_admin.company_id = user_company_associations.company_id
            AND uca_admin.user_id = auth.uid()
            AND uca_admin.role = 'admin'
            AND uca_admin.is_active = true
        )
    );

CREATE POLICY "Users can create their own association" ON user_company_associations
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
    );

-- Function to automatically create default subscription when company is created
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO plan_subscriptions (company_id, plan_type, start_date, end_date, is_active)
    VALUES (NEW.id, 'free', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month', true);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default subscription
CREATE TRIGGER trigger_create_default_subscription
    AFTER INSERT ON companies
    FOR EACH ROW
    EXECUTE FUNCTION create_default_subscription();

-- Function to automatically create usage limits when subscription is created
CREATE OR REPLACE FUNCTION create_default_usage_limits()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert default limits based on plan type
    IF NEW.plan_type = 'free' THEN
        INSERT INTO usage_limits (subscription_id, feature_type, limit_value, current_usage, period)
        VALUES 
            (NEW.id, 'users', 3, 0, 'monthly'),
            (NEW.id, 'storage_mb', 1000, 0, 'monthly'),
            (NEW.id, 'monthly_transactions', 1000, 0, 'monthly'),
            (NEW.id, 'integrations', 2, 0, 'monthly'),
            (NEW.id, 'notifications', 100, 0, 'monthly');
    ELSIF NEW.plan_type = 'premium' THEN
        INSERT INTO usage_limits (subscription_id, feature_type, limit_value, current_usage, period)
        VALUES 
            (NEW.id, 'users', 10, 0, 'monthly'),
            (NEW.id, 'storage_mb', 5000, 0, 'monthly'),
            (NEW.id, 'monthly_transactions', 10000, 0, 'monthly'),
            (NEW.id, 'integrations', 10, 0, 'monthly'),
            (NEW.id, 'notifications', 1000, 0, 'monthly');
    ELSIF NEW.plan_type = 'enterprise' THEN
        INSERT INTO usage_limits (subscription_id, feature_type, limit_value, current_usage, period)
        VALUES 
            (NEW.id, 'users', 999999, 0, 'monthly'),
            (NEW.id, 'storage_mb', 999999, 0, 'monthly'),
            (NEW.id, 'monthly_transactions', 999999, 0, 'monthly'),
            (NEW.id, 'integrations', 999999, 0, 'monthly'),
            (NEW.id, 'notifications', 999999, 0, 'monthly');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default usage limits
CREATE TRIGGER trigger_create_default_usage_limits
    AFTER INSERT ON plan_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION create_default_usage_limits();