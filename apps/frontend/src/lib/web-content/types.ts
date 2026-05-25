export interface HeroSignal {
  title: string;
  description: string;
}

export interface LandingStep {
  number: string;
  title: string;
  description: string;
}

export interface LandingCapability {
  title: string;
  description: string;
}

export interface LandingContent {
  hero: {
    badge: string;
    headline: string;
    subtext: string;
    ctaPrimary: string;
    ctaSecondary: string;
    signals: HeroSignal[];
  };
  howItWorks: {
    headline: string;
    subtext: string;
    steps: LandingStep[];
    capabilitiesHeadline: string;
    capabilities: LandingCapability[];
    fits: Array<{ label: string }>;
    fitsDescription: string;
  };
  benefits: {
    headline: string;
    subtext: string;
    items: Array<{ title: string; description: string }>;
    resolves: string[];
  };
}

export const LANDING_CONTENT_DEFAULTS: LandingContent = {
  hero: {
    badge: 'Plataforma SaaS para retail y operacion comercial',
    headline: 'Gestiona ventas, inventario y equipos desde una sola base operativa',
    subtext:
      'MiPOS unifica punto de venta, control de stock, sucursales y reportes en una experiencia lista para negocios que necesitan orden, velocidad y capacidad de crecer.',
    ctaPrimary: 'Ver planes y capacidad',
    ctaSecondary: 'Ver como funciona',
    signals: [
      {
        title: 'Venta y caja',
        description: 'Operacion diaria con inventario y control comercial en un mismo flujo.',
      },
      {
        title: 'Equipo y permisos',
        description: 'Acceso por roles, sucursales y administracion centralizada.',
      },
      {
        title: 'Datos y continuidad',
        description: 'Base multiempresa, configuracion central y resguardo operativo.',
      },
    ],
  },
  howItWorks: {
    headline: 'Como se activa MiPOS en un negocio real',
    subtext: 'Primero defines capacidad, despues abres la cuenta y luego preparas la operacion.',
    steps: [
      {
        number: '01',
        title: 'Elige el plan',
        description:
          'Compara capacidad, funciones y alcance operativo antes de abrir la cuenta principal.',
      },
      {
        number: '02',
        title: 'Crea tu organizacion',
        description:
          'Registra el negocio, define el administrador inicial y entra al panel con la base lista.',
      },
      {
        number: '03',
        title: 'Activa la operacion',
        description:
          'Carga catalogo, equipo, sucursales y empieza a vender con control centralizado.',
      },
    ],
    capabilitiesHeadline: 'Todo el frente operativo en una sola capa',
    capabilities: [
      {
        title: 'Punto de venta',
        description: 'Cobro, caja y tickets con flujo diario rapido para mostrador o sucursal.',
      },
      {
        title: 'Inventario',
        description: 'Stock, alertas, reposicion y seguimiento por producto y ubicacion.',
      },
      {
        title: 'Usuarios y roles',
        description: 'Permisos por equipo, acceso administrativo y control multiempresa.',
      },
      {
        title: 'Reportes y facturacion',
        description: 'Lectura comercial y operativa para ventas, compras y rendimiento.',
      },
      {
        title: 'Seguridad y continuidad',
        description: 'Sesiones, configuracion central y estructura preparada para escalar.',
      },
    ],
    fits: [
      { label: 'Tiendas de ropa y calzado' },
      { label: 'Minimarkets y almacenes' },
      { label: 'Ferreterias y librerias' },
      { label: 'Tiendas con multiples sucursales' },
      { label: 'Negocios con equipo de ventas' },
      { label: 'Comercios con catalogo amplio' },
    ],
    fitsDescription:
      'Cualquier comercio con caja, stock y equipo que necesita orden sin depender de hojas sueltas.',
  },
  benefits: {
    headline: 'Diseno pensado para trabajar, no para esconder informacion importante',
    subtext:
      'MiPOS concentra las piezas criticas del negocio en una interfaz sobria, rapida y preparada para mas de una sucursal o equipo.',
    items: [
      {
        title: 'Operacion rapida',
        description: 'Venta, caja y actualizacion de stock en el mismo flujo de trabajo.',
      },
      {
        title: 'Base segura',
        description:
          'Datos por empresa, configuracion central y estructura lista para administracion real.',
      },
      {
        title: 'Lectura de negocio',
        description: 'Reportes y senales de rendimiento para ventas, equipo y reposicion.',
      },
      {
        title: 'Equipo controlado',
        description: 'Permisos, roles y operacion coordinada cuando crece la estructura.',
      },
    ],
    resolves: [
      'Centraliza ventas, inventario y configuracion por empresa.',
      'Reduce dependencia de procesos manuales y hojas separadas.',
      'Permite crecer por equipo, sucursal y volumen sin rehacer la base.',
    ],
  },
};

export interface MarketplaceContent {
  hero: {
    badge: string;
    headline: string;
    headlineHighlight: string;
    description: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  sections: {
    organizations: {
      badge: string;
      headline: string;
      headlineHighlight: string;
      ctaLabel: string;
    };
    categories: {
      badge: string;
      headline: string;
      headlineHighlight: string;
      ctaLabel: string;
    };
    catalog: {
      badge: string;
      headline: string;
      headlineHighlight: string;
      ctaLabel: string;
    };
  };
}

export const MARKETPLACE_CONTENT_DEFAULTS: MarketplaceContent = {
  hero: {
    badge: 'Ecosistema publico multiempresa',
    headline: 'Directorio comercial',
    headlineHighlight: 'conectado a MiPOS',
    description:
      'El dominio principal concentra empresas, categorias y productos publicados, mientras cada negocio conserva su catalogo, marca y operacion propia.',
    ctaPrimary: 'Explorar catalogo global',
    ctaSecondary: 'Registrar mi empresa',
  },
  sections: {
    organizations: {
      badge: 'Directorio Global',
      headline: 'Marcas y negocios',
      headlineHighlight: 'publicados',
      ctaLabel: 'Ver todos los negocios',
    },
    categories: {
      badge: 'Navegacion Global',
      headline: 'Explora por',
      headlineHighlight: 'categoria',
      ctaLabel: 'Ver todas las categorias',
    },
    catalog: {
      badge: 'Catalogo Global',
      headline: 'Productos',
      headlineHighlight: 'destacados',
      ctaLabel: 'Ir al catalogo completo',
    },
  },
};
