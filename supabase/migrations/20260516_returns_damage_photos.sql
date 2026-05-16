-- =============================================================================
-- Migration: Damage photo evidence on return_items
-- Date: 2026-05-16
--
-- Context: The audit (sprint 2 follow-up) flagged "returns by 'producto
-- dañado' without evidence" as a classic fraud vector. This adds:
--   - damage_photo_url + damage_severity per return_item
--   - restock flag (false = no vuelve al stock, registra como pérdida)
--   - storage bucket policy via Supabase Storage (created manually in
--     dashboard or via the helper SQL at the bottom — see notes)
-- Backend enforces photo presence when reason matches a damage pattern.
-- =============================================================================

-- 1. Add columns to return_items (idempotent)
ALTER TABLE public.return_items
  ADD COLUMN IF NOT EXISTS damage_photo_url text,
  ADD COLUMN IF NOT EXISTS damage_severity  text
    CHECK (damage_severity IN ('minor', 'major', 'unsellable')),
  ADD COLUMN IF NOT EXISTS restock          boolean DEFAULT true;

COMMENT ON COLUMN public.return_items.damage_photo_url IS
  'Public URL of the damage evidence photo in Supabase Storage. Required when return.reason matches damage pattern. NULL otherwise.';
COMMENT ON COLUMN public.return_items.damage_severity IS
  'minor = surface damage, restockable at discount. major = unsellable as new. unsellable = total loss / write-off.';
COMMENT ON COLUMN public.return_items.restock IS
  'false = item does NOT go back to inventory on processing (use for unsellable damage). Generates a write-off inventory_movement instead of RETURN.';

-- 2. Index for "fraud queries" — returns por motivo daño sin foto
CREATE INDEX IF NOT EXISTS return_items_damage_no_photo_idx
  ON public.return_items(return_id)
  WHERE damage_severity IS NOT NULL AND damage_photo_url IS NULL;

-- 3. Storage bucket setup — RUN MANUALLY in Supabase Dashboard since
--    storage.buckets requires elevated privileges and the CREATE statement
--    in pure SQL editor may fail depending on plan. Equivalent SQL below
--    for reference; if it fails, create the bucket from the UI:
--      Storage → New bucket
--        Name: return-damage-photos
--        Public: NO (signed URLs only)
--        File size limit: 5 MB
--        Allowed MIME types: image/jpeg, image/png, image/webp
--
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'return-damage-photos',
--   'return-damage-photos',
--   false,
--   5242880,
--   ARRAY['image/jpeg', 'image/png', 'image/webp']
-- )
-- ON CONFLICT (id) DO NOTHING;

-- 4. Storage RLS policies — only members of the org can read/write photos
--    under their organization's folder structure: <org_id>/<return_id>/<file>
--
-- Note: These reference storage.objects which requires storage extension.
-- They use the bucket name as the namespace and split path on slashes to
-- extract the organization_id segment.

CREATE OR REPLACE FUNCTION public.is_return_damage_path_authorized(
  p_path text,
  p_user_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_org_id text;
BEGIN
  -- Path format: <org_uuid>/<return_id>/<filename>
  v_org_id := split_part(p_path, '/', 1);
  IF v_org_id IS NULL OR v_org_id = '' THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = p_user_id
      AND om.organization_id::text = v_org_id
  );
END;
$$;

-- Drop & recreate the policies (idempotent)
DO $$
BEGIN
  -- Best-effort; if storage.objects RLS isn't available in this plan,
  -- skip silently. The bucket-level "public: false" + signed URLs handle
  -- the main case.
  BEGIN
    DROP POLICY IF EXISTS return_damage_select_own_org ON storage.objects;
    CREATE POLICY return_damage_select_own_org ON storage.objects
      FOR SELECT
      USING (
        bucket_id = 'return-damage-photos'
        AND public.is_return_damage_path_authorized(name, auth.uid())
      );

    DROP POLICY IF EXISTS return_damage_insert_own_org ON storage.objects;
    CREATE POLICY return_damage_insert_own_org ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'return-damage-photos'
        AND public.is_return_damage_path_authorized(name, auth.uid())
      );

    DROP POLICY IF EXISTS return_damage_delete_own_org ON storage.objects;
    CREATE POLICY return_damage_delete_own_org ON storage.objects
      FOR DELETE
      USING (
        bucket_id = 'return-damage-photos'
        AND public.is_return_damage_path_authorized(name, auth.uid())
      );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create storage policies (run manually in Dashboard if needed): %', SQLERRM;
  END;
END $$;
