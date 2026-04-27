/**
 * Script simple para configurar un usuario existente como vendedor
 * o crear uno nuevo si no existe
 * 
 * Ejecutar: npx ts-node apps/backend/src/scripts/setup-vendor-simple.ts
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

async function setupVendor() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  CONFIGURAR VENDEDOR                                  ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  
  const vendorEmail = 'espinozaeduardo1015@gmail.com';
  const vendorName = 'Juan Eduardo';
  
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
    
    // 2. Verificar si el usuario existe en auth.users
    console.log(`🔍 Verificando usuario: ${vendorEmail}...`);
    const { data: authData } = await supabase.auth.admin.listUsers();
    const authUser = authData?.users?.find((u: any) => u.email === vendorEmail);
    
    if (authUser) {
      console.log('✅ Usuario encontrado en auth.users');
      console.log(`   ID: ${authUser.id}\n`);
      
      // 3. Verificar/actualizar en public.users
      console.log('🔄 Configurando perfil en public.users...');
      const { data: publicUser } = await supabase
        .from('users')
        .select('id, email, role, organization_id')
        .eq('id', authUser.id)
        .single();
      
      if (publicUser) {
        // Actualizar
        const { error: updateError } = await supabase
          .from('users')
          .update({
            full_name: vendorName,
            role: 'CASHIER',
            organization_id: organizationId,
            updated_at: new Date().toISOString()
          })
          .eq('id', authUser.id);
        
        if (updateError) {
          throw new Error(`Error actualizando: ${updateError.message}`);
        }
        
        console.log('✅ Perfil actualizado');
      } else {
        // Crear
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            email: vendorEmail,
            full_name: vendorName,
            role: 'CASHIER',
            organization_id: organizationId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (insertError) {
          throw new Error(`Error creando perfil: ${insertError.message}`);
        }
        
        console.log('✅ Perfil creado');
      }
    } else {
      console.log('⚠️  Usuario no existe en auth.users');
      console.log('');
      console.log('Para crear el usuario, ve a:');
      console.log('Supabase Dashboard → Authentication → Users → Add User');
      console.log('');
      console.log('Datos del usuario:');
      console.log(`  Email: ${vendorEmail}`);
      console.log(`  Contraseña: (la que prefieras)`);
      console.log('');
      console.log('Luego ejecuta este script nuevamente.');
      return;
    }
    
    // 4. Verificar resultado final
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
    
    // 5. Resumen
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMEN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('✅ Vendedor configurado exitosamente');
    console.log('');
    console.log(`Email: ${vendorEmail}`);
    console.log(`Rol: CASHIER (Vendedor)`);
    console.log(`Organización: Misma que bfjeem@gmail.com`);
    console.log('');
    console.log('El vendedor puede iniciar sesión en:');
    console.log('http://localhost:3000/login');
    console.log('');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

// Ejecutar
setupVendor()
  .catch((error) => {
    console.error('\n❌ Script fallido');
    process.exit(1);
  });
