#!/usr/bin/env tsx

/**
 * Script básico para crear productos de prueba
 * Sin caracteres especiales ni descripciones complejas
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join } from 'path';

// Cargar variables de entorno
config({ path: join(__dirname, '../.env') });
config({ path: join(__dirname, '../.env.local') });

// Usar variables de entorno
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !key) {
  console.error('Error: Variables de entorno no encontradas');
  console.error('URL:', url ? 'OK' : 'MISSING');
  console.error('KEY:', key ? 'OK' : 'MISSING');
  process.exit(1);
}

const supabase = createClient(url, key);

async function createBasicProducts() {
  console.log('Creando productos basicos...');

  try {
    // 1. Crear categoría
    const { data: category, error: catError } = await supabase
      .from('categories')
      .upsert([{
        name: 'Test Category',
        description: 'Test category for products'
      }], { 
        onConflict: 'name',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (catError) {
      console.error('Error categoria:', catError);
      return;
    }

    console.log('Categoria creada:', category.name);

    // 2. Crear productos básicos
    const products = [
      {
        name: 'Test Product A',
        sku: 'TST-A-001',
        category_id: category.id,
        description: 'Basic test product A',
        cost_price: 10.00,
        sale_price: 20.00,
        stock_quantity: 100,
        min_stock: 10,
        images: []
      },
      {
        name: 'Test Product B',
        sku: 'TST-B-002',
        category_id: category.id,
        description: 'Basic test product B',
        cost_price: 15.00,
        sale_price: 25.00,
        stock_quantity: 50,
        min_stock: 5,
        images: []
      }
    ];

    for (const product of products) {
      const { data, error } = await supabase
        .from('products')
        .insert([product])
        .select()
        .single();

      if (error) {
        console.error(`Error producto ${product.name}:`, error.message);
      } else {
        console.log(`✓ Producto creado: ${product.name}`);
      }
    }

    console.log('Proceso completado');

  } catch (error) {
    console.error('Error general:', error);
  }
}

createBasicProducts();