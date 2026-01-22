-- ============================================================================
-- Script de diagnóstico: Ver estructura de la tabla sale_items
-- ============================================================================

-- Ver todas las columnas de la tabla sale_items
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'sale_items'
ORDER BY 
    ordinal_position;

-- Este script te mostrará exactamente qué columnas existen en tu tabla sale_items
