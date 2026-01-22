'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Share2, Facebook, Instagram, Twitter, Linkedin, Youtube } from 'lucide-react';
import { WebsiteConfig } from '@/contexts/WebsiteConfigContext';

interface SocialMediaConfigFormProps {
  config: WebsiteConfig;
  onUpdate: (updates: Partial<WebsiteConfig>) => void;
}

export default function SocialMediaConfigForm({ config, onUpdate }: SocialMediaConfigFormProps) {
  const handleSocialChange = (field: keyof WebsiteConfig['socialMedia'], value: string | boolean) => {
    onUpdate({
      socialMedia: {
        ...config.socialMedia,
        [field]: value
      }
    });
  };

  const socialPlatforms = [
    { key: 'facebook', label: 'Facebook', icon: Facebook, placeholder: 'https://facebook.com/minegocio' },
    { key: 'instagram', label: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/minegocio' },
    { key: 'twitter', label: 'Twitter/X', icon: Twitter, placeholder: 'https://twitter.com/minegocio' },
    { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'https://linkedin.com/company/minegocio' },
    { key: 'youtube', label: 'YouTube', icon: Youtube, placeholder: 'https://youtube.com/@minegocio' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Redes Sociales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Mostrar enlaces de redes sociales</Label>
              <p className="text-sm text-gray-500">Activar iconos de redes sociales en el sitio</p>
            </div>
            <Switch
              checked={config.socialMedia.enabled}
              onCheckedChange={(checked) => handleSocialChange('enabled', checked)}
            />
          </div>

          {config.socialMedia.enabled && (
            <div className="space-y-4 pl-6 border-l-2 border-blue-200">
              {socialPlatforms.map(({ key, label, icon: Icon, placeholder }) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key} className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {label}
                  </Label>
                  <Input
                    id={key}
                    value={(config.socialMedia as any)[key] || ''}
                    onChange={(e) => handleSocialChange(key as keyof WebsiteConfig['socialMedia'], e.target.value)}
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}