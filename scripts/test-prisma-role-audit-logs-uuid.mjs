import pkg from '@prisma/client'
import crypto from 'crypto'
const { PrismaClient } = pkg

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Iniciando verificación de role_audit_logs con Prisma (UUID y NULL)')

  // Obtener un usuario válido
  const users = await prisma.$queryRaw`SELECT id FROM public.users LIMIT 1;`
  if (!users || users.length === 0) {
    throw new Error('No se encontró ningún usuario en public.users')
  }
  const userId = users[0].id
  console.log('👤 Usando user_id:', userId)

  // Generar UUID para resource_id
  const resourceUuid = crypto.randomUUID()
  console.log('🆔 UUID generado para resource_id:', resourceUuid)

  // Inserción 1: resource_id como UUID
  const insertedWithUuid = await prisma.$queryRaw`
    INSERT INTO public.role_audit_logs (
      user_id, action, resource_type, resource_id, old_values, new_values, performed_by, ip_address, user_agent
    ) VALUES (
      ${userId}::uuid, 'ASSIGN', 'role', ${resourceUuid}::uuid, ${JSON.stringify({ from: 'CASHIER' })}::jsonb, ${JSON.stringify({ to: 'MANAGER' })}::jsonb, ${userId}::uuid, '127.0.0.1'::inet, 'PrismaTest'
    )
    RETURNING id;
  `
  const idWithUuid = insertedWithUuid[0]?.id
  console.log('✅ Insertado con UUID, id:', idWithUuid)

  // Inserción 2: resource_id como NULL
  const insertedWithNull = await prisma.$queryRaw`
    INSERT INTO public.role_audit_logs (
      user_id, action, resource_type, resource_id, old_values, new_values, performed_by, ip_address, user_agent
    ) VALUES (
      ${userId}::uuid, 'ASSIGN', 'role', NULL, ${JSON.stringify({ from: 'VIEWER' })}::jsonb, ${JSON.stringify({ to: 'CASHIER' })}::jsonb, ${userId}::uuid, '127.0.0.1'::inet, 'PrismaTest'
    )
    RETURNING id;
  `
  const idWithNull = insertedWithNull[0]?.id
  console.log('✅ Insertado con NULL, id:', idWithNull)

  // Limpieza
  if (idWithUuid) {
    await prisma.$executeRawUnsafe(`DELETE FROM public.role_audit_logs WHERE id = '${idWithUuid}'`)
    console.log('🧹 Eliminado registro con UUID:', idWithUuid)
  }
  if (idWithNull) {
    await prisma.$executeRawUnsafe(`DELETE FROM public.role_audit_logs WHERE id = '${idWithNull}'`)
    console.log('🧹 Eliminado registro con NULL:', idWithNull)
  }

  console.log('🎉 Verificación completada: role_audit_logs acepta UUID y NULL en resource_id')
}

main()
  .catch((e) => {
    console.error('❌ Error durante la verificación:', e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })