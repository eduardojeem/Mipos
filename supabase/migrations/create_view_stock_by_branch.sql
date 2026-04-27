CREATE OR REPLACE VIEW public.v_product_stock_by_branch AS
SELECT p.organization_id, b.id AS branch_id, b.slug AS branch_slug, p.id AS product_id, p.name AS product_name, p.sku AS product_sku,
       COALESCE(SUM(m.quantity),0) AS stock
FROM public.products p
JOIN public.inventory_movements m ON m.product_id = p.id AND m.organization_id = p.organization_id
LEFT JOIN public.branches b ON b.id = m.branch_id
GROUP BY p.organization_id, b.id, b.slug, p.id, p.name, p.sku;

