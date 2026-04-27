import { useState, useCallback, useEffect } from 'react';
import { validateCustomerData } from '@/lib/validation-schemas';
import { useCreateCustomer, useUpdateCustomer } from '@/hooks/useOptimizedCustomers';
import type { UICustomer } from '@/types/customer-page';

interface FormData {
    name: string;
    customerCode: string;
    email: string;
    phone: string;
    address: string;
    ruc: string;
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
    validateField: (field: keyof FormData, value: unknown) => string;
    validateAll: () => boolean;
    submit: () => Promise<void>;
    reset: () => void;
    isDirty: boolean;
}

export function useCustomerForm(initialCustomer?: UICustomer): UseCustomerFormReturn {
    const createCustomer = useCreateCustomer();
    const updateCustomer = useUpdateCustomer();
    const [formData, setFormData] = useState<FormData>(
        initialCustomer ? transformCustomerToForm(initialCustomer) : getDefaultFormData()
    );
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        if (initialCustomer) {
            setFormData(transformCustomerToForm(initialCustomer));
        } else {
            setFormData(getDefaultFormData());
        }
        setErrors({});
        setIsDirty(false);
    }, [initialCustomer]);

    const validateField = useCallback((field: keyof FormData, value: unknown): string => {
        const validation = validateCustomerData(toValidationFieldPayload(field, value), Boolean(initialCustomer));

        if (!validation.success) {
            const error = validation.error.errors.find((entry) => mapValidationKeyToFormField(entry.path[0]) === field);
            return error?.message || '';
        }

        return '';
    }, [initialCustomer]);

    const updateField = useCallback((field: keyof FormData, value: string | boolean) => {
        setFormData((previous) => ({ ...previous, [field]: value }));
        setIsDirty(true);

        if (typeof value === 'string') {
            const error = validateField(field, value);
            setErrors((previous) => {
                if (!error) {
                    const { [field]: _removed, ...rest } = previous;
                    return rest;
                }

                return { ...previous, [field]: error };
            });
        }
    }, [validateField]);

    const validateAll = useCallback((): boolean => {
        const validation = validateCustomerData(toValidationPayload(formData), Boolean(initialCustomer));

        if (!validation.success) {
            const nextErrors: Record<string, string> = {};
            validation.error.errors.forEach((entry) => {
                const field = mapValidationKeyToFormField(entry.path[0]);
                if (field) {
                    nextErrors[field] = entry.message;
                }
            });

            setErrors(nextErrors);
            return false;
        }

        setErrors({});
        return true;
    }, [formData, initialCustomer]);

    const submit = useCallback(async () => {
        if (!validateAll()) {
            throw new Error('validation');
        }

        setSubmitting(true);
        try {
            const payload = {
                name: formData.name,
                email: formData.email || null,
                phone: formData.phone || null,
                address: formData.address || null,
                ruc: formData.ruc || null,
                customerType: formData.customerType,
                birthDate: formData.birthDate || null,
                notes: formData.notes || null,
                is_active: formData.is_active,
            };

            if (initialCustomer) {
                await updateCustomer.mutateAsync({
                    id: initialCustomer.id,
                    data: payload
                });
            } else {
                await createCustomer.mutateAsync(payload);
            }

            setIsDirty(false);
        } finally {
            setSubmitting(false);
        }
    }, [createCustomer, formData, initialCustomer, updateCustomer, validateAll]);

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

function getDefaultFormData(): FormData {
    return {
        name: '',
        customerCode: `CL-${Date.now()}`,
        email: '',
        phone: '',
        address: '',
        ruc: '',
        notes: '',
        birthDate: '',
        customerType: 'regular',
        is_active: true
    };
}

function transformCustomerToForm(customer: UICustomer): FormData {
    return {
        name: customer.name,
        customerCode: customer.customerCode || `CL-${Date.now()}`,
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        ruc: customer.ruc || '',
        notes: customer.notes || '',
        birthDate: customer.birthDate || '',
        customerType: customer.customerType || 'regular',
        is_active: customer.is_active ?? true
    };
}

function toValidationFieldPayload(field: keyof FormData, value: unknown) {
    switch (field) {
        case 'customerCode':
            return { customer_code: value };
        case 'customerType':
            return { customer_type: value };
        case 'birthDate':
            return { birth_date: value };
        default:
            return { [field]: value };
    }
}

function toValidationPayload(formData: FormData) {
    return {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        ruc: formData.ruc,
        customer_code: formData.customerCode,
        customer_type: formData.customerType,
        birth_date: formData.birthDate,
        notes: formData.notes,
        is_active: formData.is_active,
        status: formData.is_active ? 'active' : 'inactive'
    };
}

function mapValidationKeyToFormField(field: unknown): keyof FormData | null {
    switch (field) {
        case 'customer_code':
            return 'customerCode';
        case 'customer_type':
            return 'customerType';
        case 'birth_date':
            return 'birthDate';
        case 'name':
        case 'email':
        case 'phone':
        case 'address':
        case 'ruc':
        case 'notes':
        case 'is_active':
            return field;
        default:
            return null;
    }
}
