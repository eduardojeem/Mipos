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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Quién eres
          </CardTitle>
          <CardDescription>
            Nombre de la empresa y propuesta de valor que verán los clientes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Nombre base */}
          <div className="space-y-3 border-b pb-6">
            <h4 className="text-sm font-semibold text-foreground">Nombre del negocio</h4>
            <div className="space-y-2">
              <Label htmlFor="businessName">Nombre visible *</Label>
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
              <p className="text-xs text-muted-foreground">
                Aparece en header, footer y metadatos de SEO
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline (subtítulo)</Label>
              <Input
                id="tagline"
                value={config.tagline}
                onChange={(event) => handleChange('tagline', event.target.value)}
                placeholder="Calidad y servicio de excelencia"
              />
              <p className="text-xs text-muted-foreground">
                Frase corta que describe tu propuesta de valor
              </p>
            </div>
          </div>

          {/* Hero section */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Mensaje principal (Hero)</h4>
            <p className="text-xs text-muted-foreground">
              Este es el contenido destacado que ven los clientes al entrar a tu página.
            </p>

            <div className="space-y-2">
              <Label htmlFor="heroTitle">Título principal *</Label>
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
              <p className="text-xs text-muted-foreground">
                Primera línea que ve el cliente (ej: "Bienvenidos a", "Descubre", "Explora")
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="heroHighlight">Texto destacado (en negrita)</Label>
              <Input
                id="heroHighlight"
                value={config.heroHighlight}
                onChange={(event) => handleChange('heroHighlight', event.target.value)}
                placeholder="nuestro negocio"
              />
              <p className="text-xs text-muted-foreground">
                Se muestra en negrita junto al título (ej: "nuestro negocio", "tu tienda online")
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="heroDescription">Descripción comercial *</Label>
              <Textarea
                id="heroDescription"
                value={config.heroDescription}
                onChange={(event) => handleChange('heroDescription', event.target.value)}
                placeholder="Describe en una frase clara qué vende el negocio y por qué deberían comprar aquí."
                rows={3}
                className={getFieldError('heroDescription') ? 'border-red-500' : ''}
              />
              {getFieldError('heroDescription') && (
                <p className="text-sm text-red-500">{getFieldError('heroDescription')}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Bajo el título y highlight. Máximo 2-3 líneas que atraigan al cliente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock3 className="h-5 w-5" />
            Horarios de atención
          </CardTitle>
          <CardDescription>
            Se muestran en home, footer y sección de contacto cuando están habilitados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {config.businessHours.map((hour, index) => (
              <div key={index} className="flex items-end gap-2">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground mb-1 block">Horario {index + 1}</Label>
                  <Input
                    value={hour}
                    onChange={(event) => updateBusinessHour(index, event.target.value)}
                    placeholder="Lunes a Viernes: 08:00 - 18:00"
                    className="text-sm"
                  />
                </div>
                {config.businessHours.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0 h-10 w-10"
                    onClick={() => removeBusinessHour(index)}
                    title="Eliminar horario"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            className="gap-2 w-full"
            onClick={addBusinessHour}
          >
            <Plus className="h-4 w-4" />
            Agregar horario
          </Button>

          <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/20">
            <p className="text-xs text-blue-900 dark:text-blue-200">
              <span className="font-medium">Ejemplos:</span> "Lunes a Viernes: 09:00 - 18:00" o "Sábado: 09:00 - 14:00"
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
