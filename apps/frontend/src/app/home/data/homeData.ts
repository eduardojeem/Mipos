import { BusinessConfig } from '@/types/business-config';
import { formatPrice } from '@/utils/formatters';

export interface FeaturedProduct {
  id: number;
  name: string;
  price: number;
  originalPrice: number;
  image: string;
  rating: number;
  reviews: number;
  discount: number;
  category: string;
  stock?: number;
}

export interface SpecialOffer {
  title: string;
  description: string;
  validUntil: string;
  image: string;
}

export const featuredProducts: FeaturedProduct[] = [
  {
    id: 1,
    name: 'Crema Hidratante Premium',
    price: 299.99,
    originalPrice: 399.99,
    image: '/api/placeholder/300/300',
    rating: 4.8,
    reviews: 124,
    discount: 25,
    category: 'Cuidado Facial',
  },
  {
    id: 2,
    name: 'Labial Mate Larga Duración',
    price: 149.99,
    originalPrice: 199.99,
    image: '/api/placeholder/300/300',
    rating: 4.9,
    reviews: 89,
    discount: 25,
    category: 'Maquillaje',
  },
  {
    id: 3,
    name: 'Serum Vitamina C',
    price: 449.99,
    originalPrice: 549.99,
    image: '/api/placeholder/300/300',
    rating: 4.7,
    reviews: 156,
    discount: 18,
    category: 'Cuidado Facial',
  },
];

export function getSpecialOffers(config: BusinessConfig): SpecialOffer[] {
  return [
    {
      title: '50% OFF en Maquillaje',
      description: 'Descuentos increíbles en toda la línea de maquillaje',
      validUntil: '2024-02-28',
      image: '/api/placeholder/400/200',
    },
    {
      title: 'Compra 2 y lleva 3',
      description: 'En productos de cuidado facial seleccionados',
      validUntil: '2024-02-25',
      image: '/api/placeholder/400/200',
    },
    {
      title: 'Envío Gratis',
      description: `En compras mayores a ${formatPrice(
        config.storeSettings.freeShippingThreshold,
        config
      )}`,
      validUntil: '2024-03-01',
      image: '/api/placeholder/400/200',
    },
  ];
}