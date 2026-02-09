import { z } from 'zod';

/**
 * Returns Configuration
 * Centralized configuration for returns module validation and business rules
 */
export const RETURNS_CONFIG = {
    // Pagination settings
    pagination: {
        defaultLimit: 25,
        maxLimit: 100,
        minLimit: 1
    },

    // Validation limits
    validation: {
        maxReasonLength: 1000,
        maxNotesLength: 1000,
        maxItemsPerReturn: 50,
        maxQuantityPerItem: 10000,
        minQuantityPerItem: 1
    },

    // Business rules
    business: {
        allowedRefundMethods: ['CASH', 'CARD', 'TRANSFER', 'OTHER'] as const,
        deletableStatuses: ['PENDING'] as const,
        processableStatuses: ['APPROVED'] as const,
        statusTransitions: {
            PENDING: ['APPROVED', 'REJECTED'],
            APPROVED: ['COMPLETED', 'REJECTED'],
            REJECTED: [],
            COMPLETED: []
        } as Record<string, string[]>
    }
} as const;

// Type exports for use in validation schemas
export type RefundMethod = typeof RETURNS_CONFIG.business.allowedRefundMethods[number];
export type ReturnStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
