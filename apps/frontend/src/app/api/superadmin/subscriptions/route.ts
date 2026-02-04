import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { assertSuperAdmin } from '@/app/api/_utils/auth';

type SubscriptionRecord = {
  id: string;
  organization_id?: string | null;
  organizations?: { name?: string | null; owner_id?: string | null } | null;
  saas_plans?: { name?: string | null; price_monthly?: number | null; price_yearly?: number | null } | null;
  status?: string | null;
  billing_cycle?: 'monthly' | 'yearly' | string | null;
  current_period_end?: string | null;
  created_at?: string | null;
};

export async function GET(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const supabase = await createClient();
    const admin = await createAdminClient();

    // Obtener suscripciones
    const { data: subscriptions, error } = await supabase
      .from('saas_subscriptions')
      .select(`
        *,
        organizations (name, owner_id),
        saas_plans (name, price_monthly, price_yearly)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching subscriptions:', error);
      // Si la tabla no existe (migración pendiente), devolvemos array vacío sin error 500 para no romper la UI
      if (error.code === '42P01') { // undefined_table
        return NextResponse.json({ success: true, subscriptions: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Obtener emails de los dueños
    const ownerIds = Array.from(new Set(
      (subscriptions || [])
        .map((s: any) => s.organizations?.owner_id)
        .filter((id: any) => id)
    )) as string[];

    const userMap = new Map<string, string>();
    if (ownerIds.length > 0) {
      const { data: users } = await admin
        .from('users')
        .select('id, email')
        .in('id', ownerIds);
      users?.forEach((u: any) => { if (u.id && u.email) userMap.set(u.id, u.email) });
    }

    // Incluir organizaciones sin suscripción con estado 'UNASSIGNED'
    const { data: orgs } = await admin
      .from('organizations')
      .select('id, name, owner_id')
      .order('created_at', { ascending: false })

    const subOrgIds = new Set((subscriptions || []).map((s: any) => s.organization_id))
    const missingOrgs = (orgs || []).filter((o: any) => !subOrgIds.has(o.id))

    // Completar userMap con owners de organizaciones faltantes
    const extraOwnerIds = missingOrgs.map((o: any) => o.owner_id).filter((id: any) => id && !userMap.has(id))
    if (extraOwnerIds.length > 0) {
      const { data: extraUsers } = await admin
        .from('users')
        .select('id, email')
        .in('id', extraOwnerIds)
      extraUsers?.forEach((u: any) => { if (u.id && u.email) userMap.set(u.id, u.email) })
    }

    // Obtener miembros ADMIN o OWNER de todas las organizaciones relevantes
    const allOrgIds = [
      ...Array.from(subOrgIds),
      ...missingOrgs.map((o: any) => o.id)
    ]

    const adminsMap = new Map<string, string[]>();
    
    // Obtenemos el ID del rol ADMIN
    const { data: adminRole } = await admin.from('roles').select('id').eq('name', 'ADMIN').single();
    const adminRoleId = adminRole?.id;

    if (allOrgIds.length > 0) {
      let query = admin
        .from('organization_members')
        .select('organization_id, is_owner, user:users(email, full_name)')
        .in('organization_id', allOrgIds)

      if (adminRoleId) {
        // Filtrar por is_owner=true OR role_id=ADMIN_ROLE_ID
        // Nota: Supabase query builder OR syntax: .or(`is_owner.eq.true,role_id.eq.${adminRoleId}`)
        query = query.or(`is_owner.eq.true,role_id.eq.${adminRoleId}`)
      } else {
        query = query.eq('is_owner', true)
      }

      const { data: members } = await query;
      
      members?.forEach((m: any) => {
        if (!m.user?.email) return;
        const orgId = m.organization_id;
        const list = adminsMap.get(orgId) || [];
        // Evitar duplicados
        if (!list.includes(m.user.email)) {
          list.push(m.user.email);
        }
        adminsMap.set(orgId, list);
      });
    }

    // Transformar datos para el frontend
    const formattedSubscriptions = (subscriptions ?? []).map((sub: SubscriptionRecord) => {
      const ownerId = sub.organizations?.owner_id;
      const ownerEmail = ownerId ? userMap.get(ownerId) : null;
      const orgId = sub.organization_id || '';
      
      // Combinar email del owner (si existe) con los admins encontrados
      const admins = adminsMap.get(orgId) || [];
      const allEmails = new Set<string>();
      if (ownerEmail) allEmails.add(ownerEmail);
      admins.forEach(e => allEmails.add(e));

      return {
        id: sub.id,
        organizationId: sub.organization_id || null,
        organization: sub.organizations?.name || 'Organización desconocida',
        email: ownerEmail || (admins.length > 0 ? admins[0] : 'Sin email'),
        admins: Array.from(allEmails),
        plan: sub.saas_plans?.name?.toLowerCase() || 'custom',
        status: sub.status,
        amount: sub.billing_cycle === 'yearly' 
          ? sub.saas_plans?.price_yearly 
          : sub.saas_plans?.price_monthly,
        billingCycle: sub.billing_cycle,
        nextBilling: sub.current_period_end || new Date().toISOString(),
        startDate: sub.created_at
      };
    });

    const orgRows = missingOrgs.map((o: any) => {
      const ownerEmail = o.owner_id ? userMap.get(o.owner_id) : null;
      const admins = adminsMap.get(o.id) || [];
      const allEmails = new Set<string>();
      if (ownerEmail) allEmails.add(ownerEmail);
      admins.forEach(e => allEmails.add(e));

      return {
        id: `org-${o.id}`,
        organizationId: o.id,
        organization: o.name,
        email: ownerEmail || (admins.length > 0 ? admins[0] : 'Sin email'),
        admins: Array.from(allEmails),
        plan: 'sin plan',
        status: 'UNASSIGNED',
        amount: null,
        billingCycle: null,
        nextBilling: null,
        startDate: null,
      }
    })

    return NextResponse.json({
      success: true,
      subscriptions: [...formattedSubscriptions, ...orgRows]
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
