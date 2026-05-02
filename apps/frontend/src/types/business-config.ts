export interface BusinessConfig {
  // Información básica del negocio
  businessName: string;
  tagline: string;
  heroTitle: string;
  heroHighlight: string;
  heroDescription: string;

  // Información legal y fiscal (específico para Paraguay)
  legalInfo: {
    ruc?: string; // Registro Único del Contribuyente
    businessType: string; // Tipo de empresa (S.A., S.R.L., etc.)
    taxRegime: string; // Régimen tributario
    economicActivity: string; // Actividad económica principal
    registrationNumber?: string; // Número de registro mercantil
  };

  // Documentos legales (URLs públicas a PDF)
  legalDocuments?: {
    termsUrl?: string;
    privacyUrl?: string;
  };

  // Información de contacto
  contact: {
    phone: string;
    email: string;
    whatsapp?: string;
    website?: string;
    landline?: string; // Teléfono fijo
  };

  // Dirección (adaptada para Paraguay)
  address: {
    street: string;
    neighborhood: string; // Barrio
    city: string;
    department: string; // Departamento (equivalente a estado/provincia)
    zipCode: string;
    country: string;
    reference?: string; // Referencia de ubicación
    // Datos de mapa/ubicación
    mapUrl?: string; // URL a Google Maps u otro proveedor
    latitude?: number; // -90..90
    longitude?: number; // -180..180
    // Opciones de mapa embebido
    mapEmbedEnabled?: boolean;
    mapEmbedUrl?: string; // URL embebible (ej: Google Maps Embed)
  };

  // Redes sociales
  socialMedia: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    linkedin?: string;
  };

  // Horarios de atención (array de strings para mostrar)
  businessHours: string[];

  // Configuración visual
  branding: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    // Nuevos colores opcionales para personalización avanzada
    backgroundColor?: string; // Color de fondo por defecto de secciones
    textColor?: string; // Color de texto principal
    gradientStart?: string; // Inicio de degradado
    gradientEnd?: string; // Fin de degradado
    logo?: string;
    favicon?: string;
  };

  // Configuración de la tienda (adaptada para Paraguay)
  storeSettings: {
    currency: string;
    currencySymbol: string;
    taxRate: number; // IVA en Paraguay es 10%
    taxEnabled: boolean; // Toggle global para habilitar/deshabilitar IVA
    taxIncludedInPrices: boolean; // Si los precios ya incluyen IVA
    freeShippingThreshold: number;
    freeShippingEnabled?: boolean;
    freeShippingMessage?: string;
    freeShippingRegions?: Array<{ id?: string; name: string; threshold: number }>;
    minimumOrderAmount?: number;
    acceptsCreditCards: boolean;
    acceptsDebitCards: boolean;
    acceptsCash: boolean;
    acceptsBankTransfer: boolean;
    // POS Hardware & Behavior
    enableInventoryTracking?: boolean;
    lowStockThreshold?: number;
    enableBarcodeScanner?: boolean;
    printReceipts?: boolean;
    enableCashDrawer?: boolean;
    // POS Auto Actions
    autoPrintOnSale?: boolean;
    autoShareReceipt?: { whatsapp?: boolean; email?: boolean };
  };

  // Configuración del Sistema (Admin)
  systemSettings?: {
    autoBackup: boolean;
    backupFrequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
    maxUsers: number;
    sessionTimeout: number; // minutes
    enableLogging: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';

    security: {
      requireStrongPasswords: boolean;
      enableTwoFactor: boolean;
      maxLoginAttempts: number;
      lockoutDuration: number; // minutes
    };

    email: {
      provider: 'smtp';
      smtpHost: string;
      smtpPort: number;
      smtpUser: string;
      smtpPassword?: string;
    };
  };

  // Configuración de carrusel de imágenes para /home
  carousel: {
    enabled: boolean;
    transitionSeconds: number; // 3-10 segundos
    // Proporción ancho/alto (ej. 1.777 para 16:9). Debe ser > 0
    ratio?: number;
    // Autoplay habilitado/deshabilitado
    autoplay?: boolean;
    // Duración de transición en ms (solo visual)
    transitionMs?: number;
    images: Array<{
      id: string; // uuid o hash
      url: string; // ruta pública (ej: /uploads/carousel/xxx.jpg)
      alt?: string;
    }>;
  };

  // Configuración del carrusel de Ofertas en /home
  homeOffersCarousel?: {
    enabled: boolean;
    autoplay: boolean;
    intervalSeconds: number; // 3-10
    transitionMs: number; // 0-5000
    ratio?: number; // ancho/alto > 0
  };

  // Configuracion especifica del sitio publico del tenant
  publicSite?: {
    sections: {
      showOffers: boolean;
      showCatalog: boolean;
      showCategories: boolean;
      showFeaturedProducts: boolean;
      showContactInfo: boolean;
      showLocation: boolean;
      showCart: boolean;
      showOrderTracking: boolean;
      showBusinessHours: boolean;
      showSocialLinks: boolean;
      showHeroStats: boolean;
    };
    content: {
      announcementText?: string;
      heroBadge?: string;
      heroSecondaryText?: string;
      heroPrimaryCtaLabel?: string;
      heroSecondaryCtaLabel?: string;
      heroImageUrl?: string;
      featuredCategoriesTitle?: string;
      featuredCategoriesDescription?: string;
      featuredProductsTitle?: string;
      featuredProductsDescription?: string;
      offersTitle?: string;
      offersDescription?: string;
      catalogTitle?: string;
      catalogDescription?: string;
      orderTrackingTitle?: string;
      orderTrackingDescription?: string;
      contactTitle?: string;
      contactDescription?: string;
      footerHeadline?: string;
      supportMessage?: string;
    };
  };

  // Configuración de notificaciones
  notifications: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
  };

  // Configuración regional (específico para Paraguay)
  regional: {
    timezone: string; // America/Asuncion
    dateFormat: string; // dd/MM/yyyy
    timeFormat: string; // HH:mm
    language: string; // es-PY
    locale: string; // es-PY
  };

  // Metadatos
  createdAt: string;
  updatedAt: string;
}

