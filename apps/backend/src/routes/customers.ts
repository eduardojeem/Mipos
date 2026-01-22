import express from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { validateBody, validateQuery, validateParams, commonSchemas, sanitize } from '../middleware/input-validator';
import { auditLogger } from '../middleware/audit';

const router = express.Router();

// Aplicar middleware de auditoría a todas las rutas
router.use(auditLogger);

// Mock endpoint for testing authentication without database
router.get('/mock', asyncHandler(async (req: AuthenticatedRequest, res) => {
  console.log('🧪 Mock endpoint llamado por usuario:', req.user);
  
  const mockCustomers = [
    {
      id: '1',
      name: 'Cliente de Prueba 1',
      phone: '123-456-7890',
      email: 'cliente1@test.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Cliente de Prueba 2',
      phone: '098-765-4321',
      email: 'cliente2@test.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  res.json({
    success: true,
    data: mockCustomers,
    total: mockCustomers.length,
    page: 1,
    limit: 10,
    message: 'Mock data - authentication working!'
  });
}));

// Enhanced validation schemas with better security
const createCustomerSchema = z.object({
  name: z.string()
    .min(1, 'Customer name is required')
    .max(200, 'Customer name too long')
    .transform(val => sanitize.string(val)),
  phone: z.string()
    .max(20, 'Phone number too long')
    .regex(/^[\d\s\-\+\(\)\.]+$/, 'Invalid phone number format')
    .optional()
    .transform(val => val ? sanitize.string(val) : val),
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email too long')
    .optional()
    .transform(val => val ? sanitize.email(val) : val)
});

const updateCustomerSchema = createCustomerSchema.partial();

const enhancedQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => {
    const parsed = val ? parseInt(val, 10) : 10;
    return Math.min(Math.max(parsed, 1), 100);
  }),
  search: z.string()
    .max(100, 'Search query too long')
    .optional()
    .transform(val => val ? sanitize.string(val) : val)
}).refine(data => {
  return data.page >= 1 && data.limit >= 1 && data.limit <= 100;
}, {
  message: 'Page must be >= 1, limit must be between 1 and 100'
});

// Get all customers with pagination
router.get('/', validateQuery(enhancedQuerySchema), asyncHandler(async (req, res) => {
  const { page, limit, search } = req.query as any;
  const skip = (page - 1) * limit;

  const where: any = {
    isActive: true // Solo mostrar clientes activos por defecto
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        customerType: true,
        status: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        totalPurchases: true,
        last_purchase: true,
        _count: {
          select: {
            sales: true
          }
        }
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit
    }),
    prisma.customer.count({ where })
  ]);

  // Optimización: Obtener estadísticas en una sola consulta agregada
  const customerIds = customers.map(c => c.id);
  const salesStats = await prisma.sale.groupBy({
    by: ['customerId'],
    where: {
      customerId: { in: customerIds }
    },
    _sum: {
      total: true
    },
    _max: {
      date: true
    }
  });

  // Crear un mapa para acceso rápido a las estadísticas
  const statsMap = new Map(
    salesStats.map(stat => [
      stat.customerId,
      {
        totalSpent: stat._sum.total || 0,
        lastPurchaseDate: stat._max.date
      }
    ])
  );

  // Combinar datos de clientes con estadísticas
  const customersWithStats = customers.map(customer => ({
    ...customer,
    totalSpent: statsMap.get(customer.id)?.totalSpent || 0,
    lastPurchaseDate: statsMap.get(customer.id)?.lastPurchaseDate || customer.lastPurchase
  }));

  res.json({
    customers: customersWithStats,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// Get all customers (simple list for dropdowns)
router.get('/list', asyncHandler(async (req, res) => {
  const customers = await prisma.customer.findMany({
    where: {
      isActive: true // Solo clientes activos para dropdowns
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true
    },
    orderBy: { name: 'asc' }
  });

  res.json({ customers });
}));

// Sync customer statistics with real sales data
router.post('/sync-statistics', asyncHandler(async (req: AuthenticatedRequest, res) => {
  console.log('🔄 Sincronizando estadísticas de clientes con ventas reales...');
  
  try {
    // Get all customers with their real sales statistics
    const customersWithSales = await prisma.customer.findMany({
      where: { isActive: true },
      include: {
        sales: {
          select: {
            total: true,
            date: true
          }
        }
      }
    });

    let updatedCount = 0;

    // Update each customer's statistics
    for (const customer of customersWithSales) {
      const totalPurchases = customer.sales.reduce((sum, sale) => sum + sale.total, 0);
      const lastPurchase = customer.sales.length > 0 
        ? customer.sales.reduce((latest, sale) => 
            sale.date > latest ? sale.date : latest, customer.sales[0].date)
        : null;

      // Only update if there are changes
      if (customer.totalPurchases !== totalPurchases || 
          customer.last_purchase?.getTime() !== lastPurchase?.getTime()) {
        
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            totalPurchases,
            last_purchase: lastPurchase
          }
        });
        updatedCount++;
      }
    }

    res.json({
      success: true,
      message: `Estadísticas sincronizadas exitosamente`,
      updatedCustomers: updatedCount,
      totalCustomers: customersWithSales.length
    });

  } catch (error) {
    console.error('Error sincronizando estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al sincronizar estadísticas de clientes'
    });
  }
}));

