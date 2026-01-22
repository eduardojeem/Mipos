import request from 'supertest';
import express from 'express';
import authRoutes from '../routes/auth';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

// Create test app
const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

// Mock implementations
const mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
const mockSupabase = createClient('', '') as any;

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/signup', () => {
    it('should create a new user successfully', async () => {
      // Mock Supabase auth signup
      mockSupabase.auth.signUp.mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com'
          }
        },
        error: null
      });

      // Mock Prisma user creation
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({
        id: 'test-user-id',
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'CASHIER',
        createdAt: new Date()
      });

      const response = await request(app)
      await request(app)
        .post('/auth/signup')

        .send({
          email: 'test@example.com',
          password: 'Password123!',
          fullName: 'Test User',
          role: 'CASHIER'
        });

      expect(response.status).toBe(201);
      expect(response.body.user.email).toBe('test@example.com');
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!'
      });
    });

    it('should return error for invalid email', async () => {
      const response = await request(app)
        .post('/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'Password123!',
          fullName: 'Test User',
          role: 'CASHIER'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid email');
    });

    it('should return error for weak password', async () => {
      const response = await request(app)
        .post('/auth/signup')
        .send({
          email: 'test@example.com',
          password: '123',
          fullName: 'Test User',
          role: 'CASHIER'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Password must be at least 8 characters');
    });
  });

  describe('POST /auth/signin', () => {
    it('should sign in user successfully', async () => {
      // Mock Supabase auth signin
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com'
          },
          session: {
            access_token: 'test-access-token',
            refresh_token: 'test-refresh-token'
          }
        },
        error: null
      });

      // Mock Prisma user find
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'test-user-id',
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'CASHIER',
        createdAt: new Date()
      });

      const response = await request(app)
        .post('/auth/signin')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        });

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.session.access_token).toBe('test-access-token');
    });

    it('should return error for invalid credentials', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' }
      });

      const response = await request(app)
        .post('/auth/signin')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid credentials');
    });
  });

  describe('POST /auth/signout', () => {
    it('should sign out user successfully', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: null
      });

      const response = await request(app)
        .post('/auth/signout')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Signed out successfully');
    });
  });
});