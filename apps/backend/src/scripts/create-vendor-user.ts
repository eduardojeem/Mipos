/**
 * Script para crear un nuevo usuario vendedor en la organización de un admin
 * 
 * Ejecutar: npx ts-node apps/backend/src/scripts/create-vendor-user.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';

// Cargar variables de entorno
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}

const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/"/g, '');
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/"/g, '');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function createVendorUser() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  CREAR USUARIO VENDEDOR                               ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  
  try {
    // 1. Primero restaurar el rol de ADMIN a bfjeem@gmail.com
    console.log('🔄 Restaurando rol de ADMIN a bfjeem@gmail.com...');
    const { error: restoreError } = await supabase
      .from('users')
      .update({ role: 'ADMIN' })
      .eq('email', 'bfjeem@gmail.com');
    
    if (restoreError) {
      console.warn('⚠️  No se pudo restaurar rol de ADMIN:', restoreError.message);
    } else {
      console.log('✅ Rol de ADMIN restaurado\n');
    }
    
    // 2. Obtener la organización del admin
    console.log('🔍 Obteniendo organización de bfjeem@gmail.com...');
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id, email, full_name, role, organization_id')
      .eq('email', 'bfjeem@gmail.com')
      .single();
    
    if (adminError || !adminUser) {
      throw new Error(`No se encontró el usuario admin: ${adminError?.message}`);
    }
    
    console.log('✅ Admin encontrado:');
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Nombre: ${adminUser.full_name}`);
    console.log(`   Rol: ${adminUser.role}`);
    console.log(`   Organización ID: ${adminUser.organization_id || 'No asignada'}`);
    console.log('');
    
    // Si el admin no tiene organización, asignarle la organización por defecto
    let organizationId = adminUser.organization_id;
    
    if (!organizationId) {
      console.log('⚠️  Admin sin organización, asignando organización por defecto...');
      
      // Buscar organización por defecto
      const { data: defaultOrg, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('slug', 'default')
        .single();
      
      if (orgError || !defaultOrg) {
        throw new Error('No se encontró la organización por defecto');
      }
      
      organizationId = defaultOrg.id;
      
      // Asignar organización al admin
      const { error: updateAdminError } = await supabase
        .from('users')
        .update({ organization_id: organizationId })
        .eq('id', adminUser.id);
      
      if (updateAdminError) {
        throw new Error(`Error asignando organización al admin: ${updateAdminError.message}`);
      }
      
      console.log('✅ Organización asignada al admin:');
      console.log(`   Organización: ${defaultOrg.name} (${defaultOrg.id})`);
      console.log('');
    }
    
    // 3. Solicitar datos del nuevo vendedor
    console.log('📝 Ingresa los datos del nuevo vendedor:\n');
    
    const vendorEmail = await question('Email del vendedor: ');
    if (!vendorEmail || !vendorEmail.includes('@')) {
      throw new Error('Email inválido');
    }
    
    const vendorName = await question('Nombre completo del vendedor: ');
    if (!vendorName) {
      throw new Error('Nombre requerido');
    }
    
    const vendorPassword = await question('Contraseña (mínimo 6 caracteres): ');
    if (!vendorPassword || vendorPassword.length < 6) {
      throw new Error('Contraseña debe tener al menos 6 caracteres');
    }
    
    console.log('');
    
    // 4. Crear usuario en auth.users
    console.log('🔄 Creando usuario en Supabase Auth...');
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: vendorEmail,
      password: vendorPassword,
      email_confirm: true,
      user_metadata: {
        full_name: vendorName
      }
    });
    
    if (authError) {
      throw new Error(`Error creando usuario en auth: ${authError.message}`);
    }
    
    console.log('✅ Usuario creado en auth.users');
    console.log(`   ID: ${authUser.user.id}`);
    console.log('');
    
    // 5. Crear usuario en public.users con la misma organización
    console.log('🔄 Creando perfil en public.users...');
    
    // Primero verificar si ya existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', authUser.user.id)
      .single();
    
    if (existingUser) {
      console.log('✅ Perfil ya existe (creado por trigger automático)');
      console.log('🔄 Actualizando organización y rol...');
      
      const { error: updateError } = await supabase
        .from('users')
        .update({
          role: 'CASHIER',
          organization_id: organizationId,
          full_name: vendorName,
          updated_at: new Date().toISOString()
        })
        .eq('id', authUser.user.id);
      
      if (updateError) {
        throw new Error(`Error actualizando perfil: ${updateError.message}`);
      }
      
      console.log('✅ Perfil actualizado');
    } else {
      const { error: publicError } = await supabase
        .from('users')
        .insert({
          id: authUser.user.id,
          email: vendorEmail,
          full_name: vendorName,
          role: 'CASHIER',
          organization_id: organizationId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (publicError) {
        // Si falla, intentar eliminar el usuario de auth
        await supabase.auth.admin.deleteUser(authUser.user.id);
        throw new Error(`Error creando perfil: ${publicError.message}`);
      }
      
      console.log('✅ Perfil creado en public.users');
    }
    console.log('');
    
    // 6. Verificar el usuario creado
    console.log('🔍 Verificando usuario creado...');
    const { data: newUser, error: verifyError } = await supabase
      .from('users')
      .select('id, email, full_name, role, organization_id')
      .eq('id', authUser.user.id)
      .single();
    
    if (verifyError) {
      throw new Error(`Error verificando usuario: ${verifyError.message}`);
    }
    
    console.log('✅ Usuario verificado:');
    console.log(`   ID: ${newUser.id}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Nombre: ${newUser.full_name}`);
    console.log(`   Rol: ${newUser.role}`);
    console.log(`   Organización: ${newUser.organization_id}`);
    console.log('');
    
    // 7. Resumen
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMEN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('✅ Usuario vendedor creado exitosamente');
    console.log('');
    console.log('Detalles del vendedor:');
    console.log(`  • Email: ${vendorEmail}`);
    console.log(`  • Nombre: ${vendorName}`);
    console.log(`  • Rol: CASHIER (Vendedor)`);
    console.log(`  • Organización: ${organizationId}`);
    console.log(`  • Mismo que admin: ${adminUser.email}`);
    console.log('');
    console.log('Credenciales de acceso:');
    console.log(`  • Email: ${vendorEmail}`);
    console.log(`  • Contraseña: ${vendorPassword}`);
    console.log('');
    console.log('Permisos del vendedor:');
    console.log('  • Crear y gestionar ventas');
    console.log('  • Ver productos e inventario');
    console.log('  • Gestionar clientes');
    console.log('  • Ver reportes básicos');
    console.log('  • Gestionar caja (apertura/cierre)');
    console.log('');
    console.log('El vendedor puede iniciar sesión en:');
    console.log('  http://localhost:3000/login');
    console.log('');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    throw error;
  } finally {
    rl.close();
  }
}

// Ejecutar
createVendorUser()
  .catch((error) => {
    console.error('\n❌ Script fallido:', error);
    process.exit(1);
  });
