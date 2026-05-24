ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS buyer_type text NOT NULL DEFAULT 'guest',
  ADD COLUMN IF NOT EXISTS buyer_user_id uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS buyer_organization_id uuid NULL REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS buyer_organization_name text NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_buyer_type_check'
  ) THEN
    ALTER TABLE public.sales
      ADD CONSTRAINT sales_buyer_type_check
      CHECK (buyer_type IN ('guest', 'customer', 'business'))
      NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sales_buyer_user
  ON public.sales (buyer_user_id);

CREATE INDEX IF NOT EXISTS idx_sales_buyer_organization
  ON public.sales (buyer_organization_id);

CREATE INDEX IF NOT EXISTS idx_sales_seller_buyer
  ON public.sales (organization_id, buyer_user_id, buyer_organization_id);

COMMENT ON COLUMN public.sales.organization_id IS
  'Seller organization that owns and fulfills the sale.';
COMMENT ON COLUMN public.sales.buyer_type IS
  'Marketplace buyer kind: guest, customer, or business.';
COMMENT ON COLUMN public.sales.buyer_user_id IS
  'Authenticated user that placed the order, if any.';
COMMENT ON COLUMN public.sales.buyer_organization_id IS
  'Organization represented by the buyer when buying as a business.';
