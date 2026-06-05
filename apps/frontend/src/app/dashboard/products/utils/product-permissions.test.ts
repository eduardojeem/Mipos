import { describe, expect, it } from 'vitest';
import { canCreateProducts, canDeleteProducts, canEditProducts } from './product-permissions';

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

describe('canEditProducts', () => {
  it('allows explicit edit/update/write/manage permissions', () => {
    expect(canEditProducts({ permissions: [{ resource: 'products', action: 'edit' }] })).toBe(true);
    expect(canEditProducts({ permissions: [{ resource: 'products', action: 'update' }] })).toBe(true);
    expect(canEditProducts({ permissions: [{ resource: 'products', action: 'write' }] })).toBe(true);
    expect(canEditProducts({ permissions: [{ resource: 'products', action: 'manage' }] })).toBe(true);
  });

  it('keeps read-only users from editing products', () => {
    expect(canEditProducts({ permissions: [{ resource: 'products', action: 'read' }] })).toBe(false);
  });
});

describe('canDeleteProducts', () => {
  it('allows explicit delete/remove/manage permissions', () => {
    expect(canDeleteProducts({ permissions: [{ resource: 'products', action: 'delete' }] })).toBe(true);
    expect(canDeleteProducts({ permissions: [{ resource: 'products', action: 'remove' }] })).toBe(true);
    expect(canDeleteProducts({ permissions: [{ resource: 'products', action: 'manage' }] })).toBe(true);
  });

  it('allows write users to delete products (dashboard parity)', () => {
    expect(canDeleteProducts({ permissions: [{ resource: 'products', action: 'write' }] })).toBe(true);
  });
});
