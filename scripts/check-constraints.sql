-- Verificar restricciones de la tabla products
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'products'::regclass
ORDER BY conname;