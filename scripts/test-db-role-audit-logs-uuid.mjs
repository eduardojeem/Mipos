import 'dotenv/config'
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
import pg from 'pg'
import crypto from 'crypto'

const { Pool } = pg

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('❌ DATABASE_URL no está definido en el entorno')
  process.exit(1)
}

const pool = new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false, requestCert: true } })

async function main() {
  console.log('🔍 Verificando role_audit_logs directamente en Postgres (UUID y NULL)')

  const client = await pool.connect()
  try {
    // Obtener un usuario válido
    const userRes = await client.query('SELECT id FROM public.users LIMIT 1')
    if (!userRes.rows.length) throw new Error('No se encontró ningún usuario en public.users')
    const userId = userRes.rows[0].id
    console.log('👤 Usando user_id:', userId)

    const resourceUuid = crypto.randomUUID()
    console.log('🆔 UUID generado para resource_id:', resourceUuid)

    // Inserción 1: UUID
    const insertUuidRes = await client.query(
      `INSERT INTO public.role_audit_logs (
        user_id, action, resource_type, resource_id, old_values, new_values, performed_by, ip_address, user_agent
      ) VALUES (
        $1::uuid, 'ASSIGN', 'role', $2::uuid, $3::jsonb, $4::jsonb, $1::uuid, '127.0.0.1'::inet, 'DBTest'
      ) RETURNING id`,
      [userId, resourceUuid, JSON.stringify({ from: 'CASHIER' }), JSON.stringify({ to: 'MANAGER' })]
    )
    const idWithUuid = insertUuidRes.rows[0]?.id
    console.log('✅ Insertado con UUID, id:', idWithUuid)

    // Inserción 2: NULL
    const insertNullRes = await client.query(
      `INSERT INTO public.role_audit_logs (
        user_id, action, resource_type, resource_id, old_values, new_values, performed_by, ip_address, user_agent
      ) VALUES (
        $1::uuid, 'ASSIGN', 'role', NULL, $2::jsonb, $3::jsonb, $1::uuid, '127.0.0.1'::inet, 'DBTest'
      ) RETURNING id`,
      [userId, JSON.stringify({ from: 'VIEWER' }), JSON.stringify({ to: 'CASHIER' })]
    )
    const idWithNull = insertNullRes.rows[0]?.id
    console.log('✅ Insertado con NULL, id:', idWithNull)

    // Limpieza
    if (idWithUuid) {
      await client.query('DELETE FROM public.role_audit_logs WHERE id = $1', [idWithUuid])
      console.log('🧹 Eliminado registro con UUID:', idWithUuid)
    }
    if (idWithNull) {
      await client.query('DELETE FROM public.role_audit_logs WHERE id = $1', [idWithNull])
      console.log('🧹 Eliminado registro con NULL:', idWithNull)
    }

    console.log('🎉 Verificación directa completada: role_audit_logs acepta UUID y NULL en resource_id')
  } catch (e) {
    console.error('❌ Error durante la verificación directa:', e)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

main()