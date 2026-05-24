-- Align private product categories with the dashboard business rules.
-- Names are unique per organization, categories can be hierarchical, and
-- deleting a category must not cascade-delete products.

ALTER TABLE "categories"
  ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "parent_id" TEXT NULL;

DROP INDEX IF EXISTS "categories_name_key";

CREATE UNIQUE INDEX IF NOT EXISTS "categories_organization_name_key"
  ON "categories" ("organization_id", "name");

CREATE INDEX IF NOT EXISTS "idx_categories_organization"
  ON "categories" ("organization_id");

CREATE INDEX IF NOT EXISTS "idx_categories_org_parent"
  ON "categories" ("organization_id", "parent_id");

CREATE INDEX IF NOT EXISTS "idx_categories_org_active"
  ON "categories" ("organization_id", "is_active");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'categories_parent_id_fkey'
  ) THEN
    ALTER TABLE "categories"
      ADD CONSTRAINT "categories_parent_id_fkey"
      FOREIGN KEY ("parent_id")
      REFERENCES "categories" ("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_category_id_fkey";

ALTER TABLE "products"
  ADD CONSTRAINT "products_category_id_fkey"
  FOREIGN KEY ("category_id")
  REFERENCES "categories" ("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
