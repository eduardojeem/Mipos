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

  it('supports permission names returned by roles APIs', () => {
    expect(
      canCreateProducts({
        permissions: [{ resource: '', action: '', name: 'products.create' }],
      })
    ).toBe(true);
    expect(
      canCreateProducts({
        permissions: [{ resource: '', action: '', name: 'products:create' }],
      })
    ).toBe(true);
  });
});

describe('canEditProducts', () => {
  it('allows product admins by role', () => {
    expect(canEditProducts({ roles: ['ADMIN'] })).toBe(true);
    expect(canEditProducts({ roles: ['OWNER'] })).toBe(true);
  });

  it('allows explicit edit/update/write/manage permissions', () => {
    expect(canEditProducts({ permissions: [{ resource: 'products', action: 'edit' }] })).toBe(true);
    expect(canEditProducts({ permissions: [{ resource: 'products', action: 'update' }] })).toBe(true);
    expect(canEditProducts({ permissions: [{ resource: 'products', action: 'write' }] })).toBe(true);
    expect(canEditProducts({ permissions: [{ resource: 'products', action: 'manage' }] })).toBe(true);
  });

  it('keeps read-only users from editing products', () => {
    expect(canEditProducts({ permissions: [{ resource: 'products', action: 'read' }] })).toBe(false);
  });

  it('supports update permission names returned by roles APIs', () => {
    expect(
      canEditProducts({
        permissions: [{ resource: '', action: '', name: 'products.update' }],
      })
    ).toBe(true);
  });
});

describe('canDeleteProducts', () => {
  it('allows product admins by role', () => {
    expect(canDeleteProducts({ roles: ['ADMIN'] })).toBe(true);
    expect(canDeleteProducts({ roles: ['OWNER'] })).toBe(true);
  });

  it('allows explicit delete/remove/manage permissions', () => {
    expect(canDeleteProducts({ permissions: [{ resource: 'products', action: 'delete' }] })).toBe(true);
    expect(canDeleteProducts({ permissions: [{ resource: 'products', action: 'remove' }] })).toBe(true);
    expect(canDeleteProducts({ permissions: [{ resource: 'products', action: 'manage' }] })).toBe(true);
  });

  it('allows write users to delete products (dashboard parity)', () => {
    expect(canDeleteProducts({ permissions: [{ resource: 'products', action: 'write' }] })).toBe(true);
  });

  it('supports delete permission names returned by roles APIs', () => {
    expect(
      canDeleteProducts({
        permissions: [{ resource: '', action: '', name: 'products:delete' }],
      })
    ).toBe(true);
  });
});
