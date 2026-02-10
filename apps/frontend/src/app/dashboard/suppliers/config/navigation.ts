import {
  BarChart3,
  AlertTriangle,
  History,
  GitCompare,
  Target,
  Upload,
  Tags,
  Settings,
  TrendingUp,
  Users,
} from 'lucide-react';

export interface SupplierSection {
  href: string;
  icon: any;
  label: string;
  description: string;
  color: string;
  badge?: string;
}

export const SUPPLIER_SECTIONS: SupplierSection[] = [
  {
    href: '/dashboard/suppliers/analytics',
    icon: BarChart3,
    label: 'Analíticas',
    description: 'Reportes y métricas',
    color: 'text-blue-600',
  },
  {
    href: '/dashboard/suppliers/price-history',
    icon: History,
    label: 'Historial Precios',
    description: 'Seguimiento precios',
    color: 'text-orange-600',
  },
  {
    href: '/dashboard/suppliers/import',
    icon: Upload,
    label: 'Importar',
    description: 'Carga masiva',
    color: 'text-teal-600',
  },
];

export function getSupplierSection(href: string): SupplierSection | undefined {
  return SUPPLIER_SECTIONS.find((section) => section.href === href);
}

export function getSupplierSectionsByCategory(category: string): SupplierSection[] {
  // Puedes agregar lógica de categorización aquí
  return SUPPLIER_SECTIONS;
}