// Get customer analytics and insights
router.get('/analytics', asyncHandler(async (req: AuthenticatedRequest, res) => {
  try {
    // Get comprehensive customer analytics
    const [
      totalCustomers,
      activeCustomers,
      customersWithPurchases,
      topCustomers,
      customersByType,
      recentCustomers,
      customerGrowth
    ] = await Promise.all([
      // Total customers
      prisma.customer.count(),
      
      // Active customers (with purchases in last 30 days)
      prisma.customer.count({
        where: {
          isActive: true,
          last_purchase: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Customers with at least one purchase
      prisma.customer.count({
        where: {
          isActive: true,
          totalPurchases: { gt: 0 }
        }
      }),
      
      // Top 10 customers by total spent
      prisma.customer.findMany({
        where: { 
          isActive: true,
          totalPurchases: { gt: 0 }
        },
        orderBy: { totalPurchases: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          totalPurchases: true,
          last_purchase: true,
          _count: { select: { sales: true } }
        }
      }),
      
      // Customers by type
      prisma.customer.groupBy({
        by: ['customerType'],
        where: { isActive: true },
        _count: { id: true },
        _sum: { totalPurchases: true }
      }),
      
      // Recent customers (last 30 days)
      prisma.customer.count({
        where: {
          isActive: true,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Customer growth (last 6 months)
      prisma.customer.groupBy({
        by: ['createdAt'],
        where: {
          isActive: true,
          createdAt: {
            gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000)
          }
        },
        _count: { id: true }
      })
    ]);

    // Calculate average order value for customers with purchases
    const avgOrderValue = customersWithPurchases > 0 
      ? await prisma.sale.aggregate({
          _avg: { total: true },
          where: { customerId: { not: null } }
        })
      : { _avg: { total: 0 } };

    // Calculate customer lifetime value
    const totalRevenue = await prisma.customer.aggregate({
      _sum: { totalPurchases: true },
      where: { isActive: true }
    });

    const analytics = {
      overview: {
        totalCustomers,
        activeCustomers,
        customersWithPurchases,
        recentCustomers,
        conversionRate: totalCustomers > 0 ? (customersWithPurchases / totalCustomers * 100).toFixed(2) : 0
      },
      financial: {
        totalRevenue: totalRevenue._sum.totalPurchases || 0,
        averageOrderValue: avgOrderValue._avg.total || 0,
        averageCustomerValue: customersWithPurchases > 0 
          ? (totalRevenue._sum.totalPurchases || 0) / customersWithPurchases 
          : 0
      },
      topCustomers,
      customersByType: customersByType.map(type => ({
        type: type.customerType,
        count: type._count.id,
        totalRevenue: type._sum.totalPurchases || 0
      })),
      growth: {
        newCustomersThisMonth: recentCustomers,
        monthlyGrowth: customerGrowth
      }
    };

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Error obteniendo analytics de clientes:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener analytics de clientes'
    });
  }
}));

// Mock endpoints for customers - temporary solution while database issues are resolved
router.get('/mock-list', asyncHandler(async (req: AuthenticatedRequest, res) => {
  console.log('🧪 Mock list endpoint llamado por usuario:', req.user);
  
  const mockCustomers = [
    {
      id: '1',
      name: 'Juan Pérez',
      phone: '123-456-7890',
      email: 'juan@email.com',
      address: 'Calle Principal 123',
      customerType: 'REGULAR',
      status: 'ACTIVE',
      isActive: true,
      totalSpent: 1250.50,
      totalOrders: 8,
      lastPurchaseDate: new Date('2024-01-15'),
      createdAt: new Date('2023-06-01').toISOString(),
      updatedAt: new Date('2024-01-15').toISOString()
    },
    {
      id: '2',
      name: 'María García',
      phone: '098-765-4321',
      email: 'maria@email.com',
      address: 'Avenida Central 456',
      customerType: 'PREMIUM',
      status: 'ACTIVE',
      isActive: true,
      totalSpent: 3420.75,
      totalOrders: 15,
      lastPurchaseDate: new Date('2024-01-20'),
      createdAt: new Date('2023-05-15').toISOString(),
      updatedAt: new Date('2024-01-20').toISOString()
    },
    {
      id: '3',
      name: 'Carlos López',
      phone: '555-123-4567',
      email: 'carlos@email.com',
      address: 'Plaza Mayor 789',
      customerType: 'REGULAR',
      status: 'ACTIVE',
      isActive: true,
      totalSpent: 890.25,
      totalOrders: 5,
      lastPurchaseDate: new Date('2024-01-10'),
      createdAt: new Date('2023-07-20').toISOString(),
      updatedAt: new Date('2024-01-10').toISOString()
    },
    {
      id: '4',
      name: 'Ana Martínez',
      phone: '777-888-9999',
      email: 'ana@email.com',
      address: 'Barrio Norte 321',
      customerType: 'VIP',
      status: 'ACTIVE',
      isActive: true,
      totalSpent: 5670.00,
      totalOrders: 22,
      lastPurchaseDate: new Date('2024-01-25'),
      createdAt: new Date('2023-04-10').toISOString(),
      updatedAt: new Date('2024-01-25').toISOString()
    },
    {
      id: '5',
      name: 'Roberto Silva',
      phone: '444-555-6666',
      email: 'roberto@email.com',
      address: 'Zona Industrial 654',
      customerType: 'REGULAR',
      status: 'INACTIVE',
      isActive: false,
      totalSpent: 320.50,
      totalOrders: 2,
      lastPurchaseDate: new Date('2023-12-05'),
      createdAt: new Date('2023-08-30').toISOString(),
      updatedAt: new Date('2023-12-05').toISOString()
    }
  ];

  // Aplicar filtros de búsqueda si existen
  const { search, page = 1, limit = 10 } = req.query;
  let filteredCustomers = mockCustomers;

  if (search) {
    const searchTerm = search.toString().toLowerCase();
    filteredCustomers = mockCustomers.filter(customer => 
      customer.name.toLowerCase().includes(searchTerm) ||
      customer.email.toLowerCase().includes(searchTerm) ||
      customer.phone.includes(searchTerm)
    );
  }

  // Aplicar paginación
  const startIndex = (parseInt(page.toString()) - 1) * parseInt(limit.toString());
  const endIndex = startIndex + parseInt(limit.toString());
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

  res.json({
    customers: paginatedCustomers,
    pagination: {
      page: parseInt(page.toString()),
      limit: parseInt(limit.toString()),
      total: filteredCustomers.length,
      pages: Math.ceil(filteredCustomers.length / parseInt(limit.toString()))
    },
    message: 'Mock data - database connection issues resolved temporarily'
  });
}));

// Mock endpoint para obtener un cliente específico
router.get('/mock/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  console.log('🧪 Mock get customer endpoint llamado por usuario:', req.user);
  
  const { id } = req.params;
  
  const mockCustomers = [
    {
      id: '1',
      name: 'Juan Pérez',
      phone: '123-456-7890',
      email: 'juan@email.com',
      address: 'Calle Principal 123',
      customerType: 'REGULAR',
      status: 'ACTIVE',
      isActive: true,
      totalSpent: 1250.50,
      totalOrders: 8,
      lastPurchaseDate: new Date('2024-01-15'),
      createdAt: new Date('2023-06-01').toISOString(),
      updatedAt: new Date('2024-01-15').toISOString()
    },
    {
      id: '2',
      name: 'María García',
      phone: '098-765-4321',
      email: 'maria@email.com',
      address: 'Avenida Central 456',
      customerType: 'PREMIUM',
      status: 'ACTIVE',
      isActive: true,
      totalSpent: 3420.75,
      totalOrders: 15,
      lastPurchaseDate: new Date('2024-01-20'),
      createdAt: new Date('2023-05-15').toISOString(),
      updatedAt: new Date('2024-01-20').toISOString()
    },
    {
      id: '3',
      name: 'Carlos López',
      phone: '555-123-4567',
      email: 'carlos@email.com',
      address: 'Plaza Mayor 789',
      customerType: 'REGULAR',
      status: 'ACTIVE',
      isActive: true,
      totalSpent: 890.25,
      totalOrders: 5,
      lastPurchaseDate: new Date('2024-01-10'),
      createdAt: new Date('2023-07-20').toISOString(),
      updatedAt: new Date('2024-01-10').toISOString()
    },
    {
      id: '4',
      name: 'Ana Martínez',
      phone: '777-888-9999',
      email: 'ana@email.com',
      address: 'Barrio Norte 321',
      customerType: 'VIP',
      status: 'ACTIVE',
      isActive: true,
      totalSpent: 5670.00,
      totalOrders: 22,
      lastPurchaseDate: new Date('2024-01-25'),
      createdAt: new Date('2023-04-10').toISOString(),
      updatedAt: new Date('2024-01-25').toISOString()
    },
    {
      id: '5',
      name: 'Roberto Silva',
      phone: '444-555-6666',
      email: 'roberto@email.com',
      address: 'Zona Industrial 654',
      customerType: 'REGULAR',
      status: 'INACTIVE',
      isActive: false,
      totalSpent: 320.50,
      totalOrders: 2,
      lastPurchaseDate: new Date('2023-12-05'),
      createdAt: new Date('2023-08-30').toISOString(),
      updatedAt: new Date('2023-12-05').toISOString()
    }
  ];

  const customer = mockCustomers.find(c => c.id === id);
  
  if (!customer) {
    return res.status(404).json({ 
      error: 'Customer not found',
      message: 'Mock data - customer with specified ID does not exist'
    });
  }

  res.json({
    customer,
    message: 'Mock data - database connection issues resolved temporarily'
  });
}));

// Get customer by ID with sales and statistics
router.get('/:id', validateParams(commonSchemas.id), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Optimización: Usar Promise.all para consultas paralelas
  const [customer, salesStats] = await Promise.all([
    prisma.customer.findUnique({
      where: { 
        id,
        isActive: true // Solo mostrar clientes activos
      },
      include: {
        sales: {
          orderBy: { date: 'desc' },
          take: 10,
          select: {
            id: true,
            total: true,
            date: true,
            paymentMethod: true,
            saleItems: {
              select: {
                id: true,
                quantity: true,
                unitPrice: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            sales: true
          }
        }
      }
    }),
    // Obtener estadísticas en paralelo
    prisma.sale.aggregate({
      where: { customerId: id },
      _sum: { total: true },
      _avg: { total: true },
      _count: { id: true }
    })
  ]);

  if (!customer) {
    throw createError('Customer not found or inactive', 404);
  }

  const averageOrderValue = salesStats._avg.total || 0;

  res.json({ 
    customer: {
      ...customer,
      stats: {
        totalSpent: salesStats._sum.total || 0,
        totalOrders: customer._count.sales,
        averageOrderValue
      }
    }
  });
}));

// Create customer
router.post('/', validateBody(createCustomerSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { name, email, phone } = req.body;

  // Validación de duplicados
  const existingCustomer = await prisma.customer.findFirst({
    where: {
      OR: [
        { email: email, isActive: true },
        { phone: phone, isActive: true }
      ]
    }
  });

  if (existingCustomer) {
    if (existingCustomer.email === email) {
      throw createError('Ya existe un cliente activo con este email', 409);
    }
    if (existingCustomer.phone === phone) {
      throw createError('Ya existe un cliente activo con este teléfono', 409);
    }
  }

  const customer = await prisma.customer.create({
    data: req.body,
    include: {
      _count: {
        select: {
          sales: true
        }
      }
    }
  });

  res.status(201).json({ 
    message: 'Customer created successfully',
    customer 
  });
}));

