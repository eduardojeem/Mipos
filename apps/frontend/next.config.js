// Add path import for outputFileTracingRoot
const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['recharts'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001/api',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  serverExternalPackages: ['@supabase/supabase-js'],

  // Optimizaciones de rendimiento
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      'react-chartjs-2',
      'chart.js',
      '@tanstack/react-query',
      '@tanstack/react-table',
      'framer-motion'  // Optimizar framer-motion
    ],
  },
  // Set monorepo root to silence workspace root warning
  // outputFileTracingRoot: path.join(__dirname, '../../'),

  // Configuración de ESLint para permitir warnings durante el build
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Configuración de compresión
  compress: true,

  // Optimizaciones de bundle y code splitting
  webpack: (config, { dev, isServer }) => {
    // Optimizaciones para producción
    if (!dev && !isServer) {
      // Optimizar imports de librerías grandes
      config.resolve.alias = {
        ...config.resolve.alias,
        'react-window': 'react-window/dist/index.esm.js'
      };

      // Configurar code splitting para chunks más pequeños
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Chunk para librerías de UI
            ui: {
              test: /[\\/]node_modules[\\/](@radix-ui|lucide-react)[\\/]/,
              name: 'ui-libs',
              chunks: 'all',
              priority: 20,
            },
            // Chunk separado para animaciones (framer-motion)
            animations: {
              test: /[\\/]node_modules[\\/](framer-motion)[\\/]/,
              name: 'animation-libs',
              chunks: 'all',
              priority: 15,
            },
            // Chunk para librerías de gráficos
            charts: {
              test: /[\\/]node_modules[\\/](recharts|chart\.js|react-chartjs-2)[\\/]/,
              name: 'chart-libs',
              chunks: 'all',
              priority: 12,
            },
            // Chunk para exportación (lazy loaded)
            export: {
              test: /[\\/]node_modules[\\/](xlsx|jspdf|jspdf-autotable)[\\/]/,
              name: 'export-libs',
              chunks: 'async', // Solo cuando se carga dinámicamente
              priority: 25,
            },
            // Chunk para QR y utilidades menores
            utilities: {
              test: /[\\/]node_modules[\\/](qrcode)[\\/]/,
              name: 'utility-libs',
              chunks: 'async', // Lazy loading
              priority: 8,
            },
            // Chunk para React Query y Table
            data: {
              test: /[\\/]node_modules[\\/](@tanstack)[\\/]/,
              name: 'data-libs',
              chunks: 'all',
              priority: 10,
            },
            // Chunk para utilidades
            utils: {
              test: /[\\/]node_modules[\\/](date-fns|clsx|class-variance-authority|tailwind-merge)[\\/]/,
              name: 'utils',
              chunks: 'all',
              priority: 5,
            },
            // Chunk por defecto para otras librerías
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 1,
            },
          },
        },
      };
    }

    // Optimizaciones para desarrollo - aplicar solo en cliente
    if (dev && !isServer) {
      // Mantener valores por defecto de Next.js en desarrollo; no deshabilitar splitChunks
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
      };
    }

    return config;
  },

  // Configuración de headers para caché y seguridad (solo en producción)
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';
    if (!isProd) {
      // No aplicar headers agresivos de caché en desarrollo para evitar chunks obsoletos
      return [];
    }
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          }
        ]
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, s-maxage=300',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
