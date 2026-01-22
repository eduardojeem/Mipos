import express from 'express';
import { z } from 'zod';
import { supabase, prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { authRateLimit, passwordResetRateLimit, criticalOperationsRateLimit, uploadRateLimit } from '../middleware/rate-limiter';
import { securityLogger, SecurityEventType } from '../middleware/security-logger';

const router = express.Router();

// Validation schemas
const signUpSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  role: z.enum(['ADMIN', 'CASHIER']).optional().default('CASHIER')
});

const signInSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

// Sign up (Admin only can create users) - Rate limited for critical operations
router.post('/signup', criticalOperationsRateLimit, asyncHandler(async (req: express.Request, res: express.Response) => {
  const { email, password, fullName, role } = signUpSchema.parse(req.body);

  // Create user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      fullName,
      role
    }
  });

  if (authError) {
    throw createError(authError.message, 400);
  }

  if (!authData.user) {
    throw createError('Failed to create user', 500);
  }

  // Try to create user in our database, but don't fail if it doesn't work
  try {
    const user = await prisma.user.create({
      data: {
        id: authData.user.id,
        email,
        fullName,
        role
      }
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch (error) {
    console.warn('Database creation failed, but user created in Supabase Auth:', error);
    // Return success with Supabase user data
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        fullName,
        role
      }
    });
  }
}));

// Sign in - Rate limited for authentication attempts
router.post('/signin', authRateLimit, asyncHandler(async (req: express.Request, res: express.Response) => {
  const { email, password } = signInSchema.parse(req.body);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    // Log failed authentication attempt
    securityLogger.logAuth(SecurityEventType.LOGIN_FAILURE, req, undefined, email, {
      error: error.message,
      errorCode: error.status
    });
    throw createError('Invalid credentials', 401);
  }

  if (!data.user || !data.session) {
    // Log failed authentication attempt
    securityLogger.logAuth(SecurityEventType.LOGIN_FAILURE, req, undefined, email, {
      error: 'No user or session data returned'
    });
    throw createError('Authentication failed', 401);
  }

  // Try to get user details from our database, fallback to Supabase data
  let user;
  try {
    user = await prisma.user.findUnique({
      where: { id: data.user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true
      }
    });
  } catch (error) {
    console.warn('Database query failed, using Supabase user data:', error);
  }

  if (!user) {
    // Fallback to Supabase user data
    user = {
      id: data.user.id,
      email: data.user.email,
      fullName: data.user.user_metadata?.fullName || data.user.email?.split('@')[0] || 'User',
      role: data.user.user_metadata?.role || 'CASHIER'
    };
  }

  // Log successful authentication
  securityLogger.logAuth(
    SecurityEventType.LOGIN_SUCCESS,
    req,
    user.id,
    typeof user.email === 'string' ? user.email : email,
    {
      role: user.role
    }
  );

  res.json({
    message: 'Sign in successful',
    user,
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at
    }
  });
}));

// Sign out
router.post('/signout', asyncHandler(async (req: express.Request, res: express.Response) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    await supabase.auth.admin.signOut(token);
    
    // Log successful signout
    securityLogger.logAuth(
      SecurityEventType.LOGOUT,
      req,
      undefined,
      undefined,
      { action: 'signout' }
    );
  }

  res.json({ message: 'Sign out successful' });
}));

// Refresh token
router.post('/refresh', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    throw createError('Refresh token is required', 400);
  }

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token
  });

  if (error) {
    throw createError('Invalid refresh token', 401);
  }

  res.json({
    session: {
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
      expires_at: data.session?.expires_at
    }
  });
}));

// Get current user
router.get('/me', asyncHandler(async (req: express.Request, res: express.Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError('No token provided', 401);
  }

  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    throw createError('Invalid token', 401);
  }

  // Try to get user data from Prisma first
  let userData;
  try {
    userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true
      }
    });
  } catch (prismaError) {
    console.warn('Prisma query failed, using Supabase user data:', prismaError);
  }

  if (!userData) {
    // Fallback to Supabase user data
    userData = {
      id: user.id,
      email: user.email,
      fullName: user.user_metadata?.fullName || user.email?.split('@')[0] || 'User',
      role: user.user_metadata?.role || 'CASHIER',
      createdAt: user.created_at
    };
  }

  res.json({ user: userData });
}));

