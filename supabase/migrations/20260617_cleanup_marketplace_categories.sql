-- =============================================================================
-- MIGRATION: 20260617_cleanup_marketplace_categories
-- Desactiva categorías del marketplace que no tienen un vertical implementado.
-- El sistema solo soporta RETAIL (tienda/inventario/POS) y BARBERSHOP (agenda/servicios).
-- Categorías como Restaurantes, Educación, Entretenimiento y Servicios Profesionales
-- requieren módulos específicos que no están disponibles.
-- =============================================================================

BEGIN;

-- Desactivar categorías sin soporte operativo real
UPDATE public.marketplace_categories
SET is_active = FALSE,
    is_featured = FALSE,
    updated_at = NOW()
WHERE slug IN (
    'restaurantes',
    'educacion',
    'servicios-profesionales',
    'entretenimiento'
)
AND is_active = TRUE;

-- Actualizar "Belleza y Cuidado" para ser featured (es el vertical BARBERSHOP)
UPDATE public.marketplace_categories
SET is_featured = TRUE,
    sort_order = 10,
    description = 'Barberías, peluquerías, salones de belleza y cuidado personal',
    updated_at = NOW()
WHERE slug = 'belleza-y-cuidado';

-- Renombrar "Supermercados" a "Almacén y Despensa" (más representativo del target)
UPDATE public.marketplace_categories
SET name = 'Almacén y Despensa',
    description = 'Minimercados, almacenes, despensas y kioscos',
    updated_at = NOW()
WHERE slug = 'supermercados';

-- Reordenar las categorías activas restantes
UPDATE public.marketplace_categories SET sort_order = 20 WHERE slug = 'minimarket';
UPDATE public.marketplace_categories SET sort_order = 30 WHERE slug = 'moda-y-ropa';
UPDATE public.marketplace_categories SET sort_order = 40 WHERE slug = 'tecnologia';
UPDATE public.marketplace_categories SET sort_order = 50 WHERE slug = 'farmacias-y-salud';
UPDATE public.marketplace_categories SET sort_order = 60 WHERE slug = 'hogar-y-decoracion';
UPDATE public.marketplace_categories SET sort_order = 70 WHERE slug = 'deportes-y-fitness';
UPDATE public.marketplace_categories SET sort_order = 80 WHERE slug = 'mascotas';
UPDATE public.marketplace_categories SET sort_order = 90 WHERE slug = 'construccion-y-ferreteria';
UPDATE public.marketplace_categories SET sort_order = 100 WHERE slug = 'automotriz';

-- Insertar "Librería y Papelería" si no existe (nueva categoría para RETAIL)
INSERT INTO public.marketplace_categories
    (name, slug, description, icon, color, is_active, is_featured, sort_order)
VALUES
    ('Librería y Papelería', 'libreria-y-papeleria', 'Libros, útiles escolares y artículos de oficina', 'BookOpen', '#0ea5e9', TRUE, FALSE, 110)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
