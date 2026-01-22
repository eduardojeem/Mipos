/**
 * Shared test utilities and helpers
 */

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

/**
 * Custom render function that wraps components with common providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { ...options });
}

/**
 * Mock API response helper
 */
export function mockApiResponse<T>(data: T, success = true) {
  return {
    data: success ? data : undefined,
    error: success ? undefined : data,
    status: success ? 200 : 500,
  };
}

/**
 * Wait for async operations to complete
 */
export function waitForAsync(ms = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a mock promotion object
 */
export function createMockPromotion(overrides?: Partial<any>) {
  return {
    id: 'test-id-' + Math.random().toString(36).substr(2, 9),
    name: 'Test Promotion',
    description: 'Test Description',
    discountType: 'PERCENTAGE' as const,
    discountValue: 10,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 86400000).toISOString(),
    isActive: true,
    ...overrides,
  };
}

/**
 * Create multiple mock promotions
 */
export function createMockPromotions(count: number) {
  return Array.from({ length: count }, (_, i) =>
    createMockPromotion({ name: `Promotion ${i + 1}` })
  );
}

/**
 * Mock localStorage for tests
 */
export function mockLocalStorage() {
  const store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
  };
}

/**
 * Mock fetch for API calls
 */
export function mockFetch(response: any, ok = true) {
  return jest.fn(() =>
    Promise.resolve({
      ok,
      status: ok ? 200 : 500,
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
    })
  ) as jest.Mock;
}

/**
 * Suppress console errors/warnings in tests
 */
export function suppressConsole(methods: ('error' | 'warn')[] = ['error']) {
  const original: Record<string, any> = {};

  beforeAll(() => {
    methods.forEach((method) => {
      original[method] = console[method];
      console[method] = jest.fn();
    });
  });

  afterAll(() => {
    methods.forEach((method) => {
      console[method] = original[method];
    });
  });
}
