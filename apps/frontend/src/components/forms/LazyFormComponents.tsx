'use client';

import { withLazyLoading } from '@/components/ui/lazy-loading';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Skeleton components for form loading states
export const FormSkeleton = () => (
  <Card>
    <CardHeader>
      <CardTitle>
        <Skeleton className="h-6 w-48" />
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <div className="flex justify-end space-x-2">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export const ComplexFormSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-5 w-32" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
    
    <Card>
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-5 w-40" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
    
    <div className="flex justify-end space-x-2">
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-32" />
    </div>
  </div>
);

export const WizardFormSkeleton = () => (
  <div className="space-y-6">
    {/* Steps indicator */}
    <div className="flex items-center justify-center space-x-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center">
          <Skeleton className="h-8 w-8 rounded-full" />
          {i < 3 && <Skeleton className="h-0.5 w-16 mx-2" />}
        </div>
      ))}
    </div>
    
    {/* Form content */}
    <Card>
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-6 w-40" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
    
    {/* Navigation buttons */}
    <div className="flex justify-between">
      <Skeleton className="h-10 w-24" />
      <div className="flex space-x-2">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-28" />
      </div>
    </div>
  </div>
);

export const DynamicFormSkeleton = () => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-8 w-32" />
    </div>
    
    {Array.from({ length: 3 }).map((_, i) => (
      <Card key={i}>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-4">
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </div>
            <Skeleton className="h-8 w-8" />
          </div>
        </CardContent>
      </Card>
    ))}
    
    <div className="flex justify-center">
      <Skeleton className="h-10 w-40" />
    </div>
  </div>
);

// Lazy loaded form components
export const LazyProductForm = withLazyLoading(
  () => import('@/components/products/ProductForm'),
  ComplexFormSkeleton
);

export const LazyCustomerForm = withLazyLoading(
  () => import('@/app/dashboard/management/page').then(module => ({ 
    default: () => null // Placeholder since CustomerForm is inline in management page
  })),
  FormSkeleton
);

export const LazySupplierForm = withLazyLoading(
  () => import('@/app/dashboard/management/page').then(module => ({ 
    default: () => null // Placeholder since SupplierForm is inline in management page
  })),
  FormSkeleton
);

export const LazyCategoryForm = withLazyLoading(
  () => import('@/app/dashboard/management/page').then(module => ({ 
    default: () => null // Placeholder since CategoryForm is inline in management page
  })),
  FormSkeleton
);

export const LazyUserForm = withLazyLoading(
  () => import('@/app/dashboard/management/page').then(module => ({ 
    default: () => null // Placeholder since UserForm is inline in management page
  })),
  ComplexFormSkeleton
);

export const LazyProfileForm = withLazyLoading(
  () => import('@/components/profile/basic-info-form').then(module => ({ 
    default: module.BasicInfoForm
  })),
  ComplexFormSkeleton
);

// Advanced form components
export const LazyWizardForm = withLazyLoading(
  () => import('@/components/ui/form').then(module => ({ 
    default: () => null // Placeholder since wizard-form doesn't exist
  })),
  WizardFormSkeleton
);

export const LazyDynamicForm = withLazyLoading(
  () => import('@/components/ui/form').then(module => ({ 
    default: () => null // Placeholder since dynamic-form doesn't exist
  })),
  DynamicFormSkeleton
);

export const LazyBulkImportForm = withLazyLoading(
  () => import('@/components/ui/form').then(module => ({ 
    default: () => null // Placeholder since bulk-import-form doesn't exist
  })),
  ComplexFormSkeleton
);

export const LazyAdvancedFilters = withLazyLoading(
  () => import('@/components/ui/form').then(module => ({ 
    default: () => null // Placeholder since advanced-filters doesn't exist
  })),
  () => (
    <Card>
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-5 w-32" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
);

// Form validation components
export const LazyFormValidation = withLazyLoading(
  () => import('@/components/ui/form').then(module => ({ 
    default: () => null // Placeholder since zodResolver is not a component
  })),
  () => <div>Cargando validación...</div>
);

export const LazyReactHookForm = withLazyLoading(
  () => import('@/components/ui/form').then(module => ({ 
    default: () => null // Placeholder since react-hook-form is not a component
  })),
  () => <div>Cargando formulario...</div>
);

// Specialized forms
export const LazyInventoryAdjustmentForm = withLazyLoading(
  () => import('@/components/ui/form').then(module => ({ 
    default: () => null // Placeholder since InventoryAdjustmentForm doesn't exist
  })),
  ComplexFormSkeleton
);

export const LazyPriceUpdateForm = withLazyLoading(
  () => import('@/components/ui/form').then(module => ({ 
    default: () => null // Placeholder since PriceUpdateForm doesn't exist
  })),
  DynamicFormSkeleton
);

export const LazyStockTransferForm = withLazyLoading(
  () => import('@/components/ui/form').then(module => ({ 
    default: () => null // Placeholder since StockTransferForm doesn't exist
  })),
  WizardFormSkeleton
);

export const LazyReportConfigForm = withLazyLoading(
  () => import('@/components/ui/form').then(module => ({ 
    default: () => null // Placeholder since ReportConfigForm doesn't exist
  })),
  ComplexFormSkeleton
);

// Form utilities
export const LazyFormBuilder = withLazyLoading(
  () => import('@/components/ui/form').then(module => ({ 
    default: () => null // Placeholder since form-builder doesn't exist
  })),
  DynamicFormSkeleton
);

export const LazyFormPreview = withLazyLoading(
  () => import('@/components/ui/form').then(module => ({ 
    default: () => null // Placeholder since form-preview doesn't exist
  })),
  FormSkeleton
);

export default {
  LazyProductForm,
  LazyCustomerForm,
  LazySupplierForm,
  LazyCategoryForm,
  LazyUserForm,
  LazyProfileForm,
  LazyWizardForm,
  LazyDynamicForm,
  LazyBulkImportForm,
  LazyAdvancedFilters,
  LazyFormValidation,
  LazyReactHookForm,
  LazyInventoryAdjustmentForm,
  LazyPriceUpdateForm,
  LazyStockTransferForm,
  LazyReportConfigForm,
  LazyFormBuilder,
  LazyFormPreview
};