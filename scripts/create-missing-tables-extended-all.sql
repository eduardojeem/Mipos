-- =====================================================
-- POS System – Script extendido idempotente: Compras, Devoluciones,
-- Auditoría, Créditos y Enlaces de Recompensas/Tiers (Loyalty)
-- Crea SOLO si faltan. Re-ejecutable sin efectos secundarios.
-- =====================================================

SET search_path TO public;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================
-- SUPPLIERS
-- =====================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(name);

-- -----------------------------------------------------
-- Compras (purchases)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS purchases (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  supplier_id  TEXT NOT NULL,
  user_id      UUID NOT NULL,
  total        NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  date         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_purchases_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  CONSTRAINT fk_purchases_user     FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id     ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date        ON purchases(date);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'purchases' AND policyname = 'purchases_select_own'
  ) THEN
    CREATE POLICY purchases_select_own ON purchases
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- -----------------------------------------------------
-- Detalle de compra (purchase_items)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_items (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  purchase_id  TEXT NOT NULL,
  product_id   TEXT NOT NULL,
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost    NUMERIC(10,2) NOT NULL CHECK (unit_cost >= 0),
  CONSTRAINT fk_purchase_items_purchase FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
  CONSTRAINT fk_purchase_items_product  FOREIGN KEY (product_id)  REFERENCES products(id)  ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product_id  ON purchase_items(product_id);

ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'purchase_items' AND policyname = 'purchase_items_select_via_purchase'
  ) THEN
    CREATE POLICY purchase_items_select_via_purchase ON purchase_items
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM purchases p
          WHERE p.id = purchase_items.purchase_id
            AND p.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- -----------------------------------------------------
-- Items de venta (sale_items)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sale_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sale_id UUID NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL,
  total_price NUMERIC(12,2) NOT NULL,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items(product_id);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sale_items' AND policyname = 'sale_items_select_via_sale'
  ) THEN
    CREATE POLICY sale_items_select_via_sale ON public.sale_items
      FOR SELECT TO authenticated
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- -----------------------------------------------------
-- Devoluciones (returns)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS returns (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  original_sale_id UUID NOT NULL,
  user_id          UUID NOT NULL,
  customer_id      TEXT,
  status           TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','COMPLETED')),
  reason           TEXT NOT NULL CHECK (char_length(reason) >= 3),
  refund_method    TEXT NOT NULL CHECK (refund_method IN ('CASH','CARD','TRANSFER','OTHER')),
  total_amount     NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_returns_original_sale FOREIGN KEY (original_sale_id) REFERENCES sales(id)      ON DELETE CASCADE,
  CONSTRAINT fk_returns_user           FOREIGN KEY (user_id)          REFERENCES users(id)      ON DELETE CASCADE,
  CONSTRAINT fk_returns_customer       FOREIGN KEY (customer_id)      REFERENCES customers(id)
);

CREATE INDEX IF NOT EXISTS idx_returns_original_sale_id ON returns(original_sale_id);
CREATE INDEX IF NOT EXISTS idx_returns_user_id          ON returns(user_id);
CREATE INDEX IF NOT EXISTS idx_returns_status           ON returns(status);
CREATE INDEX IF NOT EXISTS idx_returns_created_at       ON returns(created_at);

ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'returns' AND policyname = 'returns_select_own'
  ) THEN
    CREATE POLICY returns_select_own ON returns
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- -----------------------------------------------------
-- Detalle de devolución (return_items)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS return_items (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  return_id             TEXT NOT NULL,
  original_sale_item_id TEXT NOT NULL,
  product_id            TEXT NOT NULL,
  quantity              INTEGER NOT NULL CHECK (quantity > 0),
  unit_price            NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  reason                TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_return_items_return      FOREIGN KEY (return_id)             REFERENCES returns(id)     ON DELETE CASCADE,
  CONSTRAINT fk_return_items_product     FOREIGN KEY (product_id)            REFERENCES products(id)    ON DELETE CASCADE,
  CONSTRAINT fk_return_items_sale_item   FOREIGN KEY (original_sale_item_id) REFERENCES sale_items(id)  ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_return_items_return_id             ON return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_return_items_product_id            ON return_items(product_id);
CREATE INDEX IF NOT EXISTS idx_return_items_original_sale_item_id ON return_items(original_sale_item_id);

ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'return_items' AND policyname = 'return_items_select_via_return'
  ) THEN
    CREATE POLICY return_items_select_via_return ON return_items
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM returns r
          WHERE r.id = return_items.return_id
            AND r.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- -----------------------------------------------------
