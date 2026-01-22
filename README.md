# Beauty POS System

Sistema de Punto de Venta (POS) completo para gestión de negocios de belleza, desarrollado con Next.js, TypeScript y Supabase.

## 🚀 Características

- **Gestión de Ventas**: Sistema completo de punto de venta con carrito de compras
- **Inventario**: Control de productos, stock y movimientos
- **Clientes**: Gestión de base de datos de clientes
- **Promociones y Ofertas**: Sistema de descuentos y promociones
- **Reportes**: Dashboard con estadísticas y análisis de ventas
- **Caja**: Control de sesiones de caja y movimientos de efectivo
- **Multi-usuario**: Sistema de roles y permisos
- **Responsive**: Diseño adaptable a dispositivos móviles y tablets

## 🛠️ Tecnologías

- **Frontend**: Next.js 14, React, TypeScript
- **Backend**: Next.js API Routes, Node.js
- **Base de Datos**: Supabase (PostgreSQL)
- **Estilos**: Tailwind CSS, shadcn/ui
- **Autenticación**: Supabase Auth
- **Testing**: Playwright, Vitest
- **Monorepo**: Turborepo

## 📋 Requisitos Previos

- Node.js 18+ 
- npm o yarn
- Cuenta de Supabase

## 🔧 Instalación

1. Clonar el repositorio:
```bash
git clone <tu-repositorio-url>
cd pos-system-pos
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:

Crear archivo `.env.local` en la raíz del proyecto:
```env
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

4. Ejecutar migraciones de base de datos:
```bash
npm run db:migrate
```

5. Iniciar el servidor de desarrollo:
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📁 Estructura del Proyecto

```
pos-system-pos/
├── apps/
│   ├── frontend/          # Aplicación Next.js
│   │   ├── src/
│   │   │   ├── app/       # App Router de Next.js
│   │   │   ├── components/# Componentes React
│   │   │   ├── lib/       # Utilidades y configuración
│   │   │   └── types/     # Tipos TypeScript
│   │   └── public/        # Archivos estáticos
│   └── backend/           # API Backend (opcional)
├── database/              # Migraciones y scripts SQL
├── scripts/               # Scripts de utilidad
└── docs/                  # Documentación

```

## 🚀 Scripts Disponibles

```bash
npm run dev          # Iniciar desarrollo
npm run build        # Construir para producción
npm run start        # Iniciar en producción
npm run lint         # Ejecutar linter
npm run test         # Ejecutar tests
npm run db:migrate   # Ejecutar migraciones
```

## 🔐 Configuración de Supabase

1. Crear un proyecto en [Supabase](https://supabase.com)
2. Ejecutar las migraciones SQL desde la carpeta `database/migrations`
3. Configurar las políticas RLS (Row Level Security)
4. Copiar las credenciales al archivo `.env.local`

## 📝 Licencia

Este proyecto es privado y confidencial.

## 👥 Contribuir

Para contribuir al proyecto, por favor contacta al administrador del repositorio.

## 📧 Contacto

Para más información, contacta al equipo de desarrollo.
