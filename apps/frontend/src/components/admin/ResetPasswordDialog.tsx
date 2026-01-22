'use client'

import React, { useState } from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'
import { RefreshCw, Key, Mail, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface User {
  id: string
  email: string
  fullName: string
}

interface ResetPasswordDialogProps {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export default function ResetPasswordDialog({
  user,
  open,
  onOpenChange,
  onSuccess
}: ResetPasswordDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sendEmail, setSendEmail] = useState(true)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [requireChange, setRequireChange] = useState(true)
  const { toast } = useToast()

  const handleReset = () => {
    setNewPassword('')
    setConfirmPassword('')
    setSendEmail(true)
    setRequireChange(true)
  }

  const handleSubmit = async () => {
    if (!user) return

    try {
      setIsSubmitting(true)

      // Validaciones
      if (!sendEmail) {
        if (!newPassword || !confirmPassword) {
          toast({
            title: 'Error de validación',
            description: 'Debes ingresar la nueva contraseña',
            variant: 'destructive'
          })
          return
        }

        if (newPassword.length < 8) {
          toast({
            title: 'Contraseña muy corta',
            description: 'La contraseña debe tener al menos 8 caracteres',
            variant: 'destructive'
          })
          return
        }

        if (newPassword !== confirmPassword) {
          toast({
            title: 'No coinciden',
            description: 'Las contraseñas no coinciden',
            variant: 'destructive'
          })
          return
        }
      }

      // Simular llamada a la API
      await new Promise(resolve => setTimeout(resolve, 1500))

      if (sendEmail) {
        toast({
          title: 'Email enviado',
          description: `Se ha enviado un email a ${user.email} con instrucciones para restablecer la contraseña`
        })
      } else {
        toast({
          title: 'Contraseña actualizada',
          description: `La contraseña de ${user.fullName} ha sido actualizada correctamente`
        })
      }

      handleReset()
      onOpenChange(false)
      onSuccess?.()

    } catch (error) {
      console.error('Error resetting password:', error)
      toast({
        title: 'Error',
        description: 'No se pudo restablecer la contraseña',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) handleReset()
      onOpenChange(open)
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Restablecer Contraseña
          </DialogTitle>
          <DialogDescription>
            Restablece la contraseña para {user.fullName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Opción de enviar email */}
          <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
            <Checkbox
              id="sendEmail"
              checked={sendEmail}
              onCheckedChange={(checked) => setSendEmail(!!checked)}
            />
            <Label htmlFor="sendEmail" className="text-sm cursor-pointer">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>Enviar email de restablecimiento</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                El usuario recibirá un enlace para crear una nueva contraseña
              </p>
            </Label>
          </div>

          {/* Formulario de contraseña manual */}
          {!sendEmail && (
            <>
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription className="text-sm">
                  Establece una contraseña temporal. El usuario podrá cambiarla después.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nueva contraseña *</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requireChange"
                  checked={requireChange}
                  onCheckedChange={(checked) => setRequireChange(!!checked)}
                />
                <Label htmlFor="requireChange" className="text-sm">
                  Requerir cambio de contraseña en el próximo inicio de sesión
                </Label>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              handleReset()
              onOpenChange(false)
            }}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
            {sendEmail ? 'Enviar Email' : 'Actualizar Contraseña'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
