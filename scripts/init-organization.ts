/**
 * Script para crear la organización inicial y asignar el primer usuario
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function initializeOrganization() {
  console.log('🚀 Inicializando organización por defecto...\n');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Variables de entorno no configuradas');
    console.log('   Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY\n');
    process.exit(1);
  }

  // Usar service role para tener permisos completos
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // 1. Verificar si ya existe alguna organización
    const { data: existingOrgs, error: checkError } = await supabase
      .from('organizations')
      .select('*')
      .limit(1);

    if (checkError) {
      throw checkError;
    }

    if (existingOrgs && existingOrgs.length > 0) {
      console.log('ℹ️  Ya existe una organización:');
      console.log(`   - Nombre: ${existingOrgs[0].name}`);
      console.log(`   - Slug: ${existingOrgs[0].slug}`);
      console.log(`   - Plan: ${existingOrgs[0].subscription_plan}`);
      console.log(`   - ID: ${existingOrgs[0].id}\n`);
      
      const shouldContinue = process.argv.includes('--force');
      if (!shouldContinue) {
        console.log('💡 Usa --force para crear otra organización de todos modos\n');
        return;
      }
    }

    // 2. Crear organización
    console.log('📝 Creando nueva organización...');
    
    const orgName = process.env.ORG_NAME || 'MiPOS - Organización Principal';
    const orgSlug = process.env.ORG_SLUG || 'mipos-main';
    const orgPlan = process.env.ORG_PLAN || 'ENTERPRISE';

    const { data: newOrg, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: orgName,
        slug: orgSlug,
        subscription_plan: orgPlan,
        subscription_status: 'ACTIVE',
        settings: {
          currency: 'USD',
          timezone: 'America/Santiago',
          tax_enabled: true,
          tax_rate: 19
        }
      })
      .select()
      .single();

    if (orgError) {
      if (orgError.code === '23505') { // Unique violation
        console.error('❌ Error: Ya existe una organización con ese slug');
        console.log('   Usa un slug diferente con: ORG_SLUG=otro-slug npm run init:org\n');
      } else {
        throw orgError;
      }
      process.exit(1);
    }

    console.log('✅ Organización creada exitosamente!');
    console.log(`   - ID: ${newOrg.id}`);
    console.log(`   - Nombre: ${newOrg.name}`);
    console.log(`   - Slug: ${newOrg.slug}`);
    console.log(`   - Plan: ${newOrg.subscription_plan}\n`);

    // 3. Buscar usuario admin para asignar
    const adminEmail = process.env.ADMIN_EMAIL;
    
    if (adminEmail) {
      console.log(`🔍 Buscando usuario: ${adminEmail}...`);
      
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('email', adminEmail)
        .limit(1);

      if (userError) {
        console.warn('⚠️  Error al buscar usuario:', userError.message);
      } else if (users && users.length > 0) {
        const user = users[0];
        console.log(`✅ Usuario encontrado: ${user.full_name || user.email}`);
        
        // Asignar usuario a la organización
        console.log('📝 Asignando usuario como propietario...');
        
        const { error: memberError } = await supabase
          .from('organization_members')
          .insert({
            organization_id: newOrg.id,
            user_id: user.id,
            role_id: 'ADMIN',
            is_owner: true
          });

        if (memberError) {
          if (memberError.code === '23505') {
            console.log('ℹ️  Usuario ya está asignado a esta organización');
          } else {
            console.warn('⚠️  Error al asignar usuario:', memberError.message);
          }
        } else {
          console.log('✅ Usuario asignado exitosamente como propietario\n');
        }
      } else {
        console.log('ℹ️  Usuario no encontrado. Regístralo primero y luego asígnalo.\n');
      }
    } else {
      console.log('💡 Para asignar un usuario automáticamente, usa:');
      console.log('   ADMIN_EMAIL=tu@email.com npm run init:org\n');
    }

    // 4. Resumen
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 ¡Organización inicializada exitosamente!');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`\n📋 Detalles de la organización:`);
    console.log(`   Nombre: ${newOrg.name}`);
    console.log(`   Slug: ${newOrg.slug}`);
    console.log(`   URL de acceso: /auth/signin?org=${newOrg.slug}`);
    console.log(`   Plan: ${newOrg.subscription_plan}`);
    console.log(`\n🚀 Ahora puedes:`);
    console.log(`   1. Registrar usuarios en /auth/signup`);
    console.log(`   2. Asignarlos a esta organización`);
    console.log(`   3. Hacer login y seleccionar la organización\n`);

  } catch (error: any) {
    console.error('❌ Error durante la inicialización:', error.message);
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Ejecutar
initializeOrganization().catch(console.error);
