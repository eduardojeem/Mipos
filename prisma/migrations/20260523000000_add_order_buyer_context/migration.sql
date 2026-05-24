ALTER TABLE "sales"
  ADD COLUMN IF NOT EXISTS "buyer_type" TEXT NOT NULL DEFAULT 'guest',
  ADD COLUMN IF NOT EXISTS "buyer_user_id" UUID NULL,
  ADD COLUMN IF NOT EXISTS "buyer_organization_id" UUID NULL,
  ADD COLUMN IF NOT EXISTS "buyer_organization_name" TEXT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_buyer_type_check'
  ) THEN
    ALTER TABLE "sales"
      ADD CONSTRAINT "sales_buyer_type_check"
      CHECK ("buyer_type" IN ('guest', 'customer', 'business'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_buyer_user_id_fkey'
  ) THEN
    ALTER TABLE "sales"
      ADD CONSTRAINT "sales_buyer_user_id_fkey"
      FOREIGN KEY ("buyer_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_buyer_organization_id_fkey'
  ) THEN
    ALTER TABLE "sales"
      ADD CONSTRAINT "sales_buyer_organization_id_fkey"
      FOREIGN KEY ("buyer_organization_id") REFERENCES "organizations"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_sales_buyer_user"
  ON "sales" ("buyer_user_id");

CREATE INDEX IF NOT EXISTS "idx_sales_buyer_organization"
  ON "sales" ("buyer_organization_id");

CREATE INDEX IF NOT EXISTS "idx_sales_seller_buyer"
  ON "sales" ("organization_id", "buyer_user_id", "buyer_organization_id");
