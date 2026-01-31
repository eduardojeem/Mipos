-- Crear tablas de promociones y relaciones si no existen

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Promociones
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

-- Relación promociones_products
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

-- Carrusel de promociones
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

-- Refrescar caché
NOTIFY pgrst, 'reload schema';

