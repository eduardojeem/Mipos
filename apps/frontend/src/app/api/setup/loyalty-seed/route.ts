import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function sample<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)] }
function chance(p: number) { return Math.random() < p }

export async function POST(_request: NextRequest) {
  try {
    const admin = createAdminClient()

    const alterSql: string[] = [
      `alter table if exists customers add column if not exists phone text;`,
      `alter table if exists customers add column if not exists email text;`,
      `alter table if exists customers add column if not exists created_at timestamptz default now();`,
      `alter table if exists loyalty_rewards add column if not exists image_url text;`,
      `alter table if exists loyalty_rewards add column if not exists valid_from timestamptz;`,
      `alter table if exists loyalty_rewards add column if not exists valid_until timestamptz;`,
      `alter table if exists points_transactions add column if not exists purchase_amount numeric;`,
      `alter table if exists points_transactions add column if not exists store_id text;`,
      `create index if not exists idx_points_transactions_customer on points_transactions(customer_loyalty_id);`,
      `create index if not exists idx_points_transactions_created on points_transactions(created_at);`,
      `create index if not exists idx_points_transactions_type on points_transactions(type);`,
      `create index if not exists idx_customer_loyalty_points on customer_loyalty(current_points);`,
      `create index if not exists idx_loyalty_rewards_points_cost on loyalty_rewards(points_cost);`,
      `create index if not exists idx_customers_email on customers(email);`,
      `create index if not exists idx_customers_name on customers(name);`
    ]

    const alterResults: any[] = []
    for (const sql of alterSql) {
      try {
        const { error } = await (admin as any).rpc('exec_sql', { sql })
        alterResults.push({ sql, ok: !error, error: error?.message })
      } catch (e: any) {
        alterResults.push({ sql, ok: false, error: e?.message })
      }
    }

    const { data: existingPrograms } = await (admin as any)
      .from('loyalty_programs')
      .select('id, name')
      .eq('name', 'Programa Fidelización')
      .limit(1)
    let programId: string | null = existingPrograms?.[0]?.id ?? null
    if (!programId) {
      const now = new Date().toISOString()
      const { data: created } = await (admin as any)
        .from('loyalty_programs')
        .insert({
          name: 'Programa Fidelización',
          description: 'Programa estándar',
          points_per_purchase: 1,
          minimum_purchase: 0,
          welcome_bonus: 0,
          birthday_bonus: 0,
          referral_bonus: 0,
          points_expiration_days: null,
          is_active: true,
          created_at: now,
          updated_at: now,
        })
        .select('id')
        .single()
      programId = created?.id ?? null
    }

    const tierDefs = [
      { name: 'Bronce', min_points: 0, multiplier: 1.0, color: '#CD7F32' },
      { name: 'Plata', min_points: 500, multiplier: 1.25, color: '#C0C0C0' },
      { name: 'Oro', min_points: 1500, multiplier: 1.5, color: '#FFD700' },
    ]
    if (programId) {
      const { data: existingTiers } = await (admin as any)
        .from('loyalty_tiers')
        .select('id, name')
        .eq('program_id', programId)
      const existingNames = new Set((existingTiers || []).map((t: any) => String(t.name)))
      const toInsert = tierDefs.filter(t => !existingNames.has(t.name)).map(t => ({
        program_id: programId,
        name: t.name,
        min_points: t.min_points,
        multiplier: t.multiplier,
        benefits: null,
        color: t.color,
        is_active: true,
      }))
      if (toInsert.length) {
        await (admin as any).from('loyalty_tiers').insert(toInsert)
      }
    }

    const namesA = ['Carlos','María','José','Ana','Luis','Laura','Jorge','Marta','Pedro','Lucía']
    const namesB = ['García','Martínez','López','Hernández','González','Pérez','Rodríguez','Sánchez','Ramírez','Cruz']
    const newCustomers: any[] = []
    for (let i = 0; i < 20; i++) {
      const fullName = `${sample(namesA)} ${sample(namesB)}`
      newCustomers.push({
        name: fullName,
        email: `user${String(i).padStart(3,'0')}@demo.com`,
        phone: `+52 ${String(rand(10,99)).padStart(2,'0')}${String(rand(10000000,99999999))}`,
        created_at: new Date(Date.now() - rand(0, 365) * 86400000).toISOString(),
        is_active: true,
      })
    }
    await (admin as any).from('customers').insert(newCustomers)

    const { data: customersAll } = await (admin as any).from('customers').select('id').order('created_at', { ascending: false }).limit(50)
    const { data: tiersAll } = programId ? await (admin as any).from('loyalty_tiers').select('id, min_points').eq('program_id', programId) : { data: [] }
    const tierSorted = (tiersAll || []).sort((a: any, b: any) => (a.min_points || 0) - (b.min_points || 0))
    const enrollRows: any[] = []
    for (const c of (customersAll || [])) {
      const earned = rand(100, 3000)
      const redeemed = rand(0, Math.min(earned, 1500))
      let currentTierId: string | null = null
      for (const t of tierSorted) {
        if (earned >= (t.min_points || 0)) currentTierId = t.id
      }
      enrollRows.push({
        customer_id: String(c.id),
        program_id: programId,
        current_points: Math.max(0, earned - redeemed),
        total_points_earned: earned,
        total_points_redeemed: redeemed,
        current_tier_id: currentTierId,
        enrollment_date: new Date(Date.now() - rand(0, 365) * 86400000).toISOString(),
      })
    }
    const { error: enrollErr } = await (admin as any).from('customer_loyalty').insert(enrollRows)

    const rewardDefs = [
      { name: '10% Descuento', description: 'Descuento del 10%', type: 'DISCOUNT_PERCENTAGE', value: 10, points_cost: 100 },
      { name: '15% Descuento', description: 'Descuento del 15%', type: 'DISCOUNT_PERCENTAGE', value: 15, points_cost: 150 },
      { name: '$50 Descuento', description: 'Descuento fijo', type: 'DISCOUNT_FIXED', value: 50, points_cost: 250 },
      { name: '$100 Descuento', description: 'Descuento fijo', type: 'DISCOUNT_FIXED', value: 100, points_cost: 500 },
    ]
    if (programId) {
      const { data: existingRewards } = await (admin as any).from('loyalty_rewards').select('id, name').eq('program_id', programId)
      const existingRewardNames = new Set((existingRewards || []).map((r: any) => String(r.name)))
      const toInsertRewards = rewardDefs.filter(r => !existingRewardNames.has(r.name)).map(r => ({
        program_id: programId,
        name: r.name,
        description: r.description,
        type: r.type,
        value: r.value,
        points_cost: r.points_cost,
        is_active: true,
        created_at: new Date().toISOString(),
      }))
      if (toInsertRewards.length) await (admin as any).from('loyalty_rewards').insert(toInsertRewards)
    }

    const { data: enrollments } = await (admin as any).from('customer_loyalty').select('id, program_id').limit(50)
    const txRows: any[] = []
    for (const cl of (enrollments || [])) {
      for (let i = 0; i < rand(2, 6); i++) {
        const isRedeemed = chance(0.3)
        txRows.push({
          customer_loyalty_id: cl.id,
          program_id: cl.program_id,
          type: isRedeemed ? 'REDEEMED' : 'EARNED',
          points: isRedeemed ? rand(50, 400) : rand(50, 250),
          description: isRedeemed ? 'Canje en compra' : 'Puntos por compra',
          purchase_amount: rand(20, 250),
          store_id: `SUC-${String(rand(1,6)).padStart(3,'0')}`,
          created_at: new Date(Date.now() - rand(0, 365) * 86400000).toISOString(),
        })
      }
    }
    let txErr: any = null
    if (txRows.length) {
      const { error } = await (admin as any).from('points_transactions').insert(txRows)
      txErr = error
    }

    const checkPrograms = await (admin as any).from('loyalty_programs').select('id').limit(1)
    if (!Array.isArray(checkPrograms?.data) || checkPrograms.data.length === 0) {
      const sql = `
        insert into loyalty_programs (id, name, description, points_per_purchase, minimum_purchase, is_active)
        select gen_random_uuid(), 'Programa Fidelización', 'Programa estándar', 1, 0, true
        where not exists (select 1 from loyalty_programs where name='Programa Fidelización');

        with p as (select id from loyalty_programs where name='Programa Fidelización')
        insert into loyalty_tiers (id, program_id, name, min_points, multiplier, benefits, color, is_active)
        select gen_random_uuid(), p.id, t.name, t.min_points, t.multiplier, null, t.color, true
        from p, (values ('Bronce',0,1.0,'#CD7F32'),('Plata',500,1.25,'#C0C0C0'),('Oro',1500,1.5,'#FFD700')) as t(name,min_points,multiplier,color)
        on conflict do nothing;

        with p as (select id from loyalty_programs where name='Programa Fidelización')
        insert into loyalty_rewards (id, program_id, name, description, type, value, points_cost, max_redemptions, current_redemptions, valid_from, valid_until, is_active)
        select gen_random_uuid(), p.id, r.name, r.description, r.type, r.value, r.points_cost, null, 0,
               now() - ((random()*60)::int) * interval '1 day',
               case when random()<0.3 then now() + ((random()*90)::int) * interval '1 day' else null end,
               true
        from p, (values 
          ('10% Descuento','Descuento del 10%','DISCOUNT_PERCENTAGE',10,100),
          ('15% Descuento','Descuento del 15%','DISCOUNT_PERCENTAGE',15,150),
          ('$50 Descuento','Descuento fijo','DISCOUNT_FIXED',50,250),
          ('$100 Descuento','Descuento fijo','DISCOUNT_FIXED',100,500)
        ) as r(name,description,type,value,points_cost)
        on conflict do nothing;

        with p as (select id from loyalty_programs where name='Programa Fidelización')
        insert into customer_loyalty (id, customer_id, program_id, current_points, total_points_earned, total_points_redeemed, enrollment_date)
        select gen_random_uuid(), c.id, p.id,
               floor(random()*3000)::int,
               floor(random()*3500)::int,
               floor(random()*1500)::int,
               now() - ((random()*365)::int) * interval '1 day'
        from customers c, p
        order by random()
        limit 30;

        insert into points_transactions (id, customer_loyalty_id, program_id, type, points, description, purchase_amount, store_id, created_at)
        select gen_random_uuid(), cl.id, cl.program_id,
               case when random()<0.3 then 'REDEEMED' else 'EARNED' end,
               case when random()<0.3 then floor(random()*400)::int else floor(random()*250)::int end,
               case when random()<0.3 then 'Canje en compra' else 'Puntos por compra' end,
               floor(20 + random()*230),
               (array['SUC-001','SUC-002','SUC-003','SUC-004','SUC-005','SUC-006'])[ceil(random()*6)],
               now() - ((random()*365)::int) * interval '1 day'
        from customer_loyalty cl
        order by random()
        limit 120;
      `
      await (admin as any).rpc('exec_sql', { sql })
    }

    const [programs, tiers, rewards, customers, cl, tx] = await Promise.all([
      (admin as any).from('loyalty_programs').select('id, name').order('created_at', { ascending: false }),
      (admin as any).from('loyalty_tiers').select('id, name, program_id'),
      (admin as any).from('loyalty_rewards').select('id, name, points_cost'),
      (admin as any).from('customers').select('id').limit(200),
      (admin as any).from('customer_loyalty').select('id').limit(200),
      (admin as any).from('points_transactions').select('id').limit(500),
    ])

    return NextResponse.json({
      success: true,
      alters: alterResults,
      counts: {
        programs: (programs?.data || []).length,
        tiers: (tiers?.data || []).length,
        rewards: (rewards?.data || []).length,
        customers: (customers?.data || []).length,
        customer_loyalty: (cl?.data || []).length,
        transactions: (tx?.data || []).length,
      },
      errors: {
        enrollErr: enrollErr?.message || null,
        txErr: txErr?.message || null,
      },
      sampleProgram: (programs?.data || [])[0] || null
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, stage: 'unexpected', error: error?.message || 'Internal error' }, { status: 500 })
  }
}