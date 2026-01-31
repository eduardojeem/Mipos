-- Semilla inicial para promociones reales en Supabase

-- Asegurar funciones de generación de UUID disponibles (extensión pgcrypto)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Crear algunas promociones de ejemplo reales
INSERT INTO public.promotions (id, name, description, discount_type, discount_value, start_date, end_date, is_active)
VALUES
  (gen_random_uuid(), 'Promo Bienvenida Clientes Nuevos', '10% de descuento en la primera compra de nuevos clientes.', 'PERCENTAGE', 10, NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days', true),
  (gen_random_uuid(), 'Fin de Semana de Descuentos', 'Descuentos especiales en productos seleccionados durante el fin de semana.', 'PERCENTAGE', 15, NOW() + INTERVAL '2 days', NOW() + INTERVAL '9 days', true),
  (gen_random_uuid(), 'Liquidación de Temporada', 'Descuentos fijos para liquidar stock de temporada.', 'FIXED_AMOUNT', 20, NOW() - INTERVAL '10 days', NOW() + INTERVAL '5 days', true)
ON CONFLICT DO NOTHING;

-- 2) Vincular algunas promociones al carrusel (siempre que existan promociones)
INSERT INTO public.promotions_carousel (promotion_id, position)
SELECT id, ROW_NUMBER() OVER (ORDER BY created_at)
FROM public.promotions
WHERE is_active = true
  AND id NOT IN (SELECT promotion_id FROM public.promotions_carousel)
ORDER BY created_at
LIMIT 5;

-- Refrescar caché de esquema
NOTIFY pgrst, 'reload schema';

