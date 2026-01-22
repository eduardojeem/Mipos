-- RPC Function to update product stock efficiently
-- This function handles stock updates with proper validation and error handling

CREATE OR REPLACE FUNCTION update_product_stock(
  product_id UUID,
  quantity_sold INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_stock INTEGER;
  new_stock INTEGER;
  product_name TEXT;
  result JSON;
BEGIN
  -- Get current stock and product name
  SELECT stock_quantity, name 
  INTO current_stock, product_name
  FROM products 
  WHERE id = product_id AND is_active = true;
  
  -- Check if product exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Product not found or inactive',
      'product_id', product_id
    );
  END IF;
  
  -- Calculate new stock
  new_stock := GREATEST(0, current_stock - quantity_sold);
  
  -- Update the product stock
  UPDATE products 
  SET 
    stock_quantity = new_stock,
    updated_at = NOW()
  WHERE id = product_id;
  
  -- Return success result
  result := json_build_object(
    'success', true,
    'product_id', product_id,
    'product_name', product_name,
    'previous_stock', current_stock,
    'quantity_sold', quantity_sold,
    'new_stock', new_stock,
    'updated_at', NOW()
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return error result
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'product_id', product_id
    );
END;
$$;

-- RPC Function to process sale with stock updates atomically
CREATE OR REPLACE FUNCTION process_sale_with_stock_update(
  sale_data JSON,
  items_data JSON[]
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sale_id UUID;
  item JSON;
  stock_result JSON;
  total_items INTEGER := 0;
  failed_items JSON[] := '{}';
  success_items JSON[] := '{}';
BEGIN
  -- Start transaction
  BEGIN
    -- Insert sale record
    INSERT INTO sales (
      customer_id,
      total_amount,
      discount_amount,
      tax_amount,
      discount_type,
      payment_method,
      sale_type,
      notes,
      status,
      transfer_reference,
      cash_received,
      change_amount
    )
    SELECT 
      (sale_data->>'customer_id')::UUID,
      (sale_data->>'total_amount')::DECIMAL,
      (sale_data->>'discount_amount')::DECIMAL,
      (sale_data->>'tax_amount')::DECIMAL,
      sale_data->>'discount_type',
      sale_data->>'payment_method',
      sale_data->>'sale_type',
      sale_data->>'notes',
      'completed',
      sale_data->>'transfer_reference',
      (sale_data->>'cash_received')::DECIMAL,
      (sale_data->>'change_amount')::DECIMAL
    RETURNING id INTO sale_id;
    
    -- Process each item
    FOREACH item IN ARRAY items_data
    LOOP
      total_items := total_items + 1;
      
      -- Insert sale item
      INSERT INTO sale_items (
        sale_id,
        product_id,
        quantity,
        unit_price,
        total_price,
        discount_amount
      )
      VALUES (
        sale_id,
        (item->>'product_id')::UUID,
        (item->>'quantity')::INTEGER,
        (item->>'unit_price')::DECIMAL,
        (item->>'total_price')::DECIMAL,
        COALESCE((item->>'discount_amount')::DECIMAL, 0)
      );
      
      -- Update stock
      SELECT update_product_stock(
        (item->>'product_id')::UUID,
        (item->>'quantity')::INTEGER
      ) INTO stock_result;
      
      -- Check if stock update was successful
      IF (stock_result->>'success')::BOOLEAN THEN
        success_items := success_items || item;
      ELSE
        failed_items := failed_items || json_build_object(
          'item', item,
          'error', stock_result->>'error'
        );
      END IF;
    END LOOP;
    
    -- Return success result
    RETURN json_build_object(
      'success', true,
      'sale_id', sale_id,
      'total_items', total_items,
      'success_items', success_items,
      'failed_items', failed_items,
      'created_at', NOW()
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback is automatic in function
      RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'sale_data', sale_data
      );
  END;
END;
$$;

-- RPC Function to get POS dashboard stats efficiently
CREATE OR REPLACE FUNCTION get_pos_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today_start TIMESTAMP := DATE_TRUNC('day', NOW());
  week_start TIMESTAMP := DATE_TRUNC('week', NOW());
  month_start TIMESTAMP := DATE_TRUNC('month', NOW());
  
  today_sales DECIMAL := 0;
  today_count INTEGER := 0;
  week_sales DECIMAL := 0;
  week_count INTEGER := 0;
  month_sales DECIMAL := 0;
  month_count INTEGER := 0;
  
  low_stock_count INTEGER := 0;
  critical_stock_count INTEGER := 0;
  
  result JSON;
BEGIN
  -- Get today's sales
  SELECT 
    COALESCE(SUM(total_amount), 0),
    COUNT(*)
  INTO today_sales, today_count
  FROM sales 
  WHERE created_at >= today_start 
    AND status = 'completed';
  
  -- Get week's sales
  SELECT 
    COALESCE(SUM(total_amount), 0),
    COUNT(*)
  INTO week_sales, week_count
  FROM sales 
  WHERE created_at >= week_start 
    AND status = 'completed';
  
  -- Get month's sales
  SELECT 
    COALESCE(SUM(total_amount), 0),
    COUNT(*)
  INTO month_sales, month_count
  FROM sales 
  WHERE created_at >= month_start 
    AND status = 'completed';
  
  -- Get stock alerts
  SELECT 
    COUNT(*) FILTER (WHERE stock_quantity <= min_stock AND stock_quantity > 0),
    COUNT(*) FILTER (WHERE stock_quantity = 0)
  INTO low_stock_count, critical_stock_count
  FROM products 
  WHERE is_active = true;
  
  -- Build result
  result := json_build_object(
    'today_sales', today_sales,
    'today_count', today_count,
    'week_sales', week_sales,
    'week_count', week_count,
    'month_sales', month_sales,
    'month_count', month_count,
    'average_ticket', CASE WHEN today_count > 0 THEN today_sales / today_count ELSE 0 END,
    'low_stock_count', low_stock_count,
    'critical_stock_count', critical_stock_count,
    'sales_growth', CASE 
      WHEN week_count > 0 THEN 
        ROUND(((today_count::DECIMAL / (week_count::DECIMAL / 7)) - 1) * 100, 2)
      ELSE 0 
    END,
    'last_updated', NOW()
  );
  
  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_product_stock(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION process_sale_with_stock_update(JSON, JSON[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pos_dashboard_stats() TO authenticated;