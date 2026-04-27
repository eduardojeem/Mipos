import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  CreditCard,
  MapPin,
  PackageSearch,
  Palette,
  PlugZap,
  Receipt,
  Settings2,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';

export type SettingsTab =
  | 'general'
  | 'company'
  | 'users-roles'
  | 'sales'
  | 'inventory'
  | 'branches'
  | 'integrations'
  | 'appearance'
  | 'security'
  | 'subscription';

export interface SettingsNavigationItem {
  id: SettingsTab;
  name: string;
  description: string;
  group: 'Core' | 'Operacion' | 'Plataforma';
  icon: LucideIcon;
}

export const SETTINGS_NAVIGATION: SettingsNavigationItem[] = [
  {
    id: 'general',
    name: 'General',
    description: 'Preferencias, idioma y region',
    group: 'Core',
    icon: Settings2,
  },
  {
    id: 'company',
    name: 'Empresa',
    description: 'Perfil, contacto y marca',
    group: 'Core',
    icon: Building2,
  },
  {
    id: 'users-roles',
    name: 'Usuarios y Roles',
    description: 'Equipo, permisos y acceso',
    group: 'Core',
    icon: UsersRound,
  },
  {
    id: 'sales',
    name: 'Facturacion / Ventas',
    description: 'IVA, descuentos y clientes',
    group: 'Operacion',
    icon: Receipt,
  },
  {
    id: 'inventory',
    name: 'Inventario',
    description: 'Stock, alertas y control',
    group: 'Operacion',
    icon: PackageSearch,
  },
  {
    id: 'branches',
    name: 'Sucursales',
    description: 'Locales y operacion multi-sede',
    group: 'Operacion',
    icon: MapPin,
  },
  {
    id: 'integrations',
    name: 'Integraciones',
    description: 'Hardware, correo y conectores',
    group: 'Operacion',
    icon: PlugZap,
  },
  {
    id: 'appearance',
    name: 'Apariencia',
    description: 'Tema, densidad y estilo',
    group: 'Plataforma',
    icon: Palette,
  },
  {
    id: 'security',
    name: 'Seguridad',
    description: 'Password, 2FA, sesiones y logs',
    group: 'Plataforma',
    icon: ShieldCheck,
  },
  {
    id: 'subscription',
    name: 'Suscripcion / Plan',
    description: 'Plan, limites y renovacion',
    group: 'Plataforma',
    icon: CreditCard,
  },

];

const TAB_ALIASES: Record<string, SettingsTab> = {
  profile: 'general',
  preferences: 'general',
  business: 'company',
  empresa: 'company',
  users: 'users-roles',
  roles: 'users-roles',
  team: 'users-roles',
  billing: 'subscription',
  plan: 'subscription',
  subscription: 'subscription',
  suscripcion: 'subscription',
  system: 'integrations',
  pos: 'sales',
  sales: 'sales',
  ventas: 'sales',
  facturacion: 'sales',
  stock: 'inventory',
  sucursales: 'branches',
  branches: 'branches',
};

export function normalizeSettingsTab(tab?: string | null): SettingsTab {
  const value = String(tab || 'general').trim().toLowerCase();
  const exactMatch = SETTINGS_NAVIGATION.find((item) => item.id === value);

  if (exactMatch) {
    return exactMatch.id;
  }

  return TAB_ALIASES[value] || 'general';
}

export function getSettingsTabMeta(tab?: string | null): SettingsNavigationItem {
  const normalized = normalizeSettingsTab(tab);
  return SETTINGS_NAVIGATION.find((item) => item.id === normalized) || SETTINGS_NAVIGATION[0];
}

export function getSettingsHref(tab: SettingsTab): string {
  return `/dashboard/settings?tab=${tab}`;
}
