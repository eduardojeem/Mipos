export interface WebPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  metaDescription: string;
  metaKeywords?: string;
  isPublished: boolean;
  publishedAt?: string;
  version: number;
  authorId: string;
  authorName: string;
  category: string;
  tags: string[];
  viewCount: number;
  seoScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface Banner {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  linkUrl?: string;
  position: 'HERO' | 'SIDEBAR' | 'FOOTER' | 'POPUP';
  isActive: boolean;
  order: number;
  startDate?: string;
  endDate?: string;
  targetAudience: string[];
  clickCount: number;
  impressionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  alt?: string;
  caption?: string;
  folder: string;
  tags: string[];
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
}

export const store: {
  pages: WebPage[];
  banners: Banner[];
  media: MediaFile[];
} = {
  pages: [
    {
      id: '1',
      title: 'Página de Inicio',
      slug: 'inicio',
      content: '<h1>Bienvenidos a BeautyPOS</h1><p>Tu sistema de punto de venta para productos de belleza.</p>',
      metaDescription: 'Sistema POS especializado en productos de belleza y cosméticos',
      metaKeywords: 'pos, belleza, cosméticos, sistema, ventas',
      isPublished: true,
      publishedAt: '2024-12-01T10:00:00Z',
      version: 3,
      authorId: 'user-1',
      authorName: 'Admin Usuario',
      category: 'Principal',
      tags: ['inicio', 'principal'],
      viewCount: 1250,
      seoScore: 85,
      createdAt: '2024-11-15T09:00:00Z',
      updatedAt: '2024-12-01T10:00:00Z'
    },
    {
      id: '2',
      title: 'Sobre Nosotros',
      slug: 'sobre-nosotros',
      content: '<h1>Nuestra Historia</h1><p>BeautyPOS nació con la misión de revolucionar...</p>',
      metaDescription: 'Conoce la historia y misión de BeautyPOS',
      metaKeywords: 'historia, misión, equipo, belleza',
      isPublished: true,
      publishedAt: '2024-11-20T14:30:00Z',
      version: 2,
      authorId: 'user-2',
      authorName: 'Marketing Team',
      category: 'Institucional',
      tags: ['empresa', 'historia'],
      viewCount: 890,
      seoScore: 78,
      createdAt: '2024-11-18T11:00:00Z',
      updatedAt: '2024-11-20T14:30:00Z'
    },
    {
      id: '3',
      title: 'Política de Privacidad',
      slug: 'politica-privacidad',
      content: '<h1>Política de Privacidad</h1><p>En BeautyPOS respetamos tu privacidad...</p>',
      metaDescription: 'Política de privacidad y protección de datos de BeautyPOS',
      isPublished: false,
      version: 1,
      authorId: 'user-1',
      authorName: 'Admin Usuario',
      category: 'Legal',
      tags: ['legal', 'privacidad'],
      viewCount: 0,
      seoScore: 65,
      createdAt: '2024-12-10T16:00:00Z',
      updatedAt: '2024-12-10T16:00:00Z'
    }
  ],
  banners: [
    {
      id: '1',
      title: 'Promoción Black Friday',
      description: 'Descuentos hasta 50% en productos seleccionados',
      imageUrl: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=400&fit=crop',
      linkUrl: '/promociones/black-friday',
      position: 'HERO',
      isActive: true,
      order: 1,
      startDate: '2024-11-25T00:00:00Z',
      endDate: '2024-11-30T23:59:59Z',
      targetAudience: ['todos'],
      clickCount: 245,
      impressionCount: 3200,
      createdAt: '2024-11-20T10:00:00Z',
      updatedAt: '2024-11-25T08:00:00Z'
    },
    {
      id: '2',
      title: 'Nuevos Productos',
      description: 'Descubre nuestra nueva línea de productos premium',
      imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop',
      linkUrl: '/productos/nuevos',
      position: 'SIDEBAR',
      isActive: true,
      order: 1,
      targetAudience: ['clientes-premium'],
      clickCount: 89,
      impressionCount: 1500,
      createdAt: '2024-12-01T12:00:00Z',
      updatedAt: '2024-12-01T12:00:00Z'
    },
    {
      id: '3',
      title: 'Newsletter',
      description: 'Suscríbete y recibe ofertas exclusivas',
      imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&h=200&fit=crop',
      position: 'FOOTER',
      isActive: false,
      order: 1,
      targetAudience: ['visitantes'],
      clickCount: 12,
      impressionCount: 800,
      createdAt: '2024-11-28T15:00:00Z',
      updatedAt: '2024-12-05T09:00:00Z'
    }
  ],
  media: [
    {
      id: '1',
      filename: 'hero-banner-1.jpg',
      originalName: 'Hero Banner Principal.jpg',
      mimeType: 'image/jpeg',
      size: 245760,
      url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=400&fit=crop',
      thumbnailUrl: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=100&fit=crop',
      alt: 'Banner principal de promociones',
      caption: 'Imagen para banner de promociones especiales',
      folder: 'banners',
      tags: ['banner', 'promocion', 'hero'],
      downloadCount: 15,
      createdAt: '2024-11-20T10:00:00Z',
      updatedAt: '2024-11-20T10:00:00Z'
    },
    {
      id: '2',
      filename: 'product-showcase.jpg',
      originalName: 'Showcase Productos.jpg',
      mimeType: 'image/jpeg',
      size: 189440,
      url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop',
      thumbnailUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&h=150&fit=crop',
      alt: 'Showcase de productos de belleza',
      folder: 'productos',
      tags: ['productos', 'showcase', 'belleza'],
      downloadCount: 8,
      createdAt: '2024-12-01T12:00:00Z',
      updatedAt: '2024-12-01T12:00:00Z'
    },
    {
      id: '3',
      filename: 'newsletter-bg.jpg',
      originalName: 'Fondo Newsletter.jpg',
      mimeType: 'image/jpeg',
      size: 156800,
      url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&h=200&fit=crop',
      thumbnailUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200&h=67&fit=crop',
      alt: 'Fondo para newsletter',
      folder: 'newsletter',
      tags: ['newsletter', 'fondo', 'email'],
      downloadCount: 3,
      createdAt: '2024-11-28T15:00:00Z',
      updatedAt: '2024-11-28T15:00:00Z'
    },
    {
      id: '4',
      filename: 'brand-guide.pdf',
      originalName: 'Guía de Marca BeautyPOS.pdf',
      mimeType: 'application/pdf',
      size: 2048000,
      url: '/files/brand-guide.pdf',
      folder: 'documentos',
      tags: ['marca', 'guia', 'branding'],
      downloadCount: 25,
      createdAt: '2024-11-15T09:00:00Z',
      updatedAt: '2024-11-15T09:00:00Z'
    }
  ]
}

