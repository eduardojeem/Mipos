'use client'

import { useMemo } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Clock, TrendingDown, ExternalLink } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Promotion {
  id: string
  name: string
  endDate: string
  isActive: boolean
  usageCount?: number
  usageLimit?: number
}

interface PromotionAlertsProps {
  promotions: Promotion[]
}

export function PromotionAlerts({ promotions }: PromotionAlertsProps) {
  const alerts = useMemo(() => {
    const now = new Date()
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const expiringSoon: Promotion[] = []
    const expiringThisWeek: Promotion[] = []
    const nearLimit: Promotion[] = []

    promotions.forEach(promo => {
      if (!promo.isActive) return

      const endDate = new Date(promo.endDate)

      // Expiring in 3 days
      if (endDate <= threeDaysFromNow && endDate > now) {
        expiringSoon.push(promo)
      }
      // Expiring in 7 days
      else if (endDate <= sevenDaysFromNow && endDate > now) {
        expiringThisWeek.push(promo)
      }

      // Near usage limit (>80%)
      if (promo.usageLimit && promo.usageCount) {
        const percentage = (promo.usageCount / promo.usageLimit) * 100
        if (percentage >= 80) {
          nearLimit.push(promo)
        }
      }
    })

    return { expiringSoon, expiringThisWeek, nearLimit }
  }, [promotions])

  const hasAlerts = alerts.expiringSoon.length > 0 || 
                    alerts.expiringThisWeek.length > 0 || 
                    alerts.nearLimit.length > 0

  if (!hasAlerts) return null

  return (
    <div className="space-y-4">
      {/* Critical: Expiring in 3 days */}
      {alerts.expiringSoon.length > 0 && (
        <Alert variant="destructive" className="border-red-200 dark:border-red-800">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Promociones por Expirar (3 días o menos)</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-2">
              {alerts.expiringSoon.map(promo => (
                <div key={promo.id} className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold">{promo.name}</span>
                    <span className="text-sm ml-2">
                      Expira: {formatDate(promo.endDate)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(`/offers?promotion=${promo.id}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Warning: Expiring this week */}
      {alerts.expiringThisWeek.length > 0 && (
        <Alert className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20">
          <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertTitle className="text-yellow-900 dark:text-yellow-200">
            Promociones por Expirar (Esta Semana)
          </AlertTitle>
          <AlertDescription className="text-yellow-800 dark:text-yellow-300">
            <div className="mt-2 space-y-2">
              {alerts.expiringThisWeek.map(promo => (
                <div key={promo.id} className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold">{promo.name}</span>
                    <span className="text-sm ml-2">
                      Expira: {formatDate(promo.endDate)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(`/offers?promotion=${promo.id}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Info: Near usage limit */}
      {alerts.nearLimit.length > 0 && (
        <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
          <TrendingDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="text-blue-900 dark:text-blue-200">
            Promociones Cerca del Límite de Usos
          </AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-300">
            <div className="mt-2 space-y-2">
              {alerts.nearLimit.map(promo => {
                const percentage = promo.usageLimit && promo.usageCount
                  ? Math.round((promo.usageCount / promo.usageLimit) * 100)
                  : 0

                return (
                  <div key={promo.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{promo.name}</span>
                      <Badge variant="secondary">
                        {promo.usageCount} / {promo.usageLimit} ({percentage}%)
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`/offers?promotion=${promo.id}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
