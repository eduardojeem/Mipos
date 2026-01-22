-- Migration: Add image_url column to products table
-- Date: 2026-01-22
-- Description: Adds image_url column for backward compatibility and easier image handling

BEGIN;

-- Add image_url column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'image_url'
    ) THEN
        ALTER TABLE public.products 
        ADD COLUMN image_url TEXT;
        
        -- Migrate existing images array data to image_url (first image)
        -- Only for products that have images but no image_url
        UPDATE public.products
        SET image_url = images[1]
        WHERE images IS NOT NULL 
          AND array_length(images, 1) > 0 
          AND (image_url IS NULL OR image_url = '');
        
        RAISE NOTICE 'Column image_url added to products table and data migrated';
    ELSE
        RAISE NOTICE 'Column image_url already exists in products table';
    END IF;
END $$;

-- Create index on image_url for better query performance
CREATE INDEX IF NOT EXISTS idx_products_image_url 
ON public.products(image_url) 
WHERE image_url IS NOT NULL;

COMMIT;

-- Verification query (uncomment to run manually)
-- SELECT 
--     COUNT(*) as total_products,
--     COUNT(image_url) as products_with_image_url,
--     COUNT(images) as products_with_images
-- FROM public.products;
