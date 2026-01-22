'use client';

import React from 'react';
import { PermissionGuard, PermissionProvider } from '@/components/ui/permission-guard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

function getLang(): 'es' | 'en' {
  try {
    const lang = typeof navigator !== 'undefined' ? navigator.language : 'es';
    return lang.startsWith('en') ? 'en' : 'es';
  } catch {
    return 'es';
  }
}

const messages = {
  es: {
    title: 'Acceso a reportes restringido',
    description: 'No cuentas con el permiso necesario para ver los reportes (reports.view).',
    docs: 'Ver documentación',
    requestAccess: 'Solicitar acceso',
    contactAdmin: 'Contactar al administrador',
  },
  en: {
    title: 'Reports access restricted',
    description: 'You do not have the required permission to view reports (reports.view).',
    docs: 'View documentation',
    requestAccess: 'Request access',
    contactAdmin: 'Contact the administrator',
  },
} as const;

const ACCESS_REQUEST_URL = process.env.NEXT_PUBLIC_ACCESS_REQUEST_URL || '/support/access-request';
const INTERNAL_DOCS_URL = process.env.NEXT_PUBLIC_INTERNAL_DOCS_URL || '/docs/permisos';
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@example.com';

export function ReportPermissionGuard({ children }: { children: React.ReactNode }) {
  const lang = getLang();
  const t = messages[lang];

  const fallback = (
    <Alert className="border-red-200 bg-red-50">
      <Shield className="h-4 w-4 text-red-600" />
      <AlertDescription className="text-red-800">
        <div className="font-medium">{t.title}</div>
        <div className="mt-1">{t.description}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="default" asChild>
            <a href={ACCESS_REQUEST_URL} target="_blank" rel="noreferrer">{t.requestAccess}</a>
          </Button>
          <Button variant="outline" asChild>
            <a href={INTERNAL_DOCS_URL} target="_blank" rel="noreferrer">{t.docs}</a>
          </Button>
          <Button variant="ghost" asChild>
            <a href={`mailto:${ADMIN_EMAIL}`}>{t.contactAdmin}</a>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );

  return (
    <PermissionProvider>
      <PermissionGuard permission="reports.view" fallback={fallback}>
        {children}
      </PermissionGuard>
    </PermissionProvider>
  );
}

export default ReportPermissionGuard;