// Update customer
router.put('/:id', validateParams(commonSchemas.id), validateBody(updateCustomerSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { email, phone, ...otherData } = req.body;

  // Check if customer exists
  const existingCustomer = await prisma.customer.findUnique({
    where: { id }
  });

  if (!existingCustomer) {
    throw createError('Customer not found', 404);
  }

  // Validación de duplicados (excluyendo el cliente actual)
  if (email || phone) {
    const duplicateCustomer = await prisma.customer.findFirst({
      where: {
        AND: [
          { id: { not: id } }, // Excluir el cliente actual
          { isActive: true },
          {
            OR: [
              ...(email ? [{ email }] : []),
              ...(phone ? [{ phone }] : [])
            ]
          }
        ]
      }
    });

    if (duplicateCustomer) {
      if (duplicateCustomer.email === email) {
        throw createError('Ya existe otro cliente activo con este email', 409);
      }
      if (duplicateCustomer.phone === phone) {
        throw createError('Ya existe otro cliente activo con este teléfono', 409);
      }
    }
  }

  const customer = await prisma.customer.update({
    where: { id },
    data: { email, phone, ...otherData },
    include: {
      _count: {
        select: {
          sales: true
        }
      }
    }
  });

  res.json({ 
    message: 'Customer updated successfully',
    customer 
  });
}));

