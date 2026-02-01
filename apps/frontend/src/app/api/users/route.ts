import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { isMockAuthEnabled } from '@/lib/env';
import { createClient as createSBClient } from '@supabase/supabase-js';
import { supabaseConfig } from '@/lib/supabase';
import { assertAdmin } from '@/app/api/_utils/auth';

// Explicit type for transformed user list items
type UserListItem = {
  id: string;
  email?: string | null;
  name?: string;
  role: string;
  status: string;
  createdAt: string;
  lastLogin: string;
};

export async function GET(request: NextRequest) {
  try {
    const auth = await assertAdmin(request);
    if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
    }
    // Mock mode: return synthetic user list to keep Admin UI functional
    const forceMock = (request.headers.get('x-env-mode') || request.headers.get('X-Env-Mode') || '').toLowerCase() === 'mock'
    if (forceMock || isMockAuthEnabled()) {
      const now = new Date().toISOString();
      const mockUserId = request.headers.get('x-user-id') || 'mock-user-id';
      const mockRole = (request.headers.get('x-user-role') || 'ADMIN').toUpperCase();
      return NextResponse.json({
        success: true,
        data: [
          {
            id: mockUserId,
            email: 'admin@example.com',
            name: 'Administrador',
            role: mockRole as any,
            status: 'active',
            createdAt: now,
            lastLogin: now,
          },
        ],
        total: 1,
        warning: 'Mock auth enabled; returning synthetic user list.',
      });
    }

    const supabase = await createClient();

    // Verificar autenticación (usar getUser)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    let effectiveUser: any = user
    if (userError || !user) {
      const authHeader = (request.headers.get('authorization') || '').trim()
      const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : ''
      if (token) {
        const sb = createSBClient(supabaseConfig.url, supabaseConfig.anonKey)
        const { data: tokenUser } = await sb.auth.getUser(token)
        effectiveUser = tokenUser?.user || null
      }
      if (!effectiveUser) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
    }

    // Parámetros de consulta para paginación/filtrado y forzar origen
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const search = searchParams.get('search') || '';
    const roleFilter = (searchParams.get('role') || '').toUpperCase();
    const source = (searchParams.get('source') || 'auto').toLowerCase();

    const userRoleFromSession = (((effectiveUser as any)?.user_metadata?.role || '') as string).toUpperCase() || 'ADMIN';

    // Verificar si la tabla 'users' existe
    let hasUsersTable = false;
    try {
      const { error: tableCheckError } = await (supabase as any)
        .from('users')
        .select('id')
        .limit(1);
      hasUsersTable = !tableCheckError;
    } catch {
      hasUsersTable = false;
    }

    if (hasUsersTable && source !== 'auth') {
      // Verificar que el usuario sea admin usando la tabla personalizada, con fallback a metadata
      const { data: profile } = await (supabase as any)
        .from('users')
        .select('role')
        .eq('id', effectiveUser.id)
        .single();

      const adminRole = (((profile as any)?.role || userRoleFromSession) as string).toUpperCase();
      if (adminRole !== 'ADMIN' && adminRole !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      // Obtener usuarios de la tabla personalizada
      const { data: users, error } = await (supabase as any)
        .from('users')
        .select('id, email, full_name, role, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 });
      }

      let transformed: UserListItem[] = (users || []).map((user: any) => ({
        id: user.id,
        email: user.email,
        name: user.full_name || user.email?.split('@')[0] || 'Usuario',
        role: String(user.role || 'VIEWER'),
        status: 'active',
        createdAt: user.created_at,
        lastLogin: user.updated_at || user.created_at,
      }));

      if (search) {
        transformed = transformed.filter((u: UserListItem) => (u.email?.includes(search) || u.name?.includes(search)));
      }
      if (roleFilter) {
        transformed = transformed.filter((u: UserListItem) => u.role?.toUpperCase() === roleFilter);
      }

      const total = transformed.length;
      const start = (page - 1) * limit;
      const paged = transformed.slice(start, start + limit);

      return NextResponse.json({ success: true, data: paged, total });
    }

    // Fallback: usar Supabase Auth (admin) para listar usuarios
    let admin: any;
    try {
      admin = createAdminClient();
    } catch (e) {
      console.error('Supabase admin client no configurado:', e);
      // Fallback mínimo: usuario actual
      const currentUser = {
        id: effectiveUser.id,
        email: (effectiveUser as any)?.email || 'usuario@sistema.com',
        name: (effectiveUser as any)?.user_metadata?.full_name ||
              (effectiveUser as any)?.user_metadata?.name ||
              (effectiveUser as any)?.email?.split('@')[0] ||
              'Usuario',
        role: userRoleFromSession,
        status: 'active',
        createdAt: (effectiveUser as any)?.created_at || new Date().toISOString(),
        lastLogin: (effectiveUser as any)?.last_sign_in_at || new Date().toISOString(),
      };
      return NextResponse.json({ success: true, data: [currentUser], total: 1, warning: 'Admin client no configurado. Mostrando solo usuario actual.' });
    }

    // Requerir rol admin basado en metadata (no hay tabla personalizada)
    if (userRoleFromSession !== 'ADMIN' && userRoleFromSession !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { data: listData, error: listError } = await admin.auth.admin.listUsers({ page, perPage: limit });
    if (listError) {
      console.error('Error listando usuarios de auth:', listError);
      return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 });
    }

    const supaUsers = (listData as any)?.users || [];
    let transformedAuth: UserListItem[] = supaUsers.map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.user_metadata?.full_name || u.user_metadata?.name || (u.email?.split('@')[0]) || 'Usuario',
      role: ((u.user_metadata?.role || 'VIEWER') as string).toUpperCase(),
      status: u.banned_until ? 'suspended' : 'active',
      createdAt: u.created_at,
      lastLogin: u.last_sign_in_at || u.created_at,
    }));

    if (search) {
      transformedAuth = transformedAuth.filter((u: UserListItem) => (u.email?.includes(search) || u.name?.includes(search)));
    }
    if (roleFilter) {
      transformedAuth = transformedAuth.filter((u: UserListItem) => u.role?.toUpperCase() === roleFilter);
    }

    const total = transformedAuth.length;
    const start = (page - 1) * limit;
    const paged = transformedAuth.slice(start, start + limit);

    return NextResponse.json({ success: true, data: paged, total });
  } catch (error) {
    console.error('Error in users API:', error);
    return NextResponse.json({ success: false, error: 'Error interno del servidor', data: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await assertAdmin(request);
    if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
    }
    // Allow synthetic creation in mock mode to keep UI stable
    const forceMock = (request.headers.get('x-env-mode') || request.headers.get('X-Env-Mode') || '').toLowerCase() === 'mock'
    if (forceMock || isMockAuthEnabled()) {
      const body = await request.json();
      const { email, password, name, role } = body;
      if (!email || !password || !name) {
        return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 });
      }
      const now = new Date().toISOString();
      const user = {
        id: `mock-${Math.random().toString(36).slice(2)}`,
        email,
        name,
        role: (role || 'VIEWER').toUpperCase() as any,
        status: 'active',
        createdAt: now,
        lastLogin: now,
      };
      return NextResponse.json({ success: true, user }, { status: 201 });
    }

    const supabase = await createClient();

    // Verificar autenticación (usar getUser)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario sea admin (fallback a metadata)
    const { data: profile } = await (supabase as any)
      .from('users')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    const postAdminRole = (((profile as any)?.role || (user as any)?.user_metadata?.role || '') as string).toUpperCase();
    if (postAdminRole !== 'ADMIN' && postAdminRole !== 'SUPER_ADMIN' && postAdminRole !== 'OWNER') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const body = await request.json();
    const { email, password, name, role } = body;

    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 });
    }

    // --- PLAN & PERMISSIONS CHECK ---
    const orgId = profile?.organization_id;
    if (orgId) {
      // 1. Get Organization and Plan
      const { data: org, error: orgError } = await (supabase as any)
        .from('organizations')
        .select(`
          subscription_plan,
          saas_plans!inner (
            limits,
            features
          )
        `)
        .eq('id', orgId)
        .single();

      if (!orgError && org && org.saas_plans) {
        const limits = org.saas_plans.limits || {};
        const features = org.saas_plans.features || [];
        const maxUsers = limits.maxUsers ?? 1; // Default to 1 if not set

        // 2. Check Role Restrictions
         const requestedRole = role.toUpperCase();
         
         // Define required feature for each role
         const roleFeatures: Record<string, string> = {
            'CASHIER': 'create_cashier',
            'SELLER': 'create_cashier', // Alias
            'EMPLOYEE': 'create_employee',
            'VIEWER': 'create_employee', // Grouped with employee
            'MANAGER': 'create_manager',
            'ADMIN': 'create_admin',
            'SUPER_ADMIN': 'forbidden' // Never allow creating super admin via this endpoint
         };

         const requiredFeature = roleFeatures[requestedRole];

         if (requiredFeature) {
             if (requiredFeature === 'forbidden') {
                 return NextResponse.json({ error: 'No tienes permisos para crear este rol.' }, { status: 403 });
             }
             if (!features.includes(requiredFeature)) {
                 return NextResponse.json({ 
                    error: `Tu plan actual no permite crear usuarios con rol ${requestedRole}. Actualiza tu plan para habilitar esta función.` 
                 }, { status: 403 });
             }
         }
         
         // 3. Check User Limit
        if (maxUsers !== -1) {
            const { count: currentUsers, error: countError } = await (supabase as any)
                .from('organization_members')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', orgId);

            if (!countError && (currentUsers || 0) >= maxUsers) {
                return NextResponse.json({ 
                    error: `Has alcanzado el límite de usuarios de tu plan (${maxUsers}). Actualiza tu plan para agregar más usuarios.` 
                }, { status: 403 });
            }
        }
      }
    }
    // --------------------------------

    // Crear cliente admin (service role)
    let admin: any;
    try {
      admin = createAdminClient();
    } catch (e) {
      console.error('Supabase admin client not configured:', e);
      return NextResponse.json({ error: 'Supabase admin client not configured' }, { status: 500 });
    }

    try {
      const { data: existingByEmail } = await admin
        .from('users')
        .select('id')
        .eq('email', email)
        .limit(1);
      if (existingByEmail && existingByEmail.length > 0) {
        return NextResponse.json({ error: 'Email ya existe' }, { status: 409 });
      }
    } catch {}

    // Crear usuario en Supabase Auth usando cliente admin
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        role,
      },
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 });
    }

    // Crear/actualizar registro en la tabla users (evita conflicto si el trigger ya insertó)
    const { data: userData, error: userRecordError } = await admin
      .from('users')
      .upsert({
        id: authData.user.id,
        email,
        full_name: name,
        role,
      }, { onConflict: 'id' })
      .select()
      .single();

    if (userRecordError) {
      console.error('Error creating/updating user record:', userRecordError);
      // Si falla la creación/actualización en la tabla, eliminar el usuario de auth
      await admin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: 'Error al crear registro de usuario' }, { status: 500 });
    }

    // Transformar datos para respuesta
    const newUser = {
      id: userData.id,
      email: userData.email,
      name: userData.full_name,
      role: role || 'VIEWER',
      status: 'active',
      createdAt: userData.created_at,
      lastLogin: userData.created_at,
    };

    return NextResponse.json({
      success: true,
      user: newUser,
    }, { status: 201 });

  } catch (error) {
    console.error('Error in create user API:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
