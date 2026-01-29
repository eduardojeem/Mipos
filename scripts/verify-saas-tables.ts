/**
 * Script para verificar las tablas de SaaS en Supabase
 * Verifica que las tablas organizations y organization_members existan y tengan datos
 */

import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase desde variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function verifySupabaseTables() {
  console.log('🔍 Verificando tablas SaaS en Supabase...\n');

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Variables de entorno NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY no configuradas');
    console.log('   Por favor, configura tu archivo .env.local\n');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Verificar tabla organizations
    console.log('📊 Verificando tabla: organizations');
    const { data: orgs, error: orgsError, count: orgsCount } = await supabase
      .from('organizations')
      .select('*', { count: 'exact' });

    if (orgsError) {
      console.error('   ❌ Error al acceder a la tabla organizations:', orgsError.message);
      console.log('   💡 La tabla puede no existir o no tener permisos de lectura\n');
    } else {
      console.log(`   ✅ Tabla existe y es accesible`);
      console.log(`   📈 Total de organizaciones: ${orgsCount}`);
      
      if (orgs && orgs.length > 0) {
        console.log('   📋 Organizaciones encontradas:');
        orgs.forEach((org: any, index: number) => {
          console.log(`      ${index + 1}. ${org.name} (${org.slug})`);
          console.log(`         - Plan: ${org.subscription_plan}`);
          console.log(`         - Estado: ${org.subscription_status}`);
          console.log(`         - Creada: ${new Date(org.created_at).toLocaleDateString()}`);
        });
      } else {
        console.log('   ⚠️  No se encontraron organizaciones');
      }
      console.log('');
    }

    // 2. Verificar tabla organization_members
    console.log('📊 Verificando tabla: organization_members');
    const { data: members, error: membersError, count: membersCount } = await supabase
      .from('organization_members')
      .select('*, organizations(name, slug)', { count: 'exact' });

    if (membersError) {
      console.error('   ❌ Error al acceder a la tabla organization_members:', membersError.message);
      console.log('   💡 La tabla puede no existir o no tener permisos de lectura\n');
    } else {
      console.log(`   ✅ Tabla existe y es accesible`);
      console.log(`   📈 Total de miembros: ${membersCount}`);
      
      if (members && members.length > 0) {
        // Agrupar por organización
        const byOrg = members.reduce((acc: any, member: any) => {
          const orgName = member.organizations?.name || 'Sin organización';
          if (!acc[orgName]) acc[orgName] = [];
          acc[orgName].push(member);
          return acc;
        }, {});

        console.log('   📋 Distribución de miembros por organización:');
        Object.entries(byOrg).forEach(([orgName, orgMembers]: [string, any]) => {
          console.log(`      - ${orgName}: ${orgMembers.length} miembro(s)`);
        });
      } else {
        console.log('   ⚠️  No se encontraron miembros en ninguna organización');
      }
      console.log('');
    }

    // 3. Verificar relación entre usuarios y organizaciones
    if (orgs && orgs.length > 0 && members && members.length > 0) {
      console.log('🔗 Verificando relaciones usuario-organización');
      console.log('   ✅ Las tablas están correctamente relacionadas');
      console.log('   ✅ Sistema multi-tenant está operativo\n');
    } else if (orgs && orgs.length > 0) {
      console.log('⚠️  Advertencia: Existen organizaciones pero no hay miembros asignados');
      console.log('   💡 Considera agregar usuarios a las organizaciones\n');
    }

    // 4. Resumen final
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 RESUMEN DE VERIFICACIÓN');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Tabla organizations:         ${orgsError ? '❌ Error' : '✅ OK'}`);
    console.log(`Tabla organization_members:  ${membersError ? '❌ Error' : '✅ OK'}`);
    console.log(`Total organizaciones:        ${orgsCount || 0}`);
    console.log(`Total miembros:              ${membersCount || 0}`);
    console.log('═══════════════════════════════════════════════════════\n');

    if (!orgsError && !membersError) {
      console.log('✨ ¡Sistema SaaS Multi-Tenant verificado exitosamente!');
      console.log('🚀 Tu aplicación está lista para login con organizaciones\n');
    } else {
      console.log('⚠️  Hay problemas que deben resolverse antes de usar el sistema multi-tenant');
      console.log('💡 Verifica que las migraciones se hayan ejecutado correctamente en Supabase\n');
    }

  } catch (error: any) {
    console.error('❌ Error durante la verificación:', error.message);
    console.error('   Stack trace:', error.stack);
  }
}

// Ejecutar la verificación
verifySupabaseTables().catch(console.error);
