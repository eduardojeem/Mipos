/**
 * Sanea un término de búsqueda para interpolarlo de forma segura dentro de un
 * filtro PostgREST `.or(...ilike...)`.
 *
 * Previene dos cosas:
 *  1. Inyección de filtros: PostgREST usa coma/paréntesis como sintaxis del
 *     `.or()`. Sin sanear, un valor como `a),is_active.eq.false` permitiría
 *     inyectar condiciones adicionales y alterar la lógica del query.
 *  2. Abuso de comodines ILIKE: `%` y `_` son comodines; se escapan para que se
 *     traten como literales.
 *
 * Además limita la longitud para evitar queries patológicas.
 */
export function sanitizeSearch(raw: string | null | undefined, maxLen = 100): string {
  if (!raw) return '';
  return raw
    .replace(/[,()\\]/g, ' ') // estructura del filtro or() + backslash
    .replace(/\*/g, '')        // comodín de PostgREST
    .replace(/[%_]/g, '\\$&')  // comodines ILIKE → literales
    .trim()
    .slice(0, maxLen);
}
