#!/usr/bin/env tsx
/**
 * Script para crear organizaciones en Supabase (producción)
 * Ejecutar: npx tsx scripts/seed-organizations-production.ts
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

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const organizations = [
  {
    name: 'MiPOS BFJEEM',
    slug: 'bfjeem',
    subdomain: 'bfjeem',
    subscription_plan: 'PRO',
    subscription_status: 'ACTIVE',
    description: 'Organización principal de MiPOS'
  },
  {
    name: 'Empresa John Espinoza',
    slug: 'john-espinoza-org',
    subdomain: 'john-espinoza-org',
    subscription_plan: 'STARTER',
    subscription_status: 'ACTIVE',
    description: 'Empresa de John Espinoza'
  },
  {
    name: 'Acme Corp',
    slug: 'acme-corp',
    subdomain: 'acme-corp',
    subscription_plan: 'PRO',
    subscription_status: 'TRIAL',
    description: 'Acme Corporation - Demo'
  },
  {
    name: 'Globex Corporation',
    slug: 'globex',
    subdomain: 'globex',
    subscription_plan: 'PRO',
    subscription_status: 'ACTIVE',
    description: 'Globex Corporation'
  },
  {
    name: 'Organización Principal',
    slug: 'main-org',
    subdomain: 'main-org',
    subscription_plan: 'ENTERPRISE',
    subscription_status: 'ACTIVE',
    description: 'Organización principal del sistema'
  },
  {
    name: 'Soylent Corp',
    slug: 'soylent',
    subdomain: 'soylent',
    subscription_plan: 'STARTER',
    subscription_status: 'ACTIVE',
    description: 'Soylent Corporation'
  }
]

async function seedOrganizations() {
  console.log('🚀 Creando organizaciones en Supabase...\n')

  for (const org of organizations) {
    console.log(`📝 Procesando: ${org.name}`)

    // Verificar si ya existe
    const { data: existing } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('slug', org.slug)
      .single()

    if (existing) {
      console.log(`   ⚠️  Ya existe: ${existing.name} (${existing.slug})`)
      
      // Actualizar para asegurar que esté ACTIVE
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          subscription_status: org.subscription_status,
          subdomain: org.subdomain
        })
        .eq('id', existing.id)

      if (updateError) {
        console.log(`   ❌ Error al actualizar: ${updateError.message}`)
      } else {
        console.log(`   ✅ Actualizado a ACTIVE`)
      }
      continue
    }

    // Crear nueva organización
    const { data: newOrg, error } = await supabase
      .from('organizations')
      .insert({
        name: org.name,
        slug: org.slug,
        subdomain: org.subdomain,
        subscription_plan: org.subscription_plan,
        subscription_status: org.subscription_status,
        description: org.description,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.log(`   ❌ Error: ${error.message}`)
      console.log(`   Detalles:`, error)
    } else {
      console.log(`   ✅ Creado: ${newOrg.name} (ID: ${newOrg.id})`)
    }
  }

  console.log('\n📊 Verificando organizaciones creadas...')
  
  const { data: allOrgs, error: fetchError } = await supabase
    .from('organizations')
    .select('id, name, slug, subdomain, subscription_status')
    .order('name')

  if (fetchError) {
    console.error('❌ Error al obtener organizaciones:', fetchError)
    return
  }

  if (!allOrgs || allOrgs.length === 0) {
    console.log('⚠️  No se encontraron organizaciones')
    return
  }

  console.log('\n┌─────────────────────────────────────────────────────────────────┐')
  console.log('│ Organización          │ Slug              │ Subdomain         │')
  console.log('├─────────────────────────────────────────────────────────────────┤')
  
  allOrgs.forEach(org => {
    const name = org.name.padEnd(20).substring(0, 20)
    const slug = org.slug.padEnd(16).substring(0, 16)
    const subdomain = (org.subdomain || 'N/A').padEnd(16).substring(0, 16)
    console.log(`│ ${name} │ ${slug} │ ${subdomain} │`)
  })
  
  console.log('└─────────────────────────────────────────────────────────────────┘')

  console.log('\n🌐 URLs de prueba:')
  allOrgs.forEach(org => {
    console.log(`   https://miposparaguay.vercel.app/${org.slug}/home`)
  })

  console.log('\n✅ ¡Listo! Ahora puedes probar las URLs en tu navegador.')
  console.log('\n📝 Próximos pasos:')
  console.log('   1. Accede a: https://miposparaguay.vercel.app/debug-org')
  console.log('   2. Verifica que las organizaciones aparecen')
  console.log('   3. Click en un "Test URL"')
  console.log('   4. Debería funcionar correctamente')
}

seedOrganizations().catch(console.error)
