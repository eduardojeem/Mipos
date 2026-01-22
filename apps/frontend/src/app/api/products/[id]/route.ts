import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/products/[id] - Get single product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        categories!products_category_id_fkey (
          id,
          name,
          description
        ),
        suppliers!products_supplier_id_fkey (
          id,
          name,
          email,
          phone
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ product });

  } catch (error) {
    console.error('Get product error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch product',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/products/[id] - Update product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = await createClient();

    // Check if product exists
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id, sku')
      .eq('id', id)
      .single();

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // If SKU is being changed, check for duplicates
    if (body.sku && body.sku !== existingProduct.sku) {
      const { data: duplicateProduct } = await supabase
        .from('products')
        .select('id')
        .eq('sku', body.sku)
        .neq('id', id)
        .single();

      if (duplicateProduct) {
        return NextResponse.json(
          { error: 'Product with this SKU already exists' },
          { status: 409 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Only update provided fields
    if (body.name !== undefined) updateData.name = body.name;
    if (body.sku !== undefined) updateData.sku = body.sku;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.cost_price !== undefined) updateData.cost_price = Number(body.cost_price);
    if (body.sale_price !== undefined) updateData.sale_price = Number(body.sale_price);
    if (body.stock_quantity !== undefined) updateData.stock_quantity = Number(body.stock_quantity);
    if (body.min_stock !== undefined) updateData.min_stock = Number(body.min_stock);
    if (body.category_id !== undefined) updateData.category_id = body.category_id;
    if (body.supplier_id !== undefined) updateData.supplier_id = body.supplier_id;
    if (body.image_url !== undefined) updateData.image_url = body.image_url;
    if (body.discount_percentage !== undefined) updateData.discount_percentage = Number(body.discount_percentage);
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    const { data: product, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      product,
      message: 'Product updated successfully'
    });

  } catch (error) {
    console.error('Update product error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to update product',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] - Delete product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check if product exists
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id, name')
      .eq('id', id)
      .single();

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if product is used in any sales (optional - depends on business rules)
    const { data: salesItems } = await supabase
      .from('sale_items')
      .select('id')
      .eq('product_id', id)
      .limit(1);

    if (salesItems && salesItems.length > 0) {
      // Instead of deleting, mark as inactive
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      return NextResponse.json({
        success: true,
        message: 'Product marked as inactive (has sales history)',
        action: 'deactivated'
      });
    }

    // Safe to delete
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
      action: 'deleted'
    });

  } catch (error) {
    console.error('Delete product error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to delete product',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
