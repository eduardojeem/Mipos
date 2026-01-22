'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Tag, FileText } from 'lucide-react';
import { BusinessConfig } from '@/types/business-config';
import { useConfigValidation } from '../hooks/useConfigValidation';

interface BusinessInfoFormProps {
  config: BusinessConfig;
  onUpdate: (updates: Partial<BusinessConfig>) => void;
}

export function BusinessInfoForm({ config, onUpdate }: BusinessInfoFormProps) {
  const { getFieldError } = useConfigValidation();

  const handleChange = (field: keyof BusinessConfig, value: string) => {
    onUpdate({ [field]: value });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Información Básica del Negocio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Nombre del Negocio *</Label>
              <Input
                id="businessName"
                value={config.businessName}
                onChange={(e) => handleChange('businessName', e.target.value)}
                placeholder="Mi Negocio Paraguay"
                className={getFieldError('businessName') ? 'border-red-500' : ''}
              />
              {getFieldError('businessName') && (
                <p className="text-sm text-red-500">{getFieldError('businessName')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Eslogan</Label>
              <Input
                id="tagline"
                value={config.tagline}
                onChange={(e) => handleChange('tagline', e.target.value)}
                placeholder="Calidad y servicio de excelencia"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="heroTitle">Título Principal *</Label>
            <Input
              id="heroTitle"
              value={config.heroTitle}
              onChange={(e) => handleChange('heroTitle', e.target.value)}
              placeholder="Bienvenidos a"
              className={getFieldError('heroTitle') ? 'border-red-500' : ''}
            />
            {getFieldError('heroTitle') && (
              <p className="text-sm text-red-500">{getFieldError('heroTitle')}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="heroHighlight">Texto Destacado</Label>
            <Input
              id="heroHighlight"
              value={config.heroHighlight}
              onChange={(e) => handleChange('heroHighlight', e.target.value)}
              placeholder="nuestro negocio"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="heroDescription">Descripción Principal</Label>
            <Textarea
              id="heroDescription"
              value={config.heroDescription}
              onChange={(e) => handleChange('heroDescription', e.target.value)}
              placeholder="Ofrecemos productos y servicios de la más alta calidad..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Horarios de Atención
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {config.businessHours.map((hour, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={hour}
                  onChange={(e) => {
                    const newHours = [...config.businessHours];
                    newHours[index] = e.target.value;
                    onUpdate({ businessHours: newHours });
                  }}
                  placeholder="Lunes - Viernes: 8:00 - 18:00"
                />
                {config.businessHours.length > 1 && (
                  <button
                    onClick={() => {
                      const newHours = config.businessHours.filter((_, i) => i !== index);
                      onUpdate({ businessHours: newHours });
                    }}
                    className="text-red-500 hover:text-red-700 px-2"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => {
                const newHours = [...config.businessHours, ''];
                onUpdate({ businessHours: newHours });
              }}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              + Agregar horario
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documentos Legales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="termsUrl">URL Términos y Condiciones</Label>
              <Input
                id="termsUrl"
                value={config.legalDocuments?.termsUrl || ''}
                onChange={(e) => onUpdate({ 
                  legalDocuments: { 
                    ...config.legalDocuments, 
                    termsUrl: e.target.value 
                  } 
                })}
                placeholder="https://minegocio.com.py/terminos"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="privacyUrl">URL Política de Privacidad</Label>
              <Input
                id="privacyUrl"
                value={config.legalDocuments?.privacyUrl || ''}
                onChange={(e) => onUpdate({ 
                  legalDocuments: { 
                    ...config.legalDocuments, 
                    privacyUrl: e.target.value 
                  } 
                })}
                placeholder="https://minegocio.com.py/privacidad"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}