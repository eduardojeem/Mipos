#!/usr/bin/env tsx
/**
 * Verificar Usuario Actual y Sus Permisos
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function checkCurrentUser() {
  console.log('👤 Verificando Usuario Actual\n');
  console.log('='.repeat(60));

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Intentar obtener el usuario actual (esto fallará si no hay sesión)
  const { data: { user }, error } = await client.auth.getUser();

  if (error || !user) {
    console.log('\n❌ No hay usuario autenticado');
    console.log('   Necesitas iniciar sesión primero');
    console.log('\n💡 Pasos:');
    console.log('   1. Inicia el servidor: npm run dev');
    console.log('   2. Abre: http://localhost:3000/auth/signin');
    console.log('   3. Inicia sesión con tu cuenta');
    console.log('   4. Vuelve a ejecutar este script');
    return;
  }

  console.log('\n✅ Usuario autenticado:\n');
  console.log(`   Email: ${user.email}`);
  console.log(`   ID: ${user.id}`);
  console.log(`   Creado: ${user.created_at}`);
  console.log(`   Último login: ${user.last_sign_in_at || 'N/A'}`);

  // Verificar metadata
  console.log('\n📋 Metadata del usuario:\n');
  console.log(`   App metadata:`, user.app_metadata);
  console.log(`   User metadata:`, user.user_metadata);

  // Verificar rol en metadata
  const roleFromMetadata = user.app_metadata?.role || user.user_metadata?.role;
  if (roleFromMetadata) {
    console.log(`\n✅ Rol en metadata: ${roleFromMetadata}`);
  } else {
    console.log('\n⚠️  No hay rol en metadata');
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n💡 Solución:\n');
  
  if (roleFromMetadata === 'ADMIN' || roleFromMetadata === 'SUPER_ADMIN' || roleFromMetadata === 'admin' || roleFromMetadata === 'super_admin') {
    console.log('✅ Tienes rol de administrador');
    console.log('   Deberías tener acceso automático al dashboard');
    console.log('\n   Si aún no ves datos:');
    console.log('   1. Cierra sesión y vuelve a iniciar');
    console.log('   2. Limpia el cache del navegador (Ctrl+Shift+R)');
    console.log('   3. Verifica la consola del navegador (F12) por errores');
  } else {
    console.log('❌ No tienes rol de administrador');
    console.log('\n   Opciones:');
    console.log('   1. Asignarte el rol ADMIN en Supabase:');
    console.log(`      UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"role":"ADMIN"}' WHERE id = '${user.id}';`);
    console.log('\n   2. O crear una entrada en user_roles:');
    console.log(`      INSERT INTO user_roles (user_id, role_id) SELECT '${user.id}', id FROM roles WHERE name = 'ADMIN';`);
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

checkCurrentUser().catch(console.error);
