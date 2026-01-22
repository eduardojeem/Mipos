'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Scale, Building } from 'lucide-react';
import { BusinessConfig } from '@/types/business-config';
import { useConfigValidation } from '../hooks/useConfigValidation';

interface LegalInfoFormProps {
  config: BusinessConfig;
  onUpdate: (updates: Partial<BusinessConfig>) => void;
}

export function LegalInfoForm({ config, onUpdate }: LegalInfoFormProps) {
  const { getFieldError } = useConfigValidation();

  const handleLegalInfoChange = (field: keyof BusinessConfig['legalInfo'], value: string) => {
    onUpdate({
      legalInfo: {
        ...config.legalInfo,
        [field]: value
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Información Legal y Fiscal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ruc">RUC (Registro Único del Contribuyente)</Label>
              <Input
                id="ruc"
                value={config.legalInfo.ruc || ''}
                onChange={(e) => handleLegalInfoChange('ruc', e.target.value)}
                placeholder="12345678-9"
                className={getFieldError('legalInfo.ruc') ? 'border-red-500' : ''}
              />
              {getFieldError('legalInfo.ruc') && (
                <p className="text-sm text-red-500">{getFieldError('legalInfo.ruc')}</p>
              )}
              <p className="text-xs text-gray-500">Formato: 12345678-9</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessType">Tipo de Empresa *</Label>
              <Select
                value={config.legalInfo.businessType}
                onValueChange={(value) => handleLegalInfoChange('businessType', value)}
              >
                <SelectTrigger className={getFieldError('legalInfo.businessType') ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Empresa Individual">Empresa Individual</SelectItem>
                  <SelectItem value="S.A.">Sociedad Anónima (S.A.)</SelectItem>
                  <SelectItem value="S.R.L.">Sociedad de Responsabilidad Limitada (S.R.L.)</SelectItem>
                  <SelectItem value="S.C.A.">Sociedad en Comandita por Acciones (S.C.A.)</SelectItem>
                  <SelectItem value="S.C.S.">Sociedad en Comandita Simple (S.C.S.)</SelectItem>
                  <SelectItem value="S.C.">Sociedad Colectiva (S.C.)</SelectItem>
                  <SelectItem value="Cooperativa">Cooperativa</SelectItem>
                  <SelectItem value="Fundación">Fundación</SelectItem>
                  <SelectItem value="Asociación">Asociación</SelectItem>
                </SelectContent>
              </Select>
              {getFieldError('legalInfo.businessType') && (
                <p className="text-sm text-red-500">{getFieldError('legalInfo.businessType')}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="taxRegime">Régimen Tributario</Label>
              <Select
                value={config.legalInfo.taxRegime}
                onValueChange={(value) => handleLegalInfoChange('taxRegime', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar régimen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Régimen General">Régimen General</SelectItem>
                  <SelectItem value="Régimen Simplificado">Régimen Simplificado</SelectItem>
                  <SelectItem value="Pequeño Contribuyente">Pequeño Contribuyente</SelectItem>
                  <SelectItem value="Régimen Especial">Régimen Especial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="registrationNumber">Número de Registro Mercantil</Label>
              <Input
                id="registrationNumber"
                value={config.legalInfo.registrationNumber || ''}
                onChange={(e) => handleLegalInfoChange('registrationNumber', e.target.value)}
                placeholder="123456"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="economicActivity">Actividad Económica Principal</Label>
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
                <SelectItem value="Restaurante y alimentación">Restaurante y alimentación</SelectItem>
                <SelectItem value="Servicios de salud">Servicios de salud</SelectItem>
                <SelectItem value="Educación">Educación</SelectItem>
                <SelectItem value="Construcción">Construcción</SelectItem>
                <SelectItem value="Transporte">Transporte</SelectItem>
                <SelectItem value="Tecnología">Tecnología</SelectItem>
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
            Configuración Regional
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">Zona Horaria</Label>
              <Select
                value={config.regional.timezone}
                onValueChange={(value) => onUpdate({
                  regional: { ...config.regional, timezone: value }
                })}
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
                onValueChange={(value) => onUpdate({
                  regional: { ...config.regional, language: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es-PY">Español (Paraguay)</SelectItem>
                  <SelectItem value="es-AR">Español (Argentina)</SelectItem>
                  <SelectItem value="es-ES">Español (España)</SelectItem>
                  <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                  <SelectItem value="en-US">English (US)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateFormat">Formato de Fecha</Label>
              <Select
                value={config.regional.dateFormat}
                onValueChange={(value) => onUpdate({
                  regional: { ...config.regional, dateFormat: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dd/MM/yyyy">dd/MM/yyyy (31/12/2024)</SelectItem>
                  <SelectItem value="MM/dd/yyyy">MM/dd/yyyy (12/31/2024)</SelectItem>
                  <SelectItem value="yyyy-MM-dd">yyyy-MM-dd (2024-12-31)</SelectItem>
                  <SelectItem value="dd-MM-yyyy">dd-MM-yyyy (31-12-2024)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeFormat">Formato de Hora</Label>
              <Select
                value={config.regional.timeFormat}
                onValueChange={(value) => onUpdate({
                  regional: { ...config.regional, timeFormat: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HH:mm">24 horas (14:30)</SelectItem>
                  <SelectItem value="hh:mm a">12 horas (2:30 PM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}