// Delete customer (soft delete)
router.delete('/:id', validateParams(commonSchemas.id), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          sales: true
        }
      }
    }
  });

  if (!customer) {
    throw createError('Customer not found', 404);
  }

  // Implementar soft delete - marcar como inactivo en lugar de eliminar
  const updatedCustomer = await prisma.customer.update({
    where: { id },
    data: { 
      isActive: false,
      status: 'inactive',
      updatedAt: new Date()
    }
  });

  res.json({ 
    message: 'Customer deactivated successfully (soft delete)',
    customer: updatedCustomer
  });
}));

// Search customers by name or phone
router.get('/search/:query', validateParams(z.object({ query: z.string().min(1).max(100).transform(val => sanitize.string(val)) })), asyncHandler(async (req, res) => {
  const { query } = req.params;

  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } }
      ]
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true
    },
    take: 10,
    orderBy: { name: 'asc' }
  });

  res.json({ customers });
}));


// Mock endpoints for customers - temporary solution while database issues are resolved
router.get('/mock-list', asyncHandler(async (req: AuthenticatedRequest, res) => {
  console.log('🧪 Mock list endpoint llamado por usuario:', req.user);
  
  const mockCustomers = [
    {
      id: '1',
      name: 'Juan Pérez',
      phone: '123-456-7890',
      email: 'juan@email.com',
      address: 'Calle Principal 123',
      customerType: 'REGULAR',
      status: 'ACTIVE',
      isActive: true,
      totalSpent: 1250.50,
      totalOrders: 8,
      lastPurchaseDate: new Date('2024-01-15'),
      createdAt: new Date('2023-06-01').toISOString(),
      updatedAt: new Date('2024-01-15').toISOString()
    },
    {
      id: '2',
      name: 'María García',
      phone: '098-765-4321',
      email: 'maria@email.com',
      address: 'Avenida Central 456',
      customerType: 'PREMIUM',
      status: 'ACTIVE',
      isActive: true,
      totalSpent: 3420.75,
      totalOrders: 15,
      lastPurchaseDate: new Date('2024-01-20'),
      createdAt: new Date('2023-05-15').toISOString(),
      updatedAt: new Date('2024-01-20').toISOString()
    },
    {
      id: '3',
      name: 'Carlos López',
      phone: '555-123-4567',
      email: 'carlos@email.com',
      address: 'Plaza Mayor 789',
      customerType: 'REGULAR',
      status: 'ACTIVE',
      isActive: true,
      totalSpent: 890.25,
      totalOrders: 5,
      lastPurchaseDate: new Date('2024-01-10'),
      createdAt: new Date('2023-07-20').toISOString(),
      updatedAt: new Date('2024-01-10').toISOString()
    },
    {
      id: '4',
      name: 'Ana Martínez',
      phone: '777-888-9999',
      email: 'ana@email.com',
      address: 'Barrio Norte 321',
      customerType: 'VIP',
      status: 'ACTIVE',
      isActive: true,
      totalSpent: 5670.00,
      totalOrders: 22,
      lastPurchaseDate: new Date('2024-01-25'),
      createdAt: new Date('2023-04-10').toISOString(),
      updatedAt: new Date('2024-01-25').toISOString()
    },
    {
      id: '5',
      name: 'Roberto Silva',
      phone: '444-555-6666',
      email: 'roberto@email.com',
      address: 'Zona Industrial 654',
      customerType: 'REGULAR',
      status: 'INACTIVE',
      isActive: false,
      totalSpent: 320.50,
      totalOrders: 2,
      lastPurchaseDate: new Date('2023-12-05'),
      createdAt: new Date('2023-08-30').toISOString(),
      updatedAt: new Date('2023-12-05').toISOString()
    }
  ];

  // Aplicar filtros de búsqueda si existen
  const { search, page = 1, limit = 10 } = req.query;
  let filteredCustomers = mockCustomers;

  if (search) {
    const searchTerm = search.toString().toLowerCase();
    filteredCustomers = mockCustomers.filter(customer => 
      customer.name.toLowerCase().includes(searchTerm) ||
      customer.email.toLowerCase().includes(searchTerm) ||
      customer.phone.includes(searchTerm)
    );
  }

  // Aplicar paginación
  const startIndex = (parseInt(page.toString()) - 1) * parseInt(limit.toString());
  const endIndex = startIndex + parseInt(limit.toString());
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

  res.json({
    customers: paginatedCustomers,
    pagination: {
      page: parseInt(page.toString()),
      limit: parseInt(limit.toString()),
      total: filteredCustomers.length,
      pages: Math.ceil(filteredCustomers.length / parseInt(limit.toString()))
    },
    message: 'Mock data - database connection issues resolved temporarily'
  });
}));

