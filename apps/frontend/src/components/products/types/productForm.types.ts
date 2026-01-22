/**
 * Tipos para ProductForm
 * Centraliza todos los tipos relacionados con el formulario de productos
 */

import { z } from 'zod';
import { UseFormReturn } from 'react-hook-form';
import type { Product as SupabaseProduct, Category as SupabaseCategory } from '@/types/supabase';

// Re-exportar tipos de Supabase
export type Category = SupabaseCategory;
export type Product = SupabaseProduct;

// Tipo inferido del esquema (se definirá en productFormSchema.ts)
export type ProductFormData = {
    name: string;
    code: string;
    description?: string;
    categoryId: string;
    price: number;
    costPrice: number;
    wholesalePrice: number;
    offerPrice?: number;
    offerActive?: boolean;
    stock: number;
    minStock: number;
    images?: string[];
    ivaIncluded?: boolean;
    ivaRate?: number;
    // Campos cosméticos
    brand?: string;
    shade?: string;
    skin_type?: string;
    ingredients?: string;
    volume?: string;
    spf?: number;
    finish?: string;
    coverage?: string;
    waterproof?: boolean;
    vegan?: boolean;
    cruelty_free?: boolean;
    expiration_date?: string;
};

/**
 * Props del componente principal ProductForm
 */
export interface ProductFormProps {
    product?: Product;
    categories: Category[];
    onSubmit: (data: ProductFormData) => Promise<void>;
    onCancel: () => void;
    isLoading?: boolean;
    mode?: 'create' | 'edit';
}

/**
 * Props compartidas para secciones del formulario
 */
export interface FormSectionProps {
    form: UseFormReturn<ProductFormData>;
    isLoading?: boolean;
}

/**
 * Props para secciones con categorías
 */
export interface FormSectionWithCategoriesProps extends FormSectionProps {
    categories: Category[];
}

/**
 * Estado de validación de código
 */
export interface CodeValidation {
    isValid?: boolean;
    isValidating: boolean;
    message?: string;
}

/**
 * Estado de carga de imagen
 */
export interface ImageUploadState {
    uploading: boolean;
    progress: number;
    preview: string | null;
    gallery: string[];
}

/**
 * Información de margen de ganancia
 */
export interface ProfitMarginInfo {
    margin: number;
    color: string;
    icon: React.ReactNode;
}

/**
 * Estado de stock
 */
export interface StockStatus {
    color: string;
    message: string;
    icon: React.ReactNode;
}

/**
 * Hints de IVA
 */
export interface IvaHints {
    priceWithIva: number;
    priceWithoutIva: number;
}
