INSERT INTO public.plan_features (key, display_name, description)
VALUES
  ('basic_inventory', 'Basic Inventory', 'Core inventory management'),
  ('basic_sales', 'Basic Sales', 'Core POS and sales flow'),
  ('purchase_module', 'Purchase Module', 'Supplier purchases and restocking'),
  ('basic_reports', 'Basic Reports', 'Basic reporting and dashboards'),
  ('advanced_reports', 'Advanced Reports', 'Advanced analytics and export-ready reports'),
  ('multi_branch', 'Multi Branch', 'Support for multiple branches'),
  ('audit_logs', 'Audit Logs', 'Audit trail and compliance logs'),
  ('unlimited_users', 'Unlimited Users', 'Unlimited active users'),
  ('team_management', 'Team Management', 'Manage company users and roles'),
  ('admin_panel', 'Admin Panel', 'Administrative section for company management'),
  ('advanced_inventory', 'Advanced Inventory', 'Suppliers and advanced stock controls'),
  ('export_reports', 'Export Reports', 'Export reports to external formats'),
  ('api_access', 'API Access', 'Access to external API integrations'),
  ('loyalty_program', 'Loyalty Program', 'Customer loyalty features'),
  ('unlimited_products', 'Unlimited Products', 'No product quantity limits'),
  ('custom_branding', 'Custom Branding', 'Branding customization')
ON CONFLICT (key) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  updated_at = NOW();

INSERT INTO public.saas_plans (name, slug, price_monthly, price_yearly, features, is_active, updated_at)
VALUES
  ('Free', 'free', 0, 0, '["basic_inventory","basic_sales"]'::jsonb, TRUE, NOW()),
  ('Starter', 'starter', 15, 162, '["basic_inventory","basic_sales","purchase_module","basic_reports","team_management","admin_panel","advanced_inventory"]'::jsonb, TRUE, NOW()),
  ('Professional', 'professional', 30, 324, '["basic_inventory","basic_sales","purchase_module","basic_reports","advanced_reports","multi_branch","audit_logs","unlimited_users","team_management","admin_panel","advanced_inventory","export_reports","custom_branding"]'::jsonb, TRUE, NOW()),
  ('Premium', 'premium', 30, 324, '["basic_inventory","basic_sales","purchase_module","basic_reports","advanced_reports","multi_branch","audit_logs","unlimited_users","team_management","admin_panel","advanced_inventory","export_reports","api_access","loyalty_program","unlimited_products","custom_branding"]'::jsonb, FALSE, NOW()),
  ('Enterprise', 'enterprise', 0, 0, '["basic_inventory","basic_sales","purchase_module","basic_reports","advanced_reports","multi_branch","audit_logs","unlimited_users","team_management","admin_panel","advanced_inventory","export_reports","api_access","loyalty_program","unlimited_products","custom_branding"]'::jsonb, FALSE, NOW())
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO public.saas_plan_features (plan_id, feature_id, is_enabled)
SELECT p.id, f.id, TRUE
FROM public.saas_plans p
JOIN public.plan_features f
  ON (
    (p.slug = 'free' AND f.key IN ('basic_inventory', 'basic_sales')) OR
    (p.slug IN ('starter', 'basic') AND f.key IN ('basic_inventory', 'basic_sales', 'purchase_module', 'basic_reports', 'team_management', 'admin_panel', 'advanced_inventory')) OR
    (p.slug IN ('professional', 'pro') AND f.key IN ('basic_inventory', 'basic_sales', 'purchase_module', 'basic_reports', 'advanced_reports', 'multi_branch', 'audit_logs', 'unlimited_users', 'team_management', 'admin_panel', 'advanced_inventory', 'export_reports', 'custom_branding')) OR
    (p.slug = 'premium' AND f.key IN ('basic_inventory', 'basic_sales', 'purchase_module', 'basic_reports', 'advanced_reports', 'multi_branch', 'audit_logs', 'unlimited_users', 'team_management', 'admin_panel', 'advanced_inventory', 'export_reports', 'api_access', 'loyalty_program', 'unlimited_products', 'custom_branding')) OR
    (p.slug = 'enterprise' AND f.key IN ('basic_inventory', 'basic_sales', 'purchase_module', 'basic_reports', 'advanced_reports', 'multi_branch', 'audit_logs', 'unlimited_users', 'team_management', 'admin_panel', 'advanced_inventory', 'export_reports', 'api_access', 'loyalty_program', 'unlimited_products', 'custom_branding'))
  )
ON CONFLICT (plan_id, feature_id) DO UPDATE
SET
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

INSERT INTO public.roles (name, display_name, description, is_system_role, is_active)
VALUES
  ('OWNER', 'Owner', 'Company owner with billing and company management access', TRUE, TRUE),
  ('SELLER', 'Seller', 'Sales-focused company user', TRUE, TRUE),
  ('WAREHOUSE', 'Warehouse', 'Inventory and purchasing focused user', TRUE, TRUE)
ON CONFLICT (name) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO public.permissions (name, display_name, description, resource, action, is_active)
VALUES
  ('manage_company', 'Manage Company', 'Manage company profile and settings', 'company', 'manage', TRUE),
  ('manage_billing', 'Manage Billing', 'Manage subscription and billing settings', 'billing', 'manage', TRUE),
  ('manage_users', 'Manage Users', 'Manage users and memberships', 'users', 'manage', TRUE),
  ('view_reports', 'View Reports', 'View reports and analytics', 'reports', 'view', TRUE),
  ('edit_products', 'Edit Products', 'Create and edit products', 'products', 'update', TRUE),
  ('create_sales', 'Create Sales', 'Create sales and POS transactions', 'sales', 'create', TRUE),
  ('update_stock', 'Update Stock', 'Adjust inventory stock', 'stock', 'update', TRUE),
  ('view_products', 'View Products', 'Read product catalog', 'products', 'read', TRUE),
  ('view_customers', 'View Customers', 'Read customer information', 'customers', 'read', TRUE),
  ('create_purchase', 'Create Purchase', 'Create purchase orders', 'purchases', 'create', TRUE)
ON CONFLICT (resource, action) DO UPDATE
SET
  name = EXCLUDED.name,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  resource = EXCLUDED.resource,
  action = EXCLUDED.action,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.name IN (
  'manage_company',
  'manage_billing',
  'manage_users',
  'view_reports',
  'edit_products',
  'create_sales',
  'update_stock'
)
WHERE r.name = 'OWNER'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.name IN (
  'manage_users',
  'view_reports',
  'edit_products',
  'create_sales',
  'update_stock'
)
WHERE r.name IN ('ADMIN', 'MANAGER')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.name IN (
  'create_sales',
  'view_products',
  'view_customers'
)
WHERE r.name IN ('SELLER', 'CASHIER')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.name IN (
  'view_products',
  'update_stock',
  'create_purchase'
)
WHERE r.name = 'WAREHOUSE'
ON CONFLICT (role_id, permission_id) DO NOTHING;
