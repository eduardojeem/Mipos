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

// Un "modo de operación" del cómo-funciona (Tienda / Servicios). Solo texto:
// los iconos y acentos de color viven en el componente, mapeados por posición.
export interface HowItWorksTrack {
  badge: string;
  title: string;
  tagline: string;
  steps: Array<{ title: string; description: string }>;
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
    tracks: HowItWorksTrack[];
    // Campos legacy (ya no se renderizan; se conservan por compatibilidad).
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
    badge: 'Plataforma SaaS para retail y servicios',
    headline: 'Gestiona ventas, turnos e inventario desde una sola base operativa',
    subtext:
      'MiPOS unifica punto de venta, control de stock y agenda de turnos en una misma plataforma. Lo uses como tienda, como negocio de servicios o las dos cosas, todo cae en la misma caja.',
    ctaPrimary: 'Ver planes y capacidad',
    ctaSecondary: 'Ver como funciona',
    signals: [
      {
        title: 'Ventas y turnos',
        description: 'Cobras productos en el punto de venta o turnos desde la agenda, en un mismo flujo de caja.',
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
    tracks: [
      {
        badge: 'Modo tienda',
        title: 'Retail y punto de venta',
        tagline: 'Para comercios que venden productos: kioscos, indumentaria, ferreterias, almacenes.',
        steps: [
          { title: 'Carga tu catalogo', description: 'Productos con precio, costo, stock y categorias. Importas en lote o uno por uno.' },
          { title: 'Vende en el POS', description: 'Cobras rapido por codigo o busqueda, con multiples medios de pago y ticket.' },
          { title: 'Controla el inventario', description: 'El stock se descuenta solo en cada venta; alertas de stock bajo y agotado.' },
          { title: 'Cierra caja y mide', description: 'Arqueo de caja, ventas del dia y reportes de margen y productos top.' },
        ],
      },
      {
        badge: 'Modo servicios',
        title: 'Turnos y agenda',
        tagline: 'Para negocios que venden tiempo: barberias, peluquerias, esteticas, consultorios.',
        steps: [
          { title: 'Defini servicios y profesionales', description: 'Catalogo de servicios con precio y duracion, y el equipo que los atiende.' },
          { title: 'Agenda los turnos', description: 'Reservas por profesional segun disponibilidad real, sin superposiciones.' },
          { title: 'Atende y resolve', description: 'Confirmas, marcas asistencia y reagendas los que se pasaron de fecha.' },
          { title: 'Cobra el turno', description: 'Al cobrar, el turno genera la venta automaticamente: todo queda en la misma caja.' },
        ],
      },
    ],
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
        description: 'Vendes productos o cobras turnos, con caja y stock actualizados en el mismo flujo.',
      },
      {
        title: 'Base segura',
        description:
          'Datos por empresa, configuracion central y estructura lista para administracion real.',
      },
      {
        title: 'Lectura de negocio',
        description: 'Reportes y senales de rendimiento para ventas, turnos, equipo y reposicion.',
      },
      {
        title: 'Equipo controlado',
        description: 'Permisos, roles y agenda por profesional cuando crece la estructura.',
      },
    ],
    resolves: [
      'Centraliza ventas, turnos, inventario y configuracion por empresa.',
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
