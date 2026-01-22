'use client';

import React, { memo, useCallback, useMemo, useState, useEffect } from 'react';
import { useForm, Controller, FieldValues, Path, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDebouncedState } from '@/hooks/use-optimized-state';
import { usePerformanceMonitor } from '@/hooks/use-performance';
import { cn } from '@/lib/utils';

// Form field configuration interface
interface FormFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio';
  placeholder?: string;
  description?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: z.ZodSchema<any>;
  debounceMs?: number;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

// Optimized form field component
const OptimizedFormField = memo<{
  config: FormFieldConfig;
  form: UseFormReturn<any>;
  value?: any;
  onChange?: (value: any) => void;
}>(({ config, form, value, onChange }) => {
  const { startMeasure, endMeasure } = usePerformanceMonitor(`FormField-${config.name}`);
  const [debouncedValue, setDebouncedValue] = useDebouncedState(value, config.debounceMs || 300);

  useEffect(() => {
    startMeasure();
    return () => endMeasure();
  });

  const fieldError = form.formState.errors[config.name];

  const handleChange = useCallback((newValue: any) => {
    setDebouncedValue(newValue);
    onChange?.(newValue);
  }, [setDebouncedValue, onChange]);

  const renderField = () => {
    const fieldId = `field-${config.name}`;
    const errorId = `${fieldId}-error`;
    const descriptionId = `${fieldId}-description`;
    const helpId = `${fieldId}-help`;

    switch (config.type) {
      case 'text':
      case 'email':
      case 'password':
      case 'number':
        return (
          <Controller
            name={config.name}
            control={form.control}
            render={({ field }) => (
              <Input
                {...field}
                id={fieldId}
                type={config.type}
                placeholder={config.placeholder}
                disabled={config.disabled}
                className={cn(fieldError && 'border-red-500', config.className)}
                aria-required={config.required}
                aria-invalid={!!fieldError}
                aria-describedby={cn(
                  config.description && descriptionId,
                  fieldError && errorId,
                  helpId
                )}
                onChange={(e) => {
                  field.onChange(e);
                  handleChange(e.target.value);
                }}
              />
            )}
          />
        );

      case 'textarea':
        return (
          <Controller
            name={config.name}
            control={form.control}
            render={({ field }) => (
              <Textarea
                {...field}
                id={fieldId}
                placeholder={config.placeholder}
                disabled={config.disabled}
                className={cn(fieldError && 'border-red-500', config.className)}
                aria-required={config.required}
                aria-invalid={!!fieldError}
                aria-describedby={cn(
                  config.description && descriptionId,
                  fieldError && errorId,
                  helpId
                )}
                onChange={(e) => {
                  field.onChange(e);
                  handleChange(e.target.value);
                }}
              />
            )}
          />
        );

      case 'select':
        return (
          <Controller
            name={config.name}
            control={form.control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value: string) => {
                  field.onChange(value);
                  handleChange(value);
                }}
                disabled={config.disabled}
              >
                <SelectTrigger 
                  id={fieldId}
                  className={cn(fieldError && 'border-red-500', config.className)}
                  aria-required={config.required}
                  aria-invalid={!!fieldError}
                  aria-describedby={cn(
                    config.description && descriptionId,
                    fieldError && errorId,
                    helpId
                  )}
                >
                  <SelectValue placeholder={config.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {config.options?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        );

      case 'checkbox':
        return (
          <Controller
            name={config.name}
            control={form.control}
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={fieldId}
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    handleChange(checked);
                  }}
                  disabled={config.disabled}
                  className={cn(fieldError && 'border-red-500', config.className)}
                  aria-required={config.required}
                  aria-invalid={!!fieldError}
                  aria-describedby={cn(
                    config.description && descriptionId,
                    fieldError && errorId,
                    helpId
                  )}
                />
                <Label htmlFor={fieldId}>{config.label}</Label>
              </div>
            )}
          />
        );

      case 'radio':
        return (
          <Controller
            name={config.name}
            control={form.control}
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={(value: string) => {
                  field.onChange(value);
                  handleChange(value);
                }}
                disabled={config.disabled}
                className={config.className}
                aria-required={config.required}
                aria-invalid={!!fieldError}
                aria-describedby={cn(
                  config.description && descriptionId,
                  fieldError && errorId,
                  helpId
                )}
              >
                {config.options?.map((option, index) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value={option.value} 
                      id={`${fieldId}-${option.value}`}
                      aria-describedby={`${fieldId}-${option.value}-label`}
                    />
                    <Label 
                      htmlFor={`${fieldId}-${option.value}`}
                      id={`${fieldId}-${option.value}-label`}
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          />
        );

      default:
        return null;
    }
  };

  const fieldId = `field-${config.name}`;
  const errorId = `${fieldId}-error`;
  const descriptionId = `${fieldId}-description`;
  const helpId = `${fieldId}-help`;

  if (config.type === 'checkbox') {
    return (
      <div className="space-y-2">
        {renderField()}
        {config.description && (
          <p id={descriptionId} className="text-sm text-gray-600">
            {config.description}
          </p>
        )}
        {fieldError && (
          <p id={errorId} className="text-sm text-red-600" role="alert" aria-live="polite">
            {fieldError.message as string}
          </p>
        )}
        <div id={helpId} className="sr-only">
          {config.required ? 'Campo obligatorio' : 'Campo opcional'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label 
        htmlFor={fieldId} 
        className={cn(config.required && 'after:content-["*"] after:text-red-500')}
      >
        {config.label}
      </Label>
      {renderField()}
      {config.description && (
        <p id={descriptionId} className="text-sm text-gray-600">
          {config.description}
        </p>
      )}
      {fieldError && (
        <p id={errorId} className="text-sm text-red-600" role="alert" aria-live="polite">
          {fieldError.message as string}
        </p>
      )}
      <div id={helpId} className="sr-only">
        {config.required ? 'Campo obligatorio' : 'Campo opcional'}
      </div>
    </div>
  );
});

OptimizedFormField.displayName = 'OptimizedFormField';

// Dynamic form builder component
export const DynamicForm = memo<{
  fields: FormFieldConfig[];
  onSubmit: (data: any) => void | Promise<void>;
  defaultValues?: Record<string, any>;
  schema?: z.ZodSchema<any>;
  title?: string;
  description?: string;
  submitLabel?: string;
  loading?: boolean;
  className?: string;
}>(({ 
  fields, 
  onSubmit, 
  defaultValues = {}, 
  schema, 
  title, 
  description, 
  submitLabel = 'Submit',
  loading = false,
  className 
}) => {
  const { startMeasure, endMeasure } = usePerformanceMonitor('DynamicForm');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create dynamic schema if not provided
  const formSchema = useMemo(() => {
    if (schema) return schema;

    const schemaObject: Record<string, z.ZodSchema<any>> = {};
    fields.forEach(field => {
      if (field.validation) {
        schemaObject[field.name] = field.validation;
      } else {
        // Default validation based on type
        switch (field.type) {
          case 'email':
            schemaObject[field.name] = z.string().email('Invalid email address');
            break;
          case 'number':
            schemaObject[field.name] = z.number();
            break;
          case 'checkbox':
            schemaObject[field.name] = z.boolean();
            break;
          default:
            schemaObject[field.name] = field.required 
              ? z.string().min(1, 'This field is required')
              : z.string().optional();
        }
      }
    });

    return z.object(schemaObject);
  }, [fields, schema]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onChange'
  });

  useEffect(() => {
    startMeasure();
    return () => endMeasure();
  });

  const handleSubmit = useCallback(async (data: any) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [onSubmit]);

  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {fields.map((field) => (
            <OptimizedFormField
              key={field.name}
              config={field}
              form={form}
            />
          ))}

          {form.formState.errors.root && (
            <Alert variant="destructive">
              <AlertDescription>
                {form.formState.errors.root.message}
              </AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            disabled={loading || isSubmitting || !form.formState.isValid}
            className="w-full"
          >
            {(loading || isSubmitting) ? 'Loading...' : submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
});

DynamicForm.displayName = 'DynamicForm';

// Search form component with debouncing
export const OptimizedSearchForm = memo<{
  onSearch: (query: string, filters?: Record<string, any>) => void;
  placeholder?: string;
  filters?: FormFieldConfig[];
  debounceMs?: number;
  className?: string;
}>(({ onSearch, placeholder = 'Search...', filters = [], debounceMs = 300, className }) => {
  const [query, debouncedQuery, setQuery] = useDebouncedState('', debounceMs);
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});

  useEffect(() => {
    onSearch(debouncedQuery, filterValues);
  }, [debouncedQuery, filterValues, onSearch]);

  const handleFilterChange = useCallback((name: string, value: any) => {
    setFilterValues(prev => ({ ...prev, [name]: value }));
  }, []);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setQuery('');
            setFilterValues({});
          }}
        >
          Clear
        </Button>
      </div>

      {filters.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filters.map((filter) => (
            <div key={filter.name} className="space-y-2">
              <Label>{filter.label}</Label>
              {filter.type === 'select' ? (
                <Select
                  value={filterValues[filter.name] || ''}
                  onValueChange={(value: string) => handleFilterChange(filter.name, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={filter.placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {filter.options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type={filter.type}
                  placeholder={filter.placeholder}
                  value={filterValues[filter.name] || ''}
                  onChange={(e) => handleFilterChange(filter.name, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

OptimizedSearchForm.displayName = 'OptimizedSearchForm';

// Multi-step form component
export const MultiStepForm = memo<{
  steps: Array<{
    title: string;
    description?: string;
    fields: FormFieldConfig[];
  }>;
  onSubmit: (data: any) => void | Promise<void>;
  onStepChange?: (step: number) => void;
  defaultValues?: Record<string, any>;
  schema?: z.ZodSchema<any>;
  className?: string;
}>(({ steps, onSubmit, onStepChange, defaultValues = {}, schema, className }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepData, setStepData] = useState<Record<string, any>>({});

  const currentStepConfig = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const handleStepSubmit = useCallback(async (data: any) => {
    const newStepData = { ...stepData, ...data };
    setStepData(newStepData);

    if (isLastStep) {
      await onSubmit(newStepData);
    } else {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      onStepChange?.(nextStep);
    }
  }, [stepData, isLastStep, currentStep, onSubmit, onStepChange]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      onStepChange?.(prevStep);
    }
  }, [currentStep, onStepChange]);

  return (
    <div className={className}>
      {/* Step indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div
              key={index}
              className={cn(
                'flex items-center',
                index < steps.length - 1 && 'flex-1'
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                  index <= currentStep
                    ? 'bg-[hsl(var(--primary))] text-white'
                    : 'bg-gray-200 text-gray-600'
                )}
              >
                {index + 1}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-4',
                    index < currentStep ? 'bg-[hsl(var(--primary))]' : 'bg-gray-200'
                  )}
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-2">
          <h3 className="text-lg font-medium">{currentStepConfig.title}</h3>
          {currentStepConfig.description && (
            <p className="text-sm text-gray-600">{currentStepConfig.description}</p>
          )}
        </div>
      </div>

      {/* Current step form */}
      <DynamicForm
        fields={currentStepConfig.fields}
        onSubmit={handleStepSubmit}
        defaultValues={{ ...defaultValues, ...stepData }}
        submitLabel={isLastStep ? 'Submit' : 'Next'}
      />

      {/* Navigation buttons */}
      {currentStep > 0 && (
        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
          >
            Previous
          </Button>
        </div>
      )}
    </div>
  );
});

MultiStepForm.displayName = 'MultiStepForm';