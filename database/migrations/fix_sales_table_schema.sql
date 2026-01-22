-- ============================================================================
-- Migración: Reparar/Crear tabla sales con esquema completo
-- Fecha: 2025-11-28
-- Descripción: Crea o actualiza la tabla sales con todas las columnas necesarias
-- ============================================================================

-- Crear tipos ENUM necesarios
DO $$ BEGIN
    CREATE TYPE payment_method_enum AS ENUM ('CASH', 'CARD', 'TRANSFER', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sale_status_enum AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sale_type_enum AS ENUM ('RETAIL', 'WHOLESALE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE discount_type_enum AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Crear la tabla sales si no existe
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    discount_type discount_type_enum DEFAULT 'FIXED_AMOUNT',
    coupon_code VARCHAR(50),
    payment_method payment_method_enum NOT NULL DEFAULT 'CASH',
    status sale_status_enum NOT NULL DEFAULT 'COMPLETED',
    sale_type sale_type_enum NOT NULL DEFAULT 'RETAIL',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agregar columnas faltantes si la tabla ya existía
DO $$ 
BEGIN
    -- total_amount
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'total_amount') THEN
        ALTER TABLE public.sales ADD COLUMN total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0;
        RAISE NOTICE 'Columna total_amount agregada';
    END IF;

    -- tax_amount
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'tax_amount') THEN
        ALTER TABLE public.sales ADD COLUMN tax_amount DECIMAL(10, 2) DEFAULT 0;
        RAISE NOTICE 'Columna tax_amount agregada';
    END IF;

    -- discount_amount
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'discount_amount') THEN
        ALTER TABLE public.sales ADD COLUMN discount_amount DECIMAL(10, 2) DEFAULT 0;
        RAISE NOTICE 'Columna discount_amount agregada';
    END IF;

    -- discount_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'discount_type') THEN
        ALTER TABLE public.sales ADD COLUMN discount_type discount_type_enum DEFAULT 'FIXED_AMOUNT';
        RAISE NOTICE 'Columna discount_type agregada';
    END IF;

    -- coupon_code
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'coupon_code') THEN
        ALTER TABLE public.sales ADD COLUMN coupon_code VARCHAR(50);
        RAISE NOTICE 'Columna coupon_code agregada';
    END IF;

    -- payment_method
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'payment_method') THEN
        ALTER TABLE public.sales ADD COLUMN payment_method payment_method_enum NOT NULL DEFAULT 'CASH';
        RAISE NOTICE 'Columna payment_method agregada';
    END IF;

    -- status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'status') THEN
        ALTER TABLE public.sales ADD COLUMN status sale_status_enum NOT NULL DEFAULT 'COMPLETED';
        RAISE NOTICE 'Columna status agregada';
    END IF;

    -- sale_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'sale_type') THEN
        ALTER TABLE public.sales ADD COLUMN sale_type sale_type_enum NOT NULL DEFAULT 'RETAIL';
        RAISE NOTICE 'Columna sale_type agregada';
    END IF;

    -- notes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'notes') THEN
        ALTER TABLE public.sales ADD COLUMN notes TEXT;
        RAISE NOTICE 'Columna notes agregada';
    END IF;

    -- customer_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'customer_id') THEN
        ALTER TABLE public.sales ADD COLUMN customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;
        RAISE NOTICE 'Columna customer_id agregada';
    END IF;

    -- user_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'user_id') THEN
        ALTER TABLE public.sales ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Columna user_id agregada';
    END IF;

    -- created_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'created_at') THEN
        ALTER TABLE public.sales ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        RAISE NOTICE 'Columna created_at agregada';
    END IF;

    -- updated_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'updated_at') THEN
        ALTER TABLE public.sales ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        RAISE NOTICE 'Columna updated_at agregada';
    END IF;
END $$;

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON public.sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON public.sales(payment_method);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_sale_type ON public.sales(sale_type);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at DESC);

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para updated_at
DROP TRIGGER IF EXISTS update_sales_updated_at ON public.sales;
CREATE TRIGGER update_sales_updated_at
    BEFORE UPDATE ON public.sales
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios autenticados pueden ver todas las ventas
DROP POLICY IF EXISTS "Users can view all sales" ON public.sales;
CREATE POLICY "Users can view all sales"
    ON public.sales FOR SELECT
    TO authenticated
    USING (true);

