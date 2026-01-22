/**
 * Index de exportaciones para ProductForm refactorizado
 * Facilita las importaciones desde otros módulos
 */

// Componente principal
export { default as ProductForm } from './ProductFormRefactored';

// Hooks
export { useProductForm } from './hooks/useProductForm';
export { useImageUpload } from './hooks/useImageUpload';
export { useProductValidation } from './hooks/useProductValidation';

// Componentes de sección
export { BasicInfoSection } from './form/BasicInfoSection';
export { PricingSection } from './form/PricingSection';
export { StockSection } from './form/StockSection';
export { OfferSection } from './form/OfferSection';
export { CosmeticDetailsSection } from './form/CosmeticDetailsSection';
export { ImageUploadSection } from './form/ImageUploadSection';

// Componentes de UI
export { FormProgress } from './form/FormProgress';
export { ValidationIndicator } from './form/ValidationIndicator';
export { ProfitMarginIndicator } from './form/ProfitMarginIndicator';
export { StockStatusIndicator } from './form/StockStatusIndicator';

// Tipos
export type {
    ProductFormProps,
    ProductFormData,
    FormSectionProps,
    FormSectionWithCategoriesProps,
    CodeValidation,
    ImageUploadState,
    ProfitMarginInfo,
    StockStatus,
    IvaHints
} from './types/productForm.types';

// Esquema y validaciones
export { productSchema, additionalValidations } from './utils/productFormSchema';

// Helpers
export {
    calculateProfitMargin,
    getProfitMarginColor,
    getProfitMarginIcon,
    getProfitMarginInfo,
    getStockStatus,
    calculateIvaHints,
    calculateSuggestedPrice,
    parseCurrencyRaw,
    generateProductCode,
    getCompletedFields,
    hasUnsavedChanges,
    compressImage,
    validateFileSize,
    validateFileType
} from './utils/productFormHelpers';
