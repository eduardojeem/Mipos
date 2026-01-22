import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  AlertTriangle, 
  CheckCircle, 
  User, 
  DollarSign, 
  Percent,
  Clock,
  Shield,
  XCircle
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext'

export interface DiscountApprovalData {
  originalPrice: number
  discountAmount: number
  discountPercent: number
  finalPrice: number
  reason?: string
  approverNote?: string
}

export interface DiscountApprovalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: DiscountApprovalData
  onApprove: (note?: string) => void
  onReject: (reason?: string) => void
  onCancel: () => void
  productName?: string
  productSku?: string
  timeLimit?: number // Tiempo límite en segundos
  approverRoles?: string[]
}

export default function DiscountApprovalModal({
  open,
  onOpenChange,
  data,
  onApprove,
  onReject,
  onCancel,
  productName,
  productSku,
  timeLimit = 300, // 5 minutos por defecto
  approverRoles = ['ADMIN', 'SUPER_ADMIN', 'MANAGER']
}: DiscountApprovalModalProps) {
  const { user } = useAuth()
  const formatCurrency = useCurrencyFormatter()
  const [timeRemaining, setTimeRemaining] = useState(timeLimit)
  const [approverNote, setApproverNote] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [isRejecting, setIsRejecting] = useState(false)

  // Timer para el límite de tiempo
  useEffect(() => {
    if (!open) return

    setTimeRemaining(timeLimit)
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Auto-cancelar cuando se acaba el tiempo
          onCancel()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [open, timeLimit, onCancel])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleApprove = () => {
    onApprove(approverNote.trim() || undefined)
    onOpenChange(false)
  }

  const handleReject = () => {
    if (!rejectReason.trim()) {
      return
    }
    onReject(rejectReason.trim())
    onOpenChange(false)
  }

  const handleCancel = () => {
    onCancel()
    onOpenChange(false)
  }

  const startRejection = () => {
    setIsRejecting(true)
  }

  const cancelRejection = () => {
    setIsRejecting(false)
    setRejectReason('')
  }

  const canApprove = user && approverRoles.includes(user.role || '')

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            Aprobación de Descuento Requerida
          </DialogTitle>
          <DialogDescription>
            Un descuento requiere su aprobación antes de ser aplicado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Timer */}
          <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-800">
                Tiempo restante:
              </span>
            </div>
            <Badge variant="destructive" className={timeRemaining <= 60 ? 'animate-pulse' : ''}>
              {formatTime(timeRemaining)}
            </Badge>
          </div>

          {/* Información del producto */}
          {(productName || productSku) && (
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Producto</h4>
              {productName && <p className="text-sm">{productName}</p>}
              {productSku && <p className="text-sm text-muted-foreground">SKU: {productSku}</p>}
            </div>
          )}

          {/* Detalles del descuento */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Precio original:</span>
              </div>
              <span className="text-sm font-bold text-blue-900">
                {formatCurrency(data.originalPrice)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">Descuento:</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-red-900">
                  -{formatCurrency(data.discountAmount)}
                </div>
                <div className="text-xs text-red-700">
                  ({data.discountPercent.toFixed(1)}%)
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Precio final:</span>
              </div>
              <span className="text-sm font-bold text-green-900">
                {formatCurrency(data.finalPrice)}
              </span>
            </div>
          </div>

          {/* Razón del descuento */}
          {data.reason && (
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                Razón del descuento:
              </h4>
              <p className="text-sm text-yellow-800">{data.reason}</p>
            </div>
          )}

          {/* Alerta de permisos */}
          {!canApprove && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Su rol actual no tiene permisos para aprobar descuentos. 
                Los roles autorizados son: {approverRoles.join(', ')}
              </AlertDescription>
            </Alert>
          )}

          {/* Formulario de aprobación/rechazo */}
          {isRejecting ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="rejectReason">Motivo del rechazo</Label>
                <Textarea
                  id="rejectReason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explique por qué rechaza este descuento..."
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cancelRejection}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleReject}
                  disabled={!rejectReason.trim()}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rechazar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="approverNote">Nota del aprobador (opcional)</Label>
                <Textarea
                  id="approverNote"
                  value={approverNote}
                  onChange={(e) => setApproverNote(e.target.value)}
                  placeholder="Agregue una nota sobre la aprobación..."
                  rows={2}
                  className="mt-1"
                  disabled={!canApprove}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {!isRejecting && (
            <Button
              variant="outline"
              onClick={startRejection}
              disabled={!canApprove || timeRemaining <= 0}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rechazar
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleCancel}
          >
            Cancelar
          </Button>
          {!isRejecting && (
            <Button
              onClick={handleApprove}
              disabled={!canApprove || timeRemaining <= 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Aprobar descuento
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}