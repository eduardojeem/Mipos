-- Create content_items table for web content management
CREATE TABLE IF NOT EXISTS content_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('page', 'banner', 'media')),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('published', 'draft', 'archived')),
    tags TEXT[] DEFAULT '{}',
    category VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    author_id UUID REFERENCES auth.users(id),
    views INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_items_type ON content_items(type);
CREATE INDEX IF NOT EXISTS idx_content_items_status ON content_items(status);
CREATE INDEX IF NOT EXISTS idx_content_items_category ON content_items(category);
CREATE INDEX IF NOT EXISTS idx_content_items_author ON content_items(author_id);
CREATE INDEX IF NOT EXISTS idx_content_items_created_at ON content_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_items_updated_at ON content_items(updated_at DESC);

-- Create GIN index for tags array
CREATE INDEX IF NOT EXISTS idx_content_items_tags ON content_items USING GIN(tags);

-- Create text search index for title and description
CREATE INDEX IF NOT EXISTS idx_content_items_search ON content_items USING GIN(
    to_tsvector('spanish', COALESCE(title, '') || ' ' || COALESCE(description, ''))
);

-- Enable RLS (Row Level Security)
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow authenticated users to read all published content
CREATE POLICY "Allow read published content" ON content_items
    FOR SELECT USING (status = 'published' OR auth.uid() IS NOT NULL);

-- Allow authenticated users to read their own content
CREATE POLICY "Allow read own content" ON content_items
    FOR SELECT USING (auth.uid() = author_id);

-- Allow authenticated users to create content
CREATE POLICY "Allow create content" ON content_items
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to update their own content
CREATE POLICY "Allow update own content" ON content_items
    FOR UPDATE USING (auth.uid() = author_id);

-- Allow users to delete their own content
CREATE POLICY "Allow delete own content" ON content_items
    FOR DELETE USING (auth.uid() = author_id);

-- Create function to automatically set author_id and updated_at
CREATE OR REPLACE FUNCTION set_content_metadata()
RETURNS TRIGGER AS $$
BEGIN
    -- Set author_id on insert if not provided
    IF TG_OP = 'INSERT' AND NEW.author_id IS NULL THEN
        NEW.author_id = auth.uid();
    END IF;
    
    -- Always update updated_at
    NEW.updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set metadata
CREATE TRIGGER trigger_set_content_metadata
    BEFORE INSERT OR UPDATE ON content_items
    FOR EACH ROW
    EXECUTE FUNCTION set_content_metadata();

-- Create function to increment view count
CREATE OR REPLACE FUNCTION increment_content_views(content_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE content_items 
    SET views = COALESCE(views, 0) + 1 
    WHERE id = content_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert some sample data
INSERT INTO content_items (title, description, content, type, status, category, tags) VALUES
('Página Principal - 4G Celulares', 'Página de inicio con productos destacados', 'Contenido de la página principal...', 'page', 'published', 'Principal', ARRAY['inicio', 'productos', 'destacados']),
('Banner Promocional - iPhone 15', 'Promoción especial iPhone 15 Pro', 'Texto del banner promocional...', 'banner', 'published', 'Promociones', ARRAY['promocion', 'iphone', 'oferta']),
('Catálogo de Productos', 'Página completa del catálogo', 'Contenido del catálogo...', 'page', 'draft', 'Productos', ARRAY['catalogo', 'productos']),
('Banner Black Friday', 'Promoción especial Black Friday', 'Descuentos increíbles...', 'banner', 'draft', 'Promociones', ARRAY['black-friday', 'descuentos']),
('Galería de Imágenes', 'Colección de imágenes del catálogo', 'Imágenes de productos...', 'media', 'published', 'Media', ARRAY['imagenes', 'galeria']);

COMMENT ON TABLE content_items IS 'Tabla para gestionar contenido web (páginas, banners, media)';
COMMENT ON COLUMN content_items.type IS 'Tipo de contenido: page, banner, media';
COMMENT ON COLUMN content_items.status IS 'Estado: published, draft, archived';
COMMENT ON COLUMN content_items.tags IS 'Array de tags para categorización';
COMMENT ON COLUMN content_items.metadata IS 'Metadatos adicionales en formato JSON';