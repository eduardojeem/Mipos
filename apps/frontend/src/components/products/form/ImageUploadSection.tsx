/**
 * Componente ImageUploadSection
 * Sección de carga y gestión de imágenes del producto
 */

'use client';

import React from 'react';
import { Upload, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { LazyImage } from '@/components/ui/optimized-components';
import type { ImageUploadState } from '../types/productForm.types';

interface ImageUploadSectionProps {
    imageState: ImageUploadState;
    onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    onImageRemove: (url: string) => void;
    onPreviewChange: (url: string) => void;
    isLoading?: boolean;
}

export function ImageUploadSection({
    imageState,
    onImageUpload,
    onImageRemove,
    onPreviewChange,
    isLoading
}: ImageUploadSectionProps) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-2 pb-2 border-b">
                <ImageIcon className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                    Imágenes del Producto
                </h3>
            </div>

            {/* Upload Button */}
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleButtonClick}
                        disabled={isLoading || imageState.uploading || imageState.gallery.length >= 8}
                        className="flex items-center space-x-2"
                    >
                        {imageState.uploading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Subiendo...</span>
                            </>
                        ) : (
                            <>
                                <Upload className="h-4 w-4" />
                                <span>Cargar Imágenes</span>
                            </>
                        )}
                    </Button>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={onImageUpload}
                        className="hidden"
                        disabled={isLoading || imageState.uploading}
                    />

                    <div className="text-sm text-muted-foreground">
                        {imageState.gallery.length}/8 imágenes
                    </div>
                </div>

                {/* Upload Progress */}
                {imageState.uploading && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Subiendo imágenes...</span>
                            <span className="font-medium">{imageState.progress}%</span>
                        </div>
                        <Progress value={imageState.progress} className="h-2" />
                    </div>
                )}

                {/* Help Text */}
                <p className="text-xs text-muted-foreground">
                    Formatos aceptados: JPG, PNG, WEBP. Tamaño máximo: 5MB por imagen.
                    Las imágenes se comprimirán automáticamente.
                </p>
            </div>

            {/* Image Preview */}
            {imageState.preview && (
                <div className="space-y-2">
                    <Label>Vista Previa Principal</Label>
                    <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
                        <LazyImage
                            src={imageState.preview}
                            alt="Vista previa del producto"
                            className="w-full h-full object-contain"
                        />
                    </div>
                </div>
            )}

            {/* Gallery */}
            {imageState.gallery.length > 0 && (
                <div className="space-y-2">
                    <Label>Galería de Imágenes ({imageState.gallery.length})</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {imageState.gallery.map((url, index) => (
                            <div
                                key={url}
                                className={cn(
                                    "relative group aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 cursor-pointer transition-all",
                                    imageState.preview === url
                                        ? "border-blue-500 ring-2 ring-blue-200"
                                        : "border-gray-200 hover:border-gray-300"
                                )}
                                onClick={() => onPreviewChange(url)}
                            >
                                <LazyImage
                                    src={url}
                                    alt={`Producto imagen ${index + 1}`}
                                    className="w-full h-full object-cover"
                                />

                                {/* Remove Button */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onImageRemove(url);
                                    }}
                                    disabled={isLoading}
                                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                    aria-label="Eliminar imagen"
                                >
                                    <X className="h-4 w-4" />
                                </button>

                                {/* Main Badge */}
                                {imageState.preview === url && (
                                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded">
                                        Principal
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <p className="text-xs text-muted-foreground">
                        Haz clic en una imagen para establecerla como principal
                    </p>
                </div>
            )}

            {/* Empty State */}
            {imageState.gallery.length === 0 && !imageState.uploading && (
                <div className="flex flex-col items-center justify-center p-12 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
                    <ImageIcon className="h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-sm font-medium text-gray-600 mb-2">
                        No hay imágenes cargadas
                    </p>
                    <p className="text-xs text-gray-500 mb-4">
                        Sube imágenes para mostrar tu producto
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleButtonClick}
                        disabled={isLoading}
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        Cargar Primera Imagen
                    </Button>
                </div>
            )}
        </div>
    );
}
