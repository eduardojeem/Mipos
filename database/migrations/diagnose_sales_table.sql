-- ============================================================================
-- Script de diagnóstico: Ver estructura de la tabla sales
-- ============================================================================

-- Ver todas las columnas de la tabla sales
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'sales'
ORDER BY 
    ordinal_position;

-- Este script te mostrará exactamente qué columnas existen en tu tabla sales
-- Ejecuta esto en Supabase SQL Editor y comparte el resultado