export interface BusinessConfigUpdate extends Partial<BusinessConfig> {
  updatedAt: string;
}

export const defaultBusinessConfig: BusinessConfig = {
  businessName: "Mi Negocio Paraguay",
  tagline: "Calidad y servicio de excelencia",
  heroTitle: "Bienvenidos a",
  heroHighlight: "nuestro negocio",
  heroDescription: "Ofrecemos productos y servicios de la mas alta calidad con atencion personalizada y precios justos.",

  legalInfo: {
    ruc: "",
    businessType: "Empresa Individual",
    taxRegime: "Regimen General",
    economicActivity: "Comercio al por menor",
    registrationNumber: ""
  },

  legalDocuments: {
    termsUrl: "",
    privacyUrl: ""
  },

  contact: {
    phone: "+595 21 123-456",
    email: "info@minegocio.com.py",
    whatsapp: "+595 981 123-456",
    website: "https://minegocio.com.py",
    landline: "+595 21 654-321"
  },

  address: {
    street: "Av. Mariscal Lopez 1234",
    neighborhood: "Villa Morra",
    city: "Asuncion",
    department: "Central",
    zipCode: "1209",
    country: "Paraguay",
    reference: "Cerca del Shopping del Sol",
    mapUrl: "",
    mapEmbedEnabled: false,
    mapEmbedUrl: ""
  },

  socialMedia: {
    facebook: "https://facebook.com/minegocio",
    instagram: "https://instagram.com/minegocio",
    twitter: "https://twitter.com/minegocio",
    tiktok: "https://tiktok.com/@minegocio",
    linkedin: "https://linkedin.com/company/minegocio"
  },

  businessHours: [
    "Lunes - Viernes: 8:00 - 18:00",
    "Sabados: 8:00 - 12:00",
    "Domingos: Cerrado"
  ],

  branding: {
    primaryColor: "#dc2626", // Rojo inspirado en la bandera paraguaya
    secondaryColor: "#1d4ed8", // Azul inspirado en la bandera paraguaya
    accentColor: "#059669", // Verde complementario
    // Defaults razonables (pueden personalizarse en Admin)
    // Paleta predeterminada: Porcelain Blue (neutra y profesional)
    backgroundColor: "#f7f9fb",
    textColor: "#202c38",
    gradientStart: "#e9f0f7",
    gradientEnd: "#f9fbfe"
  },

  storeSettings: {
    currency: "PYG",
    currencySymbol: "Gs.",
    taxRate: 0.10, // IVA 10% en Paraguay
    taxEnabled: true, // IVA habilitado por defecto
    taxIncludedInPrices: true,
    freeShippingThreshold: 150000, // 150,000 guaranies
    freeShippingEnabled: true,
    freeShippingMessage: "Envio gratis a partir de {amount}",
    freeShippingRegions: [],
    minimumOrderAmount: 50000, // 50,000 guaranies
    acceptsCreditCards: true,
    acceptsDebitCards: true,
    acceptsCash: true,
    acceptsBankTransfer: true,
    enableInventoryTracking: true,
    lowStockThreshold: 10,
    enableBarcodeScanner: true,
    printReceipts: true,
    enableCashDrawer: true,
    autoPrintOnSale: true,
    autoShareReceipt: { whatsapp: false, email: false }
  },

  systemSettings: {
    autoBackup: true,
    backupFrequency: 'daily',
    maxUsers: 50,
    sessionTimeout: 30,
    enableLogging: true,
    logLevel: 'info',
    security: {
      requireStrongPasswords: true,
      enableTwoFactor: false,
      maxLoginAttempts: 5,
      lockoutDuration: 15
    },
    email: {
      provider: 'smtp',
      smtpHost: '',
      smtpPort: 587,
      smtpUser: ''
    }
  },

  carousel: {
    enabled: true,
    transitionSeconds: 5,
    ratio: 16 / 9,
    autoplay: true,
    transitionMs: 800,
    images: [
      {
        id: "demo-1",
        url: "https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=1600&q=80",
        alt: "Promocion destacada 1"
      },
      {
        id: "demo-2",
        url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1600&q=80",
        alt: "Promocion destacada 2"
      },
      {
        id: "demo-3",
        url: "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=1600&q=80",
        alt: "Promocion destacada 3"
      }
    ]
  },

  homeOffersCarousel: {
    enabled: true,
    autoplay: true,
    intervalSeconds: 5,
    transitionMs: 700,
    ratio: 16 / 9,
  },

  publicSite: {
    sections: {
      showOffers: true,
      showCatalog: true,
      showCategories: true,
      showFeaturedProducts: true,
      showContactInfo: true,
      showLocation: true,
      showCart: true,
      showOrderTracking: true,
      showBusinessHours: true,
      showSocialLinks: true,
      showHeroStats: true,
    },
    content: {
      announcementText: "",
      heroBadge: "Tienda oficial",
      heroSecondaryText: "Compra online, revisa promociones y sigue tus pedidos desde una experiencia publica unificada.",
      heroPrimaryCtaLabel: "Ver catalogo",
      heroSecondaryCtaLabel: "Ver ofertas",
      heroImageUrl: "",
      featuredCategoriesTitle: "Categorias destacadas",
      featuredCategoriesDescription: "Explora las familias con mayor rotacion dentro del catalogo publico.",
      featuredProductsTitle: "Productos destacados",
      featuredProductsDescription: "Seleccion de productos activos con mejor traccion comercial.",
      offersTitle: "Ofertas activas",
      offersDescription: "Promociones visibles para clientes finales, con precios actualizados y ahorro claro.",
      catalogTitle: "Catalogo completo",
      catalogDescription: "Busca por categoria, filtra por disponibilidad y descubre productos del tenant actual.",
      orderTrackingTitle: "Sigue tu pedido",
      orderTrackingDescription: "Consulta el estado de tu compra con una vista clara y actualizada.",
      contactTitle: "Contacto y soporte",
      contactDescription: "Canales visibles para consultas, ubicacion y horarios del negocio.",
      footerHeadline: "Compra con informacion clara, branding consistente y secciones publicas controladas desde el panel.",
      supportMessage: "Si necesitas ayuda con tu pedido o una compra especifica, escribenos por nuestros canales oficiales.",
    },
  },

  notifications: {
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: true
  },

  regional: {
    timezone: "America/Asuncion",
    dateFormat: "dd/MM/yyyy",
    timeFormat: "HH:mm",
    language: "es-PY",
    locale: "es-PY"
  },

  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};
