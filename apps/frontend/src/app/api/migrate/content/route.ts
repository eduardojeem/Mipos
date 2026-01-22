import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Import Supabase dynamically to avoid build issues
    const { createClient } = await import('@supabase/supabase-js');
    
    // Create Supabase client directly with environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ 
        error: 'Supabase configuration missing',
        details: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required'
      }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try to insert sample data directly
    const sampleData = [
      {
        title: 'Página Principal - 4G Celulares',
        description: 'Página de inicio con productos destacados',
        content: 'Contenido de la página principal con información sobre nuestros productos y servicios.',
        type: 'page',
        status: 'published',
        category: 'Principal',
        tags: ['inicio', 'productos', 'destacados'],
        views: 2450
      },
      {
        title: 'Banner Promocional - iPhone 15',
        description: 'Promoción especial iPhone 15 Pro',
        content: 'Descubre el nuevo iPhone 15 Pro con descuentos especiales.',
        type: 'banner',
        status: 'published',
        category: 'Promociones',
        tags: ['promocion', 'iphone', 'oferta'],
        views: 1820
      },
      {
        title: 'Catálogo de Productos',
        description: 'Página completa del catálogo',
        content: 'Explora nuestro catálogo completo de productos tecnológicos.',
        type: 'page',
        status: 'draft',
        category: 'Productos',
        tags: ['catalogo', 'productos'],
        views: 0
      }
    ];

    const { data, error } = await supabase
      .from('content_items')
      .insert(sampleData)
      .select();

    if (error) {
      console.error('Supabase error:', error);
      
      // If table doesn't exist, return SQL to create it
      if (error.code === '42P01') {
        return NextResponse.json({ 
          error: 'Table content_items does not exist. Please create it manually in Supabase dashboard.',
          createTableSQL: `
-- Create content_items table for web content management
CREATE TABLE content_items (
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
CREATE INDEX idx_content_items_type ON content_items(type);
CREATE INDEX idx_content_items_status ON content_items(status);
CREATE INDEX idx_content_items_category ON content_items(category);
CREATE INDEX idx_content_items_created_at ON content_items(created_at DESC);
CREATE INDEX idx_content_items_updated_at ON content_items(updated_at DESC);
CREATE INDEX idx_content_items_tags ON content_items USING GIN(tags);

-- Enable RLS (Row Level Security)
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (temporarily disabled for testing)
-- CREATE POLICY "Allow read published content" ON content_items FOR SELECT USING (true);
-- CREATE POLICY "Allow create content" ON content_items FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow update content" ON content_items FOR UPDATE USING (true);
-- CREATE POLICY "Allow delete content" ON content_items FOR DELETE USING (true);
          `
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        error: 'Error inserting sample data',
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Content management system migration completed successfully!',
      insertedRecords: data?.length || 0,
      data: data
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ 
      error: 'Migration failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Content migration endpoint. Use POST to run migration.',
    instructions: 'Send a POST request to this endpoint to create sample content data.'
  });
}