import { Client } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const connectionString = process.env.DATABASE_URL || process.env.DIRECT_DATABASE_URL

if (!connectionString) {
  console.error('❌ DATABASE_URL/DIRECT_DATABASE_URL not configured in .env.local')
  process.exit(1)
}

async function main() {
  console.log('🔗 Connecting to PostgreSQL directly using pg...')
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })
  
  await client.connect()
  console.log('✅ Connection established.')

  const grants = [
    // RLS / Multi-tenant helpers
    `GRANT EXECUTE ON FUNCTION public.get_my_org_ids() TO authenticated, anon;`,
    `GRANT EXECUTE ON FUNCTION public.get_user_org_ids() TO authenticated, anon;`,
    `GRANT EXECUTE ON FUNCTION public.belongs_to_org(uuid) TO authenticated, anon;`,
    `GRANT EXECUTE ON FUNCTION public.current_user_org_ids() TO authenticated, anon;`,
    
    // RBAC / Role helpers
    `GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, anon;`,
    `GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;`,
    `GRANT EXECUTE ON FUNCTION public.is_org_owner(uuid) TO authenticated, anon;`,
    `GRANT EXECUTE ON FUNCTION public.has_permission(text, text) TO authenticated, anon;`,
    `GRANT EXECUTE ON FUNCTION public.get_user_permissions(uuid) TO authenticated, anon;`,
    
    // Company / SaaS limit helpers
    `GRANT EXECUTE ON FUNCTION public.company_plan_has_feature(uuid, text) TO authenticated, anon;`,
    `GRANT EXECUTE ON FUNCTION public.get_company_limits(uuid) TO authenticated, anon;`,
    `GRANT EXECUTE ON FUNCTION public.get_user_company_permissions(uuid, uuid) TO authenticated, anon;`,
    `GRANT EXECUTE ON FUNCTION public.user_has_company_permission(uuid, text, uuid) TO authenticated, anon;`,
    
    // Reload PostgREST schema cache
    `DO $$ BEGIN PERFORM pg_notify('pgrst', 'reload schema'); END $$;`
  ]

  console.log('\n🛠️  Applying function execution grants directly...')
  try {
    for (const sql of grants) {
      console.log(`Executing: ${sql}`)
      await client.query(sql)
    }
    console.log('\n🎉 Finished applying all function execution grants successfully!')
  } catch (err: any) {
    console.error('\n❌ Error applying grants:', err.message)
    console.error(err)
  } finally {
    await client.end()
    console.log('🔌 Disconnected.')
  }
}

main().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
