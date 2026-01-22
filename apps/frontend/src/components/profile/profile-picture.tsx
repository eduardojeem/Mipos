'use client';

import { useState } from 'react';
import { Camera, Upload, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/lib/toast';

interface ProfilePictureProps {
  currentAvatar?: string;
  userName: string;
  onAvatarUpdate: (newAvatarUrl: string) => void;
}

export function ProfilePicture({ currentAvatar, userName, onAvatarUpdate }: ProfilePictureProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen válido');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo debe ser menor a 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload the file
    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    
    try {
      // Import Supabase client dynamically to avoid SSR issues
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Usuario no autenticado');
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Error al subir imagen: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      onAvatarUpdate(publicUrl);
      setPreviewUrl(null);
      toast.success('Foto de perfil actualizada correctamente');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Error al actualizar la foto de perfil');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const displayAvatar = previewUrl || currentAvatar;

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative group">
        <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
          <AvatarImage 
            src={displayAvatar} 
            alt={userName}
            className="object-cover"
          />
          <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        {/* Upload overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <Camera className="w-8 h-8 text-white" />
        </div>
        
        {/* Loading overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-black bg-opacity-70 rounded-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 w-full">
        <Button
          variant="outline"
          size="sm"
          className="relative overflow-hidden flex-1 sm:flex-none"
          disabled={isUploading}
        >
          <Upload className="w-4 h-4 mr-2" />
          {isUploading ? 'Subiendo...' : 'Cambiar foto'}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />
        </Button>
        
        {displayAvatar && (
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => {
              onAvatarUpdate('');
              setPreviewUrl(null);
              toast.success('Foto de perfil eliminada');
            }}
            disabled={isUploading}
          >
            Eliminar
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground text-center max-w-xs">
        Formatos soportados: JPG, PNG, GIF. Tamaño máximo: 5MB
      </p>
    </div>
  );
}