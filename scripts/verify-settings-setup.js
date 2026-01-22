#!/usr/bin/env node

/**
 * Script para verificar que la configuración de settings funciona correctamente
 */

console.log('🔍 Verificando configuración de settings...\n');

// Verificar que las APIs respondan correctamente
async function testAPIs() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log('1️⃣ Probando API de business-config...');
    const businessResponse = await fetch(`${baseUrl}/api/business-config`);
    const businessData = await businessResponse.json();
    
    if (businessResponse.ok && businessData.success) {
      console.log('✅ Business Config API funcionando');
      console.log('📊 Business Name:', businessData.config?.businessName || 'No configurado');
    } else {
      console.log('❌ Business Config API falló:', businessData.error || 'Error desconocido');
    }
    
    console.log('\n2️⃣ Probando API de website-config...');
    const websiteResponse = await fetch(`${baseUrl}/api/website-config`);
    const websiteData = await websiteResponse.json();
    
    if (websiteResponse.ok && websiteData.success) {
      console.log('✅ Website Config API funcionando');
      console.log('🎨 Brand Name:', websiteData.config?.branding?.brandName || 'No configurado');
      console.log('🌈 Primary Color:', websiteData.config?.branding?.primaryColor || 'No configurado');
    } else {
      console.log('❌ Website Config API falló:', websiteData.error || 'Error desconocido');
    }
    
    console.log('\n🎉 Verificación completada!');
    console.log('\n📋 Próximos pasos:');
    console.log('1. Acceder a /admin/business-config para configurar el sistema POS');
    console.log('2. Acceder a /admin/website-config para configurar el sitio web');
    console.log('3. Probar el auto-save modificando configuraciones');
    
  } catch (error) {
    console.error('💥 Error durante la verificación:', error.message);
    console.log('\n🔧 Posibles soluciones:');
    console.log('1. Asegúrate de que el servidor esté corriendo (npm run dev)');
    console.log('2. Verifica que la migración se haya aplicado correctamente');
    console.log('3. Revisa la configuración de Supabase');
  }
}

// Ejecutar verificación
testAPIs();