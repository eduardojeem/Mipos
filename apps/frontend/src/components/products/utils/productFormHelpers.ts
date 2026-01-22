/**
 * Funciones auxiliares para ProductForm
 * Incluye helpers para cálculos, formateo y validaciones
 */

import React from 'react';
import type { ProductFormData, ProfitMarginInfo, StockStatus, IvaHints } from '../types/productForm.types';
import { TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * Calcula el margen de ganancia
 */
export function calculateProfitMargin(price: number, costPrice: number): number {
    if (!price || !costPrice || costPrice <= 0) return 0;
    const margin = ((price - costPrice) / price) * 100;
    return Math.round(margin * 100) / 100;
}

/**
 * Obtiene el color del margen de ganancia
 */
export function getProfitMarginColor(margin: number): string {
    if (margin >= 30) return 'text-green-600';
    if (margin >= 15) return 'text-yellow-600';
    return 'text-red-600';
}

/**
 * Obtiene el icono del margen de ganancia
 */
export function getProfitMarginIcon(margin: number): React.ReactNode {
    if (margin >= 30) return React.createElement(TrendingUp, { className: 'h-3 w-3' });
    if (margin >= 15) return React.createElement(Minus, { className: 'h-3 w-3' });
    return React.createElement(TrendingDown, { className: 'h-3 w-3' });
}

/**
 * Obtiene información completa del margen
 */
export function getProfitMarginInfo(price: number, costPrice: number): ProfitMarginInfo {
    const margin = calculateProfitMargin(price, costPrice);
    return {
        margin,
        color: getProfitMarginColor(margin),
        icon: getProfitMarginIcon(margin)
    };
}

/**
 * Obtiene el estado del stock
 */
export function getStockStatus(stock: number, minStock: number): StockStatus {
    if (stock <= minStock) {
        return {
            color: 'text-red-600',
            message: 'Stock crítico',
            icon: React.createElement(AlertCircle, { className: 'h-3 w-3' })
        };
    }

    if (stock <= minStock * 2) {
        return {
            color: 'text-yellow-600',
            message: 'Stock bajo',
            icon: React.createElement(AlertCircle, { className: 'h-3 w-3' })
        };
    }

    return {
        color: 'text-green-600',
        message: 'Stock adecuado',
        icon: React.createElement(CheckCircle, { className: 'h-3 w-3' })
    };
}

/**
 * Calcula los hints de IVA
 */
export function calculateIvaHints(
    price: number,
    ivaIncluded: boolean,
    ivaRate: number
): IvaHints {
    if (!price || !ivaRate) {
        return { priceWithIva: price, priceWithoutIva: price };
    }

    const rate = Math.max(0, Math.min(100, ivaRate));

    if (ivaIncluded) {
        const priceWithoutIva = price / (1 + (rate / 100));
        return {
            priceWithIva: price,
            priceWithoutIva
        };
    } else {
        const priceWithIva = price * (1 + (rate / 100));
        return {
            priceWithIva,
            priceWithoutIva: price
        };
    }
}

/**
 * Calcula el precio sugerido basado en el costo y margen mínimo
 */
export function calculateSuggestedPrice(costPrice: number, minMargin: number = 0.15): number {
    if (!costPrice || minMargin <= 0 || minMargin >= 0.95) return 0;
    const suggestedPrice = costPrice / (1 - minMargin);
    return Math.round(suggestedPrice * 100) / 100;
}

/**
 * Parsea un valor de moneda a número
 */
export function parseCurrencyRaw(val: string, locale: string = 'es'): number {
    if (!val) return 0;

    const decSep = locale.includes('es') ? ',' : '.';
    const thouSep = decSep === ',' ? '.' : ',';

    const normalized = val
        .replace(new RegExp(`\\${thouSep}`, 'g'), '')
        .replace(decSep, '.')
        .replace(/[^0-9.\-]/g, '');

    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : num;
}

/**
 * Genera un código de producto automático
 */
export function generateProductCode(prefix: string = 'PRD'): string {
    const timestamp = Date.now().toString().slice(-6);
    const randomNum = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `${prefix}${timestamp}${randomNum}`;
}

/**
 * Calcula los campos completados del formulario
 */
export function getCompletedFields(formData: Partial<ProductFormData>): number {
    const requiredFields: (keyof ProductFormData)[] = [
        'name',
        'code',
        'categoryId',
        'price',
        'costPrice'
    ];

    return requiredFields.filter(field => {
        const value = formData[field];
        return value !== '' && value !== 0 && value !== undefined;
    }).length;
}

/**
 * Valida si el formulario tiene cambios sin guardar
 */
export function hasUnsavedChanges(dirtyFields: Record<string, any>): boolean {
    return Object.keys(dirtyFields || {}).length > 0;
}

/**
 * Comprime una imagen
 */
export async function compressImage(file: File): Promise<File> {
    try {
        const bitmap = await createImageBitmap(file);
        const maxDim = 1280;
        const maxSide = Math.max(bitmap.width, bitmap.height);
        const ratio = maxSide > maxDim ? maxDim / maxSide : 1;
        const w = Math.round(bitmap.width * ratio);
        const h = Math.round(bitmap.height * ratio);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        if (!ctx) return file;

        ctx.drawImage(bitmap, 0, 0, w, h);

        const blob: Blob | null = await new Promise(resolve =>
            canvas.toBlob(b => resolve(b), 'image/jpeg', 0.82)
        );

        if (!blob) return file;

        const name = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
        return new File([blob], name, { type: 'image/jpeg' });
    } catch {
        return file;
    }
}

/**
 * Valida el tamaño de archivo
 */
export function validateFileSize(file: File, maxSizeMB: number = 5): boolean {
    const maxSize = maxSizeMB * 1024 * 1024;
    return file.size <= maxSize;
}

/**
 * Valida el tipo de archivo
 */
export function validateFileType(file: File): boolean {
    return file.type.startsWith('image/');
}
