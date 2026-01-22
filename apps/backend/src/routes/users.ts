import express from 'express';
import { z } from 'zod';
import { prisma, supabase } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { EnhancedAuthenticatedRequest, requirePermission, requireAnyPermission, hasPermission } from '../middleware/enhanced-auth';
import { criticalOperationsRateLimit, apiRateLimit } from '../middleware/rate-limiter';

// Define UserRole type since it's not exported from @prisma/client
type UserRole = 'ADMIN' | 'CASHIER' | 'MANAGER' | 'EMPLOYEE';

const router = express.Router();

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['ADMIN', 'CASHIER']).default('CASHIER')
});

const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  role: z.enum(['ADMIN', 'CASHIER']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional()
});

const querySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1),
  limit: z.string().transform(val => Math.min(parseInt(val) || 10, 100)),
  search: z.string().optional(),
  role: z.string().optional(),
  status: z.string().optional()
});

// Get all users (requires users:read permission)
router.get('/', requirePermission('users', 'read'), asyncHandler(async (req, res) => {
  const { page, limit, search, role, status } = querySchema.parse(req.query);
  const skip = (page - 1) * limit;

  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } }
    ];
  }

  if (role) {
    where.role = role;
  }

  if (status) {
    where.status = status;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            sales: true,
            purchases: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.user.count({ where })
  ]);

  res.json({
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

// Get user by ID (requires users:read permission)
router.get('/:id', requirePermission('users', 'read'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      sales: {
        select: {
          id: true,
          total: true,
          date: true,
          paymentMethod: true
        },
        orderBy: { date: 'desc' },
        take: 10
      },
      purchases: {
        select: {
          id: true,
          total: true,
          date: true,
          supplier: {
            select: {
              name: true
            }
          }
        },
        orderBy: { date: 'desc' },
        take: 10
      },
      _count: {
        select: {
          sales: true,
          purchases: true
        }
      }
    }
  });

  if (!user) {
    throw createError('User not found', 404);
  }

  res.json({ user });
}));

// Create user (requires users:create permission) - Rate limited for critical operations
router.post('/', criticalOperationsRateLimit, requirePermission('users', 'create'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { email, password, name, role } = createUserSchema.parse(req.body);

  // Create user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (authError) {
    throw createError(authError.message, 400);
  }

  if (!authData.user) {
    throw createError('Failed to create user', 500);
  }

  // Create user in our database
  try {
    const user = await prisma.user.create({
      data: {
        id: authData.user.id,
        email,
        fullName: name,
        role: role as UserRole,
        isActive: true
      }
    });

    res.status(201).json({ user });
  } catch (error) {
    // If database creation fails, delete the auth user
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw error;
  }
}));

// Update user (requires users:update permission) - Rate limited for critical operations
router.put('/:id', criticalOperationsRateLimit, requirePermission('users', 'update'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { id } = req.params;
  const validatedData = updateUserSchema.parse(req.body);
  const { name, role } = validatedData;

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id }
  });

  if (!existingUser) {
    throw createError('User not found', 404);
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { ...(name ? { fullName: name } : {}), ...(role ? { role } : {}) }
  });

  res.json({ user: updatedUser });
}));

// Delete user (requires users:delete permission) - Rate limited for critical operations
router.delete('/:id', criticalOperationsRateLimit, requirePermission('users', 'delete'), asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { id } = req.params;
  const currentUserId = req.user!.id;

  // Prevent self-deletion
  if (id === currentUserId) {
    throw createError('Cannot delete your own account', 400);
  }

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id }
  });

  if (!user) {
    throw createError('User not found', 404);
  }

  // Note: Since SupabasePrismaAdapter doesn't support include, 
  // we'll skip the sales/purchases check for now
  // In a full implementation, you'd need separate queries to check relations

  // Delete from database first
  await prisma.user.delete({
    where: { id }
  });

  // Delete from Supabase Auth
  await supabase.auth.admin.deleteUser(id);

  res.json({ message: 'User deleted successfully' });
}));

// Get user statistics (requires reports:view permission)
router.get('/stats/overview', requirePermission('reports', 'view'), asyncHandler(async (req, res) => {
  const [totalUsers, usersByRole, activeUsers] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({
      by: ['role'],
      _count: {
        id: true
      }
    }),
    prisma.user.count({
      where: {
        sales: {
          some: {
            date: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          }
        }
      }
    })
  ]);

  res.json({
    totalUsers,
    usersByRole,
    activeUsers
  });
}));

// GET /api/users/:userId/permissions
router.get('/:userId/permissions', requirePermission('users', 'read'), asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user with role information
    const userData = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true
      }
    });

    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get role and permissions based on user's role field
    let permissions: any[] = [];
    let roles: string[] = [];

    if (userData.role) {
      // Find the role by name
      const roleData = await prisma.role.findUnique({
        where: { name: userData.role },
        select: {
          id: true,
          name: true,
          permissions: {
            where: { isActive: true },
            select: {
              permission: {
                select: {
                  id: true,
                  name: true,
                  resource: true,
                  action: true,
                  description: true
                }
              }
            }
          }
        }
      });

      if (roleData) {
        roles.push(roleData.name);
        permissions = roleData.permissions.map(rp => rp.permission);
      }
    }

    res.json({
      permissions,
      roles
    });

  } catch (error) {
    console.error('Error fetching user permissions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));

// PUT /api/users/:id/status - Update user status (requires users:update permission)
router.put('/:id/status', requirePermission('users', 'update'), criticalOperationsRateLimit, asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { id } = req.params;
  const { status } = z.object({
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED'])
  }).parse(req.body);

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, status: true }
  });

  if (!existingUser) {
    throw createError('User not found', 404);
  }

  // Prevent self-status change to INACTIVE or SUSPENDED
  if (req.user?.id === id && (status === 'INACTIVE' || status === 'SUSPENDED')) {
    throw createError('Cannot deactivate or suspend your own account', 400);
  }

  // Update user status
  const updatedUser = await prisma.user.update({
    where: { id },
    data: { status }
  });

  res.json({
    message: 'User status updated successfully',
    user: updatedUser
  });
}));

// POST /api/users/:id/activate - Activate user (requires users:update permission)
router.post('/:id/activate', requirePermission('users', 'update'), criticalOperationsRateLimit, asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { id } = req.params;

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { status: 'ACTIVE' }
  });

  res.json({
    message: 'User activated successfully',
    user: updatedUser
  });
}));

// POST /api/users/:id/deactivate - Deactivate user (requires users:update permission)
router.post('/:id/deactivate', requirePermission('users', 'update'), criticalOperationsRateLimit, asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { id } = req.params;

  // Prevent self-deactivation
  if (req.user?.id === id) {
    throw createError('Cannot deactivate your own account', 400);
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { status: 'INACTIVE' }
  });

  res.json({
    message: 'User deactivated successfully',
    user: updatedUser
  });
}));

// POST /api/users/:id/suspend - Suspend user (requires users:update permission)
router.post('/:id/suspend', requirePermission('users', 'update'), criticalOperationsRateLimit, asyncHandler(async (req: EnhancedAuthenticatedRequest, res) => {
  const { id } = req.params;

  // Prevent self-suspension
  if (req.user?.id === id) {
    throw createError('Cannot suspend your own account', 400);
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { status: 'SUSPENDED' }
  });

  res.json({
    message: 'User suspended successfully',
    user: updatedUser
  });
}));

export default router;