-- Crear tabla inventory_movements en esquema public
DROP TABLE IF EXISTS public.inventory_movements CASCADE;

CREATE TABLE public.inventory_movements (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('IN','OUT','ADJUSTMENT','RETURN','TRANSFER')),
    quantity INTEGER NOT NULL,
    reason TEXT,
    reference_type TEXT CHECK (reference_type IN ('SALE','PURCHASE','ADJUSTMENT','RETURN')),
    reference_id TEXT,
    notes TEXT,
    user_id UUID REFERENCES public.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT inventory_movements_quantity_not_zero CHECK (quantity <> 0)
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON public.inventory_movements(type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON public.inventory_movements(created_at);

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.inventory_movements TO authenticated;
GRANT ALL ON public.inventory_movements TO service_role;
GRANT SELECT ON public.inventory_movements TO anon;