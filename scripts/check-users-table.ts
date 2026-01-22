#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '../.env.local' });
dotenv.config({ path: '../.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsersTable() {
  console.log('🔍 VERIFICANDO TABLA USERS EN SUPABASE');
  console.log('=====================================');

  try {
    // Intentar consultar la tabla users
    const { data, error } = await supabase
      .from('users')
      .select('id, email, role, full_name', { count: 'exact', head: true });

    if (error) {
      console.log('❌ Error al acceder a la tabla users:', error.message);
      console.log('📋 Código de error:', error.code);
      console.log('📋 Detalles:', error.details);
      
      if (error.message.includes('does not exist') || error.message.includes('schema cache')) {
        console.log('\n🔧 DIAGNÓSTICO: La tabla "users" no existe en Supabase');
        console.log('💡 SOLUCIÓN: Necesitas crear la tabla users o modificar el hook de autenticación');
      } else if (error.message.includes('permission denied')) {
        console.log('\n🔧 DIAGNÓSTICO: La tabla "users" existe pero no tienes permisos');
        console.log('💡 SOLUCIÓN: Configurar políticas RLS o usar auth.users de Supabase');
      }
      
      return false;
    }

    console.log('✅ Tabla users accesible');
    console.log('📊 Registros encontrados:', data?.length || 0);
    return true;

  } catch (err) {
    console.error('❌ Error inesperado:', err);
    return false;
  }
}

async function checkAuthUsers() {
  console.log('\n🔍 VERIFICANDO TABLA AUTH.USERS (SUPABASE NATIVA)');
  console.log('================================================');

  try {
    // Intentar obtener el usuario actual usando auth
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.log('❌ Error al acceder a auth.users:', error.message);
      return false;
    }

    if (user) {
      console.log('✅ Tabla auth.users accesible');
      console.log('👤 Usuario actual encontrado:', user.email);
      console.log('🆔 ID:', user.id);
      console.log('📅 Creado:', user.created_at);
      return true;
    } else {
      console.log('⚠️ No hay usuario autenticado actualmente');
      return false;
    }

  } catch (err) {
    console.error('❌ Error inesperado:', err);
    return false;
  }
}

async function main() {
  const usersTableExists = await checkUsersTable();
  const authUsersWorks = await checkAuthUsers();

  console.log('\n📋 RESUMEN DEL DIAGNÓSTICO');
  console.log('==========================');
  console.log(`📊 Tabla 'users' personalizada: ${usersTableExists ? '✅ Accesible' : '❌ No accesible'}`);
  console.log(`🔐 Tabla 'auth.users' nativa: ${authUsersWorks ? '✅ Funcional' : '❌ No funcional'}`);

  if (!usersTableExists && authUsersWorks) {
    console.log('\n💡 RECOMENDACIÓN:');
    console.log('El hook de autenticación está intentando usar una tabla "users" personalizada');
    console.log('que no existe. Deberías modificar el hook para usar auth.users directamente');
    console.log('o crear la tabla users personalizada.');
  } else if (!usersTableExists && !authUsersWorks) {
    console.log('\n⚠️ PROBLEMA CRÍTICO:');
    console.log('Ni la tabla users personalizada ni auth.users están funcionando.');
    console.log('Verifica tu configuración de Supabase y autenticación.');
  } else if (usersTableExists) {
    console.log('\n✅ TODO CORRECTO:');
    console.log('La tabla users está accesible y el sistema debería funcionar.');
  }
}

main().catch(console.error);