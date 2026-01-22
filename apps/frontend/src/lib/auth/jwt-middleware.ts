import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { createLogger } from '@/lib/logger';

const log = createLogger('jwt-middleware');

export interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  permissions: string[];
  iat: number;
  exp: number;
  session_id?: string;
  device_id?: string;
}

export interface JWTConfig {
  secret?: string;
  publicKey?: string;
  issuer?: string;
  audience?: string;
  algorithms?: string[];
  clockTolerance?: number;
}

export class JWTAuthMiddleware {
  private config: JWTConfig;
  private jwks?: ReturnType<typeof createRemoteJWKSet>;

  constructor(config: JWTConfig = {}) {
    this.config = {
      algorithms: ['HS256', 'RS256', 'ES256'],
      clockTolerance: 30,
      issuer: process.env.JWT_ISSUER || 'beautypos-auth',
      audience: process.env.JWT_AUDIENCE || 'beautypos-api',
      ...config
    };

    // Initialize JWKS if public key URL is provided
    if (this.config.publicKey && this.config.publicKey.startsWith('http')) {
      this.jwks = createRemoteJWKSet(new URL(this.config.publicKey));
    }
  }

  /**
   * Verify JWT token and return payload
   */
  async verifyToken(token: string): Promise<JWTPayload> {
    try {
      let payload: any;

      if (this.jwks) {
        // Verify using JWKS (for RS256/ES256 algorithms)
        const result = await jwtVerify(token, this.jwks, {
          algorithms: this.config.algorithms as any,
          issuer: this.config.issuer,
          audience: this.config.audience,
          clockTolerance: this.config.clockTolerance
        });
        payload = result.payload;
      } else if (this.config.secret) {
        // Verify using shared secret (for HS256 algorithm)
        const secret = new TextEncoder().encode(this.config.secret);
        const result = await jwtVerify(token, secret, {
          algorithms: this.config.algorithms as any,
          issuer: this.config.issuer,
          audience: this.config.audience,
          clockTolerance: this.config.clockTolerance
        });
        payload = result.payload;
      } else {
        throw new Error('No JWT verification method configured');
      }

      // Validate required claims
      if (!payload.sub || !payload.email || !payload.role) {
        throw new Error('Missing required JWT claims');
      }

      // Ensure permissions is an array
      if (!Array.isArray(payload.permissions)) {
        payload.permissions = [];
      }

      return payload as JWTPayload;
    } catch (error) {
      log.error('JWT verification failed', { error: error instanceof Error ? error.message : String(error) });
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractToken(request: NextRequest): string | null {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return null;
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return null;
    }

    return token;
  }

  /**
   * Middleware handler for API routes
   */
  async handle(request: NextRequest): Promise<NextResponse | null> {
    try {
      const token = this.extractToken(request);
      
      if (!token) {
        return NextResponse.json(
          { error: 'Missing authorization token', code: 'MISSING_TOKEN' },
          { status: 401 }
        );
      }

      const payload = await this.verifyToken(token);
      
      // Add user info to request headers for downstream use
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', payload.sub);
      requestHeaders.set('x-user-email', payload.email);
      requestHeaders.set('x-user-role', payload.role);
      requestHeaders.set('x-user-permissions', JSON.stringify(payload.permissions));
      requestHeaders.set('x-session-id', payload.session_id || '');

      // Create new request with enhanced headers
      const enhancedRequest = new NextRequest(request, {
        headers: requestHeaders
      });

      return null; // Continue to next middleware/handler
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      return NextResponse.json(
        { error: errorMessage, code: 'INVALID_TOKEN' },
        { status: 401 }
      );
    }
  }

  /**
   * Check if user has required permissions
   */
  checkPermissions(payload: JWTPayload, requiredPermissions: string[]): boolean {
    if (!requiredPermissions.length) {
      return true;
    }

    return requiredPermissions.some(permission => 
      payload.permissions.includes(permission) || 
      payload.permissions.includes('*') // Super admin permission
    );
  }

  /**
   * Check if user has required role
   */
  checkRole(payload: JWTPayload, requiredRoles: string[]): boolean {
    if (!requiredRoles.length) {
      return true;
    }

    return requiredRoles.includes(payload.role) || requiredRoles.includes('*');
  }
}

// Export singleton instance
export const jwtAuth = new JWTAuthMiddleware({
  secret: process.env.JWT_SECRET,
  publicKey: process.env.JWT_PUBLIC_KEY_URL || process.env.JWT_PUBLIC_KEY,
  issuer: process.env.JWT_ISSUER,
  audience: process.env.JWT_AUDIENCE
});

/**
 * Higher-order function to protect API routes with JWT authentication
 */
export function withJWTAuth(
  handler: (request: NextRequest, context: { user: JWTPayload }) => Promise<NextResponse>,
  options: {
    permissions?: string[];
    roles?: string[];
    allowPublic?: boolean;
  } = {}
) {
  return async (request: NextRequest) => {
    try {
      // Skip authentication if public access is allowed
      if (options.allowPublic) {
        return handler(request, { user: {} as JWTPayload });
      }

      const token = jwtAuth.extractToken(request);
      
      if (!token) {
        return NextResponse.json(
          { error: 'Missing authorization token', code: 'MISSING_TOKEN' },
          { status: 401 }
        );
      }

      const payload = await jwtAuth.verifyToken(token);

      // Check permissions if required
      if (options.permissions?.length && !jwtAuth.checkPermissions(payload, options.permissions)) {
        return NextResponse.json(
          { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
          { status: 403 }
        );
      }

      // Check roles if required
      if (options.roles?.length && !jwtAuth.checkRole(payload, options.roles)) {
        return NextResponse.json(
          { error: 'Insufficient role', code: 'INSUFFICIENT_ROLE' },
          { status: 403 }
        );
      }

      return handler(request, { user: payload });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      return NextResponse.json(
        { error: errorMessage, code: 'AUTHENTICATION_FAILED' },
        { status: 401 }
      );
    }
  };
}

/**
 * Get user from request headers (after JWT middleware)
 */
export function getUserFromRequest(request: NextRequest): JWTPayload | null {
  const userId = request.headers.get('x-user-id');
  const email = request.headers.get('x-user-email');
  const role = request.headers.get('x-user-role');
  const permissions = request.headers.get('x-user-permissions');
  const sessionId = request.headers.get('x-session-id');

  if (!userId || !email || !role) {
    return null;
  }

  return {
    sub: userId,
    email,
    role,
    permissions: permissions ? JSON.parse(permissions) : [],
    iat: 0,
    exp: 0,
    session_id: sessionId || undefined
  };
}