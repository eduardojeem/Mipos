const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');

// Load env (prefer .env.local)
dotenv.config({ path: '.env.local' });
dotenv.config();

const prisma = new PrismaClient();

async function ensureRole(name, displayName, description) {
  return prisma.role.upsert({
    where: { name },
    update: {},
    create: { name, displayName, description, isActive: true }
  });
}

async function ensurePermission(resource, action, displayName, description) {
  const name = `${resource}:${action}`;
  return prisma.permission.upsert({
    where: { name },
    update: { isActive: true, displayName, description },
    create: { name, displayName, description, resource, action, isActive: true }
  });
}

async function ensureRolePermission(roleId, permissionId) {
  return prisma.rolePermission.upsert({
    where: { roleId_permissionId: { roleId, permissionId } },
    update: { isActive: true },
    create: { roleId, permissionId, isActive: true }
  });
}

async function main() {
  console.log('🔐 Asegurando permisos de Caja (cash)...');

  const admin = await ensureRole('ADMIN', 'Administrador', 'Acceso completo al sistema');
  const cashier = await ensureRole('CASHIER', 'Cajero', 'Operaciones de caja y ventas');

  const cashPerms = [
    { action: 'read', displayName: 'Ver Caja', description: 'Consultar sesión y movimientos de caja' },
    { action: 'open', displayName: 'Abrir Caja', description: 'Abrir sesión de caja' },
    { action: 'close', displayName: 'Cerrar Caja', description: 'Cerrar sesión de caja' },
    { action: 'move', displayName: 'Movimientos de Caja', description: 'Registrar movimientos de caja' },
  ];

  const created = [];
  for (const p of cashPerms) {
    const perm = await ensurePermission('cash', p.action, p.displayName, p.description);
    created.push(perm);
  }

  // Assign to ADMIN and CASHIER
  for (const perm of created) {
    await ensureRolePermission(admin.id, perm.id);
    await ensureRolePermission(cashier.id, perm.id);
  }

  console.log(`✅ Permisos de cash asegurados: ${created.map(p => p.name).join(', ')}`);

  // Quick verification output
  const cashPermissions = await prisma.permission.findMany({
    where: { resource: 'cash', isActive: true },
    orderBy: [{ action: 'asc' }]
  });
  console.log('📜 Permisos cash actuales:');
  cashPermissions.forEach(p => console.log(` - ${p.name}`));
}

main()
  .catch((e) => { console.error('❌ Error ajustando permisos de caja:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });