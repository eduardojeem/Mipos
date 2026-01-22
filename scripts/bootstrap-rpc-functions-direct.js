// Bootstrap text-based RPC functions directly via exec_sql and verify ADMIN role
// Uses .env.local prioritization

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

function loadEnv() {
  const localEnvPath = path.resolve(process.cwd(), '.env.local');
  const defaultEnvPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath });
    console.log(`[env] Loaded .env.local`);
  } else if (fs.existsSync(defaultEnvPath)) {
    dotenv.config({ path: defaultEnvPath });
    console.log(`[env] Loaded .env`);
  } else {
    console.warn('[env] No .env.local or .env found. Relying on process env.');
  }

  // Fallbacks
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_KEY;

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  }
}

function createSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // service key required for exec_sql
  return createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function executeSQL(supabase, sql, desc) {
  console.log(`\n[exec_sql] ${desc}`);
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    console.error(`[exec_sql:error] ${desc}:`, error.message || error);
    throw error;
  }
  console.log('[exec_sql:ok]', data || 'ok');
}

function rpcSQL() {
  // Create text-based RPC functions with explicit TEXT casts on joins and filters
  const userHasRole = `
    CREATE OR REPLACE FUNCTION public.user_has_role_text(user_id_text TEXT, role_name TEXT)
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
      has_role BOOLEAN := FALSE;
    BEGIN
      SELECT TRUE INTO has_role
      FROM public.user_roles ur
      JOIN public.roles r
        ON ur.role_id::TEXT = r.id::TEXT
      WHERE ur.user_id::TEXT = user_id_text
        AND r.name::TEXT = role_name::TEXT
      LIMIT 1;

      RETURN COALESCE(has_role, FALSE);
    END;
    $$;
    GRANT EXECUTE ON FUNCTION public.user_has_role_text(TEXT, TEXT) TO authenticated, service_role;
  `;

  const getUserRoles = `
    CREATE OR REPLACE FUNCTION public.get_user_roles_text(user_id_text TEXT)
    RETURNS TEXT[]
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
      roles TEXT[] := ARRAY[]::TEXT[];
    BEGIN
      SELECT COALESCE(array_agg(r.name::TEXT), ARRAY[]::TEXT[]) INTO roles
      FROM public.user_roles ur
      JOIN public.roles r
        ON ur.role_id::TEXT = r.id::TEXT
      WHERE ur.user_id::TEXT = user_id_text;

      RETURN roles;
    END;
    $$;
    GRANT EXECUTE ON FUNCTION public.get_user_roles_text(TEXT) TO authenticated, service_role;
  `;

  const getUserPerms = `
    CREATE OR REPLACE FUNCTION public.get_user_permissions_text(user_id_text TEXT)
    RETURNS TEXT[]
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
      permissions TEXT[] := ARRAY[]::TEXT[];
    BEGIN
      SELECT COALESCE(array_agg(p.name::TEXT), ARRAY[]::TEXT[]) INTO permissions
      FROM public.user_roles ur
      JOIN public.role_permissions rp
        ON ur.role_id::TEXT = rp.role_id::TEXT
      JOIN public.permissions p
        ON rp.permission_id::TEXT = p.id::TEXT
      WHERE ur.user_id::TEXT = user_id_text;

      RETURN permissions;
    END;
    $$;
    GRANT EXECUTE ON FUNCTION public.get_user_permissions_text(TEXT) TO authenticated, service_role;
  `;

  const reloadSchema = `DO $$ BEGIN PERFORM pg_notify('pgrst', 'reload schema'); END $$;`;

  return { userHasRole, getUserRoles, getUserPerms, reloadSchema };
}

async function verifyRPC(supabase) {
  const userId = process.env.SYNC_USER_ID || process.env.TEST_USER_ID || process.env.ADMIN_USER_ID || process.env.NEXT_PUBLIC_TEST_USER_ID;
  const adminRole = process.env.ADMIN_ROLE_NAME || 'ADMIN';
  if (!userId) {
    console.warn('[verify] No SYNC_USER_ID/TEST_USER_ID/ADMIN_USER_ID set. Skipping verification call.');
    return;
  }
  console.log(`[verify] Using userId=${userId} role=${adminRole}`);

  // Check role
  {
    const { data, error } = await supabase.rpc('user_has_role_text', { user_id_text: userId, role_name: adminRole });
    if (error) {
      console.error('[verify:user_has_role_text:error]', error.message || error);
    } else {
      console.log('[verify:user_has_role_text:data]', data);
    }
  }
  // Get roles
  {
    const { data, error } = await supabase.rpc('get_user_roles_text', { user_id_text: userId });
    if (error) {
      console.error('[verify:get_user_roles_text:error]', error.message || error);
    } else {
      console.log('[verify:get_user_roles_text:data]', data);
    }
  }
  // Get permissions
  {
    const { data, error } = await supabase.rpc('get_user_permissions_text', { user_id_text: userId });
    if (error) {
      console.error('[verify:get_user_permissions_text:error]', error.message || error);
    } else {
      console.log('[verify:get_user_permissions_text:data]', data);
    }
  }
}

(async () => {
  try {
    loadEnv();
    const supabase = createSupabase();
    const { userHasRole, getUserRoles, getUserPerms, reloadSchema } = rpcSQL();

    // Apply functions
    await executeSQL(supabase, userHasRole, 'Create user_has_role_text');
    await executeSQL(supabase, getUserRoles, 'Create get_user_roles_text');
    await executeSQL(supabase, getUserPerms, 'Create get_user_permissions_text');

    // Reload schema cache
    await executeSQL(supabase, reloadSchema, 'Reload PostgREST schema cache');

    // Verify
    await verifyRPC(supabase);

    console.log('\n[done] RPC bootstrap and verification completed.');
  } catch (err) {
    console.error('[fatal]', err?.message || err);
    process.exitCode = 1;
  }
})();