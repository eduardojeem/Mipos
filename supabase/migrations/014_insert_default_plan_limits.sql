-- Function to map organization plan types to our standard types
CREATE OR REPLACE FUNCTION map_organization_plan(plan_name TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN CASE 
        WHEN LOWER(plan_name) IN ('free', 'gratis', 'basic') THEN 'free'
        WHEN LOWER(plan_name) IN ('pro', 'premium', 'professional', 'profesional') THEN 'premium'
        WHEN LOWER(plan_name) IN ('enterprise', 'empresarial', 'business') THEN 'enterprise'
        ELSE 'free'
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to migrate existing users to companies structure
CREATE OR REPLACE FUNCTION migrate_existing_users_to_companies()
RETURNS VOID AS $$
DECLARE
    user_record RECORD;
    new_company_id UUID;
    user_plan_type TEXT;
BEGIN
    -- Migrate users that don't have company associations yet
    FOR user_record IN 
        SELECT u.id, u.email, u.raw_user_meta_data
        FROM auth.users u
        WHERE NOT EXISTS (
            SELECT 1 FROM user_company_associations 
            WHERE user_company_associations.user_id = u.id
        )
    LOOP
        -- Create company for user
        INSERT INTO companies (name, industry, size, primary_color)
        VALUES (
            COALESCE(user_record.raw_user_meta_data->>'company_name', 'Mi Empresa'),
            COALESCE(user_record.raw_user_meta_data->>'industry', 'retail'),
            COALESCE(user_record.raw_user_meta_data->>'company_size', 'micro'),
            '#2563EB'
        )
        RETURNING id INTO new_company_id;
        
        -- Get user's current plan from metadata
        user_plan_type := map_organization_plan(
            COALESCE(user_record.raw_user_meta_data->>'subscription_plan', 'free')
        );
        
        -- Update existing subscription or create new one
        UPDATE plan_subscriptions 
        SET plan_type = user_plan_type
        WHERE company_id = new_company_id
        AND is_active = true;
        
        -- Create user-company association
        INSERT INTO user_company_associations (user_id, company_id, role, is_active)
        VALUES (user_record.id, new_company_id, 'admin', true);
        
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's company
CREATE OR REPLACE FUNCTION get_current_user_company()
RETURNS UUID AS $$
DECLARE
    company_id UUID;
BEGIN
    SELECT uca.company_id INTO company_id
    FROM user_company_associations uca
    WHERE uca.user_id = auth.uid()
    AND uca.is_active = true
    LIMIT 1;
    
    RETURN company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can use a feature
CREATE OR REPLACE FUNCTION can_use_feature(feature_type TEXT, requested_quantity INTEGER DEFAULT 1)
RETURNS BOOLEAN AS $$
DECLARE
    user_company UUID;
    current_usage INTEGER;
    limit_value INTEGER;
BEGIN
    -- Get user's company
    user_company := get_current_user_company();
    
    IF user_company IS NULL THEN
        RETURN false;
    END IF;
    
    -- Get current usage and limit for the feature
    SELECT 
        ul.current_usage,
        ul.limit_value
    INTO current_usage, limit_value
    FROM usage_limits ul
    JOIN plan_subscriptions ps ON ps.id = ul.subscription_id
    WHERE ps.company_id = user_company
    AND ps.is_active = true
    AND ul.feature_type = feature_type;
    
    IF limit_value = 999999 THEN -- Unlimited
        RETURN true;
    END IF;
    
    RETURN (current_usage + requested_quantity) <= limit_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment feature usage
CREATE OR REPLACE FUNCTION increment_feature_usage(feature_type TEXT, quantity INTEGER DEFAULT 1)
RETURNS BOOLEAN AS $$
DECLARE
    user_company UUID;
    current_usage INTEGER;
    limit_value INTEGER;
BEGIN
    -- Get user's company
    user_company := get_current_user_company();
    
    IF user_company IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check if usage is allowed
    IF NOT can_use_feature(feature_type, quantity) THEN
        RETURN false;
    END IF;
    
    -- Increment usage
    UPDATE usage_limits
    SET current_usage = current_usage + quantity
    FROM plan_subscriptions
    WHERE usage_limits.subscription_id = plan_subscriptions.id
    AND plan_subscriptions.company_id = user_company
    AND plan_subscriptions.is_active = true
    AND usage_limits.feature_type = feature_type;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX idx_user_company_active ON user_company_associations(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_plan_subscriptions_active_company ON plan_subscriptions(company_id, is_active) WHERE is_active = true;
CREATE INDEX idx_usage_limits_feature_subscription ON usage_limits(subscription_id, feature_type);

-- Run migration for existing users (this will be executed manually when needed)
-- SELECT migrate_existing_users_to_companies();