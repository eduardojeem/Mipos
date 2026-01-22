import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireManager, requirePOSPermissions } from '@/app/api/_utils/role-validation'
import { logAudit } from '@/app/api/admin/_utils/audit'

export interface InventoryAdjustment {
  product_id: string
  quantity: number
  type: 'addition' | 'subtraction' | 'correction'
  reason: string
  notes?: string
  reference_id?: string
}

export async function POST(request: NextRequest) {
  // Validar que el usuario tenga permisos para ajustar inventario
  const auth = await requirePOSPermissions(request, ['products.update'])
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  try {
    const body = await request.json()
    const supabase = await createClient()

    // Validar datos de entrada
    if (!body.product_id || !body.quantity || !body.type || !body.reason) {
      return NextResponse.json({ 
        error: 'Campos requeridos: product_id, quantity, type, reason' 
      }, { status: 400 })
    }

    const { product_id, quantity, type, reason, notes, reference_id } = body

    // Validar tipo de ajuste
    if (!['addition', 'subtraction', 'correction'].includes(type)) {
      return NextResponse.json({ 
        error: 'Tipo de ajuste inválido. Use: addition, subtraction, correction' 
      }, { status: 400 })
    }

    // Validar cantidad
    if (typeof quantity !== 'number' || quantity <= 0) {
      return NextResponse.json({ 
        error: 'La cantidad debe ser un número positivo' 
      }, { status: 400 })
    }

    // Verificar que el producto exista y obtener stock actual
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, sku, stock_quantity')
      .eq('id', product_id)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    // Validar límites según rol
    const maxAdjustment = await getMaxAdjustmentForRole(auth.userRole!)
    if (quantity > maxAdjustment && maxAdjustment !== Infinity) {
      logAudit('api.denied', { 
        action: 'inventory_adjustment', 
        reason: 'adjustment_limit_exceeded',
        quantity,
        maxAllowed: maxAdjustment,
        productId: product_id,
        userId: auth.userId,
        role: auth.userRole 
      })
      return NextResponse.json({ 
        error: `Cantidad de ajuste excede el límite permitido para su rol (${maxAdjustment})` 
      }, { status: 403 })
    }

    // Calcular nueva cantidad de stock
    let newStock: number
    let adjustmentQuantity: number

    switch (type) {
      case 'addition':
        newStock = product.stock_quantity + quantity
        adjustmentQuantity = quantity
        break
      case 'subtraction':
        // Validar que haya suficiente stock para restar
        if (product.stock_quantity < quantity) {
          return NextResponse.json({ 
            error: `Stock insuficiente. Stock actual: ${product.stock_quantity}, intentó restar: ${quantity}` 
          }, { status: 400 })
        }
        newStock = product.stock_quantity - quantity
        adjustmentQuantity = -quantity
        break
      case 'correction':
        // La cantidad es el nuevo valor absoluto
        newStock = quantity
        adjustmentQuantity = quantity - product.stock_quantity
        break
      default:
        return NextResponse.json({ error: 'Tipo de ajuste inválido' }, { status: 400 })
    }

    // Iniciar transacción para actualizar stock y crear registro de ajuste
    const { error: stockError } = await supabase
      .from('products')
      .update({ stock_quantity: newStock })
      .eq('id', product_id)

    if (stockError) {
      logAudit('api.error', { 
        action: 'inventory_adjustment_stock', 
        error: stockError.message, 
        productId: product_id,
        userId: auth.userId,
        role: auth.userRole 
      })
      return NextResponse.json({ error: 'Error al actualizar stock del producto' }, { status: 500 })
    }

    // Crear registro de ajuste de inventario
    const adjustmentData = {
      product_id,
      quantity: adjustmentQuantity,
      type,
      reason,
      notes: notes || null,
      reference_id: reference_id || null,
      user_id: auth.userId,
      previous_stock: product.stock_quantity,
      new_stock: newStock,
      created_at: new Date().toISOString()
    }

    const { data: adjustment, error: adjustmentError } = await supabase
      .from('inventory_adjustments')
      .insert(adjustmentData)
      .select('id, product_id, quantity, type, reason, notes, reference_id, user_id, previous_stock, new_stock, created_at')
      .single()

    if (adjustmentError || !adjustment) {
      // Revertir el cambio de stock si falla el registro
      await supabase
        .from('products')
        .update({ stock_quantity: product.stock_quantity })
        .eq('id', product_id)

      logAudit('api.error', { 
        action: 'inventory_adjustment_record', 
        error: adjustmentError?.message || 'Error al crear registro de ajuste', 
        productId: product_id,
        userId: auth.userId,
        role: auth.userRole 
      })
      return NextResponse.json({ error: 'Error al crear registro de ajuste' }, { status: 500 })
    }

    logAudit('api.success', { 
      action: 'inventory_adjustment', 
      adjustmentId: adjustment.id,
      productId: product_id,
      quantity: adjustmentQuantity,
      type,
      previousStock: product.stock_quantity,
      newStock,
      userId: auth.userId,
      role: auth.userRole 
    })

    return NextResponse.json({ 
      success: true, 
      adjustment,
      product: {
        id: product_id,
        name: product.name,
        sku: product.sku,
        previous_stock: product.stock_quantity,
        new_stock: newStock
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error in inventory adjustment route:', error)
    logAudit('api.error', { 
      action: 'inventory_adjustment', 
      error: error instanceof Error ? error.message : 'Unknown error', 
      userId: auth.userId,
      role: auth.userRole 
    })
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    )
  }
}

// GET para obtener historial de ajustes
export async function GET(request: NextRequest) {
  // Validar que el usuario tenga permisos para ver ajustes de inventario
  const auth = await requirePOSPermissions(request, ['products.read'])
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const page = Number(searchParams.get('page') || 1)
    const limit = Number(searchParams.get('limit') || 50)
    const productId = searchParams.get('product_id') || undefined
    const userId = searchParams.get('user_id') || undefined
    const type = searchParams.get('type') || undefined
    const dateFrom = searchParams.get('date_from') || undefined
    const dateTo = searchParams.get('date_to') || undefined

    let query = supabase
      .from('inventory_adjustments')
      .select(`
        id, product_id, quantity, type, reason, notes, reference_id, user_id, previous_stock, new_stock, created_at,
        product:products(id, name, sku),
        user:users(id, name, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    // Filtros
    if (productId) query = query.eq('product_id', productId)
    if (userId) query = query.eq('user_id', userId)
    if (type) query = query.eq('type', type)
    if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00`)
    if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59`)

    // Los cajeros solo pueden ver sus propios ajustes
    if (auth.userRole === 'CASHIER') {
      query = query.eq('user_id', auth.userId)
    }

    // Paginación
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: adjustments, error, count } = await query

    if (error) {
      logAudit('api.error', { 
        action: 'get_inventory_adjustments', 
        error: error.message, 
        userId: auth.userId,
        role: auth.userRole 
      })
      return NextResponse.json({ error: 'Error al obtener ajustes de inventario' }, { status: 500 })
    }

    const pagination = {
      page,
      limit,
      total: count ?? adjustments?.length ?? 0,
      pages: count ? Math.ceil(count / limit) : 1,
    }

    logAudit('api.success', { 
      action: 'get_inventory_adjustments', 
      userId: auth.userId,
      role: auth.userRole,
      count: adjustments?.length || 0,
      filters: { productId, userId, type, dateFrom, dateTo }
    })

    return NextResponse.json({ 
      success: true, 
      adjustments: adjustments || [], 
      count: adjustments?.length || 0, 
      pagination 
    })

  } catch (error) {
    console.error('Error in inventory adjustments GET route:', error)
    logAudit('api.error', { 
      action: 'get_inventory_adjustments', 
      error: error instanceof Error ? error.message : 'Unknown error', 
      userId: auth.userId,
      role: auth.userRole 
    })
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    )
  }
}

/**
 * Obtiene el límite máximo de ajuste permitido para un rol
 */
async function getMaxAdjustmentForRole(role: string): Promise<number> {
  // Límites por defecto según rol
  const defaultLimits: Record<string, number> = {
    'ADMIN': Infinity,
    'SUPER_ADMIN': Infinity,
    'MANAGER': 1000,
    'CASHIER': 100,
    'VIEWER': 0
  }

  // TODO: Implementar consulta a base de datos para límites configurables
  // Por ahora usamos los límites por defecto
  return defaultLimits[role] || 0
}