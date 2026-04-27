-- Harden permissive RLS policies flagged by Advisor

-- Helper: condition that checks org membership or super admin
-- Used inline in policies to avoid creating extra functions

-- Promotions -----------------------------------------------------------------
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='promotions' AND policyname='promotions_insert_authenticated') THEN
    EXECUTE 'DROP POLICY promotions_insert_authenticated ON public.promotions';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='promotions' AND policyname='promotions_update_authenticated') THEN
    EXECUTE 'DROP POLICY promotions_update_authenticated ON public.promotions';
  END IF;
END $$;

CREATE POLICY promotions_insert_authenticated ON public.promotions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      is_super_admin() OR EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = auth.uid()
          AND om.organization_id = public.promotions.organization_id
      )
    )
  );

CREATE POLICY promotions_update_authenticated ON public.promotions
  FOR UPDATE TO authenticated
  USING (
    auth.uid() IS NOT NULL AND (
      is_super_admin() OR EXISTS (
        SELECT 1 FROM public.organization_members om
        JOIN public.promotions p ON p.id = public.promotions.id
        WHERE om.user_id = auth.uid()
          AND om.organization_id = p.organization_id
      )
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      is_super_admin() OR EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = auth.uid()
          AND om.organization_id = public.promotions.organization_id
      )
    )
  );

-- Promotions Products --------------------------------------------------------
ALTER TABLE public.promotions_products ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='promotions_products' AND policyname='promotions_products_write_authenticated') THEN
    EXECUTE 'DROP POLICY promotions_products_write_authenticated ON public.promotions_products';
  END IF;
END $$;

CREATE POLICY promotions_products_write_authenticated ON public.promotions_products
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      is_super_admin() OR EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = auth.uid()
          AND om.organization_id = public.promotions_products.organization_id
      )
    )
  );

-- Promotions Carousel ---------------------------------------------------------
ALTER TABLE public.promotions_carousel ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='promotions_carousel' AND policyname='promotions_carousel_write_authenticated') THEN
    EXECUTE 'DROP POLICY promotions_carousel_write_authenticated ON public.promotions_carousel';
  END IF;
END $$;

CREATE POLICY promotions_carousel_write_authenticated ON public.promotions_carousel
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      is_super_admin() OR EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = auth.uid()
          AND om.organization_id = public.promotions_carousel.organization_id
      )
    )
  );

-- Sale Items -----------------------------------------------------------------
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sale_items' AND policyname='Users can create sale items') THEN
    EXECUTE 'DROP POLICY "Users can create sale items" ON public.sale_items';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sale_items' AND policyname='Users can update sale items') THEN
    EXECUTE 'DROP POLICY "Users can update sale items" ON public.sale_items';
  END IF;
END $$;

CREATE POLICY "Users can create sale items" ON public.sale_items
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      is_super_admin() OR EXISTS (
        SELECT 1
        FROM public.sales s
        JOIN public.organization_members om ON om.organization_id = s.organization_id
        WHERE s.id = public.sale_items.sale_id
          AND om.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update sale items" ON public.sale_items
  FOR UPDATE TO authenticated
  USING (
    auth.uid() IS NOT NULL AND (
      is_super_admin() OR EXISTS (
        SELECT 1
        FROM public.sales s
        JOIN public.organization_members om ON om.organization_id = s.organization_id
        WHERE s.id = public.sale_items.sale_id
          AND om.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      is_super_admin() OR EXISTS (
        SELECT 1
        FROM public.sales s
        JOIN public.organization_members om ON om.organization_id = s.organization_id
        WHERE s.id = public.sale_items.sale_id
          AND om.user_id = auth.uid()
      )
    )
  );

-- Sales ----------------------------------------------------------------------
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sales' AND policyname='Users can create sales') THEN
    EXECUTE 'DROP POLICY "Users can create sales" ON public.sales';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sales' AND policyname='Users can update their own sales') THEN
    EXECUTE 'DROP POLICY "Users can update their own sales" ON public.sales';
  END IF;
END $$;

CREATE POLICY "Users can create sales" ON public.sales
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      is_super_admin() OR EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = auth.uid()
          AND om.organization_id = public.sales.organization_id
      )
    )
  );

CREATE POLICY "Users can update their own sales" ON public.sales
  FOR UPDATE TO authenticated
  USING (
    auth.uid() IS NOT NULL AND (
      is_super_admin() OR EXISTS (
        SELECT 1 FROM public.organization_members om
        JOIN public.sales s ON s.id = public.sales.id
        WHERE om.user_id = auth.uid()
          AND om.organization_id = s.organization_id
      )
    )
  );

-- Verification ---------------------------------------------------------------
SELECT '✅ Hardened RLS policies applied' AS status;
