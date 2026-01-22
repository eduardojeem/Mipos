-- Development helper RPC used by insert-product-sql.js
-- Inserts a product and returns the inserted row

CREATE OR REPLACE FUNCTION public.insert_test_product(
  p_name TEXT,
  p_sku TEXT,
  p_description TEXT,
  p_category_id TEXT,
  p_cost_price NUMERIC,
  p_sale_price NUMERIC,
  p_stock_quantity INT,
  p_min_stock INT,
  p_images TEXT DEFAULT ''
)
RETURNS public.products
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  rec public.products;
BEGIN
  INSERT INTO public.products (
    name, sku, description, category_id, cost_price, sale_price, stock_quantity, min_stock, images
  ) VALUES (
    p_name, p_sku, p_description, p_category_id, p_cost_price, p_sale_price, p_stock_quantity, p_min_stock, p_images
  ) RETURNING * INTO rec;
  RETURN rec;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_test_product(TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, INT, INT, TEXT) TO authenticated, service_role;