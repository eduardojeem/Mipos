const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

async function createAndTestSupabaseUser() {
  console.log('🔧 Creando usuario de prueba en Supabase...\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log('Supabase URL:', supabaseUrl);
  console.log('Anon Key (primeros 20 chars):', supabaseAnonKey?.substring(0, 20) + '...');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Variables de entorno de Supabase no encontradas');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  const testUser = {
    email: 'test-user@pos-system.com',
    password: 'TestPassword123!',
    fullName: 'Usuario de Prueba POS'
  };
  
  try {
    console.log('1. Registrando nuevo usuario...');
    
    // Intentar registrar usuario
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password,
      options: {
        data: {
          fullName: testUser.fullName,
          role: 'ADMIN'
        }
      }
    });
    
    if (signUpError) {
      console.log(`⚠️  Error en registro: ${signUpError.message}`);
      
      // Si el usuario ya existe, intentar autenticación directa
      if (signUpError.message.includes('already registered')) {
        console.log('Usuario ya existe, intentando autenticación...');
      } else {
        console.error('❌ Error crítico en registro');
        return;
      }
    } else {
      console.log('✅ Usuario registrado exitosamente');
      console.log('User ID:', signUpData.user?.id);
      console.log('Email:', signUpData.user?.email);
      console.log('Email confirmado:', signUpData.user?.email_confirmed_at ? 'Sí' : 'No');
    }
    
    console.log('\n2. Intentando autenticación...');
    
    // Intentar autenticación
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password
    });
    
    if (authError) {
      console.error('❌ Error de autenticación:', authError.message);
      
      // Si el email no está confirmado, intentar con confirmación automática
      if (authError.message.includes('Email not confirmed')) {
        console.log('\n⚠️  Email no confirmado. En desarrollo, esto puede ser normal.');
        console.log('Intentando obtener sesión actual...');
        
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          console.log('✅ Sesión activa encontrada');
          const token = sessionData.session.access_token;
          await testBackendWithToken(token);
          return;
        }
      }
      return;
    }
    
    console.log('✅ Autenticación exitosa');
    console.log('User ID:', authData.user.id);
    console.log('Email:', authData.user.email);
    
    const token = authData.session.access_token;
    console.log('Token obtenido (primeros 50 chars):', token.substring(0, 50) + '...');
    
    await testBackendWithToken(token);
    
    // Cerrar sesión
    await supabase.auth.signOut();
    console.log('\n✅ Sesión cerrada correctamente');
    
  } catch (error) {
    console.error('💥 Error inesperado:', error.message);
  }
}

async function testBackendWithToken(token) {
  console.log('\n🔍 Probando token con backend...');
  
  const baseURL = 'http://127.0.0.1:3001/api';
  const endpoints = [
    { name: 'Health Check', url: 'http://127.0.0.1:3001/health', auth: false },
    { name: 'Users Me', url: `${baseURL}/users/me`, auth: true },
    { name: 'Products', url: `${baseURL}/products?page=1&limit=5`, auth: true },
    { name: 'Dashboard Stats', url: `${baseURL}/dashboard/stats`, auth: true }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const config = {
        url: endpoint.url,
        method: 'GET',
        timeout: 10000
      };
      
      if (endpoint.auth) {
        config.headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };
      }
      
      const response = await axios(config);
      console.log(`✅ ${endpoint.name} - Status: ${response.status}`);
      
      if (response.data) {
        const dataStr = JSON.stringify(response.data, null, 2);
        console.log(`   Datos: ${dataStr.substring(0, 200)}${dataStr.length > 200 ? '...' : ''}`);
      }
      
    } catch (error) {
      console.log(`❌ ${endpoint.name} - Error:`);
      console.log(`   Status: ${error.response?.status || 'No response'}`);
      console.log(`   Message: ${error.response?.data?.error || error.message}`);
    }
  }
  
  console.log('\n🎯 TOKEN VÁLIDO PARA PRUEBAS FUTURAS:');
  console.log(token);
  
  console.log('\n📋 Credenciales de prueba:');
  console.log('Email: test-user@pos-system.com');
  console.log('Password: TestPassword123!');
}

createAndTestSupabaseUser();