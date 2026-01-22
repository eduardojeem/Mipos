import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn()
    },
    category: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    sale: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn()
    },
    saleItem: {
      findMany: jest.fn(),
      create: jest.fn(),
      groupBy: jest.fn()
    },
    purchase: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    purchaseItem: {
      findMany: jest.fn(),
      create: jest.fn()
    },
    customer: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    supplier: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    inventoryMovement: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn()
    },
    $transaction: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn()
  }))
}));

// Mock Supabase Client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      refreshSession: jest.fn()
    },
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        remove: jest.fn(),
        list: jest.fn(),
        getPublicUrl: jest.fn(),
        createSignedUrl: jest.fn()
      }))
    }
  }))
}));

// Set test environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/pos_test';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.JWT_SECRET = 'test-jwt-secret';

// Global test setup
beforeAll(async () => {
  // Setup test database or any global test configuration
});

afterAll(async () => {
  // Cleanup after all tests
});

beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
});