-- Auditoría (audit_logs)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  type TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_logs' AND policyname = 'select_own_logs'
  ) THEN
    CREATE POLICY select_own_logs ON public.audit_logs
      FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_logs' AND policyname = 'insert_own_logs'
  ) THEN
    CREATE POLICY insert_own_logs ON public.audit_logs
      FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_logs' AND policyname = 'update_own_logs'
  ) THEN
    CREATE POLICY update_own_logs ON public.audit_logs
      FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_logs' AND policyname = 'delete_own_logs'
  ) THEN
    CREATE POLICY delete_own_logs ON public.audit_logs
      FOR DELETE TO authenticated USING (user_id = auth.uid()::text);
  END IF;
END $$;

-- -----------------------------------------------------
-- Créditos de clientes (customer_credits)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_credits (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING',
  description TEXT,
  due_date TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.users(id),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_credits_customer_id ON public.customer_credits(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_credits_status ON public.customer_credits(status);
CREATE INDEX IF NOT EXISTS idx_customer_credits_due_date ON public.customer_credits(due_date);
CREATE INDEX IF NOT EXISTS idx_customer_credits_created_at ON public.customer_credits(created_at);

ALTER TABLE public.customer_credits ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at' AND pronamespace = 'public'::regnamespace
  ) THEN
    CREATE OR REPLACE FUNCTION public.set_updated_at()
    RETURNS trigger AS $fn$
    BEGIN
      NEW.updated_at := NOW();
      RETURN NEW;
    END;
    $fn$ LANGUAGE plpgsql;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_customer_credits_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_customer_credits_set_updated_at
    BEFORE UPDATE ON public.customer_credits
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- -----------------------------------------------------
-- Pagos de crédito (credit_payments)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.credit_payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  credit_id TEXT NOT NULL REFERENCES public.customer_credits(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'CASH',
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_payments_credit_id ON public.credit_payments(credit_id);
CREATE INDEX IF NOT EXISTS idx_credit_payments_created_at ON public.credit_payments(created_at);

ALTER TABLE public.credit_payments ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- Enlaces Tier ↔ Reward (loyalty_tier_reward_links)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_tier_reward_links (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tier_id TEXT NOT NULL,
  reward_id TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tier_reward_unique ON public.loyalty_tier_reward_links(tier_id, reward_id);

ALTER TABLE public.loyalty_tier_reward_links ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='loyalty_tier_reward_links' AND policyname='ltr_read_authenticated'
  ) THEN
    CREATE POLICY ltr_read_authenticated ON public.loyalty_tier_reward_links
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- -----------------------------------------------------
-- Cupones de descuento (discount_coupons)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.discount_coupons (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('PERCENTAGE','FIXED_AMOUNT')),
  value NUMERIC(12,2) NOT NULL CHECK (value >= 0),
  min_purchase NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (min_purchase >= 0),
  max_discount NUMERIC(12,2),
  usage_limit_per_customer INTEGER,
  total_usage_limit INTEGER,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_discount_coupons_code ON public.discount_coupons(code);
ALTER TABLE public.discount_coupons ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX IF NOT EXISTS idx_discount_coupons_active ON public.discount_coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_discount_coupons_date_range ON public.discount_coupons(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_discount_coupons_type ON public.discount_coupons(type);
CREATE INDEX IF NOT EXISTS idx_discount_coupons_min_purchase ON public.discount_coupons(min_purchase);

ALTER TABLE public.discount_coupons ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='discount_coupons' AND policyname='discount_coupons_read_authenticated'
  ) THEN
    CREATE POLICY discount_coupons_read_authenticated ON public.discount_coupons
      FOR SELECT TO authenticated
      USING (
        is_active
        AND (start_date IS NULL OR NOW() >= start_date)
        AND (end_date IS NULL OR NOW() <= end_date)
      );
  END IF;
END $$;

-- -----------------------------------------------------
-- Promociones (promotions)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.promotions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('PERCENTAGE','FIXED_AMOUNT')),
  discount_value NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
  min_purchase_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (min_purchase_amount >= 0),
  max_discount_amount NUMERIC(12,2),
  usage_limit INT,
  usage_count INT NOT NULL DEFAULT 0,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected')),
  approval_comment TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotions_name ON public.promotions(name);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON public.promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_promotions_dates ON public.promotions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_promotions_approval_status ON public.promotions(approval_status);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='promotions' AND policyname='promotions_read_authenticated'
  ) THEN
    CREATE POLICY promotions_read_authenticated ON public.promotions
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='promotions' AND policyname='promotions_update_authenticated'
  ) THEN
    CREATE POLICY promotions_update_authenticated ON public.promotions
      FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='promotions' AND policyname='promotions_insert_authenticated'
  ) THEN
    CREATE POLICY promotions_insert_authenticated ON public.promotions
      FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- -----------------------------------------------------
