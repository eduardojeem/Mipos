import {
  Activity,
  Building2,
  CalendarDays,
  CreditCard,
  KeyRound,
  LayoutDashboard,
  MapPin,
  Palette,
  Scissors,
  Settings,
  Shield,
  UserCog,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { CompanyFeatureKey } from '@/lib/company-access'
import type { BusinessVertical } from '@/config/verticals'

export type AdminSectionKey =
  | 'overview'
  | 'barbershop'
  | 'company'
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
  /** Si está definido, el ítem solo se muestra para estos verticales. Sin definir = todos. */
  verticals?: BusinessVertical[]
}

export const ADMIN_SECTION_LABELS: Record<AdminSectionKey, string> = {
  overview: 'Vision General',
  barbershop: 'Operación',
  company: 'Empresa',
  platform: 'Plataforma',
}

export const adminNavigationConfig: AdminNavItemConfig[] = [
  // 1. OVERVIEW
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

  // 2. BARBERSHOP (Operación diaria - Lo más usado)
  {
    title: 'Agenda',
    href: '/admin/agenda',
    icon: CalendarDays,
    description: 'Turnos del día por profesional: reservar, confirmar y cerrar',
    section: 'barbershop',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN', 'OWNER'],
    requireAdminPanel: true,
    verticals: ['BARBERSHOP'],
  },
  {
    title: 'Profesionales',
    href: '/admin/staff',
    icon: UserCog,
    description: 'Barberos: especialidad, comisión, color y horarios',
    section: 'barbershop',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN', 'OWNER'],
    requireAdminPanel: true,
    verticals: ['BARBERSHOP'],
  },
  {
    title: 'Servicios',
    href: '/admin/services',
    icon: Scissors,
    description: 'Catálogo de servicios: cortes, barba, color (precio y duración)',
    section: 'barbershop',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN', 'OWNER'],
    requireAdminPanel: true,
    verticals: ['BARBERSHOP'],
  },

  // 3. COMPANY (Gestión central)
  {
    title: 'Sucursales',
    href: '/admin/sucursal',
    icon: MapPin,
    description: 'Locales, usuarios asignados y estadísticas por sede',
    section: 'company',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN', 'OWNER'],
    requireAdminPanel: true,
  },
  {
    title: 'Usuarios y Roles',
    href: '/admin/users-roles',
    icon: Users,
    description: 'Miembros, roles y permisos de acceso',
    section: 'company',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN', 'OWNER'],
    requireAdminPanel: true,
  },
  {
    title: 'Empresa',
    href: '/admin/business-config',
    icon: Building2,
    description: 'Perfil público, dominio y presencia web',
    section: 'company',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN', 'OWNER'],
    requireAdminPanel: true,
  },
  {
    title: 'Configuracion',
    href: '/admin/settings',
    icon: Settings,
    description: 'General, ventas, inventario y facturación',
    section: 'company',
    requiredRoles: ['ADMIN', 'SUPER_ADMIN', 'OWNER'],
    requireAdminPanel: true,
  },
  {
    title: 'Apariencia',
    href: '/admin/appearance',
    icon: Palette,
    description: 'Tema, densidad y estilo visual del sistema',
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

  // 5. PLATFORM (Super Admin Only)
  {
    title: 'Planes SaaS',
    href: '/superadmin/plans',
    icon: CreditCard,
    description: 'Catálogo de planes y oferta comercial',
    section: 'platform',
    requiredRoles: ['SUPER_ADMIN'],
    superAdminOnly: true,
  },
  {
    title: 'Panel SaaS',
    href: '/superadmin',
    icon: Shield,
    description: 'Administración global de la plataforma',
    section: 'platform',
    requiredRoles: ['SUPER_ADMIN'],
    superAdminOnly: true,
  },
]
