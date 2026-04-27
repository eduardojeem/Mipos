-- Align Prisma migration with existing Supabase schema without recreating organizations
BEGIN;

-- Add organization_id to users as UUID
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "organization_id" uuid;

-- Index for filtering by organization
CREATE INDEX IF NOT EXISTS "users_organization_id_idx" ON "users"("organization_id");

-- Foreign key to public.organizations(id)
DO $$
BEGIN
  ALTER TABLE "users"
    ADD CONSTRAINT "users_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

COMMIT;
