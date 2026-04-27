-- Fix RLS policies for suppliers/purchases/purchase_items to enforce organization isolation

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('suppliers','purchases','purchase_items')
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

CREATE POLICY suppliers_select_org ON public.suppliers
  FOR SELECT TO authenticated
  USING (organization_id = ANY(get_user_org_ids()));

CREATE POLICY suppliers_insert_org ON public.suppliers
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = ANY(get_user_org_ids()));

CREATE POLICY suppliers_update_org ON public.suppliers
  FOR UPDATE TO authenticated
  USING (organization_id = ANY(get_user_org_ids()))
  WITH CHECK (organization_id = ANY(get_user_org_ids()));

CREATE POLICY suppliers_delete_org ON public.suppliers
  FOR DELETE TO authenticated
  USING (organization_id = ANY(get_user_org_ids()));

CREATE POLICY purchases_select_org ON public.purchases
  FOR SELECT TO authenticated
  USING (organization_id = ANY(get_user_org_ids()));

CREATE POLICY purchases_insert_org ON public.purchases
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = ANY(get_user_org_ids()));

CREATE POLICY purchases_update_org ON public.purchases
  FOR UPDATE TO authenticated
  USING (organization_id = ANY(get_user_org_ids()))
  WITH CHECK (organization_id = ANY(get_user_org_ids()));

CREATE POLICY purchases_delete_org ON public.purchases
  FOR DELETE TO authenticated
  USING (organization_id = ANY(get_user_org_ids()));

CREATE POLICY purchase_items_select_org ON public.purchase_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.purchases p
      WHERE p.id = public.purchase_items.purchase_id
        AND p.organization_id = ANY(get_user_org_ids())
    )
  );

CREATE POLICY purchase_items_insert_org ON public.purchase_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.purchases p
      WHERE p.id = public.purchase_items.purchase_id
        AND p.organization_id = ANY(get_user_org_ids())
    )
  );

CREATE POLICY purchase_items_update_org ON public.purchase_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.purchases p
      WHERE p.id = public.purchase_items.purchase_id
        AND p.organization_id = ANY(get_user_org_ids())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.purchases p
      WHERE p.id = public.purchase_items.purchase_id
        AND p.organization_id = ANY(get_user_org_ids())
    )
  );

CREATE POLICY purchase_items_delete_org ON public.purchase_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.purchases p
      WHERE p.id = public.purchase_items.purchase_id
        AND p.organization_id = ANY(get_user_org_ids())
    )
  );

NOTIFY pgrst, 'reload schema';

