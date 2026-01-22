#!/usr/bin/env node

/**
 * Script para crear productos de prueba usando la API del backend
 * Evita problemas de caché de esquema de Supabase
 */

const https = require('http');

const API_BASE = 'http://127.0.0.1:3001/api';

// Función para hacer peticiones HTTP
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function createTestProducts() {
  console.log('🚀 Creando productos de prueba via API...');

  try {
    // 1. Obtener categorías existentes
    console.log('\n📁 Obteniendo categorías...');
    
    const categoriesResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/categories/public',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (categoriesResponse.status !== 200) {
      console.error('❌ Error obteniendo categorías:', categoriesResponse.data);
      return;
    }

    const categories = categoriesResponse.data.data || [];
    console.log(`✅ Encontradas ${categories.length} categorías`);

    if (categories.length === 0) {
      console.log('⚠️ No hay categorías. Creando una categoría de prueba...');
      
      // Crear categoría de prueba (esto requeriría autenticación)
      console.log('❌ No se puede crear categoría sin autenticación');
      console.log('💡 Por favor, crea una categoría manualmente en el admin panel');
      return;
    }

    // Usar la primera categoría disponible
    const category = categories[0];
    console.log(`📂 Usando categoría: ${category.name} (ID: ${category.id})`);

    // 2. Crear productos de prueba
    console.log('\n📦 Creando productos de prueba...');
    
    const products = [
      {
        name: 'Producto Checkout Test 1',
        sku: 'CHECKOUT-001',
        categoryId: category.id,
        description: 'Producto para probar el flujo de checkout público',
        costPrice: 15.00,
        salePrice: 25.99,
        stockQuantity: 100,
        minStock: 10,
        images: []
      },
      {
        name: 'Producto Checkout Test 2',
        sku: 'CHECKOUT-002',
        categoryId: category.id,
        description: 'Segundo producto para testing de checkout',
        costPrice: 20.00,
        salePrice: 35.50,
        stockQuantity: 50,
        minStock: 5,
        images: []
      }
    ];

    for (const product of products) {
      console.log(`\n🔨 Creando: ${product.name}...`);
      
      // Nota: La creación de productos requiere autenticación
      // Por ahora solo mostraremos lo que se enviaría
      console.log('📋 Datos del producto:');
      console.log(JSON.stringify(product, null, 2));
      
      console.log('⚠️ La creación requiere autenticación de admin');
    }

    console.log('\n✅ Script completado');
    console.log('💡 Para crear productos reales, usa el panel de administración en:');
    console.log('   http://localhost:3000/admin');

  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

createTestProducts();