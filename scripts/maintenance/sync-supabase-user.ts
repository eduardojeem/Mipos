import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fallbackSupabaseSync(supabaseUserId: string, email: string) {
  console.log('\n⚠️ Prisma no disponible, usando Supabase directo para sincronizar usuario y rol...');

  // 1) Asegurar usuario en tabla local `users`
  const { data: foundUsers, error: searchErr } = await supabase
    .from('users')
    .select('*')
    .or(`id.eq.${supabaseUserId},email.eq.${email}`)
    .limit(1);

  if (searchErr) {
    console.log('❌ Error buscando usuario local en Supabase:', searchErr.message);
  }

  let localUser = foundUsers?.[0];

  if (!localUser) {
    console.log('➕ Creando usuario en tabla local `users`');
    const { error: insertUserErr } = await supabase
      .from('users')
      .insert({
        id: supabaseUserId,
        email,
        fullName: 'Admin User',
        role: 'ADMIN'
      });
    if (insertUserErr) {
      console.log('❌ Error creando usuario local:', insertUserErr.message);
    } else {
      console.log('✅ Usuario local creado');
    }
  } else if (localUser.id !== supabaseUserId) {
    console.log(`🔄 Actualizando ID del usuario local de ${localUser.id} a ${supabaseUserId}`);
    const { error: updateIdErr } = await supabase
      .from('users')
      .update({ id: supabaseUserId })
      .eq('id', localUser.id);
    if (updateIdErr) {
      console.log('❌ Error actualizando ID del usuario local:', updateIdErr.message);
    } else {
      console.log('✅ ID del usuario local actualizado');
    }
  } else {
    console.log('✅ Usuario local ya existe en Supabase (tabla `users`)');
  }

  // 2) Asegurar rol ADMIN en tabla `roles`
  const { data: adminRoleRows, error: adminRoleErr } = await supabase
    .from('roles')
    .select('id, name')
    .eq('name', 'ADMIN')
    .limit(1);

  let adminRoleId = adminRoleRows?.[0]?.id as string | undefined;
  if (adminRoleErr) {
    console.log('❌ Error consultando rol ADMIN:', adminRoleErr.message);
  }
  if (!adminRoleId) {
    console.log('➕ Creando rol ADMIN');
    const { data: createdRole, error: createRoleErr } = await supabase
      .from('roles')
      .insert({ name: 'ADMIN', display_name: 'Administrador', description: 'Acceso completo al sistema', is_system_role: true, is_active: true })
      .select('id')
      .limit(1);
    if (createRoleErr) {
      console.log('❌ Error creando rol ADMIN:', createRoleErr.message);
    }
    adminRoleId = createdRole?.[0]?.id;
  }

  // 3) Asignar rol ADMIN al usuario en `user_roles`
  if (adminRoleId) {
    console.log('🔐 Asignando rol ADMIN al usuario en `user_roles`');
    const { error: assignRoleErr } = await supabase
      .from('user_roles')
      .upsert({
        user_id: supabaseUserId,
        role_id: adminRoleId,
        assigned_at: new Date().toISOString(),
        assigned_by: 'sync-script',
        is_active: true
      }, { onConflict: 'user_id,role_id' });

    if (assignRoleErr) {
      console.log('❌ Error asignando rol ADMIN:', assignRoleErr.message);
      console.log('⏪ Intentando asignación vía SQL RPC...');
      const sql = `
        INSERT INTO public.user_roles (user_id, role_id, assigned_at, assigned_by, is_active)
        SELECT '${supabaseUserId}', r.id, NOW(), 'sync-script', true
        FROM public.roles r
        WHERE r.name = 'ADMIN'
        ON CONFLICT (user_id, role_id) DO NOTHING;
      `;
      const { error: rpcErr } = await supabase.rpc('exec_sql', { sql });
      if (rpcErr) {
        console.log('❌ Asignación por RPC falló:', rpcErr.message);
      } else {
        console.log('✅ Rol ADMIN asignado vía RPC');
      }
    } else {
      console.log('✅ Rol ADMIN asignado correctamente');
    }
  }

  // 4) Mostrar verificación simple de roles del usuario
  const { data: userRoles, error: viewErr } = await supabase
    .from('user_roles')
    .select('user_id, role_id')
    .eq('user_id', supabaseUserId)
    .limit(5);
  if (viewErr) {
    console.log('❌ Error verificando roles del usuario:', viewErr.message);
    console.log('⏪ Intentando verificación vía SQL RPC...');
    const verifySql = `
      SELECT ur.user_id, ur.role_id, r.name AS role_name
      FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id::text = '${supabaseUserId}'::text
      ORDER BY ur.assigned_at DESC
      LIMIT 5;
    `;
    const { data: rpcView, error: rpcViewErr } = await supabase.rpc('exec_sql', { sql: verifySql });
    if (rpcViewErr) {
      console.log('❌ Verificación por RPC falló:', rpcViewErr.message);
      console.log('⏪ Probando funciones RPC dedicadas: user_has_role / get_user_roles');
      const { data: hasRole, error: hasRoleErr } = await supabase.rpc('user_has_role', { user_uuid: supabaseUserId, role_name: 'ADMIN' });
      if (hasRoleErr) {
        console.log('❌ user_has_role falló:', hasRoleErr.message);
        const { data: hasRoleText, error: hasRoleTextErr } = await supabase.rpc('user_has_role_text', { user_id_text: supabaseUserId, role_name: 'ADMIN' });
        if (hasRoleTextErr) {
          console.log('❌ user_has_role_text falló:', hasRoleTextErr.message);
        } else {
          console.log('✅ user_has_role_text(ADMIN):', hasRoleText);
        }
      } else {
        console.log('✅ user_has_role(ADMIN):', hasRole);
      }
      const { data: rolesData, error: rolesErr } = await supabase.rpc('get_user_roles', { user_uuid: supabaseUserId });
      if (rolesErr) {
        console.log('❌ get_user_roles falló:', rolesErr.message);
        const { data: rolesTextData, error: rolesTextErr } = await supabase.rpc('get_user_roles_text', { user_id_text: supabaseUserId });
        if (rolesTextErr) {
          console.log('❌ get_user_roles_text falló:', rolesTextErr.message);
        } else {
          console.log('✅ Roles del usuario vía get_user_roles_text:', rolesTextData);
        }
      } else {
        console.log('✅ Roles del usuario vía get_user_roles:', rolesData);
      }
      const { data: permsData, error: permsErr } = await supabase.rpc('get_user_permissions', { user_uuid: supabaseUserId });
      if (permsErr) {
        console.log('ℹ️ get_user_permissions(UUID) no disponible o falló:', permsErr.message);
        const { data: permsTextData, error: permsTextErr } = await supabase.rpc('get_user_permissions', { user_id_param: supabaseUserId });
        if (permsTextErr) {
          console.log('❌ get_user_permissions(TEXT) falló también:', permsTextErr.message);
        } else {
          console.log('✅ Permisos del usuario (TEXT):', permsTextData);
        }
      } else {
        console.log('✅ Permisos del usuario:', permsData);
      }
    } else {
      // Si el RPC devolvió un objeto de error en 'data', manejarlo
      if (rpcView && typeof rpcView === 'object' && (rpcView as any).status === 'error') {
        const msg = (rpcView as any).message || 'error desconocido';
        console.log('❌ Verificación por RPC devolvió estado de error:', msg);
        console.log('🛠️ Creando funciones RPC de verificación si no existen...');
        const createFnsSql = `
          CREATE OR REPLACE FUNCTION public.user_has_role(user_uuid uuid, role_name text)
          RETURNS boolean
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          DECLARE has_role boolean;
          BEGIN
            SELECT EXISTS (
              SELECT 1
              FROM public.user_roles ur
              JOIN public.roles r ON ur.role_id = r.id
              WHERE (ur.user_id::text = user_uuid::text) AND r.name = role_name
            ) INTO has_role;
            RETURN has_role;
          END;
          $$;
    
          CREATE OR REPLACE FUNCTION public.get_user_roles(user_uuid uuid)
          RETURNS TABLE(role_name text, role_display_name text)
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          BEGIN
            RETURN QUERY
            SELECT r.name, r.display_name
            FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id::text = user_uuid::text;
          END;
          $$;
    
          -- Versiones con TEXT para mayor compatibilidad
          CREATE OR REPLACE FUNCTION public.user_has_role_text(user_id_text text, role_name text)
          RETURNS boolean
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          DECLARE has_role boolean;
          BEGIN
            SELECT EXISTS (
              SELECT 1
              FROM public.user_roles ur
              JOIN public.roles r ON ur.role_id = r.id
              WHERE (ur.user_id::text = user_id_text) AND r.name = role_name
            ) INTO has_role;
            RETURN has_role;
          END;
          $$;
    
          CREATE OR REPLACE FUNCTION public.get_user_roles_text(user_id_text text)
          RETURNS TABLE(role_name text, role_display_name text)
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          BEGIN
            RETURN QUERY
            SELECT r.name, r.display_name
            FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id::text = user_id_text;
          END;
          $$;
        `;
        const { error: createFnsErr } = await supabase.rpc('exec_sql', { sql: createFnsSql });
        if (createFnsErr) {
          console.log('❌ Creación de funciones RPC falló:', createFnsErr.message);
        } else {
          console.log('✅ Funciones RPC creadas/actualizadas');
          // Intentar recargar el esquema de PostgREST para que estén disponibles
          const reloadSql = `
            DO $$ BEGIN
            BEGIN
              PERFORM pgrst.reload_schema();
            EXCEPTION WHEN undefined_function THEN
              -- alternativa en algunos despliegues
              PERFORM pg_notify('pgrst', 'reload schema');
            END;
            END $$;
          `;
          const { error: reloadErr } = await supabase.rpc('exec_sql', { sql: reloadSql });
          if (reloadErr) {
            console.log('⚠️ No se pudo recargar el esquema de PostgREST:', reloadErr.message);
          } else {
            console.log('🔄 PostgREST schema recargado');
          }
        }
        console.log('⏪ Probando funciones RPC dedicadas: user_has_role / get_user_roles');
        const { data: hasRole, error: hasRoleErr } = await supabase.rpc('user_has_role', { user_uuid: supabaseUserId, role_name: 'ADMIN' });
        if (hasRoleErr) {
          console.log('❌ user_has_role falló:', hasRoleErr.message);
        } else {
          console.log('✅ user_has_role(ADMIN):', hasRole);
        }
        const { data: rolesData, error: rolesErr } = await supabase.rpc('get_user_roles', { user_uuid: supabaseUserId });
        if (rolesErr) {
          console.log('❌ get_user_roles falló:', rolesErr.message);
        } else {
          console.log('✅ Roles del usuario vía get_user_roles:', rolesData);
        }
        const { data: permsData, error: permsErr } = await supabase.rpc('get_user_permissions', { user_uuid: supabaseUserId });
        if (permsErr) {
          console.log('ℹ️ get_user_permissions(UUID) no disponible o falló:', permsErr.message);
          const { data: permsTextData, error: permsTextErr } = await supabase.rpc('get_user_permissions', { user_id_param: supabaseUserId });
          if (permsTextErr) {
            console.log('❌ get_user_permissions(TEXT) falló también:', permsTextErr.message);
          } else {
            console.log('✅ Permisos del usuario (TEXT):', permsTextData);
          }
        } else {
          console.log('✅ Permisos del usuario:', permsData);
        }
      } else {
        console.log('👀 Roles del usuario (RPC):', rpcView);
      }
    }
  } else {
    console.log('👀 Roles del usuario (tabla user_roles):', userRoles);
  }
}

