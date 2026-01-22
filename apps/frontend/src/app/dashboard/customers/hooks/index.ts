/**
 * Customer management hooks
 * 
 * Modular hooks for managing customer data, forms, filters, and bulk actions.
 * Part of the customers section refactoring to break down the monolithic component.
 */

export { useCustomersData } from './useCustomersData';
export type { UseCustomersDataConfig, UseCustomersDataReturn } from './useCustomersData';

export { useCustomerForm } from './useCustomerForm';
export type { UseCustomerFormReturn } from './useCustomerForm';

export { useCustomerFilters } from './useCustomerFilters';
export type { CustomerFiltersState, SortState, UseCustomerFiltersReturn } from './useCustomerFilters';

export { useCustomerBulkActions } from './useCustomerBulkActions';
export type { UseBulkActionsReturn, BulkActionResult } from './useCustomerBulkActions';
