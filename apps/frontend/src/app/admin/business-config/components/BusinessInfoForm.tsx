'use client';

import { Building2, Clock3, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import type { BusinessConfig } from '@/types/business-config';
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

  const updateBusinessHour = (index: number, value: string) => {
    const nextHours = [...config.businessHours];
    nextHours[index] = value;
    onUpdate({ businessHours: nextHours });
  };

  const removeBusinessHour = (index: number) => {
    onUpdate({ businessHours: config.businessHours.filter((_, itemIndex) => itemIndex !== index) });
  };

  const addBusinessHour = () => {
    onUpdate({ businessHours: [...config.businessHours, ''] });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Identidad comercial
          </CardTitle>
          <CardDescription>
            Nombre visible, promesa principal y mensaje corto para la parte publica del negocio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="businessName">Nombre del negocio *</Label>
              <Input
                id="businessName"
                value={config.businessName}
                onChange={(event) => handleChange('businessName', event.target.value)}
                placeholder="Mi Negocio Paraguay"
                className={getFieldError('businessName') ? 'border-red-500' : ''}
              />
              {getFieldError('businessName') && (
                <p className="text-sm text-red-500">{getFieldError('businessName')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={config.tagline}
                onChange={(event) => handleChange('tagline', event.target.value)}
                placeholder="Calidad y servicio de excelencia"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="heroTitle">Titulo principal *</Label>
            <Input
              id="heroTitle"
              value={config.heroTitle}
              onChange={(event) => handleChange('heroTitle', event.target.value)}
              placeholder="Bienvenidos a"
              className={getFieldError('heroTitle') ? 'border-red-500' : ''}
            />
            {getFieldError('heroTitle') && (
              <p className="text-sm text-red-500">{getFieldError('heroTitle')}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="heroHighlight">Texto destacado</Label>
            <Input
              id="heroHighlight"
              value={config.heroHighlight}
              onChange={(event) => handleChange('heroHighlight', event.target.value)}
              placeholder="nuestro negocio"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="heroDescription">Descripcion principal</Label>
            <Textarea
              id="heroDescription"
              value={config.heroDescription}
              onChange={(event) => handleChange('heroDescription', event.target.value)}
              placeholder="Describe en una frase clara que vende el negocio y por que deberian comprar aqui."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock3 className="h-5 w-5" />
            Horarios publicados
          </CardTitle>
          <CardDescription>
            Estos horarios se usan en home, footer y contacto cuando el modulo esta visible.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {config.businessHours.map((hour, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={hour}
                onChange={(event) => updateBusinessHour(index, event.target.value)}
                placeholder="Lunes a Viernes: 08:00 a 18:00"
              />
              {config.businessHours.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => removeBusinessHour(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}

          <Button type="button" variant="outline" className="gap-2" onClick={addBusinessHour}>
            <Plus className="h-4 w-4" />
            Agregar horario
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
