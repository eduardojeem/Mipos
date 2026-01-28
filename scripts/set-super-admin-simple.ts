import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../apps/frontend/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setSuperAdmin() {
  console.log('🔧 Configurando SUPER_ADMIN...\n');

  const { data: authUsers } = await supabase.auth.admin.listUsers();
  
  if (!authUsers?.users.length) {
    console.log('❌ No se encontraron usuarios');
    return;
  }

  for (const user of authUsers.users) {
    console.log(`\n👤 ${user.email}`);
    console.log(`   Rol actual en metadata: ${user.user_metadata?.role || 'no definido'}`);
    
    // Actualizar metadata
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        role: 'SUPER_ADMIN'
      },
      app_metadata: {
        ...user.app_metadata,
        role: 'SUPER_ADMIN'
      }
    });

    if (error) {
      console.log(`   ❌ Error:`, error.message);
    } else {
      console.log(`   ✅ Rol actualizado a SUPER_ADMIN`);
    }
  }

  console.log('\n✅ Completado. Cierra sesión y vuelve a iniciar para que los cambios surtan efecto.');
  console.log('\n💡 Si aún no puedes acceder a /dashboard/admin:');
  console.log('   1. Abre las DevTools del navegador (F12)');
  console.log('   2. Ve a Application > Local Storage');
  console.log('   3. Elimina todos los items de Supabase');
  console.log('   4. Recarga la página e inicia sesión nuevamente');
}

setSuperAdmin();
