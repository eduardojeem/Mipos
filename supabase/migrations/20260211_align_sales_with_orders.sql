-- =====================================================
-- Migración: Alinear tabla SALES con el modelo ORDERS
-- Fecha: 2026-02-11
-- Descripción: Agrega columnas necesarias a sales para 
--              lifecycle de pedidos y crea historial de estados.
-- =====================================================

-- 1. Agregar columnas a la tabla sales
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'DELIVERED', -- PENDING, CONFIRMED, PREPARING, SHIPPED, DELIVERED, CANCELLED
ADD COLUMN IF NOT EXISTS order_number TEXT,
ADD COLUMN IF NOT EXISTS order_source TEXT DEFAULT 'POS', -- POS, WEB
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS customer_address TEXT,
ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipping_region TEXT,
ADD COLUMN IF NOT EXISTS estimated_delivery_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.users(id);

-- 2. Crear índices para performance
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_order_number ON public.sales(order_number);
CREATE INDEX IF NOT EXISTS idx_sales_deleted_at ON public.sales(deleted_at);

-- 3. Crear tabla de historial de estados de pedidos
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    notes TEXT,
    changed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    changed_by UUID REFERENCES public.users(id),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_org_id ON public.order_status_history(organization_id);

-- 4. Habilitar RLS para la nueva tabla
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- Política de aislamiento de tenant para el historial
DROP POLICY IF EXISTS "Tenant Isolation Status History" ON public.order_status_history;
CREATE POLICY "Tenant Isolation Status History" ON public.order_status_history
    FOR ALL USING (
        organization_id IN (SELECT unnest(get_my_org_ids()))
    );

-- 5. Generar order_number para registros existentes (opcional)
UPDATE public.sales 
SET order_number = 'ORD-' || id 
WHERE order_number IS NULL;

-- 6. Actualizar status para registros existentes (asumiendo que ventas POS están entregadas)
UPDATE public.sales 
SET status = 'DELIVERED' 
WHERE status IS NULL;
