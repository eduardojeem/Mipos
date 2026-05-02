'use client'

import { Building, FileText, Scale } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { BusinessConfig } from '@/types/business-config'
import { useConfigValidation } from '../hooks/useConfigValidation'

interface LegalInfoFormProps {
  config: BusinessConfig
  onUpdate: (updates: Partial<BusinessConfig>) => void
}

export function LegalInfoForm({ config, onUpdate }: LegalInfoFormProps) {
  const { getFieldError } = useConfigValidation()

  const handleLegalInfoChange = (field: keyof BusinessConfig['legalInfo'], value: string) => {
    onUpdate({
      legalInfo: {
        ...config.legalInfo,
        [field]: value,
      },
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Datos fiscales
          </CardTitle>
          <CardDescription>
            Informacion legal visible en facturacion, perfil publico y documentos del negocio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ruc">RUC</Label>
              <Input
                id="ruc"
                value={config.legalInfo.ruc || ''}
                onChange={(event) => handleLegalInfoChange('ruc', event.target.value)}
                placeholder="12345678-9"
                className={getFieldError('legalInfo.ruc') ? 'border-red-500' : ''}
              />
              {getFieldError('legalInfo.ruc') && (
                <p className="text-sm text-red-500">{getFieldError('legalInfo.ruc')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessType">Tipo de empresa *</Label>
              <Select
                value={config.legalInfo.businessType}
                onValueChange={(value) => handleLegalInfoChange('businessType', value)}
              >
                <SelectTrigger className={getFieldError('legalInfo.businessType') ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Empresa Individual">Empresa individual</SelectItem>
                  <SelectItem value="S.A.">Sociedad anonima (S.A.)</SelectItem>
                  <SelectItem value="S.R.L.">Sociedad de responsabilidad limitada (S.R.L.)</SelectItem>
                  <SelectItem value="S.C.A.">Sociedad en comandita por acciones (S.C.A.)</SelectItem>
                  <SelectItem value="S.C.S.">Sociedad en comandita simple (S.C.S.)</SelectItem>
                  <SelectItem value="S.C.">Sociedad colectiva (S.C.)</SelectItem>
                  <SelectItem value="Cooperativa">Cooperativa</SelectItem>
                  <SelectItem value="Fundacion">Fundacion</SelectItem>
                  <SelectItem value="Asociacion">Asociacion</SelectItem>
                </SelectContent>
              </Select>
              {getFieldError('legalInfo.businessType') && (
                <p className="text-sm text-red-500">{getFieldError('legalInfo.businessType')}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="taxRegime">Regimen tributario</Label>
              <Select
                value={config.legalInfo.taxRegime}
                onValueChange={(value) => handleLegalInfoChange('taxRegime', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar regimen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Regimen General">Regimen general</SelectItem>
                  <SelectItem value="Regimen Simplificado">Regimen simplificado</SelectItem>
                  <SelectItem value="Pequeno Contribuyente">Pequeno contribuyente</SelectItem>
                  <SelectItem value="Regimen Especial">Regimen especial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="registrationNumber">Registro mercantil</Label>
              <Input
                id="registrationNumber"
                value={config.legalInfo.registrationNumber || ''}
                onChange={(event) => handleLegalInfoChange('registrationNumber', event.target.value)}
                placeholder="123456"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="economicActivity">Actividad economica principal</Label>
            <Select
              value={config.legalInfo.economicActivity}
              onValueChange={(value) => handleLegalInfoChange('economicActivity', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar actividad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Comercio al por menor">Comercio al por menor</SelectItem>
                <SelectItem value="Comercio al por mayor">Comercio al por mayor</SelectItem>
                <SelectItem value="Servicios profesionales">Servicios profesionales</SelectItem>
                <SelectItem value="Servicios de belleza">Servicios de belleza</SelectItem>
                <SelectItem value="Restaurante y alimentacion">Restaurante y alimentacion</SelectItem>
                <SelectItem value="Servicios de salud">Servicios de salud</SelectItem>
                <SelectItem value="Educacion">Educacion</SelectItem>
                <SelectItem value="Construccion">Construccion</SelectItem>
                <SelectItem value="Transporte">Transporte</SelectItem>
                <SelectItem value="Tecnologia">Tecnologia</SelectItem>
                <SelectItem value="Manufactura">Manufactura</SelectItem>
                <SelectItem value="Agricultura">Agricultura</SelectItem>
                <SelectItem value="Turismo">Turismo</SelectItem>
                <SelectItem value="Inmobiliaria">Inmobiliaria</SelectItem>
                <SelectItem value="Financiera">Financiera</SelectItem>
                <SelectItem value="Otros">Otros</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Configuracion regional
          </CardTitle>
          <CardDescription>
            Zona horaria e idioma base para salidas publicas y mensajes del negocio.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="timezone">Zona horaria</Label>
            <Select
              value={config.regional.timezone}
              onValueChange={(value) =>
                onUpdate({
                  regional: { ...config.regional, timezone: value },
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="America/Asuncion">America/Asuncion (Paraguay)</SelectItem>
                <SelectItem value="America/Argentina/Buenos_Aires">America/Buenos_Aires (Argentina)</SelectItem>
                <SelectItem value="America/Sao_Paulo">America/Sao_Paulo (Brasil)</SelectItem>
                <SelectItem value="America/Santiago">America/Santiago (Chile)</SelectItem>
                <SelectItem value="America/La_Paz">America/La_Paz (Bolivia)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Idioma</Label>
            <Select
              value={config.regional.language}
              onValueChange={(value) =>
                onUpdate({
                  regional: { ...config.regional, language: value },
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es-PY">Espanol (Paraguay)</SelectItem>
                <SelectItem value="es-AR">Espanol (Argentina)</SelectItem>
                <SelectItem value="es-ES">Espanol (Espana)</SelectItem>
                <SelectItem value="pt-BR">Portugues (Brasil)</SelectItem>
                <SelectItem value="en-US">English (US)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documentos publicos
          </CardTitle>
          <CardDescription>
            Enlaces a terminos y privacidad para una salida publica mas completa.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="termsUrl">URL de terminos y condiciones</Label>
            <Input
              id="termsUrl"
              value={config.legalDocuments?.termsUrl || ''}
              onChange={(event) =>
                onUpdate({
                  legalDocuments: {
                    ...config.legalDocuments,
                    termsUrl: event.target.value,
                  },
                })
              }
              placeholder="https://minegocio.com.py/terminos"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="privacyUrl">URL de politica de privacidad</Label>
            <Input
              id="privacyUrl"
              value={config.legalDocuments?.privacyUrl || ''}
              onChange={(event) =>
                onUpdate({
                  legalDocuments: {
                    ...config.legalDocuments,
                    privacyUrl: event.target.value,
                  },
                })
              }
              placeholder="https://minegocio.com.py/privacidad"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
