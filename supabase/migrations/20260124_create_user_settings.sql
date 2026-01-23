-- Create user_settings table to store user preferences
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'system',
    language TEXT DEFAULT 'es',
    dashboard_config JSONB DEFAULT '{"layout": "comfortable", "sidebar_collapsed": false, "show_tooltips": true, "auto_save": true}'::jsonb,
    notifications_config JSONB DEFAULT '{"email": true, "push": true, "marketing": false, "security": true}'::jsonb,
    appearance_config JSONB DEFAULT '{"primary_color": "blue", "border_radius": "0.5", "density": "normal", "enable_animations": true, "enable_glassmorphism": true, "enable_gradients": true, "enable_shadows": true}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own settings" 
    ON public.user_settings FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" 
    ON public.user_settings FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" 
    ON public.user_settings FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Function to handle updated_at
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger
DROP TRIGGER IF EXISTS update_user_settings_timestamp ON public.user_settings;
CREATE TRIGGER update_user_settings_timestamp
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_settings_updated_at();

-- Grant permissions
GRANT ALL ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;
