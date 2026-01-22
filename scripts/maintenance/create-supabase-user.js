const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Cliente con service role key para operaciones administrativas
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Cliente normal para autenticación
const supabaseClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function createSupabaseUser() {
  console.log('🔧 Creando usuario de prueba en Supabase...\n');
  
  try {
    const testUser = {
      email: 'test@pos-system.com',
      password: 'TestPassword123!',
      fullName: 'Usuario de Prueba'
    };
    
    console.log('1. Creando usuario con service role...');
    
    // Crear usuario usando service role
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: testUser.email,
      password: testUser.password,
      email_confirm: true,
      user_metadata: {
        fullName: testUser.fullName,
        role: 'ADMIN'
      }
    });
    
    if (createError) {
      if (createError.message.includes('already registered')) {
        console.log('⚠️  Usuario ya existe, intentando autenticar...');
      } else {
        console.error('❌ Error creando usuario:', createError.message);
        return;
      }
    } else {
      console.log('✅ Usuario creado exitosamente');
      console.log('ID:', userData.user.id);
      console.log('Email:', userData.user.email);
    }
    
    console.log('\n2. Autenticando usuario para obtener token...');
    
    // Autenticar para obtener token
    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password
    });
    
    if (authError) {
      console.error('❌ Error de autenticación:', authError.message);
      return;
    }
    
    console.log('✅ Autenticación exitosa');
    console.log('Token obtenido (primeros 50 chars):', authData.session.access_token.substring(0, 50) + '...');
    
    console.log('\n3. Probando token con el backend...');
    
    // Probar el token con el backend
    const axios = require('axios');
    const baseURL = 'http://127.0.0.1:3001/api';
    
    try {
      const response = await axios.get(`${baseURL}/customers/mock`, {
        headers: {
          'Authorization': `Bearer ${authData.session.access_token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      console.log('✅ Token funciona correctamente con el backend');
      console.log('Respuesta:', response.data);
    } catch (error) {
      console.log('❌ Error probando token con backend:');
      console.log('Status:', error.response?.status);
      console.log('Data:', error.response?.data);
    }
    
    console.log('\n🎯 Token para usar en pruebas:');
    console.log(authData.session.access_token);
    
    console.log('\n📋 Credenciales de prueba:');
    console.log('Email:', testUser.email);
    console.log('Password:', testUser.password);
    
  } catch (error) {
    console.error('💥 Error inesperado:', error.message);
  }
}

createSupabaseUser();