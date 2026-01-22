/**
 * Hook para gestionar la carga de imágenes
 * Maneja compresión, upload a Supabase y preview
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import { toast } from '@/lib/toast';
import { createClient } from '@/lib/supabase';
import type { ImageUploadState } from '../types/productForm.types';
import { compressImage, validateFileSize, validateFileType } from '../utils/productFormHelpers';

interface UseImageUploadOptions {
    productCode?: string;
    maxImages?: number;
    maxSizeMB?: number;
    onImagesChange?: (images: string[]) => void;
}

interface UseImageUploadReturn {
    imageState: ImageUploadState;
    handleImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    setImagePreview: (url: string | null) => void;
    removeImage: (url: string) => void;
    clearImages: () => void;
}

export function useImageUpload({
    productCode = 'product',
    maxImages = 8,
    maxSizeMB = 5,
    onImagesChange
}: UseImageUploadOptions = {}): UseImageUploadReturn {
    const supabase = createClient();
    const supabaseBucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_PRODUCTS || 'products';

    const [imageState, setImageState] = useState<ImageUploadState>({
        uploading: false,
        progress: 0,
        preview: null,
        gallery: []
    });

    const uploadTickerRef = useRef<NodeJS.Timeout | null>(null);

    /**
     * Sube un archivo con reintentos
     */
    const uploadWithRetry = useCallback(async (
        bucket: string,
        path: string,
        file: File,
        attempts = 3
    ) => {
        let lastError: any = null;

        for (let i = 0; i < attempts; i++) {
            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(path, file, { upsert: true, contentType: file.type });

            if (!error) return data;

            lastError = error;
            await new Promise(res => setTimeout(res, 300 * Math.pow(2, i)));
        }

        throw lastError;
    }, [supabase]);

    /**
     * Maneja la carga de imágenes
     */
    const handleImageUpload = useCallback(async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        // Filtrar archivos válidos
        const selectedFiles = Array.from(files).slice(0, maxImages - imageState.gallery.length);
        const validFiles = selectedFiles.filter(f => {
            const sizeValid = validateFileSize(f, maxSizeMB);
            const typeValid = validateFileType(f);
            return sizeValid && typeValid;
        });

        if (validFiles.length < selectedFiles.length) {
            toast.error('Algunas imágenes fueron rechazadas por tamaño o tipo');
        }

        if (validFiles.length === 0) return;

        try {
            setImageState(prev => ({ ...prev, uploading: true, progress: 0 }));

            // Simular progreso
            if (uploadTickerRef.current) clearInterval(uploadTickerRef.current);
            uploadTickerRef.current = setInterval(() => {
                setImageState(prev => ({
                    ...prev,
                    progress: prev.progress < 90 ? prev.progress + 5 : prev.progress
                }));
            }, 250);

            const bucket = supabaseBucket;
            const urls: string[] = [];

            // Procesar cada archivo
            for (let i = 0; i < validFiles.length; i++) {
                let file = validFiles[i];

                // Comprimir si es necesario
                if (file.size > 1024 * 1024 && (file.type === 'image/jpeg' || file.type === 'image/png')) {
                    file = await compressImage(file);
                }

                const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
                const base = productCode || 'product';
                const path = `${base}-${Date.now()}-${i}.${ext}`;

                try {
                    const data = await uploadWithRetry(bucket, path, file, 3);

                    setImageState(prev => ({
                        ...prev,
                        progress: Math.min(90, Math.round(((i + 1) / validFiles.length) * 90))
                    }));

                    const pub = supabase.storage.from(bucket).getPublicUrl(data.path);
                    const url = pub?.data?.publicUrl || '';

                    if (url) urls.push(url);
                } catch (error) {
                    console.error('Error uploading image:', error);
                    toast.error('Error subiendo imagen');
                }
            }

            // Actualizar galería
            const nextGallery = [...imageState.gallery, ...urls].slice(0, maxImages);
            const nextPreview = imageState.preview || nextGallery[0] || null;

            setImageState({
                uploading: false,
                progress: 100,
                preview: nextPreview,
                gallery: nextGallery
            });

            // Notificar cambio
            if (onImagesChange) {
                onImagesChange(nextGallery);
            }

            toast.success(`${urls.length} imagen(es) cargada(s) exitosamente`);
        } catch (error) {
            console.error('Error in image upload:', error);
            toast.error('Error al cargar imágenes');
        } finally {
            if (uploadTickerRef.current) {
                clearInterval(uploadTickerRef.current);
                uploadTickerRef.current = null;
            }

            setTimeout(() => {
                setImageState(prev => ({ ...prev, uploading: false, progress: 0 }));
            }, 600);
        }
    }, [
        imageState.gallery,
        imageState.preview,
        maxImages,
        maxSizeMB,
        productCode,
        supabase,
        supabaseBucket,
        uploadWithRetry,
        onImagesChange
    ]);

    /**
     * Establece la imagen de preview
     */
    const setImagePreview = useCallback((url: string | null) => {
        setImageState(prev => ({ ...prev, preview: url }));
    }, []);

    /**
     * Elimina una imagen de la galería
     */
    const removeImage = useCallback((url: string) => {
        setImageState(prev => {
            const nextGallery = prev.gallery.filter(img => img !== url);
            const nextPreview = prev.preview === url
                ? (nextGallery[0] || null)
                : prev.preview;

            if (onImagesChange) {
                onImagesChange(nextGallery);
            }

            return {
                ...prev,
                gallery: nextGallery,
                preview: nextPreview
            };
        });
    }, [onImagesChange]);

    /**
     * Limpia todas las imágenes
     */
    const clearImages = useCallback(() => {
        setImageState({
            uploading: false,
            progress: 0,
            preview: null,
            gallery: []
        });

        if (onImagesChange) {
            onImagesChange([]);
        }
    }, [onImagesChange]);

    return {
        imageState,
        handleImageUpload,
        setImagePreview,
        removeImage,
        clearImages
    };
}
