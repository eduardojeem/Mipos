#!/usr/bin/env node

/**
 * Improved Product Seed Script for POS System
 *
 * Features:
 * - Idempotent operations (can run multiple times safely)
 * - Comprehensive error handling and validation
 * - Multiple test products with variety
 * - Automatic category creation if needed
 * - Progress tracking and detailed logging
 * - Environment validation
 * - Database connection health checks
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration
const CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  PRODUCTS_TO_CREATE: 5
};

// Test products data with variety
const TEST_PRODUCTS = [
  {
    name: 'Laptop Gaming Pro',
    sku: 'LAPTOP-GAMING-001',
    description: 'Laptop de alta gama para gaming con RTX 4070',
    costPrice: 1200.00,
    salePrice: 1899.99,
    stockQuantity: 25,
    minStock: 3,
    categoryName: 'Electrónicos'
  },
  {
    name: 'Camiseta Casual',
    sku: 'CAMISETA-CASUAL-001',
    description: 'Camiseta de algodón 100% para uso diario',
    costPrice: 15.00,
    salePrice: 29.99,
    stockQuantity: 100,
    minStock: 10,
    categoryName: 'Ropa'
  },
  {
    name: 'Set de Ollas Antiadherentes',
    sku: 'OLLAS-ANTIADHERENTES-001',
    description: 'Juego de 5 ollas antiadherentes de aluminio',
    costPrice: 45.00,
    salePrice: 89.99,
    stockQuantity: 15,
    minStock: 2,
    categoryName: 'Hogar'
  },
  {
    name: 'Labial Mate Rojo',
    sku: 'LABIAL-MATE-ROJO-001',
    description: 'Labial mate de larga duración color rojo pasión',
    costPrice: 8.50,
    salePrice: 18.99,
    stockQuantity: 50,
    minStock: 5,
    categoryName: 'Cosméticos'
  },
  {
    name: 'Cereal Integral Premium',
    sku: 'CEREAL-INTEGRAL-001',
    description: 'Cereal integral con frutas y nueces, 500g',
    costPrice: 4.20,
    salePrice: 9.99,
    stockQuantity: 75,
    minStock: 8,
    categoryName: 'Alimentos'
  }
];

// Utility functions
function validateEnvironment() {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = required.filter(key => !CONFIG[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.log('\n💡 Make sure your .env file contains:');
    console.log('   SUPABASE_URL=your_supabase_url');
    console.log('   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
    process.exit(1);
  }

  console.log('✅ Environment variables validated');
}

async function createSupabaseClient() {
  try {
    const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_ROLE_KEY);

    // Test connection
    const { data, error } = await supabase.from('products').select('count').limit(1);
    if (error) throw error;

    console.log('✅ Supabase connection established');
    return supabase;
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error.message);
    process.exit(1);
  }
}

async function retryOperation(operation, maxRetries = CONFIG.MAX_RETRIES) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      console.log(`⚠️ Attempt ${attempt} failed, retrying in ${CONFIG.RETRY_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
    }
  }
}

async function ensureCategoriesExist(supabase) {
  console.log('\n📂 Ensuring categories exist...');

  const categoryNames = [...new Set(TEST_PRODUCTS.map(p => p.categoryName))];
  const existingCategories = new Map();

  // Check existing categories
  for (const name of categoryNames) {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .eq('name', name)
      .single();

    if (!error && data) {
      existingCategories.set(name, data.id);
      console.log(`   ✅ Category "${name}" exists (ID: ${data.id})`);
    }
  }

  // Create missing categories
  for (const name of categoryNames) {
    if (!existingCategories.has(name)) {
      try {
        const { data, error } = await supabase
          .from('categories')
          .insert([{
            name,
            description: `Categoría de productos ${name.toLowerCase()}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select('id')
          .single();

        if (error) throw error;

        existingCategories.set(name, data.id);
        console.log(`   🆕 Created category "${name}" (ID: ${data.id})`);
      } catch (error) {
        console.error(`   ❌ Failed to create category "${name}":`, error.message);
        throw error;
      }
    }
  }

  return existingCategories;
}

async function createTestProducts(supabase, categories) {
  console.log('\n🛍️ Creating test products...');

  const createdProducts = [];
  let successCount = 0;
  let skipCount = 0;

  for (const [index, productData] of TEST_PRODUCTS.entries()) {
    const progress = `${index + 1}/${TEST_PRODUCTS.length}`;
    console.log(`\n📦 [${progress}] Processing: ${productData.name}`);

    try {
      // Check if product already exists
      const { data: existing, error: checkError } = await supabase
        .from('products')
        .select('id, name, sku')
        .eq('sku', productData.sku)
        .single();

      if (!checkError && existing) {
        console.log(`   ⏭️ Product "${productData.name}" already exists (SKU: ${productData.sku})`);
        skipCount++;
        continue;
      }

      // Prepare product data
      const categoryId = categories.get(productData.categoryName);
      if (!categoryId) {
        throw new Error(`Category "${productData.categoryName}" not found`);
      }

      const productPayload = {
        name: productData.name,
        sku: productData.sku,
        description: productData.description,
        category_id: categoryId,
        cost_price: productData.costPrice,
        sale_price: productData.salePrice,
        stock_quantity: productData.stockQuantity,
        min_stock: productData.minStock,
        images: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Create product with retry
      const result = await retryOperation(async () => {
        const { data, error } = await supabase
          .from('products')
          .insert([productPayload])
          .select('id, name, sku, sale_price, stock_quantity')
          .single();

        if (error) throw error;
        return data;
      });

      createdProducts.push(result);
      successCount++;

      console.log(`   ✅ Created: ${result.name}`);
      console.log(`      SKU: ${result.sku}`);
      console.log(`      Price: $${result.sale_price}`);
      console.log(`      Stock: ${result.stock_quantity}`);

    } catch (error) {
      console.error(`   ❌ Failed to create "${productData.name}":`, error.message);
    }
  }

  console.log(`\n📊 Summary: ${successCount} created, ${skipCount} skipped`);
  return createdProducts;
}

async function validateCreatedProducts(supabase, createdProducts) {
  console.log('\n🔍 Validating created products...');

  let validCount = 0;
  for (const product of createdProducts) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, sale_price, stock_quantity, category_id')
        .eq('id', product.id)
        .single();

      if (error) throw error;

      console.log(`   ✅ Validated: ${data.name} (${data.sku})`);
      validCount++;
    } catch (error) {
      console.error(`   ❌ Validation failed for ${product.name}:`, error.message);
    }
  }

  console.log(`\n🎯 Validation complete: ${validCount}/${createdProducts.length} products valid`);
}

async function main() {
  console.log('🚀 Starting Improved Product Seed Script');
  console.log('==========================================');

  try {
    // 1. Environment validation
    validateEnvironment();

    // 2. Database connection
    const supabase = await createSupabaseClient();

    // 3. Ensure categories exist
    const categories = await ensureCategoriesExist(supabase);

    // 4. Create test products
    const createdProducts = await createTestProducts(supabase, categories);

    // 5. Validate results
    if (createdProducts.length > 0) {
      await validateCreatedProducts(supabase, createdProducts);
    }

    // 6. Final summary
    console.log('\n🎉 Script completed successfully!');
    console.log('=====================================');
    console.log(`📦 Products processed: ${TEST_PRODUCTS.length}`);
    console.log(`✅ Products created: ${createdProducts.length}`);
    console.log(`⏭️ Products skipped: ${TEST_PRODUCTS.length - createdProducts.length}`);

    if (createdProducts.length > 0) {
      console.log('\n💡 Next steps:');
      console.log('   1. Go to: http://localhost:3000/pos');
      console.log('   2. Verify products appear in the POS interface');
      console.log('   3. Test adding products to cart and completing a sale');
    }

  } catch (error) {
    console.error('\n💥 Script failed:', error.message);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

// Execute the script
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { main, TEST_PRODUCTS, CONFIG };