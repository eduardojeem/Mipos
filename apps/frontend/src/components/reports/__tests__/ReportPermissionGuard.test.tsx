import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ReportPermissionGuard from '../ReportPermissionGuard';

// Mock hooks used by PermissionProvider and PermissionGuard
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: { id: 'u1', role: 'EMPLOYEE' }, loading: false }),
}));

vi.mock('@/hooks/use-unified-permissions', () => ({
  usePermissionsContext: () => ({
    user: { id: 'u1', role: 'EMPLOYEE' },
    permissions: [],
    hasAnyPermission: (perms: string[]) => perms.some(p => false),
  }),
}));

describe('ReportPermissionGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra CTA y mensaje cuando falta reports.view', () => {
    render(
      <ReportPermissionGuard>
        <div>Contenido protegido</div>
      </ReportPermissionGuard>
    );

    expect(screen.getByText(/Acceso a reportes restringido|Reports access restricted/i)).toBeTruthy();
    expect(screen.getByText(/Solicitar acceso|Request access/i)).toBeTruthy();
    expect(screen.getByText(/Ver documentación|View documentation/i)).toBeTruthy();
    expect(screen.getByText(/Contactar al administrador|Contact the administrator/i)).toBeTruthy();
    expect(screen.queryByText('Contenido protegido')).toBeNull();
  });

  it('renderiza el contenido cuando existe reports.view', async () => {
    vi.resetModules();
    vi.doMock('@/hooks/use-auth', () => ({
      useAuth: () => ({ user: { id: 'u1', role: 'MANAGER' }, loading: false }),
    }));
    vi.doMock('@/hooks/use-unified-permissions', () => ({
      usePermissionsContext: () => ({
        user: { id: 'u1', role: 'MANAGER' },
        permissions: [{ resource: 'reports', action: 'view' }],
        hasAnyPermission: (perms: string[]) => perms.includes('reports.view') || perms.includes('reports.read'),
      }),
    }));

    const Guard = (await import('../ReportPermissionGuard')).default;
    render(
      <Guard>
        <div>Contenido protegido</div>
      </Guard>
    );

    expect(screen.getByText('Contenido protegido')).toBeTruthy();
  });
});