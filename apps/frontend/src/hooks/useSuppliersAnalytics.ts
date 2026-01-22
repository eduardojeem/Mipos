import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'

type AnalyticsMetrics = {
  totalSuppliers: number
  activeSuppliers: number
  totalSpent: number
  averageOrderValue: number
  topPerformers: Array<{ id: string; name: string; productCount: number }>
  categoryDistribution: Array<{ name: string; value: number; color?: string }>
  monthlyTrends: Array<{ month: string; suppliers: number }>
  performanceMetrics: { excellent: number; good: number; average: number; poor: number }
}

export function useSuppliersAnalytics(params?: { months?: number }) {
  const months = Math.max(1, Math.min(24, params?.months ?? 12))
  const supabase = createClient()

  return useQuery({
    queryKey: ['suppliers-analytics', months],
    queryFn: async (): Promise<{ analytics: AnalyticsMetrics }> => {
      // Count suppliers
      const { count: totalSuppliers } = await supabase
        .from('suppliers')
        .select('id', { count: 'exact', head: true })

      const { count: activeSuppliers } = await supabase
        .from('suppliers')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)

      // Fetch recent suppliers for monthly trends
      const since = new Date()
      since.setMonth(since.getMonth() - months + 1)
      const { data: recent } = await supabase
        .from('suppliers')
        .select('id,name,created_at')
        .gte('created_at', since.toISOString())

      const monthLabels = Array.from({ length: months }, (_, i) => {
        const d = new Date()
        d.setMonth(d.getMonth() - (months - 1 - i))
        return d.toLocaleString('es-ES', { month: 'short' })
      })
      const monthlyBuckets: Record<string, number> = {}
      for (const m of monthLabels) { monthlyBuckets[m] = 0 }
      (recent || []).forEach((r: any) => {
        const m = new Date(r.created_at).toLocaleString('es-ES', { month: 'short' })
        if (monthlyBuckets[m] !== undefined) monthlyBuckets[m]++
      })
      const monthlyTrends = monthLabels.map(m => ({ month: m, suppliers: monthlyBuckets[m] }))

      // Top performers by product association (proxy)
      const { data: products } = await supabase
        .from('products')
        .select('id,name,supplier_id')
        .not('supplier_id', 'is', null)

      const bySupplier: Record<string, number> = {}
      ;(products || []).forEach((p: any) => {
        if (!p.supplier_id) return
        bySupplier[p.supplier_id] = (bySupplier[p.supplier_id] || 0) + 1
      })
      // Get supplier names for top performers
      const supplierIds = Object.keys(bySupplier).slice(0, 20)
      let namesMap: Record<string, string> = {}
      if (supplierIds.length) {
        const supQuery = await supabase
          .from('suppliers')
          .select('id,name')
          .in('id', supplierIds)
        const supRows = supQuery.data || []
        supRows.forEach((s: any) => { namesMap[s.id] = s.name })
      }
      const topPerformers = Object.entries(bySupplier)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, count]) => ({ id, name: namesMap[id] || id, productCount: count }))

      // Category distribution via products (proxy)
      const { data: catRows } = await supabase
        .from('products')
        .select('category_id')
        .not('category_id', 'is', null)
      const catCounts: { [key: string]: number } = Object.create(null)
      (catRows || []).forEach((r: any) => {
        const key = String(r.category_id)
        catCounts[key] = (catCounts[key] || 0) + 1
      })
      const categoryDistribution = Object.entries(catCounts).map(([key, value]) => ({ name: key, value }))

      const analytics: AnalyticsMetrics = {
        totalSuppliers: totalSuppliers || 0,
        activeSuppliers: activeSuppliers || 0,
        totalSpent: 0,
        averageOrderValue: 0,
        topPerformers,
        categoryDistribution,
        monthlyTrends,
        performanceMetrics: { excellent: 0, good: 0, average: 0, poor: 0 }
      }
      return { analytics }
    },
    staleTime: 60_000,
  })
}
