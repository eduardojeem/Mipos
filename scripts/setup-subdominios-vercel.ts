#!/usr/bin/env tsx
/**
 * Script para configurar subdominios en organizaciones
 * Para usar con *.vercel.app (gratis)
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// Cargar variables de entorno desde apps/frontend/.env.local
config({ path: resolve(__dirname, '../apps/frontend/.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupSubdominios() {
  console.log('🚀 Configurando subdominios para organizaciones...\n')

  // 1. Ver organizaciones actuales
  console.log('📋 Organizaciones actuales:')
  const { data: orgs, error: fetchError } = await supabase
    .from('organizations')
    .select('id, name, slug, subdomain, subscription_status')
    .order('created_at', { ascending: false })

  if (fetchError) {
    console.error('❌ Error al obtener organizaciones:', fetchError)
    return
  }

  if (!orgs || orgs.length === 0) {
    console.log('⚠️  No hay organizaciones en la base de datos')
    console.log('\n💡 Creando organización de prueba...')
    
    const { data: newOrg, error: createError } = await supabase
      .from('organizations')
      .insert({
        name: 'Tienda Demo',
        slug: 'tienda-demo',
        subdomain: 'tienda-demo',
        subscription_plan: 'PRO',
        subscription_status: 'ACTIVE'
      })
      .select()
      .single()

    if (createError) {
      console.error('❌ Error al crear organización:', createError)
      return
    }

    console.log('✅ Organización creada:', newOrg)
    console.log('\n🌐 Accede a: https://tienda-demo.tu-proyecto.vercel.app/home')
    return
  }

  // Mostrar organizaciones
  orgs.forEach((org, index) => {
    console.log(`\n${index + 1}. ${org.name}`)
    console.log(`   Slug: ${org.slug || '❌ Sin slug'}`)
    console.log(`   Subdomain: ${org.subdomain || '❌ Sin subdomain'}`)
    console.log(`   Status: ${org.subscription_status}`)
  })

  // 2. Actualizar organizaciones sin subdomain
  console.log('\n🔧 Actualizando organizaciones sin subdomain...')
  
  const orgsWithoutSubdomain = orgs.filter(org => !org.subdomain && org.slug)
  
  if (orgsWithoutSubdomain.length === 0) {
    console.log('✅ Todas las organizaciones ya tienen subdomain')
  } else {
    for (const org of orgsWithoutSubdomain) {
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ subdomain: org.slug })
        .eq('id', org.id)

      if (updateError) {
        console.error(`❌ Error al actualizar ${org.name}:`, updateError)
      } else {
        console.log(`✅ ${org.name} → subdomain: ${org.slug}`)
      }
    }
  }

  // 3. Mostrar resultado final
  console.log('\n📊 Configuración final:')
  const { data: finalOrgs } = await supabase
    .from('organizations')
    .select('name, subdomain, subscription_status')
    .order('name')

  if (finalOrgs) {
    console.log('\n┌─────────────────────────────────────────────────────────┐')
    console.log('│ Organización          │ Subdomain        │ Status      │')
    console.log('├─────────────────────────────────────────────────────────┤')
    
    finalOrgs.forEach(org => {
      const name = org.name.padEnd(20).substring(0, 20)
      const subdomain = (org.subdomain || 'N/A').padEnd(15).substring(0, 15)
      const status = org.subscription_status.padEnd(10).substring(0, 10)
      console.log(`│ ${name} │ ${subdomain} │ ${status} │`)
    })
    
    console.log('└─────────────────────────────────────────────────────────┘')
  }

  // 4. Mostrar URLs de ejemplo
  console.log('\n🌐 URLs de acceso (reemplaza "tu-proyecto" con tu nombre real):')
  finalOrgs?.forEach(org => {
    if (org.subdomain) {
      console.log(`   https://${org.subdomain}.tu-proyecto.vercel.app/home`)
    }
  })

  console.log('\n✅ Configuración completada!')
  console.log('\n📝 Próximos pasos:')
  console.log('   1. Actualiza NEXT_PUBLIC_BASE_DOMAIN en .env.local')
  console.log('   2. Configura las mismas variables en Vercel')
  console.log('   3. Deploy: git push o vercel --prod')
  console.log('   4. Prueba: https://subdomain.tu-proyecto.vercel.app/home')
}

setupSubdominios().catch(console.error)
