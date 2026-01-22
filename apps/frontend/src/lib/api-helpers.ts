/**
 * API Helper Functions
 * 
 * Utilidades para manejo consistente de errores y respuestas API
 */

/**
 * Extrae un mensaje de error legible de diferentes tipos de errores
 */
export function getErrorMessage(error: any): string {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.message) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Ha ocurrido un error inesperado';
}

/**
 * Determina si un error es recuperable (puede reintentar)
 */
export function isRetryableError(error: any): boolean {
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return true;
  }
  if (error.response?.status >= 500 && error.response?.status < 600) {
    return true;
  }
  if (error.response?.status === 429) {
    return true;
  }
  return false;
}

/**
 * Obtiene el código de estado HTTP de un error
 */
export function getErrorStatusCode(error: any): number | null {
  return error.response?.status || null;
}

/**
 * Verifica si un error es de autenticación
 */
export function isAuthError(error: any): boolean {
  const status = getErrorStatusCode(error);
  return status === 401 || status === 403;
}

/**
 * Verifica si un error es de validación
 */
export function isValidationError(error: any): boolean {
  const status = getErrorStatusCode(error);
  return status === 400 || status === 422;
}

/**
 * Hook helper para manejar errores con toast
 */
export function handleApiError(
  error: any,
  toast: any,
  customMessages?: {
    title?: string;
    fallbackMessage?: string;
  }
) {
  if (isAuthError(error)) {
    toast({
      title: customMessages?.title || 'Error de autenticación',
      description: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
      variant: 'destructive',
    });
    return;
  }

  toast({
    title: customMessages?.title || 'Error',
    description: getErrorMessage(error) || customMessages?.fallbackMessage || 'Ha ocurrido un error inesperado',
    variant: 'destructive',
  });
}
