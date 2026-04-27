-- Insert Default Plans for SaaS System
-- Date: 2026-02-15
-- Description: Insert 4 predefined plans (Free, Starter, Professional, Enterprise)

INSERT INTO plans (id, name, display_name, description, price, currency, interval, trial_days, features, limits, is_active) VALUES
(gen_random_uuid(), 'free', 'Plan Gratuito', 'Perfecto para empezar', 0.00, 'USD', 'monthly', 0,
 '["1 usuario", "100 productos", "Ventas ilimitadas", "1GB almacenamiento"]'::jsonb,
 '{"users": 1, "products": 100, "sales": -1, "storage": 1}'::jsonb,
 true),
 
(gen_random_uuid(), 'starter', 'Plan Starter', 'Para pequeños negocios', 29.99, 'USD', 'monthly', 14,
 '["5 usuarios", "1000 productos", "Ventas ilimitadas", "5GB almacenamiento", "Reportes básicos"]'::jsonb,
 '{"users": 5, "products": 1000, "sales": -1, "storage": 5}'::jsonb,
 true),
 
(gen_random_uuid(), 'professional', 'Plan Professional', 'Para negocios en crecimiento', 79.99, 'USD', 'monthly', 14,
 '["20 usuarios", "10000 productos", "Ventas ilimitadas", "50GB almacenamiento", "Reportes avanzados", "API access"]'::jsonb,
 '{"users": 20, "products": 10000, "sales": -1, "storage": 50}'::jsonb,
 true),
 
(gen_random_uuid(), 'enterprise', 'Plan Enterprise', 'Para grandes empresas', 199.99, 'USD', 'monthly', 30,
 '["Usuarios ilimitados", "Productos ilimitados", "Ventas ilimitadas", "500GB almacenamiento", "Reportes avanzados", "API access", "Soporte prioritario"]'::jsonb,
 '{"users": -1, "products": -1, "sales": -1, "storage": 500}'::jsonb,
 true)
ON CONFLICT (name) DO NOTHING;

-- Verify insertion
SELECT name, display_name, price, interval, trial_days FROM plans ORDER BY price;
