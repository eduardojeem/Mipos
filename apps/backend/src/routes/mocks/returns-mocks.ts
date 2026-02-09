/**
 * Returns Mock Data
 * Centralized mock data for development mode
 */

export const mockReturns = [
    {
        id: '1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p',
        originalSaleId: '9a8b7c6d-5e4f-3g2h-1i0j-9k8l7m6n5o4p',
        customerId: '7f6e5d4c-3b2a-1g9h-8i7j-6k5l4m3n2o1p',
        customer: {
            id: '7f6e5d4c-3b2a-1g9h-8i7j-6k5l4m3n2o1p',
            name: 'María González',
            phone: '+54 11 4567-8901',
            email: 'maria.gonzalez@email.com'
        },
        total: 15000,
        reason: 'Producto defectuoso',
        refundMethod: 'CASH',
        status: 'PENDING',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        returnItems: [
            {
                id: '1',
                productId: 'prod-001',
                quantity: 2,
                unitPrice: 7500,
                reason: 'Defectuoso',
                product: {
                    id: 'prod-001',
                    name: 'Laptop Dell XPS 13',
                    sku: 'DELL-XPS-001'
                }
            }
        ]
    },
    {
        id: '2b3c4d5e-6f7g-8h9i-0j1k-2l3m4n5o6p7q',
        originalSaleId: '8b7c6d5e-4f3g-2h1i-0j9k-8l7m6n5o4p3q',
        customerId: '6e5d4c3b-2a1g-9h8i-7j6k-5l4m3n2o1p0q',
        customer: {
            id: '6e5d4c3b-2a1g-9h8i-7j6k-5l4m3n2o1p0q',
            name: 'Juan Pérez',
            phone: '+54 11 2345-6789',
            email: 'juan.perez@email.com'
        },
        total: 8500,
        reason: 'Cliente no satisfecho',
        refundMethod: 'CARD',
        status: 'APPROVED',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        returnItems: [
            {
                id: '2',
                productId: 'prod-002',
                quantity: 1,
                unitPrice: 8500,
                reason: 'No cumple expectativas',
                product: {
                    id: 'prod-002',
                    name: 'Mouse Logitech MX Master 3',
                    sku: 'LOGI-MX3-001'
                }
            }
        ]
    },
    {
        id: '3c4d5e6f-7g8h-9i0j-1k2l-3m4n5o6p7q8r',
        originalSaleId: '7c6d5e4f-3g2h-1i0j-9k8l-7m6n5o4p3q2r',
        customerId: null,
        customer: null,
        total: 3200,
        reason: 'Producto vencido',
        refundMethod: 'CASH',
        status: 'COMPLETED',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        processedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        returnItems: [
            {
                id: '3',
                productId: 'prod-003',
                quantity: 4,
                unitPrice: 800,
                reason: 'Fecha de vencimiento pasada',
                product: {
                    id: 'prod-003',
                    name: 'Yogurt Natural',
                    sku: 'FOOD-YOG-001'
                }
            }
        ]
    }
];

export const mockReturnStats = {
    totalReturns: 15,
    totalAmount: 45000,
    pendingReturns: 5,
    pendingAmount: 18000,
    approvedReturns: 3,
    approvedAmount: 12000,
    rejectedReturns: 2,
    rejectedAmount: 5000,
    completedReturns: 5,
    completedAmount: 10000,
    returnRate: 2.5,
    avgProcessingTime: 48
};

export function getMockReturnsWithPagination(
    page: number = 1,
    limit: number = 25,
    filters?: {
        search?: string;
        status?: string;
        customerId?: string;
        startDate?: string;
        endDate?: string;
    }
) {
    let filtered = [...mockReturns];

    // Apply filters
    if (filters?.status) {
        filtered = filtered.filter(r => r.status === filters.status);
    }

    if (filters?.customerId) {
        filtered = filtered.filter(r => r.customerId === filters.customerId);
    }

    if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(r =>
            r.id.toLowerCase().includes(searchLower) ||
            r.customer?.name.toLowerCase().includes(searchLower) ||
            r.reason.toLowerCase().includes(searchLower)
        );
    }

    // Pagination
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;
    const paginatedReturns = filtered.slice(skip, skip + limit);

    return {
        returns: paginatedReturns,
        pagination: {
            page,
            limit,
            total,
            totalPages
        }
    };
}