// Mock endpoint para obtener un cliente específico
router.get('/mock/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  console.log('🧪 Mock get customer endpoint llamado por usuario:', req.user);
  
  const { id } = req.params;
  
  const mockCustomers = [
    {
      id: '1',
      name: 'Juan Pérez',
      phone: '123-456-7890',
      email: 'juan@email.com',
      address: 'Calle Principal 123',
      customerType: 'REGULAR',
      status: 'ACTIVE',
      isActive: true,
      totalSpent: 1250.50,
      totalOrders: 8,
      lastPurchaseDate: new Date('2024-01-15'),
      createdAt: new Date('2023-06-01').toISOString(),
      updatedAt: new Date('2024-01-15').toISOString(),
      sales: [
        {
          id: 'sale1',
          total: 150.25,
          date: new Date('2024-01-15').toISOString(),
          paymentMethod: 'CASH'
        },
        {
          id: 'sale2',
          total: 89.50,
          date: new Date('2024-01-10').toISOString(),
          paymentMethod: 'CARD'
        }
      ]
    }
  ];

  const customer = mockCustomers.find(c => c.id === id);
  
  if (!customer) {
    return res.status(404).json({
      error: 'Customer not found',
      message: 'El cliente solicitado no existe en los datos mock'
    });
  }

  res.json({
    customer,
    message: 'Mock data - customer details'
  });
}));

