ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_branch ON public.inventory_movements(branch_id);

