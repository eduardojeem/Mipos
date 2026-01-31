import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireOrganization } from '@/lib/organization';

export async function GET(request: NextRequest) {
  try {
    // Validate and get organization ID
    const orgId = await requireOrganization(request);
    
    const supabase = await createClient();

    // Get categories with product counts
    // Filtered by organization for multitenancy
    const { data: categories, error } = await supabase
      .from('categories')
      .select(`
        id,
        name,
        description,
        is_active,
        created_at,
        updated_at,
        products!products_category_id_fkey (
          id
        )
      `)
      .eq('is_active', true)
      .eq('organization_id', orgId)
      .order('name');

    if (error) throw error;

    // Transform data with product counts
    const transformedCategories = (categories || []).map((category: any) => ({
      id: category.id,
      name: category.name,
      description: category.description || '',
      is_active: category.is_active,
      created_at: category.created_at,
      updated_at: category.updated_at,
      product_count: category.products?.length || 0
    }));

    return NextResponse.json({
      categories: transformedCategories,
      total: transformedCategories.length,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Categories error:', error);
    
    // Return specific error if it's an organization validation error
    if (error instanceof Error && error.message.includes('No valid organization')) {
      return NextResponse.json(
        { error: 'Organization required', message: error.message },
        { status: 400 }
      );
    }
    
    // Return fallback categories
    return NextResponse.json({
      categories: [
        {
          id: 'fallback-1',
          name: 'Maquillaje',
          description: 'Productos de maquillaje',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          product_count: 0
        },
        {
          id: 'fallback-2',
          name: 'Cuidado de la Piel',
          description: 'Productos para el cuidado facial y corporal',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          product_count: 0
        }
      ],
      total: 2,
      lastUpdated: new Date().toISOString(),
      error: 'Using fallback categories'
    });
  }
}