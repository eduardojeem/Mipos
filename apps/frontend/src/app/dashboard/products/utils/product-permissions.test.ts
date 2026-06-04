import { describe, expect, it } from 'vitest';
import { canCreateProducts } from './product-permissions';

describe('canCreateProducts', () => {
  it('allows product admins by role', () => {
    expect(canCreateProducts({ roles: ['ADMIN'] })).toBe(true);
    expect(canCreateProducts({ roles: ['OWNER'] })).toBe(true);
  });

  it('allows users with explicit product create permission', () => {
    expect(
      canCreateProducts({
        roles: ['CASHIER'],
        permissions: [{ resource: 'products', action: 'create' }],
      })
    ).toBe(true);
  });

  it('keeps read-only product users from creating products', () => {
    expect(
      canCreateProducts({
        roles: ['CASHIER'],
        permissions: [{ resource: 'products', action: 'read' }],
      })
    ).toBe(false);
  });

  it('requires an explicit product create permission for managers', () => {
    expect(canCreateProducts({ roles: ['MANAGER'] })).toBe(false);
    expect(
      canCreateProducts({
        roles: ['MANAGER'],
        permissions: [{ resource: 'products', action: 'create' }],
      })
    ).toBe(true);
  });

  it('supports legacy write/manage aliases for compatibility', () => {
    expect(canCreateProducts({ permissions: [{ resource: 'products', action: 'write' }] })).toBe(true);
    expect(canCreateProducts({ permissions: [{ resource: 'products', action: 'manage' }] })).toBe(true);
  });
});
