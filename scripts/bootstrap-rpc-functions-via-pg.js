const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function bootstrapRpcFunctions() {
  const connectionString = process.env.DATABASE_URL || process.env.DIRECT_DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL/DIRECT_DATABASE_URL no configurado en .env.local');
    process.exit(1);
  }

  console.log('🔗 Conectando a PostgreSQL usando pg...');
  console.log('➡️  Usando connectionString:', connectionString.replace(/:(?:[^@]+)@/, ':***@'));

  // Intentar conexión al pooler primero; fallback a host directo si falla
  let client;
  const connUrl = (() => { try { return new URL(connectionString); } catch (e) { return null; } })();
  try {
    client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();
    console.log('✅ Conexión establecida (pooler)');
  } catch (poolErr) {
    console.warn('⚠️ Conexión via pooler falló:', poolErr.message);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const projectRefMatch = supabaseUrl && supabaseUrl.match(/^https?:\/\/([^.]+)\.supabase\.co/);
    const projectRef = projectRefMatch ? projectRefMatch[1] : null;
    const dbName = connUrl ? (connUrl.pathname.replace(/^\//,'') || 'postgres') : 'postgres';
    const dbUser = 'postgres';
    const dbPass = connUrl ? connUrl.password : undefined;
    if (!projectRef || !dbPass) {
      throw poolErr;
    }
    console.log('🔁 Intentando conexión directa a', `db.${projectRef}.supabase.co:5432`);
    client = new Client({
      host: `db.${projectRef}.supabase.co`,
      port: 5432,
      database: dbName,
      user: dbUser,
      password: dbPass,
      ssl: { rejectUnauthorized: false }
    });
    await client.connect();
    console.log('✅ Conexión establecida (direct 5432)');
  }

  try {

    // Define SQL for functions
    const sql = `
    -- Ensure schema usage for roles
    GRANT USAGE ON SCHEMA public TO service_role;
    GRANT USAGE ON SCHEMA public TO authenticated;

    -- Create exec_sql function (json version)
    CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
        result json;
    BEGIN
        EXECUTE sql;
        SELECT json_build_object('status', 'success', 'message', 'SQL executed successfully') INTO result;
        RETURN result;
    EXCEPTION
        WHEN OTHERS THEN
            SELECT json_build_object(
                'status', 'error',
                'message', SQLERRM,
                'code', SQLSTATE
            ) INTO result;
            RETURN result;
    END;
    $$;

    GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;

    -- Create user_has_role_text
    CREATE OR REPLACE FUNCTION public.user_has_role_text(p_user_id TEXT, p_role_name TEXT)
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
      has_role BOOLEAN;
    BEGIN
      SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id::text = p_user_id
          AND r.name = p_role_name
          AND ur.is_active = true
          AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
      ) INTO has_role;
      RETURN has_role;
    END;
    $$;

    GRANT EXECUTE ON FUNCTION public.user_has_role_text(TEXT, TEXT) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.user_has_role_text(TEXT, TEXT) TO service_role;

    -- Create get_user_roles_text
    CREATE OR REPLACE FUNCTION public.get_user_roles_text(p_user_id TEXT)
    RETURNS TABLE(role_name TEXT)
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    BEGIN
      RETURN QUERY
      SELECT r.name
      FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id::text = p_user_id
        AND ur.is_active = true
        AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP);
    END;
    $$;

    GRANT EXECUTE ON FUNCTION public.get_user_roles_text(TEXT) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.get_user_roles_text(TEXT) TO service_role;

    -- Create get_user_permissions_text
    CREATE OR REPLACE FUNCTION public.get_user_permissions_text(p_user_id TEXT)
    RETURNS TABLE(permission_name TEXT, resource TEXT, action TEXT)
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    BEGIN
      RETURN QUERY
      SELECT DISTINCT p.name, p.resource, p.action
      FROM public.permissions p
      JOIN public.role_permissions rp ON p.id = rp.permission_id
      JOIN public.user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id::text = p_user_id
        AND ur.is_active = true
        AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
        AND p.is_active = true;
    END;
    $$;

    GRANT EXECUTE ON FUNCTION public.get_user_permissions_text(TEXT) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.get_user_permissions_text(TEXT) TO service_role;

    -- Force PostgREST schema reload
    DO $$ BEGIN PERFORM pg_notify('pgrst', 'reload schema'); END $$;
    `;

    console.log('🛠️  Creando funciones RPC (exec_sql, user_has_role_text, etc.)...');
    await client.query(sql);
    console.log('✅ Funciones creadas/actualizadas');

    // Verify functions exist
    const verify = await client.query(`
      SELECT proname, n.nspname as schema
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND proname IN (
        'exec_sql', 'user_has_role_text', 'get_user_roles_text', 'get_user_permissions_text'
      );
    `);

    console.log('📋 Funciones registradas:', verify.rows.map(r => `${r.schema}.${r.proname}`).join(', '));

    console.log('🎉 Bootstrap completado.');
  } catch (err) {
    console.error('❌ Error ejecutando bootstrap:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

bootstrapRpcFunctions();