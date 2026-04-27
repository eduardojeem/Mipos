import { prisma } from '../index';

async function migrateUsersToOrganization() {
  console.log('🔄 Iniciando migración de usuarios a organizaciones...');
  
  try {
    // 1. Obtener o crear organización por defecto
    let defaultOrg = await prisma.organization.findFirst({
      where: { slug: 'default' }
    });
    
    if (!defaultOrg) {
      defaultOrg = await prisma.organization.create({
        data: {
          name: 'Organización Principal',
          slug: 'default',
          status: 'ACTIVE'
        }
      });
      console.log('✅ Organización por defecto creada:', defaultOrg.id);
    } else {
      console.log('✅ Organización por defecto encontrada:', defaultOrg.id);
    }
    
    // 2. Contar usuarios sin organización
    const usersWithoutOrg = await prisma.user.findMany({
      where: { organizationId: null },
      select: { id: true, email: true, fullName: true }
    });
    
    console.log(`📊 Usuarios sin organización: ${usersWithoutOrg.length}`);
    
    if (usersWithoutOrg.length === 0) {
      console.log('✅ Todos los usuarios ya tienen organización asignada');
      return;
    }
    
    // 3. Asignar usuarios sin organización a la organización por defecto
    let updated = 0;
    for (const user of usersWithoutOrg) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { organizationId: defaultOrg.id }
        });
        updated++;
        console.log(`  ✓ ${user.fullName} (${user.email})`);
      } catch (error) {
        console.error(`  ✗ Error actualizando ${user.email}:`, error);
      }
    }
    
    console.log(`\n✅ Migración completada: ${updated}/${usersWithoutOrg.length} usuarios actualizados`);
    
    // 4. Verificar resultado
    const remainingWithoutOrg = await prisma.user.count({
      where: { organizationId: null }
    });
    
    if (remainingWithoutOrg > 0) {
      console.warn(`⚠️ Advertencia: ${remainingWithoutOrg} usuarios aún sin organización`);
    } else {
      console.log('✅ Todos los usuarios tienen organización asignada');
    }
    
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    throw error;
  }
}

// Ejecutar migración
migrateUsersToOrganization()
  .catch((error) => {
    console.error('❌ Migración fallida:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
