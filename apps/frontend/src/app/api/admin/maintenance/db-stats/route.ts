import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/app/api/_utils/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await assertAdmin(request)
    if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status })
    }

    const { organizationId } = auth
    const supabase = await createClient()

    // Get table statistics for the organization
    const tables = [
      { name: 'users', label: 'Usuarios' },
      { name: 'products', label: 'Productos' },
      { name: 'sales', label: 'Ventas' },
      { name: 'sale_items', label: 'Items de Venta' },
      { name: 'customers', label: 'Clientes' },
      { name: 'categories', label: 'Categorías' },
      { name: 'cash_sessions', label: 'Sesiones de Caja' },
      { name: 'audit_logs', label: 'Logs de Auditoría' }
    ]

    const tableStats = await Promise.all(
      tables.map(async (table) => {
        const { count } = await supabase
          .from(table.name)
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
        
        // Estimate size (very rough estimate: 1KB per row)
        const estimatedSizeKB = (count || 0) * 1
        const sizeStr = estimatedSizeKB > 1024 
          ? `${(estimatedSizeKB / 1024).toFixed(2)} MB`
          : `${estimatedSizeKB} KB`

        return {
          table: table.label,
          rows: count || 0,
          size: sizeStr
        }
      })
    )

    // Calculate total size
    const totalRows = tableStats.reduce((sum, t) => sum + t.rows, 0)
    const totalSizeKB = totalRows * 1
    const totalSizeStr = totalSizeKB > 1024 
      ? `${(totalSizeKB / 1024).toFixed(2)} MB`
      : `${totalSizeKB} KB`

    // Get active connections (this is a rough estimate)
    const connections = 1 // In a real scenario, you'd query pg_stat_activity

    return NextResponse.json({
      success: true,
      stats: {
        tables: tableStats.sort((a, b) => b.rows - a.rows),
        totalSize: totalSizeStr,
        connections
      }
    })
  } catch (error) {
    console.error('Error fetching database stats:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Error al obtener estadísticas de base de datos' 
    }, { status: 500 })
  }
}
