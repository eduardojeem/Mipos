CREATE OR REPLACE FUNCTION get_products_with_sales(product_ids TEXT[])
RETURNS TABLE(product_id TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT si.product_id
  FROM sale_items si
  WHERE si.product_id::text = ANY(product_ids);
$$;
