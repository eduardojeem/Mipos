import React, { useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { toast } from 'sonner'

const supabase = createClient()

export interface SyncAlert {
  id: string
  alert_type: 'SYSTEM_OFFLINE' | 'HIGH_LATENCY' | 'SYNC_ERRORS' | 'PENDING_BACKLOG' | 'CONFLICT_RESOLUTION' | 'BATTERY_LOW' | 'STORAGE_FULL'
  branch_id?: string
  pos_id?: string
  system_type?: string
  entity_type?: string
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  title: string
  message: string
  details: any
  created_at: string
  age_minutes: number
}

export class SyncNotificationService {
  private static instance: SyncNotificationService
  private subscription: any = null
  private audio: HTMLAudioElement | null = null

  private constructor() {
    // Create audio element for critical alerts
    if (typeof window !== 'undefined') {
      this.audio = new Audio('/sounds/alert.mp3')
      this.audio.volume = 0.3
    }
  }

  public static getInstance(): SyncNotificationService {
    if (!SyncNotificationService.instance) {
      SyncNotificationService.instance = new SyncNotificationService()
    }
    return SyncNotificationService.instance
  }

  public async subscribeToAlerts() {
    if (this.subscription) {
      this.subscription.unsubscribe()
    }

    // Subscribe to new alerts
    this.subscription = supabase
      .channel('sync-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sync_alerts',
          filter: 'is_resolved=eq.false'
        },
        (payload: RealtimePostgresChangesPayload<SyncAlert>) => {
          try {
            this.handleNewAlert(payload.new as SyncAlert)
          } catch (e) {
            console.error('Invalid alert payload', e)
          }
        }
      )
      .subscribe()

    // Check for existing critical alerts every 30 seconds
    setInterval(() => {
      this.checkCriticalAlerts()
    }, 30000)

    // Initial check
    this.checkCriticalAlerts()
  }

  public unsubscribe() {
    if (this.subscription) {
      this.subscription.unsubscribe()
      this.subscription = null
    }
  }

  private handleNewAlert(alert: SyncAlert) {
    const severityConfig = {
      CRITICAL: {
        duration: 10000,
        className: 'bg-red-50 border-red-200 text-red-900',
        icon: '🚨',
        sound: true
      },
      WARNING: {
        duration: 8000,
        className: 'bg-yellow-50 border-yellow-200 text-yellow-900',
        icon: '⚠️',
        sound: false
      },
      INFO: {
        duration: 5000,
        className: 'bg-blue-50 border-blue-200 text-blue-900',
        icon: 'ℹ️',
        sound: false
      }
    }

    const config = severityConfig[alert.severity]

    // Show toast notification
    toast[alert.severity === 'CRITICAL' ? 'error' : 'warning'](
      <div className={config.className}>
        <div className="flex items-start space-x-3">
          <span className="text-2xl">{config.icon}</span>
          <div className="flex-1">
            <h4 className="font-semibold text-sm">{alert.title}</h4>
            <p className="text-sm mt-1">{alert.message}</p>
            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-600">
              <span>Hace {alert.age_minutes} minutos</span>
              {alert.branch_id && <span>Sucursal: {alert.branch_id}</span>}
              {alert.pos_id && <span>POS: {alert.pos_id}</span>}
            </div>
          </div>
        </div>
      </div>,
      {
        duration: config.duration,
        position: 'top-right',
        className: config.className
      }
    )

    // Play sound for critical alerts
    if (config.sound && this.audio) {
      this.audio.play().catch(() => {
        // Ignore audio play errors (user might have audio disabled)
      })
    }

    // Send browser notification if available
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`${config.icon} ${alert.title}`, {
        body: alert.message,
        icon: '/favicon.ico',
        tag: alert.id,
        requireInteraction: alert.severity === 'CRITICAL'
      })
    }
  }

  private async checkCriticalAlerts() {
    try {
      const { data: alerts, error } = await supabase
        .rpc('get_active_alerts', {
          p_severity: 'CRITICAL'
        })

      if (error) {
        console.error('Error checking critical alerts:', error)
        return
      }

      if (alerts && alerts.length > 0) {
        // Show summary notification
        toast.error(
          <div className="bg-red-50 border-red-200 text-red-900">
            <div className="flex items-center space-x-2">
              <span className="text-xl">🚨</span>
              <div>
                <h4 className="font-semibold">Alertas Críticas Activas</h4>
                <p className="text-sm">Hay {alerts.length} alertas críticas que requieren atención inmediata</p>
              </div>
            </div>
          </div>,
          {
            duration: 8000,
            position: 'top-right'
          }
        )
      }
    } catch (error) {
      console.error('Error in checkCriticalAlerts:', error)
    }
  }

  public async requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }

  public async resolveAlert(alertId: string, resolvedBy?: string) {
    try {
      const { data, error } = await supabase
        .rpc('resolve_alert', {
          p_alert_id: alertId,
          p_resolved_by: resolvedBy
        })

      if (error) {
        console.error('Error resolving alert:', error)
        toast.error('Error al resolver la alerta')
        return false
      }

      if (data) {
        toast.success('Alerta resuelta exitosamente')
        return true
      }

      return false
    } catch (error) {
      console.error('Error resolving alert:', error)
      toast.error('Error al resolver la alerta')
      return false
    }
  }

  public async runHealthChecks() {
    try {
      const { data, error } = await supabase
        .rpc('run_all_health_checks')

      if (error) {
        console.error('Error running health checks:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error running health checks:', error)
      return null
    }
  }
}

// Hook for using the notification service
export function useSyncNotifications() {
  const notificationService = SyncNotificationService.getInstance()

  useEffect(() => {
    notificationService.subscribeToAlerts()
    notificationService.requestNotificationPermission()

    return () => {
      notificationService.unsubscribe()
    }
  }, [notificationService])

  return {
    resolveAlert: notificationService.resolveAlert.bind(notificationService),
    runHealthChecks: notificationService.runHealthChecks.bind(notificationService)
  }
}
