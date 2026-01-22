import { useState, useCallback, useEffect } from 'react';
import { validateCustomerData } from '@/lib/validation-schemas';
import { customerService } from '@/lib/customer-service';
import type { UICustomer } from '@/types/customer-page';

interface FormData {
    name: string;
    customerCode: string;
    email: string;
    phone: string;
    address: string;
    notes: string;
    birthDate: string;
    customerType: 'regular' | 'vip' | 'wholesale';
    is_active: boolean;
}

export interface UseCustomerFormReturn {
    formData: FormData;
    errors: Record<string, string>;
    submitting: boolean;
    updateField: (field: keyof FormData, value: string | boolean) => void;
    validateField: (field: keyof FormData, value: any) => string;
    validateAll: () => boolean;
    submit: () => Promise<void>;
    reset: () => void;
    isDirty: boolean;
}

/**
 * Hook for managing customer form state and validation.
 * 
 * Features:
 * - Real-time field validation
 * - Form-wide validation
 * - Dirty state tracking
 * - Create/Update handling
 * 
 * @example
 * ```tsx
 * const form = useCustomerForm(existingCustomer);
 * 
 * <Input
 *   value={form.formData.name}
 *   onChange={(e) => form.updateField('name', e.target.value)}
 *   error={form.errors.name}
 * />
 * ```
 */
export function useCustomerForm(initialCustomer?: UICustomer): UseCustomerFormReturn {
    const [formData, setFormData] = useState<FormData>(
        initialCustomer ? transformCustomerToForm(initialCustomer) : getDefaultFormData()
    );
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // Update form when initialCustomer changes (e.g., when opening edit modal with different customer)
    useEffect(() => {
        if (initialCustomer) {
            setFormData(transformCustomerToForm(initialCustomer));
            setErrors({});
            setIsDirty(false);
        } else {
            setFormData(getDefaultFormData());
            setErrors({});
            setIsDirty(false);
        }
    }, [initialCustomer?.id]); // Only re-run when the customer ID changes

    const validateField = useCallback((field: keyof FormData, value: any): string => {
        const validation = validateCustomerData({ [field]: value }, false);

        if (!validation.success) {
            const error = validation.error.errors.find(e => e.path[0] === field);
            return error?.message || '';
        }

        return '';
    }, []);

    const updateField = useCallback((field: keyof FormData, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);

        // Validate only string fields (not booleans like is_active)
        if (typeof value === 'string') {
            const error = validateField(field, value);
            setErrors(prev => ({ ...prev, [field]: error }));
        }
    }, [validateField]);

    const validateAll = useCallback((): boolean => {
        const validation = validateCustomerData(formData, !!initialCustomer);

        if (!validation.success) {
            const newErrors: Record<string, string> = {};
            validation.error.errors.forEach(err => {
                const field = err.path[0];
                if (typeof field === 'string') {
                    newErrors[field] = err.message;
                }
            });

            setErrors(newErrors);
            return false;
        }

        setErrors({});
        return true;
    }, [formData, initialCustomer]);

    const submit = useCallback(async () => {
        if (!validateAll()) {
            throw new Error('Validation failed');
        }

        setSubmitting(true);
        try {
            // Transform form data from camelCase to snake_case for the service
            const customerData = {
                name: formData.name,
                email: formData.email || undefined,
                phone: formData.phone || undefined,
                address: formData.address || undefined,
                customer_code: formData.customerCode,
                customer_type: formData.customerType, // Keep lowercase for validation
                birth_date: formData.birthDate || undefined,
                notes: formData.notes || undefined,
                is_active: formData.is_active,
                status: formData.is_active ? 'active' : 'inactive',
            };

            console.log('📝 Form data a enviar:', customerData);
            console.log('📝 Initial customer ID:', initialCustomer?.id);

            if (initialCustomer) {
                const result = await customerService.update(initialCustomer.id, customerData as any);
                console.log('📝 Resultado de update:', result);
                if (result.error) {
                    throw new Error(result.error);
                }
            } else {
                const result = await customerService.create(customerData as any);
                console.log('📝 Resultado de create:', result);
                if (result.error) {
                    throw new Error(result.error);
                }
            }

            setIsDirty(false);
        } finally {
            setSubmitting(false);
        }
    }, [formData, initialCustomer, validateAll]);

    const reset = useCallback(() => {
        setFormData(initialCustomer ? transformCustomerToForm(initialCustomer) : getDefaultFormData());
        setErrors({});
        setIsDirty(false);
    }, [initialCustomer]);

    return {
        formData,
        errors,
        submitting,
        updateField,
        validateField,
        validateAll,
        submit,
        reset,
        isDirty
    };
}

/**
 * Get default form data for new customers
 */
function getDefaultFormData(): FormData {
    return {
        name: '',
        customerCode: `CL-${Date.now()}`,
        email: '',
        phone: '',
        address: '',
        notes: '',
        birthDate: '',
        customerType: 'regular',
        is_active: true
    };
}

/**
 * Transform a Customer object into FormData
 */
function transformCustomerToForm(customer: UICustomer): FormData {
    return {
        name: customer.name,
        customerCode: customer.customerCode || `CL-${Date.now()}`,
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        notes: customer.notes || '',
        birthDate: customer.birthDate || '',
        customerType: customer.customerType || 'regular',
        is_active: customer.is_active ?? true
    };
}