async function syncSupabaseUser() {
  try {
    console.log('🔄 Sincronizando usuario de Supabase con base de datos local...\n');

    const supabaseUserId = '01041242-4be1-4fea-a91d-b0c8d6d2c320';
    const email = 'jeem101595@gmail.com';
    
    // Verificar si el usuario ya existe en la base de datos local (Prisma)
    let localUser = await prisma.user.findUnique({
      where: { id: supabaseUserId }
    });

    if (localUser) {
      console.log('✅ Usuario ya existe en la base de datos local');
      return;
    }

    // Verificar si existe un usuario con el mismo email pero diferente ID
    const existingUser = await prisma.user.findUnique({
      where: { email: email }
    });

    if (existingUser) {
      console.log(`🔄 Actualizando ID del usuario existente de ${existingUser.id} a ${supabaseUserId}`);
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { id: supabaseUserId }
      });
      console.log('✅ ID del usuario actualizado correctamente');
    } else {
      // Crear nuevo usuario
      console.log('➕ Creando nuevo usuario en la base de datos local');
      await prisma.user.create({
        data: {
          id: supabaseUserId,
          email: email,
          fullName: 'Admin User',
          role: 'ADMIN'
        }
      });
      console.log('✅ Usuario creado correctamente');
    }

    // Verificar que el usuario ahora existe con el ID correcto
    const verifyUser = await prisma.user.findUnique({
      where: { id: supabaseUserId },
      include: {
        userRoles: {
          include: { role: true }
        }
      }
    });

    if (verifyUser) {
      console.log('\n✅ Verificación exitosa:');
      console.log(`   📧 Email: ${verifyUser.email}`);
      console.log(`   🆔 ID: ${verifyUser.id}`);
      console.log(`   👤 Nombre: ${verifyUser.fullName}`);
      console.log(`   🔐 Roles: ${verifyUser.userRoles.map(ur => ur.role.name).join(', ') || 'Ninguno'}`);
      
      // Si no tiene roles asignados, asignar el rol ADMIN
      if (verifyUser.userRoles.length === 0) {
        console.log('\n🔧 Asignando rol ADMIN...');
        const adminRole = await prisma.role.findFirst({ where: { name: 'ADMIN' } });
        if (adminRole) {
          await prisma.userRole_New.create({
            data: {
              userId: supabaseUserId,
              roleId: adminRole.id,
              assignedBy: 'sync-script'
            }
          });
          console.log('✅ Rol ADMIN asignado correctamente');
        }
      }
    }

  } catch (error: any) {
    console.error('❌ Error (Prisma):', error);
    // Fallback a Supabase directo si Prisma no está disponible
    const supabaseUserId = '01041242-4be1-4fea-a91d-b0c8d6d2c320';
    const email = 'jeem101595@gmail.com';
    await fallbackSupabaseSync(supabaseUserId, email);
  } finally {
    await prisma.$disconnect();
  }
}

syncSupabaseUser();