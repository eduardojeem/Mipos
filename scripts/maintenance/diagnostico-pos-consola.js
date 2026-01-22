/**
 * SCRIPT DE DIAGNÓSTICO COMPLETO DEL POS
 * =======================================
 * 
 * INSTRUCCIONES:
 * 1. Abre el POS en el navegador (http://localhost:3001/dashboard/pos)
 * 2. Presiona F12 para abrir DevTools
 * 3. Ve a la pestaña "Console"
 * 4. Copia TODO este archivo y pégalo en la consola
 * 5. Presiona Enter
 * 6. Lee los resultados que aparecen
 */

(async () => {
    console.clear();
    console.log('🔍 INICIANDO DIAGNÓSTICO DEL POS...\n');
    console.log('═'.repeat(50));

    // =====================================================
    // PASO 1: Verificar Variables de Entorno
    // =====================================================
    console.log('\n📋 PASO 1: Verificar Variables de Entorno');
    console.log('-'.repeat(50));

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ CRÍTICO: Variables de entorno faltantes');
        console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Configurada' : '❌ Faltante');
        console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '✅ Configurada' : '❌ Faltante');
        console.error('\n💡 SOLUCIÓN: Verifica tu archivo .env.local');
        return;
    }

    console.log('✅ Variables de entorno configuradas');
    console.log('   URL:', supabaseUrl);
    console.log('   Key:', supabaseKey.substring(0, 20) + '...');

    // =====================================================
    // PASO 2: Crear Cliente de Supabase
    // =====================================================
    console.log('\n📋 PASO 2: Crear Cliente de Supabase');
    console.log('-'.repeat(50));

    let supabase;
    try {
        const { createClient } = await import('./src/lib/supabase/client.js');
        supabase = createClient();
        console.log('✅ Cliente de Supabase creado exitosamente');
    } catch (error) {
        console.error('❌ Error al crear cliente de Supabase:', error.message);
        console.error('\n💡 SOLUCIÓN: Verifica que el archivo src/lib/supabase/client.ts existe');
        return;
    }

    // =====================================================
    // PASO 3: Verificar Autenticación
    // =====================================================
    console.log('\n📋 PASO 3: Verificar Autenticación');
    console.log('-'.repeat(50));

    try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (session) {
            console.log('✅ Usuario autenticado');
            console.log('   Email:', session.user.email);
            console.log('   ID:', session.user.id);
        } else {
            console.log('⚠️  Usuario NO autenticado (sesión anónima)');
            console.log('   Esto es normal si las políticas RLS permiten acceso anónimo');
        }
    } catch (error) {
        console.error('❌ Error al verificar sesión:', error.message);
    }

    // =====================================================
    // PASO 4: Probar Query Directa de Productos
    // =====================================================
    console.log('\n📋 PASO 4: Probar Query Directa de Productos');
    console.log('-'.repeat(50));

    try {
        const { data, error, count } = await supabase
            .from('products')
            .select('*', { count: 'exact' })
            .limit(5);

        if (error) {
            console.error('❌ Error en la query:', error.message);
            console.error('   Código:', error.code);
            console.error('   Detalles:', error.details);

            if (error.message.includes('policy')) {
                console.error('\n💡 SOLUCIÓN: Problema de RLS');
                console.error('   Ejecuta en Supabase SQL Editor:');
                console.error(`
          DROP POLICY IF EXISTS "Products are viewable by authenticated users" ON products;
          CREATE POLICY "Products are viewable by everyone" ON products
            FOR SELECT TO anon, authenticated
            USING (is_active = true);
        `);
            }
            return;
        }

        console.log('✅ Query ejecutada exitosamente');
        console.log('   Total de productos en DB:', count);
        console.log('   Productos recibidos:', data?.length || 0);

        if (data && data.length > 0) {
            console.log('\n📦 Muestra de productos:');
            data.forEach((p, i) => {
                console.log(`   ${i + 1}. ${p.name} (${p.sku}) - $${p.sale_price}`);
                console.log(`      Stock: ${p.stock_quantity}, Activo: ${p.is_active ? '✅' : '❌'}`);
            });
        } else {
            console.warn('⚠️  No se recibieron productos');
            console.warn('   Posibles causas:');
            console.warn('   1. No hay productos en la base de datos');
            console.warn('   2. Todos los productos tienen is_active = false');
            console.warn('   3. Política RLS está bloqueando el acceso');
        }
    } catch (error) {
        console.error('❌ Error inesperado:', error);
    }

    // =====================================================
    // PASO 5: Verificar usePOSData Hook
    // =====================================================
    console.log('\n📋 PASO 5: Verificar Hook usePOSData');
    console.log('-'.repeat(50));

    try {
        const { usePOSData } = await import('./src/hooks/use-optimized-data.ts');
        console.log('✅ Hook importado correctamente');
        console.log('⚠️  Para verificar el hook, inspecciona el React DevTools');
        console.log('   Busca el componente OptimizedPOSLayout');
        console.log('   Verifica el valor de "products" en los hooks');
    } catch (error) {
        console.error('❌ Error al importar hook:', error.message);
    }

    // =====================================================
    // PASO 6: Verificar Network Requests
    // =====================================================
    console.log('\n📋 PASO 6: Verificar Network Tab');
    console.log('-'.repeat(50));
    console.log('🔍 Abre la pestaña Network en DevTools');
    console.log('   1. Filtra por "products" o "supabase"');
    console.log('   2. Refresca la página (Ctrl+Shift+R)');
    console.log('   3. Busca la request a Supabase');
    console.log('   4. Verifica la respuesta (Response tab)');

    // =====================================================
    // PASO 7: Probar Query con Categorías y Proveedores
    // =====================================================
    console.log('\n📋 PASO 7: Probar Query Completa (con relaciones)');
    console.log('-'.repeat(50));

    try {
        const { data, error } = await supabase
            .from('products')
            .select(`
        *,
        category:categories(*),
        supplier:suppliers(*)
      `)
            .limit(3);

        if (error) {
            console.error('❌ Error en query con relaciones:', error.message);

            if (error.message.includes('ambiguous')) {
                console.error('\n💡 SOLUCIÓN: Foreign keys ambiguas');
                console.error('   Problema conocido con múltiples FKs a la misma tabla');
                console.error('   Intenta sin relaciones primero');
            }
        } else {
            console.log('✅ Query con relaciones exitosa');
            console.log('   Productos con categorías:', data?.length || 0);

            if (data && data.length > 0) {
                console.log('\n📦 Muestra con relaciones:');
                data.forEach((p, i) => {
                    console.log(`   ${i + 1}. ${p.name}`);
                    console.log(`      Categoría: ${p.category?.name || 'Sin categoría'}`);
                    console.log(`      Proveedor: ${p.supplier?.name || 'Sin proveedor'}`);
                });
            }
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    // =====================================================
    // RESUMEN Y RECOMENDACIONES
    // =====================================================
    console.log('\n═'.repeat(50));
    console.log('📊 RESUMEN DEL DIAGNÓSTICO');
    console.log('═'.repeat(50));

    console.log('\n🔧 ACCIONES RECOMENDADAS:');
    console.log('1. Si no hay productos en DB:');
    console.log('   → Ir a /dashboard/products y crear productos');
    console.log('');
    console.log('2. Si hay error de RLS:');
    console.log('   → Ejecutar script de políticas en Supabase SQL Editor');
    console.log('');
    console.log('3. Si productos tienen is_active = false:');
    console.log('   → Activar productos desde el panel de administración');
    console.log('');
    console.log('4. Si hay error de foreign keys:');
    console.log('   → Modificar query para no incluir relaciones');
    console.log('');
    console.log('📧 Comparte los resultados de arriba si necesitas ayuda adicional');
    console.log('═'.repeat(50));
})();

// =====================================================
// COMANDOS ÚTILES ADICIONALES
// =====================================================

console.log('\n💡 COMANDOS ÚTILES:');
console.log('Copia y ejecuta estos comandos individualmente:\n');

console.log('// Ver productos directamente:');
console.log(`
const { createClient } = await import('./src/lib/supabase/client.js');
const supabase = createClient();
const { data } = await supabase.from('products').select('*').limit(10);
console.table(data);
`);

console.log('\n// Ver políticas RLS (ejecutar en Supabase SQL Editor):');
console.log(`
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'products';
`);

console.log('\n// Insertar producto de prueba (ejecutar en Supabase SQL Editor):');
console.log(`
INSERT INTO products (name, sku, sale_price, cost_price, stock_quantity, min_stock, category_id, is_active)
VALUES ('Producto TEST', 'TEST-001', 100.00, 50.00, 10, 2, (SELECT id FROM categories LIMIT 1), true);
`);
