-- =====================================================
-- POS System – Compras y Devoluciones
-- Idempotente: crea SOLO si faltan. Seguro de re-ejecutar
-- Dependencias: requiere que existan users, suppliers, products, sales, sale_items, customers
-- =====================================================

SET search_path TO public;

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------
-- Tabla: purchases (compras a proveedores)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS purchases (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  supplier_id  TEXT NOT NULL,
  user_id      TEXT NOT NULL,
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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'purchases' AND policyname = 'purchases_select_own'
  ) THEN
    CREATE POLICY purchases_select_own ON purchases
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- -----------------------------------------------------
-- Tabla: purchase_items (detalle de compra)
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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'purchase_items' AND policyname = 'purchase_items_select_via_purchase'
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
-- Tabla: returns (devoluciones de ventas)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS returns (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  original_sale_id TEXT NOT NULL,
  user_id          TEXT NOT NULL,
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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'returns' AND policyname = 'returns_select_own'
  ) THEN
    CREATE POLICY returns_select_own ON returns
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- -----------------------------------------------------
-- Tabla: return_items (detalle de devolución)
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

CREATE INDEX IF NOT EXISTS idx_return_items_return_id            ON return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_return_items_product_id           ON return_items(product_id);
CREATE INDEX IF NOT EXISTS idx_return_items_original_sale_item_id ON return_items(original_sale_item_id);

ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'return_items' AND policyname = 'return_items_select_via_return'
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

--RAISE NOTICE '✅ Compras y Devoluciones: tablas y políticas RLS creadas correctamente';
