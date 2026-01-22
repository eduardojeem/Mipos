const fs = require('fs');
const path = require('path');

const mockCustomersCode = `
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
`;

async function addMockEndpoints() {
  console.log('🔧 Agregando endpoints mock para clientes...');
  
  const customersFilePath = path.join(__dirname, 'apps', 'backend', 'src', 'routes', 'customers.ts');
  
  try {
    // Leer el archivo actual
    const currentContent = fs.readFileSync(customersFilePath, 'utf8');
    
    // Buscar el punto de inserción (después del endpoint mock existente)
    const insertionPoint = currentContent.indexOf('export default router;');
    
    if (insertionPoint === -1) {
      console.error('❌ No se encontró el punto de inserción en el archivo');
      return;
    }
    
    // Insertar los nuevos endpoints mock antes de la exportación
    const newContent = currentContent.slice(0, insertionPoint) + 
                      mockCustomersCode + 
                      '\\n' + 
                      currentContent.slice(insertionPoint);
    
    // Escribir el archivo actualizado
    fs.writeFileSync(customersFilePath, newContent, 'utf8');
    
    console.log('✅ Endpoints mock agregados exitosamente');
    console.log('📋 Endpoints disponibles:');
    console.log('   - GET /api/customers/mock-list (lista con paginación)');
    console.log('   - GET /api/customers/mock/:id (cliente específico)');
    console.log('   - POST /api/customers/mock-create (crear cliente)');
    console.log('   - PUT /api/customers/mock/:id (actualizar cliente)');
    console.log('   - DELETE /api/customers/mock/:id (eliminar cliente)');
    
  } catch (error) {
    console.error('❌ Error al agregar endpoints mock:', error.message);
  }
}

addMockEndpoints();