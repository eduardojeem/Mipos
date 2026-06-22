'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { AlertTriangle, ArrowRight, BadgeCheck, CreditCard, Shield, ShoppingCart, Users, Scissors, UserCog, Calendar } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CurrencyDisplay } from '@/components/ui/currency-display'
import { useLowStockProducts } from '@/hooks/use-products'
import { useAdminNavigation } from '@/hooks/use-admin-navigation'
import { useCurrentVertical } from '@/hooks/use-current-vertical'
import { useServices } from '@/app/admin/services/hooks/useServices'
import { useStaff } from '@/app/admin/staff/hooks/useStaff'
import { cn, formatDate } from '@/lib/utils'

interface DashboardSummary {
  todaySales: number
  totalOrders: number
  avgTicket: number
  growthPercentage: number
  monthlyTotal: number
}

interface RecentSale {
  id: string
  total_amount: number
  payment_method: string
  created_at: string
}

interface RecentSalesResponse {
  sales: RecentSale[]
}

function useDashboardSummary() {
  return useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/summary')
      if (!response.ok) throw new Error('Failed to fetch dashboard summary')
      return (await response.json()) as DashboardSummary
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

function useRecentSales() {
  return useQuery<RecentSalesResponse>({
    queryKey: ['recent-sales'],
    queryFn: async () => {
      const response = await fetch('/api/sales?limit=5&sort=created_at:desc')
      if (!response.ok) throw new Error('Failed to fetch recent sales')
      return (await response.json()) as RecentSalesResponse
    },
    staleTime: 60 * 1000,
    gcTime: 3 * 60 * 1000,
  })
}

export default function AdminDashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary()
  const { data: recentSalesData, isLoading: recentSalesLoading } = useRecentSales()
  const { data: lowStockProducts, isLoading: lowStockLoading } = useLowStockProducts(5)
  const { sections, role, canAccessAdminPanel, canAccessReports } = useAdminNavigation()
  const vertical = useCurrentVertical()
  const { services, isLoading: servicesLoading } = useServices()
  const { staff, isLoading: staffLoading } = useStaff()

  const recentSales = recentSalesData?.sales || []
  const quickSections = useMemo(() => sections.filter((section) => section.items.length > 0), [sections])

  return (
    <div className="space-y-8 pb-10">
      <section className="rounded-[28px] border border-border bg-background/90 p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                {role}
              </Badge>
              <Badge variant={canAccessAdminPanel ? 'default' : 'secondary'}>
                {canAccessAdminPanel ? 'Panel administrativo habilitado' : 'Panel administrativo limitado'}
              </Badge>
              <Badge variant={canAccessReports ? 'outline' : 'secondary'}>
                {canAccessReports ? 'Reportes disponibles' : 'Reportes no incluidos'}
              </Badge>
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                {vertical === 'BARBERSHOP' ? 'Administración de turnos y profesionales' : 'Administracion clara y operativa'}
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                {vertical === 'BARBERSHOP' 
                  ? 'Organiza tu agenda, profesionales, servicios, dominio de la página de reservas y configuraciones operativas del salón.'
                  : 'La seccion admin queda organizada por empresa, operacion, analisis y seguridad, con acceso controlado por rol del usuario y por plan de la empresa.'
                }
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/admin/users-roles">
                <Users className="mr-2 h-4 w-4" />
                Gestionar usuarios
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Volver al dashboard
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-3xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ventas de hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {summaryLoading ? <Skeleton className="h-8 w-24" /> : <CurrencyDisplay value={summary?.todaySales || 0} />}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Flujo actual de caja y ventas.</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {vertical === 'BARBERSHOP' ? 'Turnos del periodo' : 'Pedidos del periodo'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {summaryLoading ? <Skeleton className="h-8 w-20" /> : summary?.totalOrders || 0}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {vertical === 'BARBERSHOP' ? 'Citas registradas en los últimos 30 días.' : 'Volumen comercial de los ultimos 30 dias.'}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ticket promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {summaryLoading ? <Skeleton className="h-8 w-24" /> : <CurrencyDisplay value={summary?.avgTicket || 0} />}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {vertical === 'BARBERSHOP' ? 'Valor medio por turno agendado.' : 'Valor medio por transaccion.'}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {vertical === 'BARBERSHOP' ? 'Profesionales' : 'Alertas de inventario'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {vertical === 'BARBERSHOP' 
                ? (staffLoading ? <Skeleton className="h-8 w-16" /> : staff.length)
                : (lowStockLoading ? <Skeleton className="h-8 w-16" /> : lowStockProducts?.length || 0)
              }
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {vertical === 'BARBERSHOP' ? 'Barberos registrados en el staff.' : 'Productos que requieren accion inmediata.'}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Mapa del panel</CardTitle>
            <CardDescription>Secciones organizadas para crecer sin mezclar administracion con operacion.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {quickSections.map((section) => (
              <div key={section.key} className="rounded-2xl border border-border bg-muted/20 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{section.label}</p>
                <div className="mt-3 space-y-3">
                  {section.items.slice(0, 3).map((item) => (
                    <Link key={item.href} href={item.href} className="flex items-start gap-3 rounded-xl p-2 transition-colors hover:bg-background">
                      <item.icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>Estado operativo</CardTitle>
              <CardDescription>Resumen de crecimiento, inventario y cobertura del plan actual.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Crecimiento mensual</p>
                    <p className="text-xs text-muted-foreground">Comparado con el periodo anterior</p>
                  </div>
                  <div className="text-xl font-semibold text-emerald-600">
                    {summaryLoading ? <Skeleton className="h-7 w-16" /> : `+${summary?.growthPercentage || 0}%`}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Total del mes</p>
                    <p className="text-xs text-muted-foreground">Facturacion consolidada</p>
                  </div>
                  <div className="text-xl font-semibold text-foreground">
                    {summaryLoading ? <Skeleton className="h-7 w-20" /> : <CurrencyDisplay value={summary?.monthlyTotal || 0} />}
                  </div>
                </div>
              </div>

              {vertical === 'BARBERSHOP' ? (
                <div className="rounded-2xl border border-border bg-muted/20 p-4">
                  <div className="flex items-start gap-3">
                    <Scissors className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Servicios activos</p>
                      <p className="text-xs text-muted-foreground">
                        {servicesLoading 
                          ? 'Cargando servicios…' 
                          : `${services.length} servicios cargados en tu catálogo.`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={cn('rounded-2xl border p-4', (lowStockProducts?.length || 0) > 0 ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-muted/20')}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={cn('mt-0.5 h-5 w-5', (lowStockProducts?.length || 0) > 0 ? 'text-destructive' : 'text-muted-foreground')} />
                    <div>
                      <p className="text-sm font-medium text-foreground">Inventario sensible</p>
                      <p className="text-xs text-muted-foreground">
                        {(lowStockProducts?.length || 0) > 0
                          ? `${lowStockProducts?.length || 0} productos requieren reposicion.`
                          : 'No hay productos en nivel critico.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>Acciones prioritarias</CardTitle>
              <CardDescription>Atajos utiles para administracion diaria.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-between" asChild>
                <Link href="/admin/subscriptions">
                  <span className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Revisar plan y suscripcion
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-between" asChild>
                <Link href="/admin/sessions">
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Revisar seguridad
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-between" asChild>
                <Link href="/dashboard/reports">
                  <span className="flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4" />
                    Ver analisis y reportes
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Actividad reciente</CardTitle>
            <CardDescription>Ultimas ventas procesadas en el sistema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentSalesLoading ? (
              Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-16 w-full rounded-2xl" />)
            ) : recentSales.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                No hay transacciones recientes.
              </p>
            ) : (
              recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Venta #{sale.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(sale.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">
                      <CurrencyDisplay value={sale.total_amount} />
                    </p>
                    <Badge variant="secondary" className="mt-1">{sale.payment_method}</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {vertical === 'BARBERSHOP' ? (
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>Equipo de profesionales</CardTitle>
              <CardDescription>Estilistas y barberos activos en la agenda.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {staffLoading ? (
                <Skeleton className="h-32 w-full rounded-2xl" />
              ) : !staff || staff.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                  No hay profesionales registrados.
                </p>
              ) : (
                staff.map((p) => {
                  const displayName = p.display_name || p.user?.full_name || 'Profesional'
                  return (
                    <div key={p.id} className="rounded-2xl border border-border px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black text-white" style={{ backgroundColor: p.color || '#6366f1' }}>
                            {displayName.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                            <p className="truncate text-xs text-muted-foreground">{p.specialty || 'Estilista'}</p>
                          </div>
                        </div>
                        <Badge variant="outline">Activo</Badge>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>Stock critico</CardTitle>
              <CardDescription>Productos con necesidad de reabastecimiento.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {lowStockLoading ? (
                <Skeleton className="h-32 w-full rounded-2xl" />
              ) : !lowStockProducts || lowStockProducts.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                  Inventario sin alertas criticas.
                </p>
              ) : (
                lowStockProducts.map((product) => (
                  <div key={product.id} className="rounded-2xl border border-border px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{product.name}</p>
                        <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                      </div>
                      <Badge variant="destructive">{product.stock_quantity} un.</Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}
