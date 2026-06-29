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
      'MITIENDA unifica punto de venta, control de stock y agenda de turnos en una misma plataforma. Lo uses como tienda, como negocio de servicios o las dos cosas, todo cae en la misma caja.',
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
    headline: 'Como se activa MITIENDA en un negocio real',
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
      'MITIENDA concentra las piezas criticas del negocio en una interfaz sobria, rapida y preparada para mas de una sucursal o equipo.',
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
    badge: 'Catalogo de productos de tiendas activas',
    headline: 'Encuentra productos',
    headlineHighlight: 'de comercios reales',
    description:
      'Explora ofertas, novedades y productos disponibles publicados por tiendas registradas. Compara precios, revisa disponibilidad y entra directo al catalogo de cada negocio.',
    ctaPrimary: 'Ver productos publicados',
    ctaSecondary: 'Registrar mi empresa',
  },
  sections: {
    organizations: {
      badge: 'Tiendas con catalogo',
      headline: 'Negocios que publican',
      headlineHighlight: 'publicados',
      ctaLabel: 'Ver todos los negocios',
    },
    categories: {
      badge: 'Categorias de productos',
      headline: 'Compra por',
      headlineHighlight: 'categoria',
      ctaLabel: 'Ver todas las categorias',
    },
    catalog: {
      badge: 'Catalogo de tiendas',
      headline: 'Productos publicados',
      headlineHighlight: 'por comercios',
      ctaLabel: 'Ver mas productos',
    },
  },
};

// ── Legal (Términos / Privacidad) ────────────────────────────────────────────
// El cuerpo se edita como texto. Convenciones de formato soportadas por el
// render público (componente LegalBody): líneas que empiezan con "## " son
// subtítulos, líneas con "- " son ítems de lista, y los bloques separados por
// una línea en blanco son párrafos. No se interpreta HTML (sin riesgo de XSS).
export interface LegalContent {
  version: string;
  lastUpdated: string;
  termsTitle: string;
  termsBody: string;
  privacyTitle: string;
  privacyBody: string;
}

export const LEGAL_CONTENT_DEFAULTS: LegalContent = {
  version: '2026-06-23',
  lastUpdated: '23 de junio de 2026',
  termsTitle: 'Términos de Servicio',
  termsBody: `Bienvenido a MiPOS. Estos Términos de Servicio (los “Términos”) regulan el acceso y uso de la plataforma. Al crear una cuenta, navegar el catálogo o utilizar cualquier funcionalidad, aceptás estos Términos. Si no estás de acuerdo, no utilices la plataforma.

## 1. Qué es la plataforma
MiPOS es una plataforma tecnológica que permite a comercios y tiendas independientes (las “Tiendas”) publicar sus productos y servicios, gestionar sus ventas y mostrar un catálogo público. MiPOS provee el software; no es el vendedor de los productos o servicios ofrecidos por las Tiendas.

## 2. Rol de la plataforma y deslinde de responsabilidad
MiPOS actúa únicamente como intermediario tecnológico. En consecuencia, son responsabilidad exclusiva de cada Tienda, y no de MiPOS:
- La existencia, calidad, seguridad y legalidad de los productos o servicios.
- La veracidad y exactitud de descripciones, precios, fotos y disponibilidad de stock.
- El cumplimiento de los pedidos, la facturación, los envíos y las entregas.
- Las garantías, cambios, devoluciones y atención postventa.
- El cumplimiento de las obligaciones tributarias y regulatorias de la Tienda.

MiPOS no garantiza la disponibilidad, exactitud ni actualización de la información publicada por las Tiendas, ni la concreción de ninguna transacción.

## 3. Relación entre comprador y Tienda
Cualquier compra, reserva o contratación se celebra directamente entre el comprador y la Tienda. MiPOS no es parte de esa relación. Los reclamos por productos o servicios deben dirigirse a la Tienda correspondiente.

## 4. Cuentas y registro
Para usar ciertas funciones necesitás crear una cuenta. Sos responsable de la veracidad de los datos que proporcionás y de mantener la confidencialidad de tus credenciales. La actividad realizada desde tu cuenta es tu responsabilidad.

## 5. Uso aceptable
Al usar la plataforma te comprometés a no publicar contenido falso, ilegal, infractor o engañoso; no vulnerar la seguridad de la plataforma ni acceder a datos de terceros; no usar la plataforma para fines fraudulentos o no autorizados; y no realizar scraping masivo o sobrecargar el servicio de forma abusiva.

## 6. Disponibilidad del servicio
MiPOS se ofrece “tal cual” y “según disponibilidad”. No garantizamos que el servicio sea ininterrumpido o libre de errores. Podemos modificar, suspender o discontinuar funcionalidades en cualquier momento.

## 7. Limitación de responsabilidad
En la máxima medida permitida por la ley aplicable, MiPOS no será responsable por daños indirectos, incidentales o consecuentes derivados del uso o imposibilidad de uso de la plataforma, ni por las operaciones realizadas entre compradores y Tiendas.

## 8. Propiedad intelectual
El software, la marca y los elementos de la plataforma pertenecen a MiPOS. El contenido publicado por cada Tienda pertenece a dicha Tienda, que es responsable de contar con los derechos necesarios.

## 9. Modificaciones
Podemos actualizar estos Términos. Cuando los cambios sean sustanciales, lo informaremos por medios razonables. El uso continuado de la plataforma tras la actualización implica la aceptación de los nuevos Términos.

## 10. Ley aplicable y contacto
Estos Términos se rigen por las leyes de la República del Paraguay. Para consultas legales, escribinos a soporte@mitienda.com.py.`,
  privacyTitle: 'Política de Privacidad',
  privacyBody: `Esta Política describe cómo MiPOS recopila, usa y protege la información de quienes utilizan la plataforma. Al usarla, aceptás las prácticas aquí descritas.

## 1. Datos que recopilamos
- Datos de cuenta: nombre, correo, teléfono y datos del negocio al registrarte.
- Datos de uso: páginas visitadas, acciones en la plataforma y datos técnicos (dispositivo, navegador, IP).
- Datos de transacciones: información de pedidos y ventas gestionados a través de la plataforma.

## 2. Cómo usamos los datos
- Proveer y operar la plataforma.
- Procesar registros, pedidos y soporte.
- Mejorar el servicio y prevenir fraudes o abusos.
- Cumplir obligaciones legales.

## 3. Con quién compartimos datos
Cuando interactuás con una Tienda (por ejemplo, al realizar un pedido), compartimos con esa Tienda los datos necesarios para gestionar la operación. Cada Tienda es responsable del tratamiento de los datos que recibe. También podemos usar proveedores tecnológicos (hosting, base de datos) que procesan datos por nuestra cuenta bajo confidencialidad.

## 4. Cookies y tecnologías similares
Usamos cookies y almacenamiento local para mantener tu sesión, recordar preferencias y entender el uso de la plataforma. Podés gestionarlas desde la configuración de tu navegador.

## 5. Seguridad
Aplicamos medidas razonables para proteger los datos. Ningún sistema es completamente seguro, por lo que no podemos garantizar seguridad absoluta.

## 6. Tus derechos
Podés solicitar acceder, corregir o eliminar tus datos personales, así como retirar consentimientos, escribiéndonos al correo de contacto. Atenderemos tu solicitud conforme a la legislación aplicable.

## 7. Retención
Conservamos los datos mientras tu cuenta esté activa y durante el tiempo necesario para cumplir obligaciones legales o resolver disputas.

## 8. Contacto
Para ejercer tus derechos o consultas sobre privacidad, escribinos a soporte@mitienda.com.py.`,
};
