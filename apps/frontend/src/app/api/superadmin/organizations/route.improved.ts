/**
 * EJEMPLO DE ENDPOINT MEJORADO
 * Implementa todas las recomendaciones de la auditoría:
 * - Rate limiting
 * - Validación con Zod
 * - Logging seguro
 * - Respuestas estandarizadas
 * - Verificación de 2FA
 */

import { NextRequest } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { applyRateLimit, RateLimitPresets } from '@/lib/rate-limit';
import {
  OrganizationQuerySchema,
  OrganizationCreateSchema,
  OrganizationUpdateSchema,
  validateQueryParams,
  validateRequestBody,
} from '@/lib/validation/superadmin-schemas';
import { secureLogger } from '@/lib/secure-logger';
import {
  successResponse,
  paginatedResponse,
  ErrorResponses,
  handleError,
} from '@/lib/api-response';
import { verify2FARequired } from '@/lib/auth/require-2fa';

const COMPONENT = 'SuperAdminOrganizationsAPI';

/**
 * GET /api/superadmin/organizations
 * Lista todas las organizaciones con paginación y filtros
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const logger = secureLogger.withContext(COMPONENT, 'GET');
  
  try {
    // 1. Rate Limiting
    const rateLimitResponse = await applyRateLimit(request, RateLimitPresets.superAdmin);
    if (rateLimitResponse) {
      logger.warn('Rate limit exceeded');
      return rateLimitResponse;
    }
    
    // 2. Autenticación
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      logger.warn('Authentication failed', { authError: authError?.message });
      return ErrorResponses.unauthorized();
    }
    
    // 3. Verificar 2FA
    const twoFACheck = await verify2FARequired(request);
    if (!twoFACheck.success) {
      logger.warn('2FA required', { userId: user.id });
      return ErrorResponses.twoFARequired(twoFACheck.redirectTo);
    }
    
    // 4. Verificar permisos de super admin
    let isSuperAdmin = false;
    
    // Verificar en user_roles
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role:roles(name)')
      .eq('user_id', user.id)
      .eq('is_active', true);
    
    if (userRoles && userRoles.length > 0) {
      isSuperAdmin = userRoles.some((ur: { role: { name: string } | null }) => 
        String(ur.role?.name || '').toUpperCase() === 'SUPER_ADMIN'
      );
    }
    
    if (!isSuperAdmin) {
      // Verificar en users table
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      isSuperAdmin = String(userData?.role || '').toUpperCase() === 'SUPER_ADMIN';
    }
    
    if (!isSuperAdmin) {
      logger.warn('Access denied - not super admin', { userId: user.id });
      return ErrorResponses.forbidden();
    }
    
    // 5. Validar query parameters
    const searchParams = new URL(request.url).searchParams;
    const validation = validateQueryParams(searchParams, OrganizationQuerySchema);
    
    if (!validation.success) {
      logger.warn('Invalid query parameters', { errors: validation.details });
      return ErrorResponses.validationError(validation.details, validation.error);
    }
    
    const { page, pageSize, search, status, plan, sortBy, sortOrder } = validation.data;
    
    logger.info('Fetching organizations', {
      page,
      pageSize,
      search,
      status,
      plan,
    });
    
    // 6. Consultar base de datos con admin client
    const adminClient = await createAdminClient();
    let query = adminClient
      .from('organizations')
      .select('*, organization_members(count)', { count: 'exact' });
    
    // Aplicar filtros
    if (search) {
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
    }
    
    if (status && status !== 'ALL') {
      query = query.eq('subscription_status', status);
    }
    
    if (plan && plan !== 'ALL') {
      query = query.eq('subscription_plan', plan);
    }
    
    // Aplicar ordenamiento
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    
    // Aplicar paginación
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
    
    const { data: organizations, error: queryError, count } = await query;
    
    if (queryError) {
      logger.error('Database query failed', queryError as Error, {
        query: 'organizations',
      });
      return ErrorResponses.databaseError('Error al obtener organizaciones');
    }
    
    const duration = Date.now() - startTime;
    
    logger.success('Organizations fetched successfully', {
      count: organizations?.length || 0,
      total: count || 0,
      duration,
    });
    
    // 7. Retornar respuesta paginada estandarizada
    return paginatedResponse(
      organizations || [],
      {
        page,
        pageSize,
        total: count || 0,
      },
      {
        message: 'Organizaciones obtenidas exitosamente',
        meta: {
          duration,
          filters: { search, status, plan },
        },
      }
    );
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Fatal error in GET handler', error as Error, { duration });
    return handleError(error);
  }
}

/**
 * POST /api/superadmin/organizations
 * Crea una nueva organización
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const logger = secureLogger.withContext(COMPONENT, 'POST');
  
  try {
    // 1. Rate Limiting (más estricto para escritura)
    const rateLimitResponse = await applyRateLimit(request, RateLimitPresets.write);
    if (rateLimitResponse) {
      logger.warn('Rate limit exceeded');
      return rateLimitResponse;
    }
    
    // 2. Autenticación
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      logger.warn('Authentication failed');
      return ErrorResponses.unauthorized();
    }
    
    // 3. Verificar 2FA
    const twoFACheck = await verify2FARequired(request);
    if (!twoFACheck.success) {
      logger.warn('2FA required', { userId: user.id });
      return ErrorResponses.twoFARequired(twoFACheck.redirectTo);
    }
    
    // 4. Verificar permisos (simplificado para el ejemplo)
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (String(userData?.role || '').toUpperCase() !== 'SUPER_ADMIN') {
      logger.warn('Access denied', { userId: user.id });
      return ErrorResponses.forbidden();
    }
    
    // 5. Validar body
    const validation = await validateRequestBody(request, OrganizationCreateSchema);
    
    if (!validation.success) {
      logger.warn('Invalid request body', { errors: validation.details });
      return ErrorResponses.validationError(validation.details, validation.error);
    }
    
    const organizationData = validation.data;
    
    logger.info('Creating organization', {
      name: organizationData.name,
      slug: organizationData.slug,
    });
    
    // 6. Verificar que el slug no exista
    const adminClient = await createAdminClient();
    const { data: existing } = await adminClient
      .from('organizations')
      .select('id')
      .eq('slug', organizationData.slug)
      .single();
    
    if (existing) {
      logger.warn('Organization slug already exists', { slug: organizationData.slug });
      return ErrorResponses.conflict('Ya existe una organización con ese slug');
    }
    
    // 7. Crear organización
    const { data: newOrg, error: createError } = await adminClient
      .from('organizations')
      .insert({
        ...organizationData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (createError) {
      logger.error('Failed to create organization', createError as Error);
      return ErrorResponses.databaseError('Error al crear la organización');
    }
    
    const duration = Date.now() - startTime;
    
    logger.success('Organization created successfully', {
      organizationId: newOrg.id,
      duration,
    });
    
    // 8. Retornar respuesta exitosa
    return successResponse(
      newOrg,
      {
        message: 'Organización creada exitosamente',
        status: 201,
        meta: {
          duration,
        },
      }
    );
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Fatal error in POST handler', error as Error, { duration });
    return handleError(error);
  }
}

/**
 * PATCH /api/superadmin/organizations
 * Actualiza una organización existente
 */
export async function PATCH(request: NextRequest) {
  const startTime = Date.now();
  const logger = secureLogger.withContext(COMPONENT, 'PATCH');
  
  try {
    // Implementación similar a POST...
    // (Omitida para brevedad, seguiría el mismo patrón)
    
    return successResponse({ message: 'Not implemented yet' });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Fatal error in PATCH handler', error as Error, { duration });
    return handleError(error);
  }
}

/**
 * DELETE /api/superadmin/organizations
 * Elimina una organización
 */
export async function DELETE(request: NextRequest) {
  const startTime = Date.now();
  const logger = secureLogger.withContext(COMPONENT, 'DELETE');
  
  try {
    // Implementación similar a POST...
    // (Omitida para brevedad, seguiría el mismo patrón)
    
    return successResponse({ message: 'Not implemented yet' });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Fatal error in DELETE handler', error as Error, { duration });
    return handleError(error);
  }
}
