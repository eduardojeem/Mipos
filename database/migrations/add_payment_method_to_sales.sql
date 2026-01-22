-- ============================================================================
-- Migración: Agregar columna payment_method a la tabla sales
-- Fecha: 2025-11-28
-- Descripción: Agrega la columna payment_method si no existe en la tabla sales
-- ============================================================================

-- Crear tipo ENUM para payment_method si no existe
DO $$ BEGIN
    CREATE TYPE payment_method_enum AS ENUM ('CASH', 'CARD', 'TRANSFER', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Agregar columna payment_method a la tabla sales si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sales' 
        AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE public.sales 
        ADD COLUMN payment_method payment_method_enum NOT NULL DEFAULT 'CASH';
        
        RAISE NOTICE 'Columna payment_method agregada exitosamente a la tabla sales';
    ELSE
        RAISE NOTICE 'La columna payment_method ya existe en la tabla sales';
    END IF;
END $$;

-- Crear índice para mejorar consultas por método de pago
CREATE INDEX IF NOT EXISTS idx_sales_payment_method 
ON public.sales(payment_method);

-- Agregar comentario a la columna para documentación
COMMENT ON COLUMN public.sales.payment_method IS 'Método de pago utilizado en la venta: CASH (Efectivo), CARD (Tarjeta), TRANSFER (Transferencia), OTHER (Otro)';

-- Verificar que la columna se agregó correctamente
DO $$
DECLARE
    column_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sales' 
        AND column_name = 'payment_method'
    ) INTO column_exists;
    
    IF column_exists THEN
        RAISE NOTICE '✓ Verificación exitosa: La columna payment_method existe en la tabla sales';
    ELSE
        RAISE EXCEPTION '✗ Error: La columna payment_method NO se pudo agregar a la tabla sales';
    END IF;
END $$;

-- ============================================================================
-- ROLLBACK (si necesitas revertir esta migración)
-- ============================================================================
-- IMPORTANTE: Descomentar solo si necesitas revertir los cambios
-- 
-- DROP INDEX IF EXISTS idx_sales_payment_method;
-- ALTER TABLE public.sales DROP COLUMN IF EXISTS payment_method;
-- DROP TYPE IF EXISTS payment_method_enum;
