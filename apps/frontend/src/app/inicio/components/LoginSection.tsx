'use client';

import { LoginAccessSection } from '@/components/auth/LoginAccessSection';

export function LoginSection() {
  return (
    <LoginAccessSection
      theme="dark"
      title="Entra con el acceso correcto para tu rol"
      description="La misma pantalla de autenticacion adapta el contexto: administracion global del SaaS, panel del negocio o cuenta operativa de empleado."
      types={['saas-admin', 'business-owner', 'employee']}
      className="bg-transparent"
    />
  );
}