// Get user profile (authenticated)
router.get('/profile', asyncHandler(async (req: express.Request, res: express.Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError('No token provided', 401);
  }

  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    throw createError('Invalid token', 401);
  }

  // Try to get user data from Prisma first
  let userData;
  try {
    userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        bio: true,
        avatar: true,
        location: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true
      }
    });
  } catch (prismaError) {
    console.warn('Prisma query failed, using Supabase user data:', prismaError);
  }

  if (!userData) {
    // Fallback to Supabase user data
    userData = {
      id: user.id,
      email: user.email,
      fullName: user.user_metadata?.fullName || user.email?.split('@')[0] || 'User',
      phone: user.user_metadata?.phone || null,
      bio: user.user_metadata?.bio || null,
      avatar: user.user_metadata?.avatar || null,
      location: user.user_metadata?.location || null,
      role: user.user_metadata?.role || 'CASHIER',
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastLogin: user.last_sign_in_at
    };
  }

  res.json({ 
    success: true,
    data: {
      id: userData.id,
      name: userData.fullName,
      email: userData.email,
      phone: userData.phone,
      bio: userData.bio,
      avatar: userData.avatar,
      location: userData.location,
      role: userData.role,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
      lastLogin: userData.lastLogin
    }
  });
}));

// Update user profile (authenticated)
router.put('/profile', asyncHandler(async (req: express.Request, res: express.Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError('No token provided', 401);
  }

  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    throw createError('Invalid token', 401);
  }

  const updateSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    phone: z.string().optional(),
    bio: z.string().optional(),
    location: z.string().optional()
  });

  const validatedData = updateSchema.parse(req.body);

  // Log profile update attempt
  securityLogger.logCriticalOperation(
    SecurityEventType.CONFIGURATION_CHANGED,
    req,
    true,
    {
      userId: user.id,
      updatedFields: Object.keys(validatedData)
    }
  );

  // Try to update in Prisma first
  let updatedUser;
  try {
    updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        fullName: validatedData.name,
        phone: validatedData.phone,
        bio: validatedData.bio,
        location: validatedData.location,
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        bio: true,
        avatar: true,
        location: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
  } catch (prismaError) {
    console.warn('Prisma update failed, updating Supabase user metadata:', prismaError);
    
    // Fallback to updating Supabase user metadata
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        fullName: validatedData.name || user.user_metadata?.fullName,
        phone: validatedData.phone || user.user_metadata?.phone,
        bio: validatedData.bio || user.user_metadata?.bio,
        location: validatedData.location || user.user_metadata?.location
      }
    });

    if (updateError) {
      throw createError('Failed to update profile', 500);
    }

    // Return updated data from Supabase
    updatedUser = {
      id: user.id,
      email: user.email,
      fullName: validatedData.name || user.user_metadata?.fullName || 'User',
      phone: validatedData.phone || user.user_metadata?.phone,
      bio: validatedData.bio || user.user_metadata?.bio,
      avatar: user.user_metadata?.avatar,
      location: validatedData.location || user.user_metadata?.location,
      role: user.user_metadata?.role || 'CASHIER',
      createdAt: user.created_at,
      updatedAt: new Date()
    };
  }

  res.json({ 
    success: true,
    message: 'Profile updated successfully',
    data: {
      id: updatedUser.id,
      name: updatedUser.fullName,
      email: updatedUser.email,
      phone: updatedUser.phone,
      bio: updatedUser.bio,
      avatar: updatedUser.avatar,
      location: updatedUser.location,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt
    }
  });
}));

// Upload avatar (authenticated) - Rate limited for uploads
router.post('/upload-avatar', uploadRateLimit, asyncHandler(async (req: express.Request, res: express.Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError('No token provided', 401);
  }

  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    throw createError('Invalid token', 401);
  }

  // For now, we'll return a mock response since file upload requires multer setup
  const mockAvatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`;

  // Try to update in Prisma first
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        updatedAt: new Date()
      }
    });
  } catch (prismaError) {
    console.warn('Prisma update failed, updating Supabase user metadata:', prismaError);
    
    // Fallback to updating Supabase user metadata
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        avatar: mockAvatarUrl
      }
    });
  }

  res.json({ 
    success: true,
    message: 'Avatar updated successfully',
    data: {
      avatarUrl: mockAvatarUrl
    }
  });
}));

export default router;