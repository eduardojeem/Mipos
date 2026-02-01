'use client';

import React, { useMemo, useCallback, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Mail, Phone, MapPin, Calendar, Camera, RefreshCw, Edit, Lock, Copy, Check, X } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface ProfileHeaderProps {
  profile: {
    name: string;
    email: string;
    phone?: string;
    bio?: string;
    location?: string;
    role: string;
    avatar?: string;
    createdAt: string;
    lastLogin?: string;
  };
  isRefreshing: boolean;
  isUploading: boolean;
  isEditing: boolean;
  onRefresh: () => void;
  onToggleEdit: () => void;
  onChangePassword: () => void;
  onAvatarUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ProfileHeader({
  profile,
  isRefreshing,
  isUploading,
  isEditing,
  onRefresh,
  onToggleEdit,
  onChangePassword,
  onAvatarUpload,
}: ProfileHeaderProps) {
  const [copied, setCopied] = useState<{ email: boolean; phone: boolean }>({ email: false, phone: false });

  const completeness = useMemo(() => {
    const fields = [profile.name, profile.email, profile.phone, profile.location, profile.bio, profile.avatar];
    const completed = fields.filter(Boolean).length;
    const total = fields.length;
    return Math.round((completed / total) * 100);
  }, [profile]);

  const missingFields = useMemo(() => {
    const entries: { key: string; label: string }[] = [
      { key: 'phone', label: 'Teléfono' },
      { key: 'location', label: 'Ubicación' },
      { key: 'bio', label: 'Biografía' },
      { key: 'avatar', label: 'Foto' },
    ];
    return entries.filter((f) => !(profile as any)[f.key]);
  }, [profile]);

  const copyToClipboard = useCallback(async (text: string, field: 'email' | 'phone') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied((prev) => ({ ...prev, [field]: true }));
      setTimeout(() => setCopied((prev) => ({ ...prev, [field]: false })), 1500);
    } catch {
      // noop
    }
  }, []);

  return (
    <Card className="hover-lift smooth-transition">
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="h-24 w-24 avatar-hover">
              <AvatarImage src={profile.avatar} alt={profile.name} />
              <AvatarFallback className="text-2xl">
                {profile.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <label
              htmlFor="avatar-upload"
              className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors animate-scale-in"
            >
              <Camera className="h-4 w-4" />
              <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={onAvatarUpload} />
            </label>
            {isUploading && (
              <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center">
                <RefreshCw className="h-6 w-6 text-white animate-spin" />
              </div>
            )}
          </div>

          {/* Información básica */}
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold">{profile.name}</h1>
              <Badge variant="secondary">{profile.role}</Badge>
            </div>

            {/* Contacto */}
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <a href={`mailto:${profile.email}`} className="underline-offset-2 hover:underline">
                  {profile.email}
                </a>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => copyToClipboard(profile.email, 'email')}>
                        {copied.email ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copiar correo</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {profile.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <a href={`tel:${profile.phone}`} className="underline-offset-2 hover:underline">
                    {profile.phone}
                  </a>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => copyToClipboard(profile.phone!, 'phone')}>
                          {copied.phone ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copiar teléfono</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
              {profile.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{profile.location}</span>
                </div>
              )}
            </div>

            {/* Fechas */}
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Miembro desde {formatDate(profile.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Último acceso {profile.lastLogin ? formatDate(profile.lastLogin) : '—'}</span>
              </div>
            </div>

            {/* Progreso del perfil */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Compleción del perfil</span>
                <span className="text-sm text-muted-foreground">{completeness}%</span>
              </div>
              <Progress value={completeness} className="h-2" />
              {missingFields.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-muted-foreground">Campos a completar:</span>
                  {missingFields.map((f) => (
                    <Badge key={f.key} variant="outline" className="text-xs">
                      {f.label}
                    </Badge>
                  ))}
                  <Button variant="link" size="sm" className="h-6" onClick={onToggleEdit}>
                    Completar ahora
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onRefresh} disabled={isRefreshing} className="button-press" title="Actualizar perfil">
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Actualizando...' : 'Actualizar'}
            </Button>
            <Button variant="outline" onClick={onToggleEdit} className="button-press">
              <Edit className="h-4 w-4 mr-2" />
              {isEditing ? 'Salir de edición' : 'Editar Perfil'}
            </Button>
            <Button variant="outline" onClick={onChangePassword} className="button-press">
              <Lock className="h-4 w-4 mr-2" />
              Cambiar Contraseña
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}