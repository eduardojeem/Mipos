'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { 
  Globe, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Settings,
  Sparkles,
  Info,
  ExternalLink
} from 'lucide-react';

interface SystemSettingsProps {
  onUpdate?: () => void;
}

export function SystemSettings({ onUpdate }: SystemSettingsProps) {
  const { toast } = useToast();
  
  const [baseDomain, setBaseDomain] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Cargar configuración actual
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/superadmin/system-settings');
      if (response.ok) {
        const data = await response.json();
        setBaseDomain(data.baseDomain || '');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validar dominio base
    if (!baseDomain || baseDomain.trim() === '') {
      toast({
        title: 'Error',
        description: 'El dominio base es requerido',
        variant: 'destructive',
      });
      return;
    }

    // Validar formato de dominio
    const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i;
    if (!domainRegex.test(baseDomain)) {
      toast({
        title: 'Error',
        description: 'El formato del dominio no es válido. Ejemplo: miposparaguay.vercel.app',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/superadmin/system-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseDomain: baseDomain.toLowerCase().trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al actualizar configuración');
      }

      toast({
        title: '✅ Configuración actualizada',
        description: 'El dominio base del sistema se actualizó correctamente',
      });

      onUpdate?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar la configuración',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="h-6 w-6 text-purple-600" />
            Configuración del Sistema SaaS
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Configura el dominio base para el sistema multitenancy
          </p>
        </div>
        <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-none">
          <Sparkles className="h-3 w-3 mr-1" />
          Super Admin
        </Badge>
      </div>

      {/* Información importante */}
      <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
          <strong>Importante:</strong> Este dominio base se usará para construir los subdominios de cada organización.
          Por ejemplo, si configuras <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">miposparaguay.vercel.app</code>,
          las organizaciones tendrán URLs como <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">tienda1.miposparaguay.vercel.app</code>
        </AlertDescription>
      </Alert>

      {/* Formulario de Configuración */}
      <Card className="border-2 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5 text-purple-600" />
            Dominio Base del Sistema
          </CardTitle>
          <CardDescription>
            Dominio principal donde está desplegada tu aplicación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="baseDomain" className="text-sm font-medium">
              Dominio Base *
            </Label>
            <div className="relative">
              <Input
                id="baseDomain"
                value={baseDomain}
                onChange={(e) => setBaseDomain(e.target.value.toLowerCase())}
                placeholder="miposparaguay.vercel.app"
                className="pl-10 font-mono"
              />
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            </div>
            <p className="text-xs text-slate-500">
              No incluyas <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">http://</code> o <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">https://</code>
            </p>
          </div>

          {/* Preview de cómo se verán los subdominios */}
          {baseDomain && (
            <div className="mt-4 p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg border-2 border-purple-200 dark:border-purple-800">
              <p className="text-xs font-medium text-purple-900 dark:text-purple-100 mb-2 uppercase tracking-wider">
                Vista Previa de Subdominios
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-purple-600" />
                  <code className="font-mono text-purple-700 dark:text-purple-300">
                    organizacion1.{baseDomain}
                  </code>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-purple-600" />
                  <code className="font-mono text-purple-700 dark:text-purple-300">
                    organizacion2.{baseDomain}
                  </code>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-purple-600" />
                  <code className="font-mono text-purple-700 dark:text-purple-300">
                    tienda-ejemplo.{baseDomain}
                  </code>
                </div>
              </div>
            </div>
          )}

          <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-xs text-amber-900 dark:text-amber-100">
              <strong>Configuración DNS requerida:</strong> Para que los subdominios funcionen, 
              debes configurar un registro DNS wildcard (*.{baseDomain || 'tudominio.com'}) 
              apuntando a tu servidor.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Botón de Guardar */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Los cambios se aplicarán inmediatamente a todo el sistema
        </p>
        <Button
          onClick={handleSave}
          disabled={saving || !baseDomain}
          className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              Guardar Configuración
            </>
          )}
        </Button>
      </div>

      {/* Guía de configuración */}
      <Card className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4" />
            Guía de Configuración
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
          <div>
            <h4 className="font-medium text-slate-900 dark:text-white mb-2">
              1. Configuración en Vercel
            </h4>
            <p className="text-xs mb-2">
              Si estás usando Vercel, los subdominios wildcard funcionan automáticamente. 
              Solo necesitas configurar el dominio base en tu proyecto.
            </p>
            <div className="flex items-center gap-2 text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded">
              <code>*.miposparaguay.vercel.app</code>
              <Badge variant="secondary" className="text-xs">Auto-configurado</Badge>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-slate-900 dark:text-white mb-2">
              2. Configuración DNS para Dominio Personalizado
            </h4>
            <p className="text-xs mb-2">
              Si usas un dominio personalizado, agrega estos registros DNS:
            </p>
            <div className="space-y-1 text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded font-mono">
              <div>Tipo: <strong>CNAME</strong></div>
              <div>Nombre: <strong>*</strong></div>
              <div>Valor: <strong>cname.vercel-dns.com</strong></div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-slate-900 dark:text-white mb-2">
              3. Variables de Entorno
            </h4>
            <p className="text-xs mb-2">
              Asegúrate de configurar estas variables en tu archivo .env:
            </p>
            <div className="space-y-1 text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded font-mono">
              <div>NEXT_PUBLIC_BASE_DOMAIN={baseDomain || 'miposparaguay.vercel.app'}</div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <a 
              href="https://vercel.com/docs/projects/domains/working-with-domains#wildcard-domains"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
            >
              Ver documentación de Vercel sobre dominios wildcard
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
