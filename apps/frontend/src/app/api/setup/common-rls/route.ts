import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

// Aplica políticas RLS de lectura comunes para tablas base del POS
// customers: lectura autenticada de clientes activos
// products: lectura autenticada de productos
// categories: lectura autenticada de categorías
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    const statements: string[] = [
      // Customers
      `alter table if exists customers enable row level security;`,
      `create policy if not exists "Authenticated read customers" on customers for select to authenticated using (is_active = true);`,
      // Products
      `alter table if exists products enable row level security;`,
      `create policy if not exists "Authenticated read products" on products for select to authenticated using (true);`,
      `alter table if exists suppliers enable row level security;`,
      `create policy if not exists "Authenticated read suppliers" on suppliers for select to authenticated using (is_active = true);`,
      `grant usage on schema public to authenticated;`,
      `grant usage on schema public to service_role;`,
      // User Settings: habilitar RLS y políticas por usuario
      `alter table if exists user_settings enable row level security;`,
      `create policy if not exists "Read own user_settings" on user_settings
         for select to authenticated
         using (user_id = auth.uid());`,
      `create policy if not exists "Insert own user_settings" on user_settings
         for insert to authenticated
         with check (user_id = auth.uid());`,
      `create policy if not exists "Update own user_settings" on user_settings
         for update to authenticated
         using (user_id = auth.uid())
         with check (user_id = auth.uid());`,
      `grant select, insert, update on user_settings to authenticated;`,
      `grant select, insert, update, delete on user_settings to service_role;`,
      `grant select on products to authenticated;`,
      `grant select on categories to authenticated;`,
      `grant select on suppliers to authenticated;`,
      `grant select, insert, update, delete on products to service_role;`,
      `grant select on categories to service_role;`,
      `grant select on suppliers to service_role;`,
      `grant insert, update, delete on products to authenticated;`,
      `grant insert, update, delete on categories to authenticated;`,
      `grant insert, update, delete on suppliers to authenticated;`,
      `grant insert, update, delete on categories to service_role;`,
      `grant insert, update, delete on suppliers to service_role;`,
      `create policy if not exists "Write products (ADMIN/MANAGER/SUPER_ADMIN)" on products for insert to authenticated
        with check (
          exists (
            select 1 from user_roles ur
            join roles r on r.id = ur.role_id
            where ur.user_id = auth.uid()
              and ur.is_active = true
              and r.name in ('SUPER_ADMIN','ADMIN','MANAGER')
          )
        );`,
      `create policy if not exists "Update products (ADMIN/MANAGER/SUPER_ADMIN)" on products for update to authenticated
        using (
          exists (
            select 1 from user_roles ur
            join roles r on r.id = ur.role_id
            where ur.user_id = auth.uid()
              and ur.is_active = true
              and r.name in ('SUPER_ADMIN','ADMIN','MANAGER')
          )
        )
        with check (
          exists (
            select 1 from user_roles ur
            join roles r on r.id = ur.role_id
            where ur.user_id = auth.uid()
              and ur.is_active = true
              and r.name in ('SUPER_ADMIN','ADMIN','MANAGER')
          )
        );`,
      `create policy if not exists "Delete products (ADMIN/SUPER_ADMIN)" on products for delete to authenticated
        using (
          exists (
            select 1 from user_roles ur
            join roles r on r.id = ur.role_id
            where ur.user_id = auth.uid()
              and ur.is_active = true
              and r.name in ('SUPER_ADMIN','ADMIN')
          )
        );`,
      `create policy if not exists "Write suppliers (ADMIN/MANAGER/SUPER_ADMIN)" on suppliers for insert to authenticated
        with check (
          exists (
            select 1 from user_roles ur
            join roles r on r.id = ur.role_id
            where ur.user_id = auth.uid()
              and ur.is_active = true
              and r.name in ('SUPER_ADMIN','ADMIN','MANAGER')
          )
        );`,
      `create policy if not exists "Update suppliers (ADMIN/MANAGER/SUPER_ADMIN)" on suppliers for update to authenticated
        using (
          exists (
            select 1 from user_roles ur
            join roles r on r.id = ur.role_id
            where ur.user_id = auth.uid()
              and ur.is_active = true
              and r.name in ('SUPER_ADMIN','ADMIN','MANAGER')
          )
        )
        with check (
          exists (
            select 1 from user_roles ur
            join roles r on r.id = ur.role_id
            where ur.user_id = auth.uid()
              and ur.is_active = true
              and r.name in ('SUPER_ADMIN','ADMIN','MANAGER')
          )
        );`,
      `create policy if not exists "Delete suppliers (ADMIN/SUPER_ADMIN)" on suppliers for delete to authenticated
        using (
          exists (
            select 1 from user_roles ur
            join roles r on r.id = ur.role_id
            where ur.user_id = auth.uid()
              and ur.is_active = true
              and r.name in ('SUPER_ADMIN','ADMIN')
          )
        );`,
      // ---------------------------------------------------------------------
      // RPC: get_user_permissions(UUID) - Deriva permisos por roles del usuario
      // ---------------------------------------------------------------------
      `CREATE OR REPLACE FUNCTION public.get_user_permissions(user_uuid uuid)
       RETURNS TABLE (permission_name text, resource text, action text)
       LANGUAGE plpgsql
       SECURITY DEFINER
       AS $$
       BEGIN
         RETURN QUERY
         SELECT p.name AS permission_name, p.resource, p.action
         FROM public.user_roles ur
         JOIN public.roles r ON r.id = ur.role_id
         JOIN public.role_permissions rp ON rp.role_id = r.id
         JOIN public.permissions p ON p.id = rp.permission_id
         WHERE ur.is_active = true
           AND ur.user_id = user_uuid::text;
       END;
       $$;`,
      `GRANT EXECUTE ON FUNCTION public.get_user_permissions(uuid) TO authenticated, service_role;`,
      // ---------------------------------------------------------------------
      // Seed básico de roles, permisos y mapeos role_permissions
      // ---------------------------------------------------------------------
      `CREATE TABLE IF NOT EXISTS public.role_permissions (
         role_id TEXT NOT NULL,
         permission_id TEXT NOT NULL,
         created_at timestamptz DEFAULT now(),
         PRIMARY KEY (role_id, permission_id)
       );`,
      `INSERT INTO public.roles (id, name, is_active, created_at, updated_at)
         VALUES
           ('SUPER_ADMIN','SUPER_ADMIN',true, now(), now()),
           ('ADMIN','ADMIN',true, now(), now()),
           ('MANAGER','MANAGER',true, now(), now()),
           ('CASHIER','CASHIER',true, now(), now()),
           ('VIEWER','VIEWER',true, now(), now())
       ON CONFLICT (id) DO NOTHING;`,
      `INSERT INTO public.permissions (id, name, resource, action, created_at, updated_at)
         VALUES
           ('products.read','Products Read','products','read', now(), now()),
           ('products.write','Products Write','products','write', now(), now()),
           ('products.export','Products Export','products','export', now(), now()),
           ('categories.read','Categories Read','categories','read', now(), now()),
           ('categories.write','Categories Write','categories','write', now(), now()),
           ('suppliers.read','Suppliers Read','suppliers','read', now(), now()),
           ('suppliers.write','Suppliers Write','suppliers','write', now(), now()),
           ('sales.read','Sales Read','sales','read', now(), now()),
           ('sales.write','Sales Write','sales','write', now(), now()),
           ('inventory.read','Inventory Read','inventory','read', now(), now()),
           ('inventory.write','Inventory Write','inventory','write', now(), now()),
           ('reports.read','Reports Read','reports','read', now(), now()),
           ('reports.export','Reports Export','reports','export', now(), now()),
           ('settings.read','Settings Read','settings','read', now(), now()),
           ('users.read','Users Read','users','read', now(), now()),
           ('users.write','Users Write','users','write', now(), now()),
           ('dashboard.view','Dashboard View','dashboard','view', now(), now()),
           ('pos.access','POS Access','pos','access', now(), now())
       ON CONFLICT (id) DO NOTHING;`,
      `INSERT INTO public.role_permissions (role_id, permission_id)
         VALUES
           -- SUPER_ADMIN: todos
           ('SUPER_ADMIN','products.read'),('SUPER_ADMIN','products.write'),
           ('SUPER_ADMIN','products.export'),
           ('SUPER_ADMIN','categories.read'),('SUPER_ADMIN','categories.write'),
           ('SUPER_ADMIN','suppliers.read'),('SUPER_ADMIN','suppliers.write'),
           ('SUPER_ADMIN','sales.read'),('SUPER_ADMIN','sales.write'),
           ('SUPER_ADMIN','inventory.read'),('SUPER_ADMIN','inventory.write'),
           ('SUPER_ADMIN','reports.read'),('SUPER_ADMIN','reports.export'),
           ('SUPER_ADMIN','settings.read'),
           ('SUPER_ADMIN','users.read'),('SUPER_ADMIN','users.write'),
           ('SUPER_ADMIN','dashboard.view'),('SUPER_ADMIN','pos.access'),
           -- ADMIN: todos
           ('ADMIN','products.read'),('ADMIN','products.write'),
           ('ADMIN','products.export'),
           ('ADMIN','categories.read'),('ADMIN','categories.write'),
           ('ADMIN','suppliers.read'),('ADMIN','suppliers.write'),
           ('ADMIN','sales.read'),('ADMIN','sales.write'),
           ('ADMIN','inventory.read'),('ADMIN','inventory.write'),
           ('ADMIN','reports.read'),('ADMIN','reports.export'),
           ('ADMIN','settings.read'),
           ('ADMIN','users.read'),('ADMIN','users.write'),
           ('ADMIN','dashboard.view'),('ADMIN','pos.access'),
           -- MANAGER: sin users.write
           ('MANAGER','products.read'),('MANAGER','products.write'),
           ('MANAGER','products.export'),
           ('MANAGER','categories.read'),('MANAGER','categories.write'),
           ('MANAGER','suppliers.read'),('MANAGER','suppliers.write'),
           ('MANAGER','sales.read'),('MANAGER','sales.write'),
           ('MANAGER','inventory.read'),('MANAGER','inventory.write'),
           ('MANAGER','reports.read'),('MANAGER','reports.export'),
           ('MANAGER','settings.read'),
           ('MANAGER','users.read'),
           ('MANAGER','dashboard.view'),('MANAGER','pos.access'),
           -- CASHIER: operaciones básicas
           ('CASHIER','products.read'),
           ('CASHIER','sales.read'),('CASHIER','sales.write'),
           ('CASHIER','customers.read'),
           ('CASHIER','dashboard.view'),('CASHIER','pos.access'),
           -- VIEWER: sólo lectura
           ('VIEWER','products.read'),('VIEWER','sales.read'),('VIEWER','inventory.read'),('VIEWER','dashboard.view')
       ON CONFLICT (role_id, permission_id) DO NOTHING;`,
      // Categories
      `alter table if exists categories enable row level security;`,
      `create policy if not exists "Authenticated read categories" on categories for select to authenticated using (true);`,
      `create policy if not exists "Write categories (ADMIN/MANAGER/SUPER_ADMIN)" on categories for insert to authenticated
        with check (
          exists (
            select 1 from user_roles ur
            join roles r on r.id = ur.role_id
            where ur.user_id = auth.uid()
              and ur.is_active = true
              and r.name in ('SUPER_ADMIN','ADMIN','MANAGER')
          )
        );`,
      `create policy if not exists "Update categories (ADMIN/MANAGER/SUPER_ADMIN)" on categories for update to authenticated
        using (
          exists (
            select 1 from user_roles ur
            join roles r on r.id = ur.role_id
            where ur.user_id = auth.uid()
              and ur.is_active = true
              and r.name in ('SUPER_ADMIN','ADMIN','MANAGER')
          )
        )
        with check (
          exists (
            select 1 from user_roles ur
            join roles r on r.id = ur.role_id
            where ur.user_id = auth.uid()
              and ur.is_active = true
              and r.name in ('SUPER_ADMIN','ADMIN','MANAGER')
          )
        );`,
      `create policy if not exists "Delete categories (ADMIN/SUPER_ADMIN)" on categories for delete to authenticated
        using (
          exists (
            select 1 from user_roles ur
            join roles r on r.id = ur.role_id
            where ur.user_id = auth.uid()
              and ur.is_active = true
              and r.name in ('SUPER_ADMIN','ADMIN')
          )
        );`,
      // Loyalty tables
      `create table if not exists loyalty_programs (
        id uuid default gen_random_uuid() primary key,
        name text not null,
        description text,
        points_per_purchase numeric default 0,
        minimum_purchase numeric default 0,
        welcome_bonus integer default 0,
        birthday_bonus integer default 0,
        referral_bonus integer default 0,
        points_expiration_days integer,
        is_active boolean default true,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );`,
      `create table if not exists loyalty_tiers (
        id uuid default gen_random_uuid() primary key,
        program_id uuid references loyalty_programs(id) on delete cascade,
        name text not null,
        description text,
        min_points integer not null default 0,
        multiplier numeric not null default 1,
        benefits text,
        color text,
        is_active boolean default true,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );`,
      `create table if not exists customer_loyalty (
        id uuid default gen_random_uuid() primary key,
        customer_id text not null references customers(id) on delete cascade,
        program_id uuid not null references loyalty_programs(id) on delete cascade,
        current_points integer not null default 0,
        total_points_earned integer not null default 0,
        total_points_redeemed integer not null default 0,
        current_tier_id uuid references loyalty_tiers(id),
        enrollment_date timestamptz default now(),
        last_activity_date timestamptz,
        created_at timestamptz default now(),
        updated_at timestamptz default now(),
        unique(customer_id, program_id)
      );`,
      `create table if not exists points_transactions (
        id uuid default gen_random_uuid() primary key,
        customer_loyalty_id uuid not null references customer_loyalty(id) on delete cascade,
        program_id uuid not null references loyalty_programs(id) on delete cascade,
        type text not null check (type in ('EARNED','REDEEMED','EXPIRED','BONUS','ADJUSTMENT')),
        points integer not null,
        description text,
        reference_type text,
        reference_id text,
        sale_id text,
        expiration_date timestamptz,
        created_at timestamptz default now(),
        created_by text,
        metadata jsonb
      );`,
      `create table if not exists loyalty_rewards (
        id uuid default gen_random_uuid() primary key,
        program_id uuid not null references loyalty_programs(id) on delete cascade,
        name text not null,
        description text,
        type text not null,
        value numeric default 0,
        points_cost integer not null default 0,
        max_redemptions integer,
        current_redemptions integer default 0,
        valid_from timestamptz,
        valid_until timestamptz,
        is_active boolean default true,
        category_id uuid,
        product_id uuid,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );`,
      `create table if not exists customer_rewards (
        id uuid default gen_random_uuid() primary key,
        program_id uuid not null references loyalty_programs(id) on delete cascade,
        customer_loyalty_id uuid not null references customer_loyalty(id) on delete cascade,
        reward_id uuid not null references loyalty_rewards(id) on delete cascade,
        status text not null check (status in ('AVAILABLE','USED','EXPIRED')) default 'AVAILABLE',
        redeemed_at timestamptz,
        used_at timestamptz,
        expiration_date timestamptz,
        sale_id text,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );`,
      // Enable RLS and basic read policies
      `alter table loyalty_programs enable row level security;`,
      `alter table loyalty_tiers enable row level security;`,
      `alter table customer_loyalty enable row level security;`,
      `alter table points_transactions enable row level security;`,
      `alter table loyalty_rewards enable row level security;`,
      `alter table customer_rewards enable row level security;`,
      `grant usage on schema public to anon;`,
      `grant usage on schema public to authenticated;`,
      `grant usage on schema public to service_role;`,
      `grant select on loyalty_programs to anon;`,
      `grant select on loyalty_programs to authenticated;`,
      `grant select on loyalty_programs to service_role;`,
      `grant insert, update, delete on loyalty_programs to service_role;`,
      `grant select on loyalty_tiers to anon;`,
      `grant select on loyalty_tiers to authenticated;`,
      `grant select on loyalty_tiers to service_role;`,
      `grant insert, update, delete on loyalty_tiers to service_role;`,
      `grant select on loyalty_rewards to anon;`,
      `grant select on loyalty_rewards to authenticated;`,
      `grant select on loyalty_rewards to service_role;`,
      `grant insert, update, delete on loyalty_rewards to service_role;`,
      `grant select on customer_loyalty to service_role;`,
      `grant insert, update, delete on customer_loyalty to service_role;`,
      `grant select on points_transactions to service_role;`,
      `grant insert, update, delete on points_transactions to service_role;`,
      `grant select on customer_rewards to service_role;`,
      `grant insert, update, delete on customer_rewards to service_role;`,
      `create policy if not exists "Authenticated read loyalty_programs" on loyalty_programs for select to authenticated using (is_active = true);`,
      `create policy if not exists "Public read loyalty_programs" on loyalty_programs for select to anon using (is_active = true);`,
      `create policy if not exists "Authenticated read loyalty_tiers" on loyalty_tiers for select to authenticated using (is_active = true);`,
      `create policy if not exists "Public read loyalty_tiers" on loyalty_tiers for select to anon using (is_active = true);`,
      `create policy if not exists "Authenticated read loyalty_rewards" on loyalty_rewards for select to authenticated using (is_active = true);`,
      `create policy if not exists "Public read loyalty_rewards" on loyalty_rewards for select to anon using (is_active = true);`,
      `create policy if not exists "Authenticated read customer_loyalty" on customer_loyalty for select to authenticated using (true);`,
      `create policy if not exists "Authenticated read points_transactions" on points_transactions for select to authenticated using (true);`,
      `create policy if not exists "Authenticated read customer_rewards" on customer_rewards for select to authenticated using (true);`
      ,
      // Basic write policies (adjust as needed)
      `create policy if not exists "Authenticated insert loyalty_programs" on loyalty_programs for insert to authenticated with check (true);`,
      `create policy if not exists "Authenticated update loyalty_programs" on loyalty_programs for update to authenticated using (true);`,
      `create policy if not exists "Authenticated insert loyalty_tiers" on loyalty_tiers for insert to authenticated with check (true);`,
      `create policy if not exists "Authenticated update loyalty_tiers" on loyalty_tiers for update to authenticated using (true);`,
      `create policy if not exists "Authenticated insert customer_loyalty" on customer_loyalty for insert to authenticated with check (true);`,
      `create policy if not exists "Authenticated update customer_loyalty" on customer_loyalty for update to authenticated using (true);`,
      `create policy if not exists "Authenticated insert points_transactions" on points_transactions for insert to authenticated with check (true);`,
      `create policy if not exists "Authenticated insert loyalty_rewards" on loyalty_rewards for insert to authenticated with check (true);`,
      `create policy if not exists "Authenticated update loyalty_rewards" on loyalty_rewards for update to authenticated using (true);`,
      `create policy if not exists "Authenticated insert customer_rewards" on customer_rewards for insert to authenticated with check (true);`,
      `create policy if not exists "Authenticated update customer_rewards" on customer_rewards for update to authenticated using (true);`,
      `create table if not exists promotions (
        id text primary key default gen_random_uuid()::text,
        name text not null,
        description text,
        discount_type text not null check (discount_type in ('PERCENTAGE','FIXED_AMOUNT')),
        discount_value numeric(12,2) not null default 0 check (discount_value >= 0),
        min_purchase_amount numeric(12,2) not null default 0 check (min_purchase_amount >= 0),
        max_discount_amount numeric(12,2),
        usage_limit int,
        usage_count int not null default 0,
        start_date timestamptz not null,
        end_date timestamptz not null,
        is_active boolean not null default true,
        approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected')),
        approval_comment text,
        approved_by text,
        approved_at timestamptz,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );`,
      `create index if not exists idx_promotions_name on promotions(name);`,
      `create index if not exists idx_promotions_active on promotions(is_active);`,
      `create index if not exists idx_promotions_dates on promotions(start_date, end_date);`,
      `CREATE EXTENSION IF NOT EXISTS pg_trgm;`,
      `CREATE INDEX IF NOT EXISTS idx_promotions_name_trgm ON public.promotions USING gin (name gin_trgm_ops);`,
      `CREATE INDEX IF NOT EXISTS idx_promotions_description_trgm ON public.promotions USING gin (description gin_trgm_ops);`,
      `CREATE INDEX IF NOT EXISTS idx_promotions_start_date ON public.promotions(start_date);`,
      `CREATE INDEX IF NOT EXISTS idx_promotions_end_date ON public.promotions(end_date);`,
      `CREATE INDEX IF NOT EXISTS idx_promotions_active_true ON public.promotions(is_active) WHERE is_active = true;`,
      `create index if not exists idx_promotions_approval_status on promotions(approval_status);`,
      `alter table promotions enable row level security;`,
      `grant select on promotions to anon;`,
      `grant select on promotions to authenticated;`,
      `grant select on promotions to service_role;`,
      `grant insert, update, delete on promotions to service_role;`,
      `create policy if not exists "Authenticated read promotions" on promotions for select to authenticated using (true);`,
      `create policy if not exists "Authenticated insert promotions" on promotions for insert to authenticated with check (true);`,
      `create policy if not exists "Authenticated update promotions" on promotions for update to authenticated using (true);`,
      `create table if not exists promotions_products (
        promotion_id text not null references promotions(id) on delete cascade,
        product_id text not null references products(id),
        created_at timestamptz not null default now(),
        primary key (promotion_id, product_id)
      );`,
      `create index if not exists idx_promotions_products_product_id on promotions_products(product_id);`,
      `alter table promotions_products enable row level security;`,
      `grant select on promotions_products to authenticated;`,
      `grant select on promotions_products to service_role;`,
      `grant insert, update, delete on promotions_products to service_role;`,
      `create policy if not exists "Authenticated read promotions_products" on promotions_products for select to authenticated using (true);`,
      `create policy if not exists "Authenticated write promotions_products" on promotions_products for insert to authenticated with check (true);`,
      `create table if not exists promotions_carousel (
        promotion_id text not null references promotions(id) on delete cascade,
        position int not null,
        created_at timestamptz not null default now(),
        primary key (promotion_id)
      );`,
      `create unique index if not exists idx_promotions_carousel_position on promotions_carousel(position);`,
      `alter table promotions_carousel enable row level security;`,
      `grant select on promotions_carousel to authenticated;`,
      `grant select on promotions_carousel to service_role;`,
      `grant insert, update, delete on promotions_carousel to service_role;`,
      `create policy if not exists "Authenticated read promotions_carousel" on promotions_carousel for select to authenticated using (true);`,
      `create policy if not exists "Authenticated write promotions_carousel" on promotions_carousel for insert to authenticated with check (true);`
      ,
      // Migrations: align columns old -> new for promotions
      `DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='promotions' AND column_name='type') THEN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='promotions' AND column_name='discount_type') THEN
            ALTER TABLE public.promotions ADD COLUMN discount_type TEXT;
            UPDATE public.promotions SET discount_type = CASE WHEN type IN ('PERCENTAGE','FIXED_AMOUNT') THEN type ELSE 'PERCENTAGE' END WHERE discount_type IS NULL;
            ALTER TABLE public.promotions ADD CONSTRAINT promotions_discount_type_chk CHECK (discount_type IN ('PERCENTAGE','FIXED_AMOUNT'));
          END IF;
        END IF;
      END $$;`,
      `DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='promotions' AND column_name='value') THEN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='promotions' AND column_name='discount_value') THEN
            ALTER TABLE public.promotions ADD COLUMN discount_value NUMERIC(12,2) NOT NULL DEFAULT 0;
            UPDATE public.promotions SET discount_value = COALESCE(value, 0) WHERE discount_value = 0;
          END IF;
        END IF;
      END $$;`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='promotions' AND column_name='min_purchase_amount') THEN
          ALTER TABLE public.promotions ADD COLUMN min_purchase_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='promotions' AND column_name='max_discount_amount') THEN
          ALTER TABLE public.promotions ADD COLUMN max_discount_amount NUMERIC(12,2);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='promotions' AND column_name='usage_limit') THEN
          ALTER TABLE public.promotions ADD COLUMN usage_limit INT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='promotions' AND column_name='usage_count') THEN
          ALTER TABLE public.promotions ADD COLUMN usage_count INT NOT NULL DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='promotions' AND column_name='approval_status') THEN
          ALTER TABLE public.promotions ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'pending';
          ALTER TABLE public.promotions ADD CONSTRAINT promotions_approval_status_chk CHECK (approval_status IN ('pending','approved','rejected'));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='promotions' AND column_name='approval_comment') THEN
          ALTER TABLE public.promotions ADD COLUMN approval_comment TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='promotions' AND column_name='approved_by') THEN
          ALTER TABLE public.promotions ADD COLUMN approved_by TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='promotions' AND column_name='approved_at') THEN
          ALTER TABLE public.promotions ADD COLUMN approved_at TIMESTAMPTZ;
        END IF;
      END $$;`,
      `DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='promotions' AND column_name='type') THEN
          ALTER TABLE public.promotions DROP COLUMN type;
        END IF;
      END $$;`,
      `DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='promotions' AND column_name='value') THEN
          ALTER TABLE public.promotions DROP COLUMN value;
        END IF;
      END $$;`,
      // Seed example promotions (idempotente por nombre)
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM public.promotions WHERE name = 'Descuento 10% General') THEN
          INSERT INTO public.promotions (name, description, discount_type, discount_value, min_purchase_amount, max_discount_amount, usage_limit, usage_count, start_date, end_date, is_active, approval_status)
          VALUES ('Descuento 10% General', 'Promoción general del 10% en todo', 'PERCENTAGE', 10, 0, NULL, NULL, 0, NOW() - INTERVAL '30 days', NOW() + INTERVAL '180 days', TRUE, 'approved');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.promotions WHERE name = 'Monto fijo $50000') THEN
          INSERT INTO public.promotions (name, description, discount_type, discount_value, min_purchase_amount, max_discount_amount, usage_limit, usage_count, start_date, end_date, is_active, approval_status)
          VALUES ('Monto fijo $50000', 'Promoción de monto fijo', 'FIXED_AMOUNT', 50000, 100000, 50000, NULL, 0, NOW() - INTERVAL '10 days', NOW() + INTERVAL '90 days', TRUE, 'approved');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.promotions WHERE name = 'Navidad 20%') THEN
          INSERT INTO public.promotions (name, description, discount_type, discount_value, min_purchase_amount, max_discount_amount, usage_limit, usage_count, start_date, end_date, is_active, approval_status)
          VALUES ('Navidad 20%', 'Promoción navideña', 'PERCENTAGE', 20, 150000, 200000, 1, 0, DATE_TRUNC('year', NOW()) + INTERVAL '11 months', DATE_TRUNC('year', NOW()) + INTERVAL '11 months' + INTERVAL '31 days', TRUE, 'approved');
        END IF;
      END $$;`,
      // Seed carousel using inserted promotions by name
      `DO $$ BEGIN
        DELETE FROM public.promotions_carousel WHERE promotion_id IS NOT NULL;
        INSERT INTO public.promotions_carousel (promotion_id, position)
        SELECT id, ROW_NUMBER() OVER (ORDER BY name) - 1
        FROM public.promotions
        WHERE name IN ('Descuento 10% General','Monto fijo $50000','Navidad 20%')
        ON CONFLICT (promotion_id) DO UPDATE SET position = EXCLUDED.position;
      END $$;`,
      `CREATE INDEX IF NOT EXISTS idx_promotions_products_promotion_id ON public.promotions_products(promotion_id);`,
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'promotions_dates_chk' AND conrelid = 'public.promotions'::regclass
        ) THEN
          ALTER TABLE public.promotions ADD CONSTRAINT promotions_dates_chk CHECK (start_date <= end_date);
        END IF;
      END $$;`,
      `CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
      BEGIN
        NEW.updated_at := NOW();
        RETURN NEW;
      END;$$ LANGUAGE plpgsql;`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'promotions_set_updated_at') THEN
          CREATE TRIGGER promotions_set_updated_at BEFORE UPDATE ON public.promotions
          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        END IF;
      END $$;`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='promotions_products' AND column_name='updated_at') THEN
          ALTER TABLE public.promotions_products ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        END IF;
      END $$;`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'promotions_products_set_updated_at') THEN
          CREATE TRIGGER promotions_products_set_updated_at BEFORE UPDATE ON public.promotions_products
          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        END IF;
      END $$;`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='promotions_carousel' AND column_name='updated_at') THEN
          ALTER TABLE public.promotions_carousel ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        END IF;
      END $$;`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'promotions_carousel_set_updated_at') THEN
          CREATE TRIGGER promotions_carousel_set_updated_at BEFORE UPDATE ON public.promotions_carousel
          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        END IF;
      END $$;`,
      `DO $$
      DECLARE p_general TEXT; p_fijo TEXT; p_navidad TEXT; pid TEXT; c1 TEXT; c2 TEXT; c3 TEXT;
      BEGIN
        SELECT id INTO p_general FROM public.promotions WHERE name = 'Descuento 10% General' LIMIT 1;
        SELECT id INTO p_fijo FROM public.promotions WHERE name = 'Monto fijo $50000' LIMIT 1;
        SELECT id INTO p_navidad FROM public.promotions WHERE name = 'Navidad 20%' LIMIT 1;

        SELECT id INTO c1 FROM public.categories WHERE name = 'Ofertas' LIMIT 1;
        IF c1 IS NULL THEN SELECT id INTO c1 FROM public.categories WHERE name ILIKE 'Oferta%' LIMIT 1; END IF;
        IF c1 IS NULL THEN SELECT id INTO c1 FROM public.categories ORDER BY name NULLS LAST LIMIT 1; END IF;

        SELECT id INTO c2 FROM public.categories WHERE name = 'Electrónica' LIMIT 1;
        IF c2 IS NULL THEN SELECT id INTO c2 FROM public.categories WHERE name ILIKE 'Electr%' LIMIT 1; END IF;
        IF c2 IS NULL THEN SELECT id INTO c2 FROM public.categories WHERE id <> c1 ORDER BY name NULLS LAST LIMIT 1 OFFSET 1; END IF;

        SELECT id INTO c3 FROM public.categories WHERE name = 'Navidad' LIMIT 1;
        IF c3 IS NULL THEN SELECT id INTO c3 FROM public.categories WHERE name ILIKE 'Navidad%' LIMIT 1; END IF;
        IF c3 IS NULL THEN SELECT id INTO c3 FROM public.categories WHERE id <> c1 AND id <> c2 ORDER BY name NULLS LAST LIMIT 1 OFFSET 2; END IF;

        IF p_general IS NOT NULL AND c1 IS NOT NULL THEN
          FOR pid IN SELECT id FROM public.products WHERE category_id = c1 ORDER BY name NULLS LAST LIMIT 5 LOOP
            INSERT INTO public.promotions_products (promotion_id, product_id, created_at)
            VALUES (p_general, pid, NOW())
            ON CONFLICT (promotion_id, product_id) DO NOTHING;
          END LOOP;
        END IF;

        IF p_fijo IS NOT NULL AND c2 IS NOT NULL THEN
          FOR pid IN SELECT id FROM public.products WHERE category_id = c2 ORDER BY name NULLS LAST LIMIT 5 LOOP
            INSERT INTO public.promotions_products (promotion_id, product_id, created_at)
            VALUES (p_fijo, pid, NOW())
            ON CONFLICT (promotion_id, product_id) DO NOTHING;
          END LOOP;
        END IF;

        IF p_navidad IS NOT NULL AND c3 IS NOT NULL THEN
          FOR pid IN SELECT id FROM public.products WHERE category_id = c3 ORDER BY name NULLS LAST LIMIT 5 LOOP
            INSERT INTO public.promotions_products (promotion_id, product_id, created_at)
            VALUES (p_navidad, pid, NOW())
            ON CONFLICT (promotion_id, product_id) DO NOTHING;
          END LOOP;
        END IF;
      END $$;`,
      `CREATE TABLE IF NOT EXISTS public.coupons (
        code TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('PERCENTAGE','FIXED_AMOUNT')),
        value NUMERIC(12,2) NOT NULL,
        start_date TIMESTAMPTZ NOT NULL,
        end_date TIMESTAMPTZ NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        usage_limit INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,
      `ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;`,
      `GRANT SELECT ON public.coupons TO authenticated;`,
      `GRANT SELECT ON public.coupons TO service_role;`,
      `GRANT INSERT, UPDATE, DELETE ON public.coupons TO service_role;`,
      `CREATE POLICY IF NOT EXISTS coupons_read_authenticated ON public.coupons FOR SELECT TO authenticated USING (true);`,
      `CREATE POLICY IF NOT EXISTS coupons_insert_authenticated ON public.coupons FOR INSERT TO authenticated WITH CHECK (true);`,
      `CREATE POLICY IF NOT EXISTS coupons_update_authenticated ON public.coupons FOR UPDATE TO authenticated USING (true);`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM public.coupons WHERE code = 'WELCOME10') THEN
          INSERT INTO public.coupons (code, type, value, start_date, end_date, is_active, usage_limit)
          VALUES ('WELCOME10', 'PERCENTAGE', 10, NOW() - INTERVAL '15 days', NOW() + INTERVAL '90 days', TRUE, NULL);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.coupons WHERE code = 'FIJO50K') THEN
          INSERT INTO public.coupons (code, type, value, start_date, end_date, is_active, usage_limit)
          VALUES ('FIJO50K', 'FIXED_AMOUNT', 50000, NOW() - INTERVAL '5 days', NOW() + INTERVAL '60 days', TRUE, 100);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM public.coupons WHERE code = 'NAVIDAD20') THEN
          INSERT INTO public.coupons (code, type, value, start_date, end_date, is_active, usage_limit)
          VALUES ('NAVIDAD20', 'PERCENTAGE', 20, DATE_TRUNC('year', NOW()) + INTERVAL '11 months', DATE_TRUNC('year', NOW()) + INTERVAL '11 months' + INTERVAL '31 days', TRUE, 1);
        END IF;
      END $$;`,
      `CREATE TABLE IF NOT EXISTS public.audit_logs (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id TEXT NOT NULL,
        action TEXT NOT NULL,
        resource TEXT NOT NULL,
        details JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,
      `ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;`,
      `GRANT SELECT ON public.audit_logs TO authenticated;`,
      `GRANT INSERT ON public.audit_logs TO authenticated;`,
      `GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs TO service_role;`,
      `CREATE POLICY IF NOT EXISTS audit_logs_read_authenticated ON public.audit_logs FOR SELECT TO authenticated USING (true);`,
      `CREATE POLICY IF NOT EXISTS audit_logs_insert_authenticated ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);`,
      `CREATE EXTENSION IF NOT EXISTS pg_trgm;`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_action_trgm ON public.audit_logs USING gin (action gin_trgm_ops);`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_trgm ON public.audit_logs USING gin (resource gin_trgm_ops);`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_details_trgm ON public.audit_logs USING gin ((details::text) gin_trgm_ops);`
      ,
      // Realtime: asegurar replica identity y publicación para promociones
      `ALTER TABLE public.promotions REPLICA IDENTITY FULL;`,
      `ALTER TABLE public.promotions_products REPLICA IDENTITY FULL;`,
      `DO $$
      BEGIN
        BEGIN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.promotions;
        EXCEPTION WHEN others THEN
          NULL;
        END;
        BEGIN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.promotions_products;
        EXCEPTION WHEN others THEN
          NULL;
        END;
        BEGIN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.promotions_carousel;
        EXCEPTION WHEN others THEN
          NULL;
        END;
        BEGIN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.sale_items;
        EXCEPTION WHEN others THEN
          NULL;
        END;
        BEGIN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_movements;
        EXCEPTION WHEN others THEN
          NULL;
        END;
        BEGIN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.roles;
        EXCEPTION WHEN others THEN
          NULL;
        END;
        BEGIN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.permissions;
        EXCEPTION WHEN others THEN
          NULL;
        END;
        BEGIN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;
        EXCEPTION WHEN others THEN
          NULL;
        END;
        BEGIN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.loyalty_programs;
        EXCEPTION WHEN others THEN
          NULL;
        END;
        BEGIN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.loyalty_tiers;
        EXCEPTION WHEN others THEN
          NULL;
        END;
        BEGIN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_loyalty;
        EXCEPTION WHEN others THEN
          NULL;
        END;
        BEGIN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.points_transactions;
        EXCEPTION WHEN others THEN
          NULL;
        END;
        BEGIN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.loyalty_rewards;
        EXCEPTION WHEN others THEN
          NULL;
        END;
        BEGIN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_rewards;
        EXCEPTION WHEN others THEN
          NULL;
        END;
      END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='settings' AND column_name='checksum') THEN ALTER TABLE public.settings ADD COLUMN checksum TEXT; END IF; END $$;`,
      `CREATE EXTENSION IF NOT EXISTS pgcrypto;`,
      `CREATE OR REPLACE FUNCTION settings_set_checksum() RETURNS trigger AS $$ BEGIN NEW.checksum := encode(digest(coalesce(NEW.value::text,'') || '|' || NEW.version::text, 'sha256'),'hex'); RETURN NEW; END; $$ LANGUAGE plpgsql;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'settings_set_checksum_trg') THEN CREATE TRIGGER settings_set_checksum_trg BEFORE INSERT OR UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION settings_set_checksum(); END IF; END $$;`,
      `CREATE OR REPLACE FUNCTION reserve_promotion_usage(p_id TEXT) RETURNS TABLE (id TEXT, usage_limit INT, usage_count INT) AS $$ BEGIN PERFORM pg_advisory_xact_lock(hashtext(p_id)); UPDATE public.promotions SET usage_count = usage_count + 1 WHERE id = p_id AND (usage_limit IS NULL OR usage_count < usage_limit) RETURNING id, usage_limit, usage_count INTO STRICT id, usage_limit, usage_count; RETURN QUERY SELECT id, usage_limit, usage_count; EXCEPTION WHEN NO_DATA_FOUND THEN RAISE EXCEPTION 'Promotion limit reached or not found'; END; $$ LANGUAGE plpgsql;`,
      `GRANT EXECUTE ON FUNCTION reserve_promotion_usage(TEXT) TO authenticated, service_role;`,
      `CREATE OR REPLACE FUNCTION adjust_points_atomic(cl_id UUID, delta INT, descr TEXT) RETURNS TABLE (id UUID, current_points INT, total_points_earned INT, total_points_redeemed INT) AS $$ DECLARE rec RECORD; BEGIN PERFORM pg_advisory_xact_lock(hashtext(cl_id::text)); UPDATE public.customer_loyalty SET current_points = current_points + delta, total_points_earned = total_points_earned + CASE WHEN delta > 0 THEN delta ELSE 0 END, total_points_redeemed = total_points_redeemed + CASE WHEN delta < 0 THEN -delta ELSE 0 END, updated_at = NOW() WHERE id = cl_id RETURNING id, current_points, total_points_earned, total_points_redeemed INTO rec; IF NOT FOUND THEN RAISE EXCEPTION 'Customer loyalty not found'; END IF; INSERT INTO public.points_transactions (customer_loyalty_id, program_id, type, points, description, created_at) SELECT cl_id, program_id, CASE WHEN delta > 0 THEN 'EARNED' ELSE 'REDEEMED' END, ABS(delta), descr, NOW() FROM public.customer_loyalty WHERE id = cl_id; RETURN QUERY SELECT rec.id, rec.current_points, rec.total_points_earned, rec.total_points_redeemed; END; $$ LANGUAGE plpgsql;`,
      `GRANT EXECUTE ON FUNCTION adjust_points_atomic(UUID, INT, TEXT) TO authenticated, service_role;`,
      `CREATE OR REPLACE FUNCTION invalidate_sessions_on_user_role_change() RETURNS trigger AS $$ BEGIN UPDATE public.user_sessions SET is_active = false, updated_at = NOW() WHERE user_id = NEW.user_id; RETURN NEW; END; $$ LANGUAGE plpgsql;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'user_roles_invalidate_sessions_trg') THEN CREATE TRIGGER user_roles_invalidate_sessions_trg AFTER INSERT OR UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION invalidate_sessions_on_user_role_change(); END IF; END $$;`,
      `ALTER TABLE public.coupons REPLICA IDENTITY FULL;`,
      `DO $$ BEGIN BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.coupons; EXCEPTION WHEN others THEN NULL; END; END $$;`,
      `CREATE TABLE IF NOT EXISTS public.coupon_usages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        coupon_id TEXT NOT NULL REFERENCES public.coupons(code) ON UPDATE CASCADE ON DELETE RESTRICT,
        sale_id TEXT,
        user_id TEXT,
        status TEXT NOT NULL DEFAULT 'APPLIED' CHECK (status IN ('APPLIED','ROLLED_BACK')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,
      `ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;`,
      `GRANT SELECT ON public.coupon_usages TO authenticated;`,
      `GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupon_usages TO service_role;`,
      `CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon_id ON public.coupon_usages(coupon_id);`,
      `CREATE INDEX IF NOT EXISTS idx_coupon_usages_sale_id ON public.coupon_usages(sale_id);`,
      `CREATE INDEX IF NOT EXISTS idx_coupon_usages_created_at ON public.coupon_usages(created_at DESC);`,
      `DO $$ BEGIN BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.coupon_usages; EXCEPTION WHEN others THEN NULL; END; END $$;`,
      `CREATE OR REPLACE FUNCTION apply_coupon_secure(p_coupon_id TEXT, p_sale_id TEXT DEFAULT NULL, p_user_id TEXT DEFAULT NULL)
      RETURNS TABLE (coupon_id TEXT, usage_limit INT, usage_count INT, status TEXT) AS $$
      DECLARE r RECORD;
      BEGIN
        PERFORM pg_advisory_xact_lock(hashtext(p_coupon_id));
        SELECT * FROM public.coupons WHERE code = p_coupon_id FOR UPDATE INTO r;
        IF NOT FOUND THEN RAISE EXCEPTION 'Coupon not found'; END IF;
        IF r.is_active IS NOT TRUE THEN RAISE EXCEPTION 'Coupon inactive'; END IF;
        IF NOW() < r.start_date OR NOW() > r.end_date THEN RAISE EXCEPTION 'Coupon out of date'; END IF;
        IF r.usage_limit IS NOT NULL AND r.usage_count >= r.usage_limit THEN RAISE EXCEPTION 'Coupon limit reached'; END IF;
        IF p_sale_id IS NOT NULL THEN
          IF EXISTS (SELECT 1 FROM public.coupon_usages WHERE coupon_id = p_coupon_id AND sale_id = p_sale_id AND status='APPLIED') THEN
            RAISE EXCEPTION 'Coupon already applied to sale';
          END IF;
        END IF;
        UPDATE public.coupons SET usage_count = usage_count + 1 WHERE code = p_coupon_id RETURNING code, usage_limit, usage_count INTO r;
        INSERT INTO public.coupon_usages(coupon_id, sale_id, user_id, status)
        VALUES (p_coupon_id, p_sale_id, p_user_id, 'APPLIED');
        RETURN QUERY SELECT r.code::TEXT, r.usage_limit::INT, r.usage_count::INT, 'APPLIED'::TEXT;
      EXCEPTION WHEN OTHERS THEN
        RAISE;
      END; $$ LANGUAGE plpgsql SECURITY DEFINER;`,
      `GRANT EXECUTE ON FUNCTION apply_coupon_secure(TEXT, TEXT, TEXT) TO authenticated, service_role;`,
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_coupon_usage_unique_sale ON public.coupon_usages(coupon_id, sale_id) WHERE sale_id IS NOT NULL AND status='APPLIED';`,
      `CREATE OR REPLACE FUNCTION rollback_coupon_usage(p_coupon_id TEXT, p_sale_id TEXT)
      RETURNS TABLE (coupon_id TEXT, usage_count INT, status TEXT) AS $$
      DECLARE r RECORD;
      BEGIN
        PERFORM pg_advisory_xact_lock(hashtext(p_coupon_id));
        SELECT * FROM public.coupons WHERE code = p_coupon_id FOR UPDATE INTO r;
        IF NOT FOUND THEN RAISE EXCEPTION 'Coupon not found'; END IF;
        IF NOT EXISTS (SELECT 1 FROM public.coupon_usages WHERE coupon_id = p_coupon_id AND sale_id = p_sale_id AND status='APPLIED') THEN
          RAISE EXCEPTION 'No applied coupon for sale';
        END IF;
        UPDATE public.coupons SET usage_count = GREATEST(usage_count - 1, 0) WHERE code = p_coupon_id RETURNING code, usage_count INTO r;
        UPDATE public.coupon_usages SET status='ROLLED_BACK' WHERE coupon_id = p_coupon_id AND sale_id = p_sale_id AND status='APPLIED';
        RETURN QUERY SELECT r.code::TEXT, r.usage_count::INT, 'ROLLED_BACK'::TEXT;
      END; $$ LANGUAGE plpgsql SECURITY DEFINER;`,
      `GRANT EXECUTE ON FUNCTION rollback_coupon_usage(TEXT, TEXT) TO authenticated, service_role;`,
      `CREATE OR REPLACE FUNCTION redeem_reward_safe(p_reward_id TEXT, p_customer_id TEXT, p_sale_id TEXT DEFAULT NULL, p_idempotency_key TEXT DEFAULT NULL)
      RETURNS TABLE (reward_id TEXT, customer_id TEXT, points_cost INT, status TEXT) AS $$
      DECLARE rec RECORD; points_cost INT; current_points INT; idem UUID;
      BEGIN
        PERFORM pg_advisory_xact_lock(hashtext(p_reward_id));
        IF p_idempotency_key IS NOT NULL THEN
          SELECT id FROM public.idempotency_keys WHERE key = p_idempotency_key AND entity = 'reward' AND entity_id = p_reward_id INTO idem;
          IF FOUND THEN
            RETURN QUERY SELECT p_reward_id::TEXT, p_customer_id::TEXT, 0::INT, 'IDEMPOTENT'::TEXT;
            RETURN;
          END IF;
        END IF;
        SELECT * FROM public.loyalty_rewards WHERE id = p_reward_id FOR UPDATE INTO rec;
        IF NOT FOUND THEN RAISE EXCEPTION 'Reward not found'; END IF;
        IF rec.is_active IS NOT TRUE THEN RAISE EXCEPTION 'Reward inactive'; END IF;
        IF rec.stock IS NOT NULL AND rec.stock <= 0 THEN RAISE EXCEPTION 'Reward out of stock'; END IF;
        SELECT current_points FROM public.customer_loyalty WHERE customer_id = p_customer_id INTO current_points;
        IF current_points IS NULL THEN RAISE EXCEPTION 'Customer loyalty not found'; END IF;
        IF current_points < rec.points_cost THEN RAISE EXCEPTION 'Insufficient points'; END IF;
        points_cost := rec.points_cost;
        PERFORM pg_advisory_xact_lock(hashtext(p_customer_id));
        UPDATE public.customer_loyalty SET current_points = current_points - points_cost, total_points_redeemed = total_points_redeemed + points_cost WHERE customer_id = p_customer_id RETURNING current_points INTO current_points;
        IF rec.stock IS NOT NULL THEN
          UPDATE public.loyalty_rewards SET stock = stock - 1 WHERE id = p_reward_id;
        END IF;
        INSERT INTO public.customer_rewards(customer_id, reward_id, sale_id, points_cost, created_at) VALUES (p_customer_id, p_reward_id, p_sale_id, points_cost, NOW());
        IF p_idempotency_key IS NOT NULL THEN
          INSERT INTO public.idempotency_keys(key, entity, entity_id) VALUES (p_idempotency_key, 'reward', p_reward_id);
        END IF;
        RETURN QUERY SELECT p_reward_id::TEXT, p_customer_id::TEXT, points_cost::INT, 'REDEEMED'::TEXT;
      END; $$ LANGUAGE plpgsql SECURITY DEFINER;`,
      `GRANT EXECUTE ON FUNCTION redeem_reward_safe(TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;`,
      `CREATE OR REPLACE FUNCTION adjust_points_safe(p_customer_id TEXT, p_delta INT, p_descr TEXT DEFAULT 'Manual adjustment', p_idempotency_key TEXT DEFAULT NULL)
      RETURNS TABLE (customer_id TEXT, current_points INT, total_points_earned INT, total_points_redeemed INT, status TEXT) AS $$
      DECLARE rec RECORD; idem UUID;
      BEGIN
        PERFORM pg_advisory_xact_lock(hashtext(p_customer_id));
        IF p_idempotency_key IS NOT NULL THEN
          SELECT id FROM public.idempotency_keys WHERE key = p_idempotency_key AND entity = 'points' AND entity_id = p_customer_id INTO idem;
          IF FOUND THEN
            RETURN QUERY SELECT p_customer_id::TEXT, 0::INT, 0::INT, 0::INT, 'IDEMPOTENT'::TEXT;
            RETURN;
          END IF;
        END IF;
        SELECT * FROM public.customer_loyalty WHERE customer_id = p_customer_id FOR UPDATE INTO rec;
        IF NOT FOUND THEN RAISE EXCEPTION 'Customer loyalty not found'; END IF;
        UPDATE public.customer_loyalty SET current_points = current_points + p_delta, total_points_earned = total_points_earned + CASE WHEN p_delta > 0 THEN p_delta ELSE 0 END, total_points_redeemed = total_points_redeemed + CASE WHEN p_delta < 0 THEN -p_delta ELSE 0 END, updated_at = NOW() WHERE customer_id = p_customer_id RETURNING id, current_points, total_points_earned, total_points_redeemed INTO rec;
        INSERT INTO public.points_transactions (customer_loyalty_id, program_id, type, points, description, created_at) VALUES (rec.id, rec.program_id, CASE WHEN p_delta > 0 THEN 'EARNED' ELSE 'REDEEMED' END, ABS(p_delta), p_descr, NOW());
        IF p_idempotency_key IS NOT NULL THEN
          INSERT INTO public.idempotency_keys(key, entity, entity_id) VALUES (p_idempotency_key, 'points', p_customer_id);
        END IF;
        RETURN QUERY SELECT p_customer_id::TEXT, rec.current_points::INT, rec.total_points_earned::INT, rec.total_points_redeemed::INT, 'ADJUSTED'::TEXT;
      END; $$ LANGUAGE plpgsql SECURITY DEFINER;`,
      `GRANT EXECUTE ON FUNCTION adjust_points_safe(TEXT, INT, TEXT, TEXT) TO authenticated, service_role;`,
      `CREATE OR REPLACE FUNCTION close_cash_session_safe(p_session_id TEXT, p_actual_cash NUMERIC(12,2), p_idempotency_key TEXT DEFAULT NULL)
      RETURNS TABLE (session_id TEXT, status TEXT, variance NUMERIC(12,2)) AS $$
      DECLARE rec RECORD; variance NUMERIC(12,2); idem UUID;
      BEGIN
        PERFORM pg_advisory_xact_lock(hashtext(p_session_id));
        IF p_idempotency_key IS NOT NULL THEN
          SELECT id FROM public.idempotency_keys WHERE key = p_idempotency_key AND entity = 'cash_session' AND entity_id = p_session_id INTO idem;
          IF FOUND THEN
            RETURN QUERY SELECT p_session_id::TEXT, 'IDEMPOTENT'::TEXT, 0::NUMERIC(12,2);
            RETURN;
          END IF;
        END IF;
        SELECT * FROM public.cash_sessions WHERE id = p_session_id AND status = 'OPEN' FOR UPDATE INTO rec;
        IF NOT FOUND THEN RAISE EXCEPTION 'Session not open or not found'; END IF;
        variance := p_actual_cash - rec.expected_cash;
        UPDATE public.cash_sessions SET actual_cash = p_actual_cash, variance = variance, status = 'CLOSED', closed_at = NOW() WHERE id = p_session_id;
        INSERT INTO public.cash_audit_logs(session_id, action, amount, description, created_at) VALUES (p_session_id, 'CLOSE', p_actual_cash, 'Caja cerrada', NOW());
        IF p_idempotency_key IS NOT NULL THEN
          INSERT INTO public.idempotency_keys(key, entity, entity_id) VALUES (p_idempotency_key, 'cash_session', p_session_id);
        END IF;
        RETURN QUERY SELECT p_session_id::TEXT, 'CLOSED'::TEXT, variance::NUMERIC(12,2);
      END; $$ LANGUAGE plpgsql SECURITY DEFINER;`,
      `GRANT EXECUTE ON FUNCTION close_cash_session_safe(TEXT, NUMERIC, TEXT) TO authenticated, service_role;`,
      `CREATE TABLE IF NOT EXISTS public.sync_queue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        event TEXT NOT NULL,
        priority INT NOT NULL DEFAULT 5,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        processed BOOLEAN NOT NULL DEFAULT FALSE
      );`,
      `ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;`,
      `GRANT SELECT, INSERT, UPDATE ON public.sync_queue TO authenticated;`,
      `GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_queue TO service_role;`,
      `CREATE OR REPLACE FUNCTION enqueue_sync_event() RETURNS trigger AS $$ BEGIN INSERT INTO public.sync_queue(entity, entity_id, event, priority) VALUES (TG_TABLE_NAME, COALESCE(NEW.id::text, OLD.id::text), TG_OP, CASE WHEN TG_TABLE_NAME='inventory_movements' THEN 1 ELSE 3 END); RETURN NEW; END; $$ LANGUAGE plpgsql;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'sale_items_enqueue_sync') THEN CREATE TRIGGER sale_items_enqueue_sync AFTER INSERT OR UPDATE OR DELETE ON public.sale_items FOR EACH ROW EXECUTE FUNCTION enqueue_sync_event(); END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'inventory_movements_enqueue_sync') THEN CREATE TRIGGER inventory_movements_enqueue_sync AFTER INSERT OR UPDATE OR DELETE ON public.inventory_movements FOR EACH ROW EXECUTE FUNCTION enqueue_sync_event(); END IF; END $$;`,
      `DO $$ BEGIN BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_queue; EXCEPTION WHEN others THEN NULL; END; END $$;`,
      `CREATE TABLE IF NOT EXISTS public.sync_acks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        event TEXT NOT NULL,
        node_id TEXT NOT NULL,
        received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,
      `ALTER TABLE public.sync_acks ENABLE ROW LEVEL SECURITY;`,
      `GRANT SELECT, INSERT ON public.sync_acks TO authenticated;`,
      `GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_acks TO service_role;`,
      `DO $$ BEGIN BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_acks; EXCEPTION WHEN others THEN NULL; END; END $$;`
      ,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'coupons_enqueue_sync') THEN CREATE TRIGGER coupons_enqueue_sync AFTER INSERT OR UPDATE OR DELETE ON public.coupons FOR EACH ROW EXECUTE FUNCTION enqueue_sync_event(); END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'coupon_usages_enqueue_sync') THEN CREATE TRIGGER coupon_usages_enqueue_sync AFTER INSERT OR UPDATE OR DELETE ON public.coupon_usages FOR EACH ROW EXECUTE FUNCTION enqueue_sync_event(); END IF; END $$;`,
      `CREATE TABLE IF NOT EXISTS public.idempotency_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key TEXT UNIQUE NOT NULL,
        entity TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,
      `ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;`,
      `GRANT SELECT, INSERT ON public.idempotency_keys TO authenticated;`,
      `GRANT SELECT, INSERT, DELETE ON public.idempotency_keys TO service_role;`,
      `CREATE INDEX IF NOT EXISTS idx_idempotency_keys_key ON public.idempotency_keys(key);`,
      `CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created_at ON public.idempotency_keys(created_at DESC);`,
      `DO $$ BEGIN BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.idempotency_keys; EXCEPTION WHEN others THEN NULL; END; END $$;`
    ]

    const results: { step: string; success: boolean; error?: string }[] = []

    for (const sql of statements) {
      try {
        const { error } = await (supabase as any).rpc('exec_sql', { sql })
        if (error) {
          results.push({ step: sql, success: false, error: error.message })
        } else {
          results.push({ step: sql, success: true })
        }
      } catch (err: any) {
        results.push({ step: sql, success: false, error: err?.message || 'Unknown error' })
      }
    }

    const success = results.every(r => r.success)
    return NextResponse.json({ success, results })
  } catch (error) {
    console.error('Error applying common RLS policies:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
