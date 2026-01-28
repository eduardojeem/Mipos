import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../apps/frontend/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function discoverColumns() {
  console.log('🔍 Descubriendo columnas de la tabla users...\n');

  // Intentar diferentes combinaciones de columnas comunes
  const possibleColumns = [
    'id',
    'email', 
    'role',
    'name',
    'full_name',
    'username',
    'status',
    'is_active',
    'created_at',
    'updated_at',
    'phone',
    'avatar_url',
    'bio',
    'location'
  ];

  const availableColumns: string[] = [];

  for (const col of possibleColumns) {
    const { error } = await supabase
      .from('users')
      .select(col)
      .limit(0);

    if (!error) {
      availableColumns.push(col);
      console.log(`✅ ${col}`);
    } else {
      console.log(`❌ ${col} - ${error.message}`);
    }
  }

  console.log('\n📋 Columnas disponibles:', availableColumns.join(', '));

  // Intentar insertar un usuario de prueba con las columnas disponibles
  if (availableColumns.length > 0) {
    console.log('\n🔧 Intentando insertar usuario con rol SUPER_ADMIN...');
    
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const firstUser = authUsers?.users[0];

    if (firstUser) {
      const insertData: any = {
        id: firstUser.id,
        email: firstUser.email
      };

      if (availableColumns.includes('role')) {
        insertData.role = 'SUPER_ADMIN';
      }

      console.log('📝 Datos a insertar:', insertData);

      const { data, error } = await supabase
        .from('users')
        .upsert(insertData, { onConflict: 'id' })
        .select();

      if (error) {
        console.log('❌ Error:', error.message);
      } else {
        console.log('✅ Usuario insertado:', data);
      }
    }
  }
}

discoverColumns();
