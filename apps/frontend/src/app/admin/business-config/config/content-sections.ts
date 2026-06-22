import type { BusinessVertical } from '@/config/verticals';
import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  Sparkles,
  Image,
  ShoppingBag,
  Package,
  Scissors,
  Calendar,
  Tags,
} from 'lucide-react';

export type SectionId =
  | 'company-identity'
  | 'hero'
  | 'carousel'
  | 'catalog'
  | 'products'
  | 'offers'
  | 'services'
  | 'appointments'
  | 'marketplace';

export interface ContentSection {
  id: SectionId;
  label: string;
  description: string;
  icon: LucideIcon;
  component: string;
  order: number;
  verticals: BusinessVertical[];
}

const CONTENT_SECTIONS: Record<SectionId, ContentSection> = {
  'company-identity': {
    id: 'company-identity',
    label: 'Identidad de la empresa',
    description: 'Nombre, tagline y horarios de atención',
    icon: Building2,
    component: 'BusinessInfoForm',
    order: 1,
    verticals: ['RETAIL', 'BARBERSHOP'],
  },
  hero: {
    id: 'hero',
    label: 'Mensaje principal (Hero)',
    description: 'Título, highlight y descripción que ve el cliente al entrar',
    icon: Sparkles,
    component: 'HeroSection',
    order: 2,
    verticals: ['RETAIL', 'BARBERSHOP'],
  },
  carousel: {
    id: 'carousel',
    label: 'Contenido visual (Carrusel)',
    description: 'Imágenes, transiciones y configuración del carrusel',
    icon: Image,
    component: 'CarouselEditor',
    order: 3,
    verticals: ['RETAIL', 'BARBERSHOP'],
  },
  catalog: {
    id: 'catalog',
    label: 'Catálogo de productos',
    description: 'Mostrar o ocultar catálogo, títulos y descripciones',
    icon: ShoppingBag,
    component: 'CatalogSection',
    order: 4,
    verticals: ['RETAIL'],
  },
  products: {
    id: 'products',
    label: 'Productos recomendados',
    description: 'Productos destacados como venta complementaria',
    icon: Package,
    component: 'ProductsSection',
    order: 5,
    verticals: ['RETAIL', 'BARBERSHOP'],
  },
  offers: {
    id: 'offers',
    label: 'Ofertas y promociones',
    description: 'Mostrar o ocultar ofertas, títulos y descripciones',
    icon: Tags,
    component: 'OffersSection',
    order: 6,
    verticals: ['RETAIL', 'BARBERSHOP'],
  },
  services: {
    id: 'services',
    label: 'Servicios disponibles',
    description: 'Configurar visibilidad y descripción de servicios',
    icon: Scissors,
    component: 'ServicesSection',
    order: 4,
    verticals: ['BARBERSHOP'],
  },
  appointments: {
    id: 'appointments',
    label: 'Sistema de reservas',
    description: 'Reservas online, calendarios y confirmaciones',
    icon: Calendar,
    component: 'AppointmentsSection',
    order: 5,
    verticals: ['BARBERSHOP'],
  },
  marketplace: {
    id: 'marketplace',
    label: 'Visibilidad en marketplace',
    description: 'Categoría para aparecer en el directorio',
    icon: ShoppingBag,
    component: 'MarketplaceCategoryForm',
    order: 99,
    verticals: ['RETAIL', 'BARBERSHOP'],
  },
};

export function getContentSections(vertical: BusinessVertical | null): ContentSection[] {
  if (!vertical) return [];

  return Object.values(CONTENT_SECTIONS)
    .filter((section) => section.verticals.includes(vertical))
    .sort((a, b) => a.order - b.order);
}

export function getSectionById(id: SectionId): ContentSection | undefined {
  return CONTENT_SECTIONS[id];
}

export function getVerticalSectionMap(): Record<BusinessVertical, ContentSection[]> {
  return {
    RETAIL: getContentSections('RETAIL'),
    BARBERSHOP: getContentSections('BARBERSHOP'),
  };
}

export const SECTION_DESCRIPTIONS: Record<BusinessVertical, string> = {
  RETAIL:
    'Configura tu tienda online con catálogo, productos destacados, ofertas y carrito de compras.',
  BARBERSHOP:
    'Personaliza tu barbería con servicios, reservas online, productos recomendados y ofertas.',
};
