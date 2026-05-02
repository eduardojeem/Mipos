import {
  Building2,
  CreditCard,
  FileText,
  LayoutDashboard,
  Shield,
  Users,
  Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { CompanyFeatureKey } from '@/lib/company-access'

export type AdminSectionKey =
  | 'overview'
  | 'company'
  | 'security'
  | 'platform'

export type AdminNavItemConfig = {
  title: string
  href: string
  icon: LucideIcon
  description: string
  section: AdminSectionKey
  requiredRoles?: string[]
  requireAdminPanel?: boolean
  requireReports?: boolean
  requiredFeature?: CompanyFeatureKey
  superAdminOnly?: boolean
  exact?: boolean
}

export const ADMIN_SECTION_LABELS: Record<AdminSectionKey, string> = {
  overview: 'Vision General',
  company: 'Empresa',
  security: 'Auditoria y Seguridad',
  platform: 'Plataforma',
}

export const adminNavigationConfig: AdminNavItemConfig[] = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    description: 'Resumen ejecutivo del panel',
    section: 'overview',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN', 'OWNER'],
    requireAdminPanel: true,
    exact: true,
  },
  {
    title: 'Empresa',
    href: '/admin/business-config',
    icon: Building2,
    description: 'Contenido publico, dominio y presencia web',
    section: 'company',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN', 'OWNER'],
    requireAdminPanel: true,
  },
  {
    title: 'Usuarios y Roles',
    href: '/admin/users',
    icon: Users,
    description: 'Miembros, roles y permisos',
    section: 'company',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN', 'OWNER'],
    requireAdminPanel: true,
  },
  {
    title: 'Plan y Suscripcion',
    href: '/admin/subscriptions',
    icon: CreditCard,
    description: 'Plan actual, suscripcion y facturacion',
    section: 'company',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN', 'OWNER'],
    requireAdminPanel: true,
  },
  {
    title: 'Auditoria',
    href: '/admin/audit',
    icon: FileText,
    description: 'Eventos, trazabilidad y auditoria',
    section: 'security',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN', 'OWNER'],
    requireAdminPanel: true,
  },
  {
    title: 'Seguridad y Sesiones',
    href: '/admin/sessions',
    icon: Shield,
    description: 'Sesiones activas, accesos y control de seguridad',
    section: 'security',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN', 'OWNER'],
    requireAdminPanel: true,
  },
  {
    title: 'Planes SaaS',
    href: '/superadmin/plans',
    icon: CreditCard,
    description: 'Catalogo de planes y oferta comercial',
    section: 'platform',
    requiredRoles: ['SUPER_ADMIN'],
    superAdminOnly: true,
  },
  {
    title: 'Mantenimiento',
    href: '/admin/maintenance',
    icon: Wrench,
    description: 'Herramientas de mantenimiento y soporte',
    section: 'platform',
    requiredRoles: ['SUPER_ADMIN'],
    superAdminOnly: true,
  },
  {
    title: 'Panel SaaS',
    href: '/superadmin',
    icon: Shield,
    description: 'Administracion global de la plataforma',
    section: 'platform',
    requiredRoles: ['SUPER_ADMIN'],
    superAdminOnly: true,
  },
]
