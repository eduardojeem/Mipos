-- ============================================================================
-- Migration: Add missing columns to customers and sync statistics
-- Date: 2026-03-21
-- Description: 
--   1. Adds missing columns that Prisma schema expects but DB doesn't have
--   2. Backfills total_orders and total_purchases from actual sales data
--   3. Creates a trigger to auto-update customer stats on sale changes
-- ============================================================================

-- 1. Add all missing columns that the application expects
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS customer_code TEXT,
  ADD COLUMN IF NOT EXISTS customer_type TEXT DEFAULT 'REGULAR',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS birth_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS total_purchases NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_purchase TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS wholesale_discount NUMERIC,
  ADD COLUMN IF NOT EXISTS min_wholesale_quantity INTEGER;

-- 2. Add unique constraint on customer_code if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'customers_customer_code_key'
  ) THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT customers_customer_code_key UNIQUE (customer_code);
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'customer_code unique constraint skipped: %', SQLERRM;
END $$;

-- 3. Create indexes on new columns
CREATE INDEX IF NOT EXISTS idx_customers_total_orders ON public.customers(total_orders);
CREATE INDEX IF NOT EXISTS idx_customers_customer_type ON public.customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON public.customers(is_active);
CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON public.customers(deleted_at) WHERE deleted_at IS NULL;

-- 4. Backfill customer statistics from real sales data
UPDATE public.customers c
SET
  total_orders = COALESCE(stats.order_count, 0),
  total_purchases = COALESCE(stats.total_spent, 0),
  last_purchase = stats.last_sale_date
FROM (
  SELECT
    customer_id,
    COUNT(*)::integer AS order_count,
    COALESCE(SUM(total), 0) AS total_spent,
    MAX(created_at) AS last_sale_date
  FROM public.sales
  WHERE customer_id IS NOT NULL
    AND (deleted_at IS NULL)
  GROUP BY customer_id
) stats
WHERE c.id = stats.customer_id;

-- 5. Create function to auto-sync customer stats on sale changes
CREATE OR REPLACE FUNCTION public.fn_sync_customer_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_customer_id := OLD.customer_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If customer_id changed, update the old customer too
    IF OLD.customer_id IS DISTINCT FROM NEW.customer_id AND OLD.customer_id IS NOT NULL THEN
      UPDATE public.customers
      SET
        total_orders = COALESCE((
          SELECT COUNT(*) FROM public.sales
          WHERE customer_id = OLD.customer_id AND deleted_at IS NULL
        ), 0),
        total_purchases = COALESCE((
          SELECT SUM(total) FROM public.sales
          WHERE customer_id = OLD.customer_id AND deleted_at IS NULL
        ), 0),
        last_purchase = (
          SELECT MAX(created_at) FROM public.sales
          WHERE customer_id = OLD.customer_id AND deleted_at IS NULL
        ),
        updated_at = NOW()
      WHERE id = OLD.customer_id;
    END IF;
    v_customer_id := NEW.customer_id;
  ELSE
    v_customer_id := NEW.customer_id;
  END IF;

  -- Update the target customer stats
  IF v_customer_id IS NOT NULL THEN
    UPDATE public.customers
    SET
      total_orders = COALESCE((
        SELECT COUNT(*) FROM public.sales
        WHERE customer_id = v_customer_id AND deleted_at IS NULL
      ), 0),
      total_purchases = COALESCE((
        SELECT SUM(total) FROM public.sales
        WHERE customer_id = v_customer_id AND deleted_at IS NULL
      ), 0),
      last_purchase = (
        SELECT MAX(created_at) FROM public.sales
        WHERE customer_id = v_customer_id AND deleted_at IS NULL
      ),
      updated_at = NOW()
    WHERE id = v_customer_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- 6. Attach trigger to sales table
DROP TRIGGER IF EXISTS trg_sync_customer_stats ON public.sales;
CREATE TRIGGER trg_sync_customer_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_customer_stats();

-- 7. Verify
DO $$
DECLARE
  cols_ok boolean;
  trigger_ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'total_orders'
  ) INTO cols_ok;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'trg_sync_customer_stats'
  ) INTO trigger_ok;

  RAISE NOTICE '✅ total_orders column: %', CASE WHEN cols_ok THEN 'OK' ELSE 'MISSING' END;
  RAISE NOTICE '✅ sync trigger: %', CASE WHEN trigger_ok THEN 'OK' ELSE 'MISSING' END;
END $$;
