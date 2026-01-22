const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const userId = process.env.SYNC_USER_ID || '01041242-4be1-4fea-a91d-b0c8d6d2c320';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

(async () => {
  try {
    console.log('🔍 Verificación RPC de roles y permisos para usuario:', userId);

    const { data: hasRoleText, error: hasRoleTextErr } = await supabase.rpc('user_has_role_text', { user_id_text: userId, role_name: 'ADMIN' });
    if (hasRoleTextErr) {
      console.log('❌ user_has_role_text error:', hasRoleTextErr.message);
    } else {
      console.log('✅ user_has_role_text(ADMIN):', hasRoleText);
    }

    const { data: rolesText, error: rolesTextErr } = await supabase.rpc('get_user_roles_text', { user_id_text: userId });
    if (rolesTextErr) {
      console.log('❌ get_user_roles_text error:', rolesTextErr.message);
    } else {
      console.log('✅ get_user_roles_text:', rolesText);
    }

    const { data: permsText2, error: permsTextErr2 } = await supabase.rpc('get_user_permissions_text', { user_id_text: userId });
    if (permsTextErr2) {
      console.log('❌ get_user_permissions_text error:', permsTextErr2.message);
    } else {
      console.log('✅ get_user_permissions_text:', permsText2);
    }

  } catch (err) {
    console.error('❌ Error en verificación RPC:', err);
    process.exit(1);
  }
})();