-- Enlaces Promoción ↔ Producto (promotions_products)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.promotions_products (
  promotion_id TEXT NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (promotion_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_promotions_products_product_id ON public.promotions_products(product_id);

ALTER TABLE public.promotions_products ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='promotions_products' AND policyname='promotions_products_read_authenticated'
  ) THEN
    CREATE POLICY promotions_products_read_authenticated ON public.promotions_products
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='promotions_products' AND policyname='promotions_products_write_authenticated'
  ) THEN
    CREATE POLICY promotions_products_write_authenticated ON public.promotions_products
      FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- -----------------------------------------------------
-- Carrusel de promociones (promotions_carousel)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.promotions_carousel (
  promotion_id TEXT NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  position INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (promotion_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_promotions_carousel_position ON public.promotions_carousel(position);

ALTER TABLE public.promotions_carousel ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='promotions_carousel' AND policyname='promotions_carousel_read_authenticated'
  ) THEN
    CREATE POLICY promotions_carousel_read_authenticated ON public.promotions_carousel
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='promotions_carousel' AND policyname='promotions_carousel_write_authenticated'
  ) THEN
    CREATE POLICY promotions_carousel_write_authenticated ON public.promotions_carousel
      FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- -----------------------------------------------------
-- Migraciones de columnas antiguas -> nuevas en promotions
-- -----------------------------------------------------
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='promotions' AND column_name='type'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema='public' AND table_name='promotions' AND column_name='discount_type'
    ) THEN
      ALTER TABLE public.promotions ADD COLUMN discount_type TEXT;
      UPDATE public.promotions 
        SET discount_type = CASE WHEN type IN ('PERCENTAGE','FIXED_AMOUNT') THEN type ELSE 'PERCENTAGE' END
        WHERE discount_type IS NULL;
      ALTER TABLE public.promotions 
        ADD CONSTRAINT promotions_discount_type_chk CHECK (discount_type IN ('PERCENTAGE','FIXED_AMOUNT'));
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='promotions' AND column_name='value'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema='public' AND table_name='promotions' AND column_name='discount_value'
    ) THEN
      ALTER TABLE public.promotions ADD COLUMN discount_value NUMERIC(12,2) NOT NULL DEFAULT 0;
      UPDATE public.promotions SET discount_value = COALESCE(value, 0) WHERE discount_value = 0;
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='promotions' AND column_name='min_purchase_amount'
  ) THEN
    ALTER TABLE public.promotions ADD COLUMN min_purchase_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='promotions' AND column_name='max_discount_amount'
  ) THEN
    ALTER TABLE public.promotions ADD COLUMN max_discount_amount NUMERIC(12,2);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='promotions' AND column_name='usage_limit'
  ) THEN
    ALTER TABLE public.promotions ADD COLUMN usage_limit INT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='promotions' AND column_name='usage_count'
  ) THEN
    ALTER TABLE public.promotions ADD COLUMN usage_count INT NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='promotions' AND column_name='approval_status'
  ) THEN
    ALTER TABLE public.promotions ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'pending';
    ALTER TABLE public.promotions ADD CONSTRAINT promotions_approval_status_chk CHECK (approval_status IN ('pending','approved','rejected'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='promotions' AND column_name='approval_comment'
  ) THEN
    ALTER TABLE public.promotions ADD COLUMN approval_comment TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='promotions' AND column_name='approved_by'
  ) THEN
    ALTER TABLE public.promotions ADD COLUMN approved_by TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='promotions' AND column_name='approved_at'
  ) THEN
    ALTER TABLE public.promotions ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_discount_coupons_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_discount_coupons_set_updated_at
    BEFORE UPDATE ON public.discount_coupons
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- =====================
-- Fin del script
-- =====================