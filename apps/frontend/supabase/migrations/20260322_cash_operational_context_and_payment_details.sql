DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE public.payment_method AS ENUM ('CASH', 'CARD', 'TRANSFER', 'OTHER');
  END IF;
END $$;

ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'QR';
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'MIXED';

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS payment_details JSONB,
  ADD COLUMN IF NOT EXISTS branch_id TEXT,
  ADD COLUMN IF NOT EXISTS pos_id TEXT;

ALTER TABLE public.cash_sessions
  ADD COLUMN IF NOT EXISTS branch_id TEXT,
  ADD COLUMN IF NOT EXISTS pos_id TEXT;

ALTER TABLE public.cash_movements
  ADD COLUMN IF NOT EXISTS branch_id TEXT,
  ADD COLUMN IF NOT EXISTS pos_id TEXT;

CREATE INDEX IF NOT EXISTS idx_sales_branch_id ON public.sales (branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_pos_id ON public.sales (pos_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_branch_id ON public.cash_sessions (branch_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_pos_id ON public.cash_sessions (pos_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_branch_id ON public.cash_movements (branch_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_pos_id ON public.cash_movements (pos_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'ux_cash_sessions_open_global'
  ) THEN
    BEGIN
      CREATE UNIQUE INDEX ux_cash_sessions_open_global
        ON public.cash_sessions (organization_id)
        WHERE UPPER(COALESCE(status, '')) = 'OPEN'
          AND branch_id IS NULL
          AND pos_id IS NULL;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Skipping ux_cash_sessions_open_global: %', SQLERRM;
    END;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'ux_cash_sessions_open_branch'
  ) THEN
    BEGIN
      CREATE UNIQUE INDEX ux_cash_sessions_open_branch
        ON public.cash_sessions (organization_id, branch_id)
        WHERE UPPER(COALESCE(status, '')) = 'OPEN'
          AND branch_id IS NOT NULL;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Skipping ux_cash_sessions_open_branch: %', SQLERRM;
    END;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'ux_cash_sessions_open_pos'
  ) THEN
    BEGIN
      CREATE UNIQUE INDEX ux_cash_sessions_open_pos
        ON public.cash_sessions (organization_id, pos_id)
        WHERE UPPER(COALESCE(status, '')) = 'OPEN'
          AND pos_id IS NOT NULL;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Skipping ux_cash_sessions_open_pos: %', SQLERRM;
    END;
  END IF;
END $$;