// Mock endpoint para crear un cliente
router.post('/mock-create', asyncHandler(async (req: AuthenticatedRequest, res) => {
  console.log('🧪 Mock create customer endpoint llamado por usuario:', req.user);
  console.log('📝 Datos recibidos:', req.body);
  
  const { name, email, phone, address } = req.body;
  
  // Validación básica
  if (!name) {
    return res.status(400).json({
      error: 'Validation error',
      message: 'El nombre del cliente es requerido'
    });
  }

  const newCustomer = {
    id: Date.now().toString(),
    name,
    email: email || null,
    phone: phone || null,
    address: address || null,
    customerType: 'REGULAR',
    status: 'ACTIVE',
    isActive: true,
    totalSpent: 0,
    totalOrders: 0,
    lastPurchaseDate: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  res.status(201).json({
    message: 'Customer created successfully (mock)',
    customer: newCustomer
  });
}));

// Mock endpoint para actualizar un cliente
router.put('/mock/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  console.log('🧪 Mock update customer endpoint llamado por usuario:', req.user);
  console.log('📝 Datos recibidos:', req.body);
  
  const { id } = req.params;
  const { name, email, phone, address } = req.body;
  
  const updatedCustomer = {
    id,
    name: name || 'Cliente Actualizado',
    email: email || 'updated@email.com',
    phone: phone || '000-000-0000',
    address: address || 'Dirección actualizada',
    customerType: 'REGULAR',
    status: 'ACTIVE',
    isActive: true,
    totalSpent: 500.00,
    totalOrders: 3,
    lastPurchaseDate: new Date().toISOString(),
    createdAt: new Date('2023-06-01').toISOString(),
    updatedAt: new Date().toISOString()
  };

  res.json({
    message: 'Customer updated successfully (mock)',
    customer: updatedCustomer
  });
}));

// Mock endpoint para eliminar un cliente
router.delete('/mock/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  console.log('🧪 Mock delete customer endpoint llamado por usuario:', req.user);
  
  const { id } = req.params;
  
  res.json({
    message: 'Customer deleted successfully (mock)',
    deletedId: id
  });
}));

export default router;