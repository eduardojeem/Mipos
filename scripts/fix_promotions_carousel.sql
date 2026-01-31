-- Ejecuta este script en el Editor SQL de Supabase para solucionar el error de tabla no encontrada

-- 1. Crear la tabla si no existe
CREATE TABLE IF NOT EXISTS public.promotions_carousel (
    promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
    position INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT promotions_carousel_pkey PRIMARY KEY (promotion_id)
);

-- 2. Crear índice único para evitar posiciones duplicadas
CREATE UNIQUE INDEX IF NOT EXISTS idx_promotions_carousel_position ON public.promotions_carousel(position);

-- 3. Habilitar seguridad a nivel de fila (RLS)
ALTER TABLE public.promotions_carousel ENABLE ROW LEVEL SECURITY;

-- 4. Eliminar políticas antiguas para evitar conflictos
DROP POLICY IF EXISTS "Enable read access for all users" ON public.promotions_carousel;
DROP POLICY IF EXISTS "Enable all access for service role" ON public.promotions_carousel;

-- 5. Crear política de lectura pública (cualquiera puede ver el carrusel)
CREATE POLICY "Enable read access for all users" ON public.promotions_carousel
    FOR SELECT USING (true);

-- 6. Crear política de administración total para el rol de servicio (API)
CREATE POLICY "Enable all access for service role" ON public.promotions_carousel
    FOR ALL USING (auth.role() = 'service_role');

-- 7. IMPORTANTE: Recargar el caché de esquema de PostgREST para que la API detecte la tabla
NOTIFY pgrst, 'reload schema';
