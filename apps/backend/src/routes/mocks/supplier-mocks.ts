/**
 * Mock data for suppliers - used in development mode
 */

export const mockSuppliers = [
    {
        id: 'mock-supplier-1',
        name: 'Proveedor Demo Uno',
        contactInfo: {
            phone: '+52 555-123-4567',
            email: 'proveedor1@demo.com',
            address: 'Av. Siempre Viva 742, CDMX',
            taxId: 'DEM123456789',
            status: 'active',
            category: 'regular'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'mock-supplier-2',
        name: 'Proveedor Demo Dos',
        contactInfo: {
            phone: '+52 555-987-6543',
            email: 'proveedor2@demo.com',
            address: 'Calle Falsa 123, Guadalajara',
            taxId: 'DEM987654321',
            status: 'active',
            category: 'premium'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'mock-supplier-3',
        name: 'Proveedor Demo Tres',
        contactInfo: {
            phone: '+52 555-456-7890',
            email: 'proveedor3@demo.com',
            address: 'Blvd. Principal 456, Monterrey',
            taxId: 'DEM456789123',
            status: 'active',
            category: 'regular'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
];

export const mockTags = [
    {
        id: '1',
        name: 'Premium',
        color: '#22c55e',
        description: 'Proveedores de alta calidad y confiabilidad',
        category: 'performance' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        supplierCount: 8
    },
    {
        id: '2',
        name: 'Local',
        color: '#3b82f6',
        description: 'Proveedores locales',
        category: 'location' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        supplierCount: 12
    },
    {
        id: '3',
        name: 'Internacional',
        color: '#8b5cf6',
        description: 'Proveedores internacionales',
        category: 'location' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        supplierCount: 5
    },
    {
        id: '4',
        name: 'Tecnología',
        color: '#06b6d4',
        description: 'Proveedores de tecnología y software',
        category: 'product' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        supplierCount: 15
    }
];

export function getMockSuppliersWithStats(skip: number, limit: number) {
    const pageItems = mockSuppliers.slice(skip, skip + limit);

    return pageItems.map((s) => ({
        ...s,
        totalPurchases: 0,
        lastPurchase: null,
        _count: { purchases: 0 }
    }));
}
