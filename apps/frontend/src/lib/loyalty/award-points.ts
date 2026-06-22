type LoyaltyProgramRow = {
  id: string
  points_per_purchase?: number | null
  minimum_purchase?: number | null
}

type CustomerLoyaltyRow = {
  id: string
  current_points?: number | null
  total_points_earned?: number | null
  total_points_redeemed?: number | null
  current_tier_id?: string | null
}

type LoyaltyTierRow = {
  id: string
  min_points?: number | null
  multiplier?: number | null
}

type AwardAppointmentLoyaltyPointsInput = {
  admin: any
  orgId: string
  customerId: string | null
  saleId: string
  appointmentId: string
  serviceName: string
  paymentMethod: string
  purchaseAmount: number
  userId?: string | null
}

export async function awardAppointmentLoyaltyPoints(input: AwardAppointmentLoyaltyPointsInput) {
  const amount = Number(input.purchaseAmount || 0)
  if (!input.customerId || !(amount > 0)) {
    return { awarded: false as const, reason: 'missing-customer-or-amount' }
  }

  const { data: program } = await input.admin
    .from('loyalty_programs')
    .select('id, points_per_purchase, minimum_purchase')
    .eq('organization_id', input.orgId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!program?.id) {
    return { awarded: false as const, reason: 'no-active-program' }
  }

  let loyaltyRecord: CustomerLoyaltyRow | null = null

  const { data: existingLoyalty } = await input.admin
    .from('customer_loyalty')
    .select('id, current_points, total_points_earned, total_points_redeemed, current_tier_id')
    .eq('customer_id', input.customerId)
    .eq('program_id', program.id)
    .maybeSingle()

  loyaltyRecord = existingLoyalty ?? null

  if (!loyaltyRecord) {
    const now = new Date().toISOString()
    const { data: created, error: insertError } = await input.admin
      .from('customer_loyalty')
      .insert({
        customer_id: input.customerId,
        program_id: program.id,
        current_points: 0,
        total_points_earned: 0,
        total_points_redeemed: 0,
        enrollment_date: now,
        last_activity_date: now,
        created_at: now,
        updated_at: now,
      })
      .select('id, current_points, total_points_earned, total_points_redeemed, current_tier_id')
      .single()

    if (insertError) {
      const { data: fallback } = await input.admin
        .from('customer_loyalty')
        .select('id, current_points, total_points_earned, total_points_redeemed, current_tier_id')
        .eq('customer_id', input.customerId)
        .eq('program_id', program.id)
        .maybeSingle()

      loyaltyRecord = fallback ?? null
    } else {
      loyaltyRecord = created
    }
  }

  if (!loyaltyRecord?.id) {
    return { awarded: false as const, reason: 'loyalty-enrollment-failed' }
  }

  const { data: existingTx } = await input.admin
    .from('points_transactions')
    .select('id, points')
    .eq('customer_loyalty_id', loyaltyRecord.id)
    .eq('program_id', program.id)
    .eq('reference_type', 'SALE')
    .eq('reference_id', input.saleId)
    .maybeSingle()

  if (existingTx?.id) {
    return {
      awarded: false as const,
      reason: 'already-awarded',
      programId: program.id,
      customerLoyaltyId: loyaltyRecord.id,
      points: Number(existingTx.points || 0),
    }
  }

  let multiplier = 1
  if (loyaltyRecord.current_tier_id) {
    const { data: currentTier } = await input.admin
      .from('loyalty_tiers')
      .select('multiplier')
      .eq('id', loyaltyRecord.current_tier_id)
      .maybeSingle()

    multiplier = Number(currentTier?.multiplier || 1)
  }

  const minimumPurchase = Number(program.minimum_purchase || 0)
  const pointsPerPurchase = Number(program.points_per_purchase || 0)
  const points = amount >= minimumPurchase ? Math.floor(amount * pointsPerPurchase * multiplier) : 0

  if (!(points > 0)) {
    return {
      awarded: false as const,
      reason: 'no-points-earned',
      programId: program.id,
      customerLoyaltyId: loyaltyRecord.id,
      points: 0,
    }
  }

  const nextTotalEarned = Number(loyaltyRecord.total_points_earned || 0) + points
  const nextCurrentPoints = Number(loyaltyRecord.current_points || 0) + points
  const now = new Date().toISOString()

  const { data: tiers } = await input.admin
    .from('loyalty_tiers')
    .select('id, min_points, multiplier')
    .eq('program_id', program.id)
    .eq('is_active', true)
    .order('min_points', { ascending: true })

  let nextTierId = loyaltyRecord.current_tier_id || null
  for (const tier of (tiers || []) as LoyaltyTierRow[]) {
    if (nextTotalEarned >= Number(tier.min_points || 0)) {
      nextTierId = tier.id
    }
  }

  const { error: updateError } = await input.admin
    .from('customer_loyalty')
    .update({
      current_points: nextCurrentPoints,
      total_points_earned: nextTotalEarned,
      current_tier_id: nextTierId,
      last_activity_date: now,
      updated_at: now,
    })
    .eq('id', loyaltyRecord.id)

  if (updateError) {
    throw new Error(updateError.message || 'No se pudo actualizar loyalty del cliente')
  }

  const { error: txError } = await input.admin
    .from('points_transactions')
    .insert({
      customer_loyalty_id: loyaltyRecord.id,
      program_id: program.id,
      type: 'EARNED',
      points,
      description: `Puntos por servicio: ${input.serviceName}`,
      reference_type: 'SALE',
      reference_id: input.saleId,
      sale_id: input.saleId,
      created_at: now,
      created_by: input.userId || null,
      metadata: {
        source: 'APPOINTMENT',
        appointmentId: input.appointmentId,
        paymentMethod: input.paymentMethod,
        purchaseAmount: amount,
      },
    })

  if (txError) {
    throw new Error(txError.message || 'No se pudo registrar la transacción de puntos')
  }

  return {
    awarded: true as const,
    reason: 'awarded',
    programId: program.id,
    customerLoyaltyId: loyaltyRecord.id,
    points,
  }
}
