-- =============================================================================
-- MIGRATION: 20260517_marketplace_categories
-- Enterprise marketplace categories system
--
-- PROBLEMA RESUELTO:
--   Las categorías internas de organizaciones estaban mezcladas con las
--   categorías públicas del marketplace. Esta migración las separa correctamente:
--
--   1. marketplace_categories → globales, curadas por admin SaaS, SEO-friendly
--   2. categories              → privadas de cada organización (sin cambios)
--   3. organizations.marketplace_category_id → FK que vincula cada org al rubro público
--
-- ARQUITECTURA:
--   marketplace_categories (global, admin)
--         ↑ FK
--   organizations.marketplace_category_id (1 categoría pública por org)
--         ↑
--   categories (privadas por org, para clasificar productos internamente)
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- TABLE: marketplace_categories
-- Categorías globales, curadas exclusivamente por el super admin del SaaS.
-- Equivalente a "rubros" en Mercado Libre, "categories" en Etsy o Airbnb.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketplace_categories (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT        NOT NULL,
    slug            TEXT        NOT NULL,
    description     TEXT,
    icon            TEXT,                          -- nombre de icono lucide-react (ej: "UtensilsCrossed")
    color           TEXT        NOT NULL DEFAULT '#10b981',  -- hex color para UI
    image_url       TEXT,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    is_featured     BOOLEAN     NOT NULL DEFAULT FALSE,
    sort_order      INTEGER     NOT NULL DEFAULT 0,
    parent_id       UUID        REFERENCES public.marketplace_categories(id) ON DELETE SET NULL,
    seo_title       TEXT,
    seo_description TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT marketplace_categories_slug_unique   UNIQUE (slug),
    CONSTRAINT marketplace_categories_name_length   CHECK  (LENGTH(TRIM(name)) >= 2),
    CONSTRAINT marketplace_categories_slug_format   CHECK  (slug ~* '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    CONSTRAINT marketplace_categories_color_format  CHECK  (color ~* '^#[0-9a-fA-F]{6}$')
);

COMMENT ON TABLE  public.marketplace_categories                IS 'Categorías públicas del marketplace. Solo editables por super admins.';
COMMENT ON COLUMN public.marketplace_categories.slug           IS 'URL-friendly identifier. Usado en /home/categorias/[slug]';
COMMENT ON COLUMN public.marketplace_categories.icon           IS 'Nombre de icono de lucide-react (ej: UtensilsCrossed, Laptop, Shirt)';
COMMENT ON COLUMN public.marketplace_categories.is_featured    IS 'Mostrar en la sección destacada del marketplace';
COMMENT ON COLUMN public.marketplace_categories.sort_order     IS 'Orden de aparición en el marketplace (menor = primero)';

-- Trigger: updated_at automático
CREATE OR REPLACE FUNCTION public.set_marketplace_categories_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marketplace_categories_updated_at ON public.marketplace_categories;
CREATE TRIGGER trg_marketplace_categories_updated_at
    BEFORE UPDATE ON public.marketplace_categories
    FOR EACH ROW EXECUTE FUNCTION public.set_marketplace_categories_updated_at();

-- Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_marketplace_categories_active_order
    ON public.marketplace_categories (sort_order ASC, name ASC)
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_marketplace_categories_featured
    ON public.marketplace_categories (sort_order ASC)
    WHERE is_active = TRUE AND is_featured = TRUE;

CREATE INDEX IF NOT EXISTS idx_marketplace_categories_slug
    ON public.marketplace_categories (slug);

CREATE INDEX IF NOT EXISTS idx_marketplace_categories_parent
    ON public.marketplace_categories (parent_id)
    WHERE parent_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- COLUMN: organizations.marketplace_category_id
-- Vincula cada organización a UN rubro principal del marketplace público.
-- Esto permite filtrar /home/catalogo?category=restaurantes correctamente.
-- ---------------------------------------------------------------------------
ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS marketplace_category_id UUID
    REFERENCES public.marketplace_categories(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.organizations.marketplace_category_id IS
    'Rubro público del marketplace al que pertenece esta organización. Editable desde configuración de la org.';

CREATE INDEX IF NOT EXISTS idx_organizations_marketplace_category
    ON public.organizations (marketplace_category_id)
    WHERE marketplace_category_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- TABLE: organization_marketplace_categories  (multi-categoría opcional)
-- Permite que una org aparezca en más de un rubro del marketplace.
-- La categoría principal sigue siendo organizations.marketplace_category_id
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_marketplace_categories (
    organization_id         UUID        NOT NULL REFERENCES public.organizations(id)         ON DELETE CASCADE,
    marketplace_category_id UUID        NOT NULL REFERENCES public.marketplace_categories(id) ON DELETE CASCADE,
    is_primary              BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (organization_id, marketplace_category_id)
);

COMMENT ON TABLE public.organization_marketplace_categories IS
    'Permite asociar una organización a múltiples rubros del marketplace. is_primary indica el rubro principal.';

CREATE INDEX IF NOT EXISTS idx_org_mkt_cat_category
    ON public.organization_marketplace_categories (marketplace_category_id);

-- ---------------------------------------------------------------------------
-- RLS: marketplace_categories
-- Lectura pública (todos pueden ver categorías activas)
-- Escritura solo super admins
-- ---------------------------------------------------------------------------
ALTER TABLE public.marketplace_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active marketplace categories" ON public.marketplace_categories;
CREATE POLICY "Public read active marketplace categories"
    ON public.marketplace_categories
    FOR SELECT
    USING (is_active = TRUE);

DROP POLICY IF EXISTS "Super admin full access marketplace categories" ON public.marketplace_categories;
CREATE POLICY "Super admin full access marketplace categories"
    ON public.marketplace_categories
    FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- RLS: organization_marketplace_categories
ALTER TABLE public.organization_marketplace_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members read marketplace category links" ON public.organization_marketplace_categories;
CREATE POLICY "Org members read marketplace category links"
    ON public.organization_marketplace_categories
    FOR SELECT
    USING (
        organization_id IN (SELECT unnest(public.get_my_org_ids()))
        OR public.is_super_admin()
    );

DROP POLICY IF EXISTS "Org admins manage marketplace category links" ON public.organization_marketplace_categories;
CREATE POLICY "Org admins manage marketplace category links"
    ON public.organization_marketplace_categories
    FOR ALL
    TO authenticated
    USING (
        organization_id IN (SELECT unnest(public.get_my_org_ids()))
        OR public.is_super_admin()
    )
    WITH CHECK (
        organization_id IN (SELECT unnest(public.get_my_org_ids()))
        OR public.is_super_admin()
    );

-- ---------------------------------------------------------------------------
-- RPC: get_marketplace_categories_with_counts
-- Retorna categorías del marketplace con conteo de orgs y productos.
-- Usado en /home/categorias para mostrar el directorio de rubros.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_marketplace_categories_with_counts()
RETURNS TABLE (
    id              UUID,
    name            TEXT,
    slug            TEXT,
    description     TEXT,
    icon            TEXT,
    color           TEXT,
    image_url       TEXT,
    is_featured     BOOLEAN,
    sort_order      INTEGER,
    org_count       BIGINT,
    product_count   BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        mc.id,
        mc.name,
        mc.slug,
        mc.description,
        mc.icon,
        mc.color,
        mc.image_url,
        mc.is_featured,
        mc.sort_order,
        COUNT(DISTINCT o.id)  AS org_count,
        COUNT(DISTINCT p.id)  AS product_count
    FROM public.marketplace_categories mc
    LEFT JOIN public.organizations o
        ON  o.marketplace_category_id = mc.id
        AND o.subscription_status IN ('ACTIVE', 'TRIAL')
    LEFT JOIN public.products p
        ON  p.organization_id = o.id
        AND p.is_active = TRUE
        AND p.is_public = TRUE
        AND p.deleted_at IS NULL
    WHERE mc.is_active = TRUE
    GROUP BY mc.id, mc.name, mc.slug, mc.description, mc.icon, mc.color,
             mc.image_url, mc.is_featured, mc.sort_order
    ORDER BY mc.sort_order ASC, org_count DESC, mc.name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_marketplace_categories_with_counts() TO anon, authenticated;
COMMENT ON FUNCTION public.get_marketplace_categories_with_counts() IS
    'Retorna marketplace_categories con conteo de orgs activas y productos. Sin parámetros, sin auth.';

-- ---------------------------------------------------------------------------
-- SEED: Categorías iniciales del marketplace (mercado hispanohablante)
-- Basado en los verticales implementados: RETAIL (tienda) y BARBERSHOP (servicios)
-- Solo se activan categorías que el sistema puede soportar operativamente.
-- ---------------------------------------------------------------------------
INSERT INTO public.marketplace_categories
    (name, slug, description, icon, color, is_active, is_featured, sort_order)
VALUES
    ('Belleza y Cuidado',           'belleza-y-cuidado',            'Barberías, peluquerías, salones de belleza y cuidado personal', 'Sparkles',         '#a855f7', TRUE, TRUE,   10),
    ('Almacén y Despensa',          'supermercados',                'Minimercados, almacenes, despensas y kioscos',                 'ShoppingCart',     '#10b981', TRUE, TRUE,   20),
    ('Moda y Ropa',                 'moda-y-ropa',                  'Ropa, calzado y accesorios de moda',                           'Shirt',            '#ec4899', TRUE, TRUE,   30),
    ('Tecnología',                  'tecnologia',                   'Electrónica, celulares, accesorios y computación',              'Laptop',           '#6366f1', TRUE, TRUE,   40),
    ('Farmacias y Salud',           'farmacias-y-salud',            'Medicamentos, suplementos y productos de salud',               'Pill',             '#ef4444', TRUE, TRUE,   50),
    ('Hogar y Decoración',          'hogar-y-decoracion',           'Muebles, decoración y artículos del hogar',                    'Home',             '#84cc16', TRUE, FALSE,  60),
    ('Deportes y Fitness',          'deportes-y-fitness',           'Equipamiento deportivo, ropa deportiva y nutrición',           'Dumbbell',         '#f97316', TRUE, FALSE,  70),
    ('Mascotas',                    'mascotas',                     'Alimentos, accesorios y veterinarias para mascotas',           'PawPrint',         '#22c55e', TRUE, FALSE,  80),
    ('Construcción y Ferretería',   'construccion-y-ferreteria',    'Materiales, herramientas y acabados para construcción',        'Hammer',           '#92400e', TRUE, FALSE,  90),
    ('Automotriz',                  'automotriz',                   'Repuestos, servicio técnico y accesorios para vehículos',      'Car',              '#78716c', TRUE, FALSE, 100),
    ('Librería y Papelería',        'libreria-y-papeleria',         'Libros, útiles escolares y artículos de oficina',              'BookOpen',         '#0ea5e9', TRUE, FALSE, 110),
    ('Otros',                       'otros',                        'Tiendas y negocios que no encajan en otra categoría',          'Store',            '#94a3b8', TRUE, FALSE, 999)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
