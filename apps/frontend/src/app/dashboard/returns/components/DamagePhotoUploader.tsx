'use client';

import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import { Camera, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

interface UploadedPhoto {
  url: string;
  path: string;
  sizeBytes: number;
  mimeType: string;
}

interface DamagePhotoUploaderProps {
  /** Foto actual (URL firmada). Si null/undefined, muestra el botón
   *  para subir. Si presente, muestra el preview con botón quitar. */
  value: string | null;
  onChange: (next: UploadedPhoto | null) => void;
  /** ID temporal del return en draft. Se usa para agrupar la foto bajo
   *  esa carpeta (path = <org>/<draftId>/<random>.<ext>). */
  returnDraftId?: string;
  /** Si true, el componente se vuelve obligatorio visualmente (asterisco,
   *  borde amber cuando vacío). El backend siempre re-valida. */
  required?: boolean;
  disabled?: boolean;
}

export function DamagePhotoUploader({
  value,
  onChange,
  returnDraftId,
  required = false,
  disabled = false,
}: DamagePhotoUploaderProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const upload = useCallback(
    async (file: File) => {
      if (file.size > MAX_BYTES) {
        toast({
          title: 'Archivo muy grande',
          description: `Máximo 5 MB. Este pesa ${(file.size / 1024 / 1024).toFixed(2)} MB.`,
          variant: 'destructive',
        });
        return;
      }
      if (!ALLOWED_MIME.includes(file.type)) {
        toast({
          title: 'Formato no permitido',
          description: 'Usá JPG, PNG o WebP.',
          variant: 'destructive',
        });
        return;
      }
      setIsUploading(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        if (returnDraftId) fd.append('returnDraftId', returnDraftId);
        const res = await fetch('/api/returns/damage-photo', {
          method: 'POST',
          body: fd,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || `HTTP ${res.status}`);
        }
        onChange({
          url: data.url,
          path: data.path,
          sizeBytes: data.sizeBytes,
          mimeType: data.mimeType,
        });
        toast({ title: 'Foto subida correctamente' });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al subir';
        toast({ title: 'No se pudo subir la foto', description: message, variant: 'destructive' });
      } finally {
        setIsUploading(false);
      }
    },
    [onChange, returnDraftId, toast]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void upload(file);
    // Reset input so selecting same file again still triggers change.
    e.target.value = '';
  };

  const handleRemove = () => {
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  if (value) {
    return (
      <div className="space-y-2">
        <div className="relative inline-block">
          <Image
            src={value}
            alt="Evidencia de daño"
            width={160}
            height={160}
            unoptimized
            className="h-40 w-40 rounded-lg border object-cover"
          />
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-white shadow-md transition-transform hover:scale-110"
              aria-label="Quitar foto"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Foto subida. Podés cambiarla quitándola y subiendo otra.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_MIME.join(',')}
        // capture permite usar cámara directamente en mobile.
        capture="environment"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
        className="sr-only"
        id="damage-photo-input"
      />
      <label
        htmlFor="damage-photo-input"
        className={`flex h-40 w-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors ${
          required
            ? 'border-amber-400 bg-amber-50/50 hover:border-amber-500 hover:bg-amber-100/50 dark:border-amber-700 dark:bg-amber-950/20'
            : 'border-muted-foreground/30 hover:border-muted-foreground/50 hover:bg-muted/20'
        } ${(disabled || isUploading) ? 'pointer-events-none opacity-60' : ''}`}
      >
        {isUploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : (
          <>
            <Camera className="h-8 w-8 text-muted-foreground" />
            <span className="text-center text-xs font-medium text-muted-foreground">
              {required ? 'Foto requerida' : 'Subir foto'}
            </span>
            <span className="text-center text-[10px] text-muted-foreground/70">
              JPG, PNG, WebP · 5 MB máx
            </span>
          </>
        )}
      </label>
      {required && (
        <p className="text-xs text-amber-700 dark:text-amber-500">
          Las devoluciones por producto dañado o defectuoso requieren foto de evidencia.
        </p>
      )}
    </div>
  );
}
