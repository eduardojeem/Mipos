/**
 * Configuration for suppliers module
 */

export const SUPPLIERS_CONFIG = {
    pagination: {
        defaultLimit: 25,
        maxLimit: 100,
        minLimit: 1
    },
    validation: {
        maxNameLength: 200,
        maxNotes: 1000,
        maxPhoneLength: 20,
        maxEmailLength: 255,
        maxAddressLength: 500,
        maxContactPersonLength: 200,
        maxWebsiteLength: 255,
        maxTaxIdLength: 50,
        maxCategoryLength: 100,
        maxTagNameLength: 100,
        maxTagDescriptionLength: 500
    },
    commercialConditions: {
        maxPaymentTerms: 180,
        maxDiscount: 100
    },
    tags: {
        maxTagsPerSupplier: 10,
        maxSuppliersPerBulkAssign: 100
    },
    features: {
        analytics: true,
        segmentation: true,
        tags: true,
        priceHistory: true,
        performance: true
    }
} as const;

export type SuppliersConfig = typeof SUPPLIERS_CONFIG;
