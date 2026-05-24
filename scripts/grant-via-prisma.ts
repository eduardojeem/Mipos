import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Starting execute permissions grant script via Prisma...\n')

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
    `NOTIFY pgrst, 'reload schema';`
  ]

  for (const sql of grants) {
    try {
      console.log(`Executing: ${sql}`)
      await prisma.$executeRawUnsafe(sql)
      console.log('✅ Success')
    } catch (err: any) {
      console.error(`❌ Failed: ${err.message}`)
    }
  }

  console.log('\n🎉 Finished applying all grants via Prisma.')
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
