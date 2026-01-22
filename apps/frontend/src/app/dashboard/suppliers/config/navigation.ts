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
    href: '/dashboard/suppliers/alerts',
    icon: AlertTriangle,
    label: 'Alertas',
    description: 'Notificaciones',
    color: 'text-red-600',
  },
  {
    href: '/dashboard/suppliers/price-history',
    icon: History,
    label: 'Historial Precios',
    description: 'Seguimiento precios',
    color: 'text-orange-600',
  },
  {
    href: '/dashboard/suppliers/comparison',
    icon: GitCompare,
    label: 'Comparación',
    description: 'Análisis comparativo',
    color: 'text-indigo-600',
  },
  {
    href: '/dashboard/suppliers/performance',
    icon: TrendingUp,
    label: 'Rendimiento',
    description: 'Evaluación de desempeño',
    color: 'text-cyan-600',
  },
  {
    href: '/dashboard/suppliers/segmentation',
    icon: Target,
    label: 'Segmentación',
    description: 'Grupos y categorías',
    color: 'text-pink-600',
  },
  {
    href: '/dashboard/suppliers/tags',
    icon: Tags,
    label: 'Etiquetas',
    description: 'Gestión de tags',
    color: 'text-yellow-600',
  },
  {
    href: '/dashboard/suppliers/import',
    icon: Upload,
    label: 'Importar',
    description: 'Carga masiva',
    color: 'text-teal-600',
  },
  {
    href: '/dashboard/suppliers/evaluation',
    icon: Users,
    label: 'Evaluación',
    description: 'Calificación proveedores',
    color: 'text-violet-600',
  },
  {
    href: '/dashboard/suppliers/search',
    icon: Settings,
    label: 'Búsqueda Avanzada',
    description: 'Filtros y búsqueda',
    color: 'text-gray-600',
  },
];

export function getSupplierSection(href: string): SupplierSection | undefined {
  return SUPPLIER_SECTIONS.find((section) => section.href === href);
}

export function getSupplierSectionsByCategory(category: string): SupplierSection[] {
  // Puedes agregar lógica de categorización aquí
  return SUPPLIER_SECTIONS;
}