-- Política: Los usuarios autenticados pueden crear ventas
DROP POLICY IF EXISTS "Users can create sales" ON public.sales;
CREATE POLICY "Users can create sales"
    ON public.sales FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Política: Los usuarios autenticados pueden actualizar ventas
-- NOTA: Puedes hacer esta política más restrictiva después si lo necesitas
DROP POLICY IF EXISTS "Users can update their own sales" ON public.sales;
CREATE POLICY "Users can update their own sales"
    ON public.sales FOR UPDATE
    TO authenticated
    USING (true);

-- Agregar comentarios a las columnas
COMMENT ON TABLE public.sales IS 'Tabla de ventas del sistema POS';
COMMENT ON COLUMN public.sales.id IS 'Identificador único de la venta';
COMMENT ON COLUMN public.sales.customer_id IS 'ID del cliente (opcional)';
COMMENT ON COLUMN public.sales.user_id IS 'ID del usuario que realizó la venta';
COMMENT ON COLUMN public.sales.total_amount IS 'Monto total de la venta';
COMMENT ON COLUMN public.sales.tax_amount IS 'Monto de impuestos (IVA)';
COMMENT ON COLUMN public.sales.discount_amount IS 'Monto de descuento aplicado';
COMMENT ON COLUMN public.sales.discount_type IS 'Tipo de descuento: PERCENTAGE o FIXED_AMOUNT';
COMMENT ON COLUMN public.sales.coupon_code IS 'Código de cupón aplicado (opcional)';
COMMENT ON COLUMN public.sales.payment_method IS 'Método de pago: CASH, CARD, TRANSFER, OTHER';
COMMENT ON COLUMN public.sales.status IS 'Estado de la venta: PENDING, COMPLETED, CANCELLED, REFUNDED';
COMMENT ON COLUMN public.sales.sale_type IS 'Tipo de venta: RETAIL (minorista) o WHOLESALE (mayorista)';
COMMENT ON COLUMN public.sales.notes IS 'Notas adicionales sobre la venta';
COMMENT ON COLUMN public.sales.created_at IS 'Fecha y hora de creación';
COMMENT ON COLUMN public.sales.updated_at IS 'Fecha y hora de última actualización';

-- Verificación final
DO $$
DECLARE
    missing_columns TEXT[];
    required_columns TEXT[] := ARRAY[
        'id', 'customer_id', 'user_id', 'total_amount', 'tax_amount', 
        'discount_amount', 'discount_type', 'coupon_code', 'payment_method', 
        'status', 'sale_type', 'notes', 'created_at', 'updated_at'
    ];
    col TEXT;
BEGIN
    missing_columns := ARRAY[]::TEXT[];
    
    FOREACH col IN ARRAY required_columns
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'sales' 
            AND column_name = col
        ) THEN
            missing_columns := array_append(missing_columns, col);
        END IF;
    END LOOP;
    
    IF array_length(missing_columns, 1) IS NULL THEN
        RAISE NOTICE '✓ Verificación exitosa: Todas las columnas necesarias existen en la tabla sales';
    ELSE
        RAISE EXCEPTION '✗ Error: Faltan las siguientes columnas: %', array_to_string(missing_columns, ', ');
    END IF;
END $$;

-- ============================================================================
-- INFORMACIÓN ADICIONAL
-- ============================================================================
-- Este script:
-- 1. Crea todos los tipos ENUM necesarios
-- 2. Crea la tabla sales si no existe
-- 3. Agrega todas las columnas faltantes si la tabla ya existía
-- 4. Crea índices para optimizar consultas
-- 5. Configura triggers para actualizar updated_at automáticamente
-- 6. Configura políticas RLS para seguridad
-- 7. Verifica que todo esté correcto
--
-- Después de ejecutar este script, DEBES reiniciar tu servidor de desarrollo
-- para que Supabase actualice su caché de esquema.
