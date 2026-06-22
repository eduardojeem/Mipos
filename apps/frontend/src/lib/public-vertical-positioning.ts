import type { BusinessVertical } from '@/config/verticals'

export type PublicVerticalPositioning = {
  shortLabel: string
  selectorDescription: string
  heroSummary: string
  priceNote: string
  recommendedNote: string
  catalogDescription: string
  comparisonDescription: string
  capacityDescription: string
  finalCtaDescription: string
  primaryFlow: string[]
  sharedModules: string[]
  planImpact: string[]
  verticalModules: Array<{
    title: string
    description: string
    availability: 'Desde Free' | 'Desde Starter' | 'Desde Professional' | 'A medida'
  }>
}

export const PUBLIC_VERTICAL_POSITIONING: Record<BusinessVertical, PublicVerticalPositioning> = {
  RETAIL: {
    shortLabel: 'Tienda',
    selectorDescription: 'Productos, inventario, compras, caja y catalogo publico como flujo principal.',
    heroSummary:
      'El tipo Tienda prioriza productos, stock, ventas y catalogo. Los planes siguen midiendo capacidad, usuarios, sucursales y funciones.',
    priceNote: 'Ideal para validar primero tu inventario comercial, caja y catalogo antes de expandirte.',
    recommendedNote:
      'Capacidad para equipos reales: control de stock con alertas, compras, reportes y multiples sucursales.',
    catalogDescription:
      'Cada plan mide capacidad de productos, usuarios, sucursales, ventas, reportes y funciones comerciales. El rubro solo ordena la experiencia inicial.',
    comparisonDescription:
      'Revisa capacidad de productos, sucursales, usuarios y modulos habilitados para operar una tienda sin sorpresas.',
    capacityDescription: 'Volumen maximo de productos, sucursales, usuarios y cajas fisicas.',
    finalCtaDescription:
      'Crea la cuenta, elige Tienda como flujo principal y empieza con productos, inventario, caja y catalogo publico.',
    primaryFlow: ['Productos e inventario', 'Caja y ventas rapidas', 'Catalogo publico y ofertas'],
    sharedModules: ['Clientes', 'Reportes', 'Usuarios y roles', 'Planes y facturacion'],
    planImpact: [
      'El plan limita volumen y funciones.',
      'El rubro prioriza productos e inventario.',
      'Puedes vender y cobrar desde el POS.',
    ],
    verticalModules: [
      {
        title: 'Catalogo publico ecommerce',
        description: 'Productos publicados, precios, imagenes y detalle conectados al catalogo del negocio.',
        availability: 'Desde Free',
      },
      {
        title: 'Pedidos online',
        description: 'Carrito, checkout, validacion de stock y seguimiento de pedidos web.',
        availability: 'Desde Starter',
      },
      {
        title: 'Marketplace publico',
        description: 'Presencia en el catalogo global multiempresa con categorias y productos publicados.',
        availability: 'Desde Starter',
      },
      {
        title: 'Operacion avanzada',
        description: 'Reportes, fidelizacion, marca publica y capacidad para varias sucursales.',
        availability: 'Desde Professional',
      },
    ],
  },
  BARBERSHOP: {
    shortLabel: 'Barberia',
    selectorDescription: 'Agenda, servicios y profesionales primero; productos, inventario y POS siguen incluidos.',
    heroSummary:
      'El tipo Barberia prioriza agenda, servicios y profesionales, pero no quita productos: puedes vender shampoo, ceras, maquinas o accesorios desde el mismo POS.',
    priceNote:
      'Ideal para ordenar turnos y servicios sin perder ventas de productos en mostrador.',
    recommendedNote:
      'Agenda multi-profesional, servicios, clientes y ventas de productos dentro del mismo panel.',
    catalogDescription:
      'Los planes mantienen limites generales. En Barberia el sistema destaca agenda, servicios y profesionales, pero conserva productos, inventario, clientes y caja.',
    comparisonDescription:
      'Compara capacidad para operar turnos, profesionales, productos, ventas, sucursales y modulos comerciales.',
    capacityDescription:
      'Volumen maximo de productos, sucursales, usuarios y capacidad operativa para agenda y caja.',
    finalCtaDescription:
      'Crea la cuenta, elige Barberia y empieza con agenda, servicios, profesionales, productos y POS en un solo flujo.',
    primaryFlow: ['Agenda de turnos', 'Servicios y profesionales', 'Cobro de servicios y productos'],
    sharedModules: ['Productos e inventario', 'POS y caja', 'Clientes', 'Reportes'],
    planImpact: [
      'El plan limita volumen y funciones.',
      'El rubro prioriza agenda y servicios.',
      'Los productos siguen disponibles para venta e inventario.',
    ],
    verticalModules: [
      {
        title: 'Catalogo de servicios',
        description: 'Servicios con precio, duracion y presentacion publica para clientes.',
        availability: 'Desde Free',
      },
      {
        title: 'Agenda y reservas',
        description: 'Turnos, disponibilidad, estados de reserva y calendario operativo.',
        availability: 'Desde Starter',
      },
      {
        title: 'Profesionales y staff',
        description: 'Profesionales, horarios, excepciones y pagina publica de profesionales.',
        availability: 'Desde Starter',
      },
      {
        title: 'Productos y pedidos online',
        description: 'Venta de productos de reventa con catalogo, carrito y seguimiento de pedidos.',
        availability: 'Desde Starter',
      },
    ],
  },
}

export function getPublicVerticalPositioning(vertical: BusinessVertical): PublicVerticalPositioning {
  return PUBLIC_VERTICAL_POSITIONING[vertical]
}
