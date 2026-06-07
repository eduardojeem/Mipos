import type { LucideIcon } from 'lucide-react';
import {
  PackageSearch,
  Palette,
  Receipt,
  Settings2,
  ShieldCheck,
} from 'lucide-react';

export type SettingsTab =
  | 'general'
  | 'sales'
  | 'inventory'
  | 'appearance'
  | 'security';

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

];

const TAB_ALIASES: Record<string, SettingsTab> = {
  profile: 'general',
  preferences: 'general',
  pos: 'sales',
  sales: 'sales',
  ventas: 'sales',
  facturacion: 'sales',
  stock: 'inventory',
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

export function getSettingsHref(tab: SettingsTab, basePath = '/admin/settings'): string {
  return `${basePath}?tab=${tab}`;
}
