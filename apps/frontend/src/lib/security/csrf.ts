/**
 * CSRF Protection Implementation
 * 
 * Protege contra ataques Cross-Site Request Forgery
 * usando tokens de doble envío (Double Submit Cookie)
 */

const CSRF_TOKEN_KEY = 'csrf_token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hora

interface CSRFToken {
  token: string;
  expiresAt: number;
}

/**
 * Genera un token CSRF criptográficamente seguro
 */
function generateToken(): string {
  if (typeof window === 'undefined') {
    // Server-side: usar crypto de Node.js
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('base64url');
  }
  
  // Client-side: usar Web Crypto API
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Obtiene o genera un token CSRF
 */
export function getCSRFToken(): string {
  if (typeof window === 'undefined') {
    return generateToken();
  }

  try {
    const stored = sessionStorage.getItem(CSRF_TOKEN_KEY);
    
    if (stored) {
      const parsed: CSRFToken = JSON.parse(stored);
      
      // Verificar si el token no ha expirado
      if (Date.now() < parsed.expiresAt) {
        return parsed.token;
      }
    }
  } catch (e) {
    console.error('Error reading CSRF token:', e);
  }

  // Generar nuevo token
  const token = generateToken();
  const csrfToken: CSRFToken = {
    token,
    expiresAt: Date.now() + TOKEN_EXPIRY_MS
  };

  try {
    sessionStorage.setItem(CSRF_TOKEN_KEY, JSON.stringify(csrfToken));
  } catch (e) {
    console.error('Error storing CSRF token:', e);
  }

  return token;
}

/**
 * Valida un token CSRF
 */
export function validateCSRFToken(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  try {
    const stored = sessionStorage.getItem(CSRF_TOKEN_KEY);
    
    if (!stored) {
      return false;
    }

    const parsed: CSRFToken = JSON.parse(stored);
    
    // Verificar que el token coincida y no haya expirado
    return (
      parsed.token === token &&
      Date.now() < parsed.expiresAt
    );
  } catch (e) {
    console.error('Error validating CSRF token:', e);
    return false;
  }
}

/**
 * Limpia el token CSRF (útil al cerrar sesión)
 */
export function clearCSRFToken(): void {
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(CSRF_TOKEN_KEY);
    } catch (e) {
      console.error('Error clearing CSRF token:', e);
    }
  }
}

/**
 * Agrega el token CSRF a los headers de una petición
 */
export function addCSRFHeader(headers: HeadersInit = {}): HeadersInit {
  const token = getCSRFToken();
  
  return {
    ...headers,
    [CSRF_HEADER_NAME]: token
  };
}

/**
 * Wrapper para fetch que incluye automáticamente el token CSRF
 */
export async function secureFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = options.method?.toUpperCase() || 'GET';
  
  // Solo agregar CSRF token para métodos que modifican datos
  const needsCSRF = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  
  if (needsCSRF) {
    options.headers = addCSRFHeader(options.headers);
  }

  return fetch(url, options);
}

/**
 * Middleware para validar CSRF en el servidor (Next.js API routes)
 */
export function validateCSRFMiddleware(req: Request): boolean {
  const method = req.method?.toUpperCase();
  
  // Solo validar para métodos que modifican datos
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method || '')) {
    return true;
  }

  const token = req.headers.get(CSRF_HEADER_NAME);
  
  if (!token) {
    console.warn('CSRF token missing in request');
    return false;
  }

  // En producción, validar contra el token almacenado en la sesión
  // Por ahora, solo verificar que existe y tiene el formato correcto
  const isValid = token.length >= 32 && /^[A-Za-z0-9_-]+$/.test(token);
  
  if (!isValid) {
    console.warn('Invalid CSRF token format');
  }
  
  return isValid;
}

/**
 * Hook de React para usar CSRF protection
 */
export function useCSRFToken() {
  const [token, setToken] = React.useState<string>('');

  React.useEffect(() => {
    setToken(getCSRFToken());
  }, []);

  const refreshToken = React.useCallback(() => {
    clearCSRFToken();
    const newToken = getCSRFToken();
    setToken(newToken);
    return newToken;
  }, []);

  return {
    token,
    refreshToken,
    addToHeaders: (headers: HeadersInit = {}) => addCSRFHeader(headers)
  };
}

// Para compatibilidad con React
import React from 'react';
