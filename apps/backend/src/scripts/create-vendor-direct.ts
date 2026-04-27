/**
 * Script para crear vendedor directamente
 * Maneja el caso donde el trigger automático ya creó el perfil
 * 
 * Ejecutar: npx ts-node apps/backend/src/scripts/create-vendor-direct.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Cargar variables de entorno
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}

const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/"/g, '');
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/"/g, '');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createVendor() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  CREAR VENDEDOR NUEVO                                 ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Datos del vendedor
  const vendorEmail = 'vendedor1@mipos.com';
  const vendorPassword = 'Vendedor123!';
  const vendorName = 'Vendedor Uno';
  
  try {
    // 1. Obtener organización del admin
    console.log('🔍 Obteniendo organización de bfjeem@gmail.com...');
    const { data: adminUser } = await supabase
      .from('users')
      .select('organization_id')
      .eq('email', 'bfjeem@gmail.com')
      .single();
    
    if (!adminUser?.organization_id) {
      throw new Error('Admin no tiene organización asignada');
    }
    
    const organizationId = adminUser.organization_id;
    console.log(`✅ Organización: ${organizationId}\n`);
    
    // 2. Verificar si el email ya existe
    console.log(`🔍 Verificando si ${vendorEmail} ya existe...`);
    const { data: existingAuth } = await supabase.auth.admin.listUsers();
    const userExists = existingAuth?.users?.find((u: any) => u.email === vendorEmail);
    
    if (userExists) {
      console.log('⚠️  El usuario ya existe en auth.users');
      console.log(`   Usa el script setup-vendor-simple.ts para configurarlo\n`);
      return;
    }
    
    // 3. Crear usuario en auth.users
    console.log('🔄 Creando usuario en Supabase Auth...');
    const { data: newAuthUser, error: authError } = await supabase.auth.admin.createUser({
      email: vendorEmail,
      password: vendorPassword,
      email_confirm: true,
      user_metadata: {
        full_name: vendorName
      }
    });
    
    if (authError) {
      throw new Error(`Error creando usuario: ${authError.message}`);
    }
    
    console.log('✅ Usuario creado en auth.users');
    console.log(`   ID: ${newAuthUser.user.id}\n`);
    
    // 4. Esperar un momento para que el trigger se ejecute
    console.log('⏳ Esperando trigger automático...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 5. Verificar y actualizar perfil en public.users
    console.log('🔄 Configurando perfil en public.users...');
    const { data: publicUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', newAuthUser.user.id)
      .single();
    
    if (publicUser) {
      // El trigger ya lo creó, solo actualizar
      console.log('✅ Perfil creado por trigger automático');
      console.log('🔄 Actualizando organización...');
      
      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: vendorName,
          role: 'CASHIER',
          organization_id: organizationId,
          updated_at: new Date().toISOString()
        })
        .eq('id', newAuthUser.user.id);
      
      if (updateError) {
        console.warn('⚠️  Error actualizando:', updateError.message);
      } else {
        console.log('✅ Perfil actualizado');
      }
    } else {
      // El trigger no se ejecutó, crear manualmente
      console.log('⚠️  Trigger no se ejecutó, creando perfil manualmente...');
      
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: newAuthUser.user.id,
          email: vendorEmail,
          full_name: vendorName,
          role: 'CASHIER',
          organization_id: organizationId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error('❌ Error creando perfil:', insertError.message);
        console.log('   El usuario existe en auth pero no en public.users');
        console.log('   Ejecuta setup-vendor-simple.ts para corregir');
      } else {
        console.log('✅ Perfil creado manualmente');
      }
    }
    
    // 6. Verificar resultado final
    console.log('');
    console.log('🔍 Verificando configuración final...');
    const { data: finalUser } = await supabase
      .from('users')
      .select('id, email, full_name, role, organization_id')
      .eq('email', vendorEmail)
      .single();
    
    if (!finalUser) {
      throw new Error('No se pudo verificar el usuario');
    }
    
    console.log('✅ Usuario configurado correctamente:');
    console.log(`   Email: ${finalUser.email}`);
    console.log(`   Nombre: ${finalUser.full_name}`);
    console.log(`   Rol: ${finalUser.role}`);
    console.log(`   Organización: ${finalUser.organization_id}`);
    console.log('');
    
    // 7. Resumen
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMEN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('✅ Vendedor creado exitosamente');
    console.log('');
    console.log('Credenciales de acceso:');
    console.log(`  Email: ${vendorEmail}`);
    console.log(`  Contraseña: ${vendorPassword}`);
    console.log('');
    console.log('Detalles:');
    console.log(`  Nombre: ${vendorName}`);
    console.log(`  Rol: CASHIER (Vendedor)`);
    console.log(`  Organización: Misma que bfjeem@gmail.com`);
    console.log('');
    console.log('El vendedor puede iniciar sesión en:');
    console.log('  http://localhost:3000/login');
    console.log('');
    console.log('Permisos del vendedor:');
    console.log('  • Crear y gestionar ventas');
    console.log('  • Ver productos e inventario');
    console.log('  • Gestionar clientes');
    console.log('  • Ver reportes básicos');
    console.log('  • Gestionar caja (apertura/cierre)');
    console.log('');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

// Ejecutar
createVendor()
  .catch((error) => {
    console.error('\n❌ Script fallido');
    process.exit(1);
  });
