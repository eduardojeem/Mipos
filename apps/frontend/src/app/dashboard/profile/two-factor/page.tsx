'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { 
  ArrowLeft, 
  Shield, 
  Smartphone, 
  QrCode, 
  Copy, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Loader2,
  Key,
  Download
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface TwoFactorStatus {
  enabled: boolean
  backupCodes: string[]
  lastUsed?: string
  method: 'app' | 'sms' | null
}

export default function TwoFactorPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [twoFactorStatus, setTwoFactorStatus] = useState<TwoFactorStatus>({
    enabled: false,
    backupCodes: [],
    method: null
  })
  
  const [isLoading, setIsLoading] = useState(true)
  const [isEnabling, setIsEnabling] = useState(false)
  const [isDisabling, setIsDisabling] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [showSetup, setShowSetup] = useState(false)

  useEffect(() => {
    loadTwoFactorStatus()
  }, [])

  const loadTwoFactorStatus = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/auth/two-factor', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Error al cargar el estado del 2FA');
      }

      const result = await response.json();
      
      if (result.success) {
        setTwoFactorStatus(result.data);
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error loading 2FA status:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el estado del 2FA",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateQRCode = async () => {
    try {
      setIsEnabling(true);
      
      const response = await fetch('/api/auth/two-factor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'setup' }),
      });

      if (!response.ok) {
        throw new Error('Error al configurar 2FA');
      }

      const result = await response.json();
      
      if (result.success) {
        setQrCodeUrl(result.data.qrCodeUrl);
        setSecretKey(result.data.secret);
        setTwoFactorStatus(prev => ({
          ...prev,
          backupCodes: result.data.backupCodes
        }));
        setShowSetup(true);
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el código QR",
        variant: "destructive",
      });
    } finally {
      setIsEnabling(false);
    }
  };

  const enableTwoFactor = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Error",
        description: "Por favor ingresa un código de 6 dígitos",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsEnabling(true);
      
      const response = await fetch('/api/auth/two-factor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'verify',
          code: verificationCode 
        }),
      });

      if (!response.ok) {
        throw new Error('Error al verificar el código');
      }

      const result = await response.json();
      
      if (result.success) {
        setTwoFactorStatus(prev => ({
          ...prev,
          enabled: true,
          method: 'app',
          lastUsed: new Date().toISOString(),
          backupCodes: result.data.backupCodes
        }));
        setShowSetup(false);
        setVerificationCode('');
        
        toast({
          title: "¡Éxito!",
          description: result.message || "Autenticación de dos factores activada",
        });
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo activar la autenticación de dos factores",
        variant: "destructive",
      });
    } finally {
      setIsEnabling(false);
    }
  };

  const disableTwoFactor = async () => {
    try {
      setIsDisabling(true);
      
      const response = await fetch('/api/auth/two-factor', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Error al desactivar 2FA');
      }

      const result = await response.json();
      
      if (result.success) {
        setTwoFactorStatus({
          enabled: false,
          backupCodes: [],
          method: null
        });
        
        toast({
          title: "2FA Desactivado",
          description: result.message || "La autenticación de dos factores ha sido desactivada",
        });
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo desactivar la autenticación de dos factores",
        variant: "destructive",
      });
    } finally {
      setIsDisabling(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copiado",
      description: "Texto copiado al portapapeles",
    })
  }

  const downloadBackupCodes = () => {
    const codesText = twoFactorStatus.backupCodes.join('\n')
    const blob = new Blob([codesText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'backup-codes.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast({
      title: "Descarga iniciada",
      description: "Los códigos de respaldo se han descargado",
    })
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 max-w-2xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando configuración...</span>
        </div>
      </div>
    )
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
          <h1 className="text-2xl font-bold">Autenticación de Dos Factores</h1>
        </div>
        <p className="text-muted-foreground">
          Añade una capa extra de seguridad a tu cuenta
        </p>
      </div>

      {/* Estado Actual */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Estado Actual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {twoFactorStatus.enabled ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600" />
              )}
              <div>
                <p className="font-medium">
                  {twoFactorStatus.enabled ? 'Habilitado' : 'Deshabilitado'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {twoFactorStatus.enabled 
                    ? `Método: ${twoFactorStatus.method === 'app' ? 'Aplicación Autenticadora' : 'SMS'}`
                    : 'Tu cuenta no está protegida con 2FA'
                  }
                </p>
              </div>
            </div>
            
            <Badge variant={twoFactorStatus.enabled ? 'default' : 'secondary'}>
              {twoFactorStatus.enabled ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {!twoFactorStatus.enabled ? (
        // Configuración inicial
        <Tabs defaultValue="setup" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="setup">Configurar 2FA</TabsTrigger>
            <TabsTrigger value="info">Información</TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="space-y-6">
            {!showSetup ? (
              <Card>
                <CardHeader>
                  <CardTitle>Habilitar Autenticación de Dos Factores</CardTitle>
                  <CardDescription>
                    Protege tu cuenta con un código adicional desde tu teléfono
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Alert>
                      <Smartphone className="h-4 w-4" />
                      <AlertDescription>
                        Necesitarás una aplicación autenticadora como Google Authenticator, 
                        Authy o Microsoft Authenticator instalada en tu teléfono.
                      </AlertDescription>
                    </Alert>
                    
                    <Button onClick={generateQRCode} className="w-full">
                      <QrCode className="h-4 w-4 mr-2" />
                      Comenzar Configuración
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Paso 1: Escanea el Código QR</CardTitle>
                    <CardDescription>
                      Usa tu aplicación autenticadora para escanear este código
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Aquí iría el QR Code real */}
                      <div className="flex justify-center">
                        <div className="w-48 h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                          <QrCode className="h-16 w-16 text-gray-400" />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Clave secreta (si no puedes escanear)</Label>
                        <div className="flex gap-2">
                          <Input value={secretKey} readOnly />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(secretKey)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Paso 2: Verifica el Código</CardTitle>
                    <CardDescription>
                      Ingresa el código de 6 dígitos de tu aplicación
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="verification">Código de Verificación</Label>
                        <Input
                          id="verification"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="123456"
                          className="text-center text-lg tracking-widest"
                        />
                      </div>
                      
                      <div className="flex gap-3">
                        <Button
                          onClick={enableTwoFactor}
                          disabled={isEnabling || verificationCode.length !== 6}
                          className="flex-1"
                        >
                          {isEnabling ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Shield className="h-4 w-4 mr-2" />
                          )}
                          Habilitar 2FA
                        </Button>
                        
                        <Button
                          variant="outline"
                          onClick={() => setShowSetup(false)}
                          disabled={isEnabling}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>¿Qué es la Autenticación de Dos Factores?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    La autenticación de dos factores (2FA) añade una capa extra de seguridad 
                    a tu cuenta requiriendo un segundo factor además de tu contraseña.
                  </p>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium">Beneficios:</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Protección contra acceso no autorizado
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Seguridad adicional si tu contraseña es comprometida
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Códigos de respaldo para emergencias
                      </li>
                    </ul>
                  </div>
                  
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Importante:</strong> Guarda los códigos de respaldo en un lugar seguro. 
                      Los necesitarás si pierdes acceso a tu dispositivo.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        // Gestión de 2FA habilitado
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Códigos de Respaldo
              </CardTitle>
              <CardDescription>
                Usa estos códigos si no tienes acceso a tu dispositivo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 rounded-lg">
                  {twoFactorStatus.backupCodes.map((code, index) => (
                    <div key={index} className="font-mono text-sm text-center p-2 bg-white rounded border">
                      {code}
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={downloadBackupCodes}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar Códigos
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(twoFactorStatus.backupCodes.join('\n'))}
                    className="flex-1"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Todos
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Zona de Peligro</CardTitle>
              <CardDescription>
                Deshabilitar la autenticación de dos factores reducirá la seguridad de tu cuenta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={disableTwoFactor}
                disabled={isDisabling}
              >
                {isDisabling ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Deshabilitar 2FA
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}