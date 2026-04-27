-- Ensure UI-required columns exist on categories and suppliers
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT TRUE;

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT TRUE;

-- Backfill nulls to true to keep current records visible
UPDATE public.categories SET is_active = TRUE WHERE is_active IS NULL;
UPDATE public.suppliers SET is_active = TRUE WHERE is_active IS NULL;

