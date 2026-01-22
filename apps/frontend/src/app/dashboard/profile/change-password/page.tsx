'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, Eye, EyeOff, Shield, CheckCircle, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface PasswordStrength {
  score: number
  feedback: string[]
  color: string
}

export default function ChangePasswordPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  // Validación de fortaleza de contraseña
  const checkPasswordStrength = (password: string): PasswordStrength => {
    let score = 0
    const feedback: string[] = []
    
    if (password.length >= 8) {
      score += 1
    } else {
      feedback.push('Mínimo 8 caracteres')
    }
    
    if (/[A-Z]/.test(password)) {
      score += 1
    } else {
      feedback.push('Al menos una mayúscula')
    }
    
    if (/[a-z]/.test(password)) {
      score += 1
    } else {
      feedback.push('Al menos una minúscula')
    }
    
    if (/\d/.test(password)) {
      score += 1
    } else {
      feedback.push('Al menos un número')
    }
    
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1
    } else {
      feedback.push('Al menos un carácter especial')
    }
    
    let color = 'bg-red-500'
    if (score >= 4) color = 'bg-green-500'
    else if (score >= 3) color = 'bg-yellow-500'
    else if (score >= 2) color = 'bg-orange-500'
    
    return { score, feedback, color }
  }

  const passwordStrength = checkPasswordStrength(formData.newPassword)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.currentPassword) {
      newErrors.currentPassword = 'La contraseña actual es requerida'
    }
    
    if (!formData.newPassword) {
      newErrors.newPassword = 'La nueva contraseña es requerida'
    } else if (passwordStrength.score < 3) {
      newErrors.newPassword = 'La contraseña no cumple con los requisitos mínimos'
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirma tu nueva contraseña'
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden'
    }
    
    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = 'La nueva contraseña debe ser diferente a la actual'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsLoading(true)
    
    try {
      // Aquí iría la llamada al API
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al cambiar la contraseña')
      }
      
      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido cambiada exitosamente",
      })
      
      // Limpiar formulario
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      
      // Redirigir después de un momento
      setTimeout(() => {
        router.push('/dashboard/profile')
      }, 2000)
      
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al cambiar la contraseña",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al Perfil
        </Button>
        
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Cambiar Contraseña</h1>
        </div>
        <p className="text-muted-foreground">
          Actualiza tu contraseña para mantener tu cuenta segura
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nueva Contraseña</CardTitle>
          <CardDescription>
            Asegúrate de usar una contraseña fuerte y única
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Contraseña Actual */}
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Contraseña Actual</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPasswords.current ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    currentPassword: e.target.value
                  }))}
                  className={errors.currentPassword ? 'border-red-500' : ''}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => togglePasswordVisibility('current')}
                >
                  {showPasswords.current ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.currentPassword && (
                <p className="text-sm text-red-500">{errors.currentPassword}</p>
              )}
            </div>

            {/* Nueva Contraseña */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nueva Contraseña</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPasswords.new ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    newPassword: e.target.value
                  }))}
                  className={errors.newPassword ? 'border-red-500' : ''}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => togglePasswordVisibility('new')}
                >
                  {showPasswords.new ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {/* Indicador de fortaleza */}
              {formData.newPassword && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${passwordStrength.color}`}
                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                      />
                    </div>
                    <Badge variant={passwordStrength.score >= 4 ? 'default' : 'secondary'}>
                      {passwordStrength.score >= 4 ? 'Fuerte' : 
                       passwordStrength.score >= 3 ? 'Media' : 'Débil'}
                    </Badge>
                  </div>
                  
                  {passwordStrength.feedback.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium mb-1">Requisitos:</p>
                      <ul className="space-y-1">
                        {passwordStrength.feedback.map((item, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <XCircle className="h-3 w-3 text-red-500" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              
              {errors.newPassword && (
                <p className="text-sm text-red-500">{errors.newPassword}</p>
              )}
            </div>

            {/* Confirmar Contraseña */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    confirmPassword: e.target.value
                  }))}
                  className={errors.confirmPassword ? 'border-red-500' : ''}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => togglePasswordVisibility('confirm')}
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {formData.confirmPassword && formData.newPassword === formData.confirmPassword && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Las contraseñas coinciden
                </div>
              )}
              
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Consejos de Seguridad */}
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Consejos de seguridad:</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• Usa una combinación de letras, números y símbolos</li>
                  <li>• Evita información personal como nombres o fechas</li>
                  <li>• No reutilices contraseñas de otras cuentas</li>
                  <li>• Considera usar un gestor de contraseñas</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isLoading || passwordStrength.score < 3}
                className="flex-1"
              >
                {isLoading ? 'Cambiando...' : 'Cambiar Contraseña'}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}