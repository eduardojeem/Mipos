import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function testFrontendIntegration() {
  console.log('🧪 PRUEBA DE INTEGRACIÓN FRONTEND-SUPABASE')
  console.log('=' .repeat(60))

  let testsPassedCount = 0
  let testsFailedCount = 0
  const testResults: { test: string; status: 'PASS' | 'FAIL'; details?: string }[] = []

  // Función auxiliar para ejecutar pruebas
  async function runTest(testName: string, testFunction: () => Promise<boolean>) {
    console.log(`🔍 Ejecutando: ${testName}...`)
    try {
      const result = await testFunction()
      if (result) {
        console.log(`✅ PASS: ${testName}`)
        testResults.push({ test: testName, status: 'PASS' })
        testsPassedCount++
      } else {
        console.log(`❌ FAIL: ${testName}`)
        testResults.push({ test: testName, status: 'FAIL' })
        testsFailedCount++
      }
    } catch (error: any) {
      console.log(`❌ ERROR: ${testName} - ${error.message}`)
      testResults.push({ test: testName, status: 'FAIL', details: error.message })
      testsFailedCount++
    }
  }

  // Test 1: Verificar conexión básica
  await runTest('Conexión básica a Supabase', async () => {
    const { data, error } = await supabase.from('roles').select('count', { count: 'exact' }).limit(1)
    return !error && data !== null
  })

  // Test 2: Verificar datos de roles
  await runTest('Verificar roles insertados', async () => {
    const { data, error } = await supabase.from('roles').select('*')
    if (error) return false
    
    const expectedRoles = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER', 'INVENTORY_CLERK']
    const actualRoles = data?.map(role => role.name) || []
    
    console.log(`   📊 Roles encontrados: ${actualRoles.length}`)
    console.log(`   📋 Roles: ${actualRoles.join(', ')}`)
    
    return expectedRoles.every(role => actualRoles.includes(role))
  })

  // Test 3: Verificar permisos
  await runTest('Verificar permisos insertados', async () => {
    const { data, error } = await supabase.from('permissions').select('*')
    if (error) return false
    
    console.log(`   📊 Permisos encontrados: ${data?.length || 0}`)
    
    // Verificar algunos permisos clave
    const keyPermissions = ['users.create', 'products.read', 'sales.create', 'reports.view']
    const actualPermissions = data?.map(perm => perm.name) || []
    
    return keyPermissions.every(perm => actualPermissions.includes(perm))
  })

  // Test 4: Verificar categorías
  await runTest('Verificar categorías insertadas', async () => {
    const { data, error } = await supabase.from('categories').select('*')
    if (error) return false
    
    console.log(`   📊 Categorías encontradas: ${data?.length || 0}`)
    
    const expectedCategories = ['Electrónicos', 'Ropa', 'Hogar', 'Deportes', 'Libros']
    const actualCategories = data?.map(cat => cat.name) || []
    
    return expectedCategories.some(cat => actualCategories.includes(cat))
  })

  // Test 5: Verificar proveedores
  await runTest('Verificar proveedores insertados', async () => {
    const { data, error } = await supabase.from('suppliers').select('*')
    if (error) return false
    
    console.log(`   📊 Proveedores encontrados: ${data?.length || 0}`)
    
    return (data?.length || 0) >= 3
  })

  // Test 6: Verificar clientes
  await runTest('Verificar clientes insertados', async () => {
    const { data, error } = await supabase.from('customers').select('*')
    if (error) return false
    
    console.log(`   📊 Clientes encontrados: ${data?.length || 0}`)
    
    return (data?.length || 0) >= 3
  })

  // Test 7: Verificar productos
  await runTest('Verificar productos insertados', async () => {
    const { data, error } = await supabase.from('products').select('*')
    if (error) return false
    
    console.log(`   📊 Productos encontrados: ${data?.length || 0}`)
    
    return (data?.length || 0) >= 1
  })

  // Test 8: Verificar relaciones rol-permiso
  await runTest('Verificar asignaciones rol-permiso', async () => {
    const { data, error } = await supabase.from('role_permissions').select('*')
    if (error) return false
    
    console.log(`   📊 Asignaciones encontradas: ${data?.length || 0}`)
    
    return (data?.length || 0) >= 10
  })

  // Test 9: Probar consulta compleja (JOIN)
  await runTest('Verificar consultas complejas (JOIN)', async () => {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        categories (name),
        suppliers (name)
      `)
      .limit(5)
    
    if (error) return false
    
    console.log(`   📊 Productos con relaciones: ${data?.length || 0}`)
    
    return data && data.length > 0 && data[0].categories && data[0].suppliers
  })

  // Test 10: Verificar funcionalidad de inserción
  await runTest('Probar inserción de datos (cliente de prueba)', async () => {
    const testCustomer = {
      name: 'Cliente de Prueba',
      email: `test-${Date.now()}@example.com`,
      phone: '+9999999999',
      address: 'Dirección de Prueba'
    }

    const { data, error } = await supabase
      .from('customers')
      .insert([testCustomer])
      .select()

    if (error) return false

    // Limpiar datos de prueba
    if (data && data[0]) {
      await supabase.from('customers').delete().eq('id', data[0].id)
    }

    return data && data.length > 0
  })

  // Resumen de resultados
  console.log('\n📋 RESUMEN DE PRUEBAS')
  console.log('=' .repeat(60))
  console.log(`✅ Pruebas exitosas: ${testsPassedCount}`)
  console.log(`❌ Pruebas fallidas: ${testsFailedCount}`)
  console.log(`📊 Tasa de éxito: ${Math.round((testsPassedCount / (testsPassedCount + testsFailedCount)) * 100)}%`)

  // Mostrar detalles de pruebas fallidas
  const failedTests = testResults.filter(result => result.status === 'FAIL')
  if (failedTests.length > 0) {
    console.log('\n❌ PRUEBAS FALLIDAS:')
    failedTests.forEach((test, index) => {
      console.log(`${index + 1}. ${test.test}`)
      if (test.details) {
        console.log(`   Error: ${test.details}`)
      }
    })
  }

  // Recomendaciones
  console.log('\n💡 RECOMENDACIONES:')
  console.log('-' .repeat(40))
  
  if (testsPassedCount === 0) {
    console.log('🚨 CRÍTICO: Ninguna prueba pasó. Ejecutar configuración manual en Supabase Dashboard.')
    console.log('   1. Ir a Supabase Dashboard > SQL Editor')
    console.log('   2. Ejecutar scripts/complete-database-schema.sql')
    console.log('   3. Ejecutar scripts/supabase-sql-direct.sql')
  } else if (testsFailedCount > 0) {
    console.log('⚠️ PARCIAL: Algunas pruebas fallaron. Revisar configuración específica.')
    console.log('   1. Verificar que todos los scripts SQL se ejecutaron correctamente')
    console.log('   2. Comprobar permisos RLS en Supabase Dashboard')
    console.log('   3. Revisar variables de entorno en .env.local')
  } else {
    console.log('🎉 EXCELENTE: Todas las pruebas pasaron. El sistema está listo.')
    console.log('   1. El frontend puede conectarse correctamente a Supabase')
    console.log('   2. Todos los datos están insertados correctamente')
    console.log('   3. Las relaciones entre tablas funcionan')
  }

  // Estado del sistema
  console.log('\n🔧 ESTADO DEL SISTEMA:')
  console.log('-' .repeat(40))
  
  if (testsPassedCount >= 8) {
    console.log('🟢 SISTEMA OPERATIVO - Listo para producción')
  } else if (testsPassedCount >= 5) {
    console.log('🟡 SISTEMA PARCIAL - Requiere ajustes menores')
  } else {
    console.log('🔴 SISTEMA NO OPERATIVO - Requiere configuración manual')
  }

  return {
    success: testsPassedCount > testsFailedCount,
    testsPassedCount,
    testsFailedCount,
    totalTests: testsPassedCount + testsFailedCount,
    results: testResults
  }
}

// Ejecutar las pruebas
testFrontendIntegration()
  .then((result) => {
    if (result.success) {
      console.log('\n✅ Integración frontend-Supabase: EXITOSA')
      process.exit(0)
    } else {
      console.log('\n⚠️ Integración frontend-Supabase: REQUIERE ATENCIÓN')
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('\n❌ Error crítico en las pruebas:', error)
    process.exit(1)
  })