"use client";
import React from 'react'
import { ShoppingCart, AlertTriangle, TrendingUp, DollarSign, Clock, Percent, RefreshCw, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils'
import { useBusinessConfig } from '@/contexts/BusinessConfigContext'
import type { POSStatsUI } from '@/lib/pos/types'

export type DBStatus = 'verifying' | 'ok' | 'error'

interface POSHeaderBarProps {
  dbStatus: DBStatus
  error?: unknown
  isWholesaleMode: boolean
  cartCount: number
  totalAmount: number
  stats: POSStatsUI
  onShowShortcuts: () => void
  onRefresh: () => void
  loading?: boolean
  performanceMode?: boolean
  actions?: React.ReactNode
}

export default function POSHeaderBar({
  dbStatus,
  error,
  isWholesaleMode,
  cartCount,
  totalAmount,
  stats,
  onShowShortcuts,
  onRefresh,
  loading,
  performanceMode,
  actions
}: POSHeaderBarProps) {
  const { config } = useBusinessConfig();
  return (
    <header role="banner" aria-label="Barra del POS" className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="flex items-center justify-between px-4 sm:px-5 py-2 sm:py-2">
        {/* Título y estado */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            {config.branding?.logo ? (
              <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-white dark:bg-gray-800">
                <img src={config.branding.logo} alt="Logo" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{config.businessName || 'BeautyPOS'}</h1>
            </div>
          </div>
          {/* Indicador compacto de estado */}
          <div className="hidden md:flex items-center gap-2 ml-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted dark:bg-muted">
              <div className={`w-2 h-2 rounded-full ${dbStatus === 'verifying' ? 'bg-yellow-500 dark:bg-yellow-400' : dbStatus === 'ok' ? 'bg-green-500 dark:bg-green-400' : 'bg-red-500 dark:bg-red-400'} ${performanceMode ? '' : 'animate-pulse motion-reduce:animate-none'}`}></div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200" aria-live="polite">
                Sistema Activo · BD: {dbStatus === 'ok' ? 'ok' : dbStatus === 'verifying' ? 'verificando' : 'error'}
              </span>
            </div>
            {!!error && (
              <Badge variant="destructive" className="flex items-center gap-1 bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800">
                <AlertTriangle className="h-3 w-3" />
                Datos limitados
              </Badge>
            )}
            {isWholesaleMode && (
              <Badge variant="secondary" className="bg-orange-100 dark:bg-orange-950/30 text-orange-800 dark:text-orange-400 border-orange-200 dark:border-orange-800">
                <TrendingUp className="h-3 w-3 mr-1" />
                Mayorista
              </Badge>
            )}
          </div>
        </div>

        {/* Controles principales */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Estadísticas rápidas */}
          <div className="hidden lg:flex items-center gap-3 mr-3">
            <div className="text-center">
              <div className="text-base font-bold text-foreground dark:text-foreground">{cartCount}</div>
              <div className="text-xs text-muted-foreground dark:text-muted-foreground">Productos</div>
            </div>
            <Separator orientation="vertical" className="h-7" />
            <div className="text-center">
              <div className="text-base font-bold text-green-600 dark:text-green-400">{formatCurrency(totalAmount)}</div>
              <div className="text-xs text-muted-foreground dark:text-muted-foreground">Total</div>
            </div>
          </div>

          {/* Métricas del día */}
          {!error && (
            <details className="hidden xl:block mr-2">
              <summary className="cursor-pointer text-xs text-slate-600 dark:text-slate-400 select-none">Métricas del día</summary>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <div className="text-center">
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatCurrency(stats.todaySales)}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Ventas hoy</div>
                  </div>
                </div>
                <Separator orientation="vertical" className="h-7" />
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <div className="text-center">
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{stats.todayTransactions}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Transacciones</div>
                  </div>
                </div>
                <Separator orientation="vertical" className="h-7" />
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <div className="text-center">
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatCurrency(stats.averageTicket)}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Ticket promedio</div>
                  </div>
                </div>
                {stats.topProduct && (
                  <>
                    <Separator orientation="vertical" className="h-7" />
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      <div className="text-center">
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 max-w-[160px] truncate">{stats.topProduct}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">Top cosmético</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </details>
          )}

          {/* Botón de atajos movido a la barra de acciones rápida en POSLayout */}
          <Button variant="outline" size="icon" onClick={onRefresh} disabled={!!loading} aria-label="Actualizar datos">
            <RefreshCw className={`${loading && !performanceMode ? 'animate-spin motion-reduce:animate-none' : ''} h-4 w-4`} />
          </Button>

          {actions}
        </div>
      </div>
    </header>
  )
}