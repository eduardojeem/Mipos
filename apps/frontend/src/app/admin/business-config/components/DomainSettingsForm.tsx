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
  ExternalLink, 
  Copy, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Eye,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useUserOrganizations } from '@/hooks/use-user-organizations';

interface DomainSettingsFormProps {
  onUpdate?: () => void;
}

export function DomainSettingsForm({ onUpdate }: DomainSettingsFormProps) {
  const { user } = useAuth();
  const { currentOrganization, loading: orgLoading } = useUserOrganizations();
  const { toast } = useToast();
  
  const [subdomain, setSubdomain] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  // Cargar datos de la organización
  useEffect(() => {
    if (currentOrganization) {
      setSubdomain(currentOrganization.subdomain || currentOrganization.slug || '');
      setCustomDomain(currentOrganization.custom_domain || '');
    }
  }, [currentOrganization]);

  // Actualizar preview URL
  useEffect(() => {
    if (subdomain) {
      // En producción sería: `https://${subdomain}.tudominio.com`
      setPreviewUrl(`${subdomain}.tudominio.com`);
    }
  }, [subdomain]);

  const handleSave = async () => {
    if (!currentOrganization?.id) {
      toast({
        title: 'Error',
        description: 'No se pudo identificar la organización',
        variant: 'destructive',
      });
      return;
    }

    // Validar subdomain
    if (!subdomain || subdomain.trim() === '') {
      toast({
        title: 'Error',
        description: 'El subdominio es requerido',
        variant: 'destructive',
      });
      return;
    }

    // Validar formato de subdomain
    const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
    if (!subdomainRegex.test(subdomain)) {
      toast({
        title: 'Error',
        description: 'El subdominio solo puede contener letras minúsculas, números y guiones (no al inicio o final)',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/admin/organizations/${currentOrganization.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain: subdomain.toLowerCase().trim(),
          custom_domain: customDomain.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al actualizar dominio');
      }

      toast({
        title: '✅ Dominio actualizado',
        description: 'Tu tienda pública ahora está disponible en el nuevo dominio',
      });

      onUpdate?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar el dominio',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: 'Copiado',
      description: 'URL copiada al portapapeles',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const openPreview = () => {
    if (previewUrl) {
      // En desarrollo, abrir localhost
      const url = process.env.NODE_ENV === 'development' 
        ? `http://localhost:3001/home`
        : `https://${previewUrl}/home`;
      window.open(url, '_blank');
    }
  };

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con badge */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="h-6 w-6 text-blue-600" />
            Dominio de tu Tienda Pública
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Configura cómo los clientes accederán a tu tienda online
          </p>
        </div>
        <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-none">
          <Sparkles className="h-3 w-3 mr-1" />
          SaaS Multitenancy
        </Badge>
      </div>

      {/* Vista Previa Destacada */}
      <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <Eye className="h-5 w-5" />
            Vista Previa de tu Tienda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {previewUrl ? (
            <>
              <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border-2 border-blue-300 dark:border-blue-700">
                <Globe className="h-6 w-6 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                    Tu tienda estará disponible en:
                  </p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono truncate">
                    {previewUrl}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(`https://${previewUrl}`)}
                    className="gap-2"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copiar
                      </>
                    )}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={openPreview}
                    className="gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir Tienda
                  </Button>
                </div>
              </div>

              {/* Preview visual */}
              <div className="relative rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="flex-1 bg-white dark:bg-slate-900 rounded px-3 py-1 text-sm font-mono text-slate-600 dark:text-slate-400">
                    https://{previewUrl}/home
                  </div>
                </div>
                <div className="p-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white mb-4">
                    <Store className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    {currentOrganization?.name || 'Tu Tienda'}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    Así verán tus clientes tu tienda online
                  </p>
                </div>
              </div>
            </>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Configura tu subdominio para ver la vista previa
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Formulario de Configuración */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subdominio */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5 text-blue-600" />
              Subdominio
            </CardTitle>
            <CardDescription>
              Tu dirección única para la tienda pública
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subdomain" className="text-sm font-medium">
                Subdominio *
              </Label>
              <div className="relative">
                <Input
                  id="subdomain"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
                  placeholder="mi-tienda"
                  className="pl-10 font-mono"
                />
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                  {subdomain || 'mi-tienda'}.tudominio.com
                </span>
              </p>
            </div>

            <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-xs text-blue-900 dark:text-blue-100">
                <strong>Formato válido:</strong> Solo letras minúsculas, números y guiones. 
                No puede empezar o terminar con guión.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Dominio Personalizado */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5 text-purple-600" />
              Dominio Personalizado
              <Badge variant="secondary" className="ml-auto">Premium</Badge>
            </CardTitle>
            <CardDescription>
              Usa tu propio dominio (opcional)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="custom_domain" className="text-sm font-medium">
                Dominio Personalizado
              </Label>
              <div className="relative">
                <Input
                  id="custom_domain"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value.toLowerCase())}
                  placeholder="www.mi-tienda.com"
                  className="pl-10 font-mono"
                />
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <Alert className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
              <AlertCircle className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-xs text-purple-900 dark:text-purple-100">
                <strong>Requiere configuración DNS:</strong> Deberás configurar un registro CNAME 
                en tu proveedor de dominio apuntando a nuestro servidor.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Botón de Guardar */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Los cambios se aplicarán inmediatamente
        </p>
        <Button
          onClick={handleSave}
          disabled={saving || !subdomain}
          className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
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

      {/* Información adicional */}
      <Card className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-base">¿Cómo funciona?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 text-blue-600 font-bold text-xs">
              1
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Configura tu subdominio</p>
              <p className="text-xs">Elige un nombre único para tu tienda</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 text-blue-600 font-bold text-xs">
              2
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Guarda los cambios</p>
              <p className="text-xs">Los cambios se aplican automáticamente</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 text-blue-600 font-bold text-xs">
              3
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Comparte tu tienda</p>
              <p className="text-xs">Tus clientes podrán acceder desde el nuevo dominio</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Import necesario para el icono Store
import { Store } from 'lucide-react';
