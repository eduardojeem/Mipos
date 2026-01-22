'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { BarChart3, Eye } from 'lucide-react';
import { WebsiteConfig } from '@/contexts/WebsiteConfigContext';

interface AnalyticsConfigFormProps {
  config: WebsiteConfig;
  onUpdate: (updates: Partial<WebsiteConfig>) => void;
}

export default function AnalyticsConfigForm({ config, onUpdate }: AnalyticsConfigFormProps) {
  const handleAnalyticsChange = (field: keyof WebsiteConfig['analytics'], value: string | boolean) => {
    onUpdate({
      analytics: {
        ...config.analytics,
        [field]: value
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Configuración de Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Habilitar Analytics</Label>
              <p className="text-sm text-gray-500">Activar seguimiento de visitantes</p>
            </div>
            <Switch
              checked={config.analytics.enabled}
              onCheckedChange={(checked) => handleAnalyticsChange('enabled', checked)}
            />
          </div>

          {config.analytics.enabled && (
            <div className="space-y-4 pl-6 border-l-2 border-blue-200">
              <div className="space-y-2">
                <Label htmlFor="googleAnalytics">Google Analytics ID</Label>
                <Input
                  id="googleAnalytics"
                  value={config.analytics.googleAnalytics}
                  onChange={(e) => handleAnalyticsChange('googleAnalytics', e.target.value)}
                  placeholder="GA-XXXXXXXXX-X o G-XXXXXXXXXX"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="googleTagManager">Google Tag Manager ID</Label>
                <Input
                  id="googleTagManager"
                  value={config.analytics.googleTagManager}
                  onChange={(e) => handleAnalyticsChange('googleTagManager', e.target.value)}
                  placeholder="GTM-XXXXXXX"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="facebookPixel">Facebook Pixel ID</Label>
                <Input
                  id="facebookPixel"
                  value={config.analytics.facebookPixel}
                  onChange={(e) => handleAnalyticsChange('facebookPixel', e.target.value)}
                  placeholder="123456789012345"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hotjar">Hotjar Site ID</Label>
                <Input
                  id="hotjar"
                  value={config.analytics.hotjar}
                  onChange={(e) => handleAnalyticsChange('hotjar', e.target.value)}
                  placeholder="1234567"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Información y Privacidad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <h4 className="font-medium text-yellow-900 mb-2">Importante sobre Analytics</h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Asegúrese de tener una política de privacidad actualizada</li>
              <li>• Informe a los usuarios sobre el uso de cookies</li>
              <li>• Cumpla con las regulaciones locales de protección de datos</li>
              <li>• Configure Google Analytics para respetar la privacidad</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}