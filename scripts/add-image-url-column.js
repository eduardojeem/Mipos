#!/usr/bin/env node

/**
 * Script to add missing image_url column to products table
 * Run: node scripts/add-image-url-column.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing Supabase credentials');
    console.error('   Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addImageUrlColumn() {
    console.log('🔧 Adding image_url column to products table...\n');

    try {
        // Read migration file
        const migrationPath = path.join(__dirname, '../supabase/migrations/20260122_add_image_url_to_products.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

        // Execute migration
        const { data, error } = await supabase.rpc('exec_sql', {
            sql: migrationSQL
        });

        if (error) {
            // If exec_sql doesn't exist, try direct execution
            console.log('⚠️  Attempting direct SQL execution...');

            const queries = migrationSQL
                .split(';')
                .map(q => q.trim())
                .filter(q => q && !q.startsWith('--'));

            for (const query of queries) {
                if (query.toLowerCase().includes('alter table') ||
                    query.toLowerCase().includes('create index') ||
                    query.toLowerCase().includes('update')) {
                    console.log(`  Executing: ${query.substring(0, 50)}...`);
                    // Note: Supabase client doesn't support DDL directly
                    // You'll need to run this via Supabase Dashboard SQL Editor
                }
            }

            console.log('\n⚠️  Direct execution not available via Supabase client');
            console.log('📋 Please run the migration manually:');
            console.log('   1. Go to Supabase Dashboard > SQL Editor');
            console.log('   2. Copy and paste the content from:');
            console.log(`      ${migrationPath}`);
            console.log('   3. Run the query\n');

            return;
        }

        console.log('✅ Migration executed successfully!\n');

        // Verify the changes
        const { data: products, error: queryError } = await supabase
            .from('products')
            .select('id, image_url, images')
            .limit(5);

        if (queryError) {
            console.error('❌ Error verifying changes:', queryError.message);
            return;
        }

        console.log('📊 Verification - Sample products:');
        console.table(products?.map(p => ({
            id: p.id.substring(0, 8) + '...',
            has_image_url: !!p.image_url,
            images_count: Array.isArray(p.images) ? p.images.length : 0
        })));

        // Get statistics
        const { data: stats, error: statsError } = await supabase
            .from('products')
            .select('id, image_url, images');

        if (!statsError && stats) {
            const withImageUrl = stats.filter(p => p.image_url).length;
            const withImages = stats.filter(p => p.images && p.images.length > 0).length;

            console.log('\n📈 Statistics:');
            console.log(`   Total products: ${stats.length}`);
            console.log(`   With image_url: ${withImageUrl}`);
            console.log(`   With images array: ${withImages}`);
        }

        console.log('\n✨ Done!\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('\n📋 Manual steps:');
        console.log('   1. Open Supabase Dashboard');
        console.log('   2. Go to SQL Editor');
        console.log('   3. Run the migration from:');
        console.log('      supabase/migrations/20260122_add_image_url_to_products.sql\n');
        process.exit(1);
    }
}

// Run the migration
addImageUrlColumn();
