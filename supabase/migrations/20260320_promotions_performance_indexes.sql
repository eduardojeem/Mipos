-- Performance indexes for promotions listing and joins
CREATE INDEX IF NOT EXISTS idx_promotions_created_at ON public.promotions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_promotions_is_active ON public.promotions(is_active);

-- Ensure products(name) index aids join display (optional)
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);

