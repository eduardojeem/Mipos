import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';

/**
 * Security Headers Middleware
 * Implements comprehensive security headers for the application
 */

/**
 * CORS Configuration
 * Configures Cross-Origin Resource Sharing with strict policies
 */
export const corsMiddleware = cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:3001',
      'https://localhost:3000',
      'https://localhost:3001'
    ];

    // In production, be more restrictive
    if (process.env.NODE_ENV === 'production') {
      const productionOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
      if (productionOrigins.length > 0) {
        allowedOrigins.length = 0; // Clear default origins
        allowedOrigins.push(...productionOrigins);
      }
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-API-Key',
    'X-Env-Mode',
    'x-user-id',
    'x-user-role'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'X-Request-Id'],
  maxAge: 86400 // 24 hours
});

/**
 * Helmet Configuration
 * Configures various security headers using Helmet
 */
export const helmetMiddleware = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for some UI libraries
        "https://fonts.googleapis.com",
        "https://cdn.jsdelivr.net"
      ],
      scriptSrc: [
        "'self'",
        "'unsafe-eval'", // Required for development
        "https://cdn.jsdelivr.net"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdn.jsdelivr.net"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https:",
        process.env.SUPABASE_URL || ""
      ].filter(Boolean),
      connectSrc: [
        "'self'",
        process.env.SUPABASE_URL || "",
        "https://api.supabase.io",
        "wss:"
      ].filter(Boolean),
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "blob:", "data:"],
      workerSrc: ["'self'", "blob:"],
      childSrc: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    },
    reportOnly: process.env.NODE_ENV !== 'production'
  },

  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },

  // X-Frame-Options
  frameguard: {
    action: 'deny'
  },

  // X-Content-Type-Options
  noSniff: true,

  // X-XSS-Protection
  xssFilter: true,

  // Referrer Policy
  referrerPolicy: {
    policy: ['strict-origin-when-cross-origin']
  },

  // X-Permitted-Cross-Domain-Policies
  permittedCrossDomainPolicies: false,

  // X-Download-Options
  ieNoOpen: true,

  // X-DNS-Prefetch-Control
  dnsPrefetchControl: {
    allow: false
  },

  // Expect-CT header is set via custom middleware for compatibility
});

/**
 * Custom Security Headers Middleware
 * Adds additional custom security headers
 */
export const customSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Add custom security headers
  res.setHeader('X-API-Version', '1.0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Expect-CT header (Helmet no longer exposes expectCt option)
  const expectCt = 'max-age=86400' + (process.env.NODE_ENV === 'production' ? ', enforce' : '');
  res.setHeader('Expect-CT', expectCt);
  
  // Cache control for API responses
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }

  // Security headers for file uploads
  if (req.path.includes('/upload')) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'attachment');
  }

  next();
};

/**
 * Security Headers Logging Middleware
 * Logs security-related information for monitoring
 */
export const securityHeadersLogging = (req: Request, res: Response, next: NextFunction) => {
  // Log suspicious headers or patterns
  const suspiciousHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'x-cluster-client-ip',
    'x-forwarded',
    'forwarded-for',
    'forwarded'
  ];

  const hasSuspiciousHeaders = suspiciousHeaders.some(header => 
    req.headers[header] && typeof req.headers[header] === 'string'
  );

  if (hasSuspiciousHeaders) {
    console.log(`[SECURITY] Suspicious headers detected from ${req.ip}:`, {
      headers: Object.fromEntries(
        suspiciousHeaders
          .filter(h => req.headers[h])
          .map(h => [h, req.headers[h]])
      ),
      userAgent: req.headers['user-agent'],
      path: req.path,
      method: req.method
    });
  }

  // Log requests with unusual user agents
  const userAgent = req.headers['user-agent'] as string;
  if (userAgent) {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /java/i
    ];

    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));
    if (isSuspicious && !req.path.includes('/health')) {
      console.log(`[SECURITY] Suspicious user agent from ${req.ip}:`, {
        userAgent,
        path: req.path,
        method: req.method
      });
    }
  }

  next();
};

/**
 * Combined Security Middleware
 * Applies all security headers and configurations
 */
export const applySecurityHeaders = [
  securityHeadersLogging,
  corsMiddleware,
  helmetMiddleware,
  customSecurityHeaders
];