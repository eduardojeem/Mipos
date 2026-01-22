import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export interface LoyaltyProgramConfig {
  name: string;
  description?: string;
  pointsPerPurchase: number;
  minimumPurchase: number;
  pointsExpirationDays?: number;
  welcomeBonus: number;
  birthdayBonus: number;
  referralBonus: number;
}

export interface LoyaltyTierConfig {
  name: string;
  minPoints: number;
  maxPoints?: number;
  multiplier: number;
  benefits?: string;
  color?: string;
}

export interface RewardConfig {
  name: string;
  description?: string;
  type: 'DISCOUNT_PERCENTAGE' | 'DISCOUNT_FIXED' | 'FREE_PRODUCT' | 'FREE_SHIPPING' | 'CUSTOM';
  value: number;
  pointsCost: number;
  maxRedemptions?: number;
  validFrom?: Date;
  validUntil?: Date;
  terms?: string;
  productId?: string;
  categoryId?: string;
  minPurchase?: number;
}

export class LoyaltyService {
  // Program Management
  async createLoyaltyProgram(config: LoyaltyProgramConfig) {
    return await prisma.loyaltyProgram.create({
      data: {
        name: config.name,
        description: config.description,
        pointsPerPurchase: config.pointsPerPurchase,
        minimumPurchase: config.minimumPurchase,
        pointsExpirationDays: config.pointsExpirationDays,
        welcomeBonus: config.welcomeBonus,
        birthdayBonus: config.birthdayBonus,
        referralBonus: config.referralBonus,
      },
    });
  }

  async getLoyaltyPrograms() {
    return await prisma.loyaltyProgram.findMany({
      where: { isActive: true },
      include: {
        tiers: {
          orderBy: { minPoints: 'asc' }
        },
        rewards: {
          where: { isActive: true },
          orderBy: { pointsCost: 'asc' }
        },
        _count: {
          select: { customerLoyalties: true }
        }
      },
    });
  }

  async updateLoyaltyProgram(programId: string, config: Partial<LoyaltyProgramConfig>) {
    return await prisma.loyaltyProgram.update({
      where: { id: programId },
      data: config,
    });
  }

  // Tier Management
  async createLoyaltyTier(programId: string, config: LoyaltyTierConfig) {
    return await prisma.loyaltyTier.create({
      data: {
        programId,
        name: config.name,
        minPoints: config.minPoints,
        maxPoints: config.maxPoints,
        multiplier: config.multiplier,
        benefits: config.benefits,
        color: config.color || '#6B7280',
      },
    });
  }

  async getLoyaltyTiers(programId: string) {
    return await prisma.loyaltyTier.findMany({
      where: { programId },
      orderBy: { minPoints: 'asc' },
    });
  }

  async updateLoyaltyTier(tierId: string, config: Partial<LoyaltyTierConfig>) {
    const existing = await prisma.loyaltyTier.findUnique({ where: { id: tierId } });
    if (!existing) throw new Error('Nivel de lealtad no encontrado');

    // Validate unique name within program if name changes
    if (config.name && config.name !== existing.name) {
      const dup = await prisma.loyaltyTier.findFirst({
        where: { programId: existing.programId, name: config.name },
      });
      if (dup) throw new Error('Ya existe un nivel con ese nombre en el programa');
    }

    // Validate range overlaps if min/max provided
    const newMin = config.minPoints ?? existing.minPoints;
    const newMax = config.maxPoints ?? existing.maxPoints;
    const tiers = await prisma.loyaltyTier.findMany({
      where: { programId: existing.programId, id: { not: tierId } },
      orderBy: { minPoints: 'asc' },
    });
    const overlaps = tiers.some(t => {
      const tMin = t.minPoints;
      const tMax = t.maxPoints ?? Number.POSITIVE_INFINITY;
      const nMax = newMax ?? Number.POSITIVE_INFINITY;
      return !(newMin > tMax || nMax < tMin); // intervals intersect
    });
    if (overlaps) throw new Error('Rango de puntos se solapa con otros niveles');

    return await prisma.loyaltyTier.update({
      where: { id: tierId },
      data: {
        name: config.name ?? existing.name,
        minPoints: newMin,
        maxPoints: newMax,
        multiplier: config.multiplier ?? existing.multiplier,
        benefits: config.benefits ?? existing.benefits,
        color: config.color ?? existing.color,
      },
    });
  }

  async deleteLoyaltyTier(tierId: string) {
    // Prevent delete if tier in use
    const count = await prisma.customerLoyalty.count({ where: { tierId } });
    if (count > 0) {
      throw new Error('No se puede eliminar el nivel: está asignado a clientes');
    }
    await prisma.loyaltyTier.delete({ where: { id: tierId } });
    return true;
  }

  // Customer Loyalty Management
  async enrollCustomer(customerId: string, programId: string) {
    const program = await prisma.loyaltyProgram.findUnique({
      where: { id: programId },
    });

    if (!program) {
      throw new Error('Programa de lealtad no encontrado');
    }

    // Check if customer is already enrolled
    const existingLoyalty = await prisma.customerLoyalty.findUnique({
      where: {
        customerId_programId: {
          customerId,
          programId,
        },
      },
    });

    if (existingLoyalty) {
      throw new Error('El cliente ya está inscrito en este programa');
    }

    // Create customer loyalty record
    const customerLoyalty = await prisma.customerLoyalty.create({
      data: {
        customerId,
        programId,
        currentPoints: program.welcomeBonus,
        totalPointsEarned: program.welcomeBonus,
      },
    });

    // Add welcome bonus transaction if applicable
    if (program.welcomeBonus > 0) {
      await this.addPointsTransaction(
        customerLoyalty.id,
        'BONUS',
        program.welcomeBonus,
        'Bono de bienvenida',
        'WELCOME'
      );
    }

    // Assign initial tier
    await this.updateCustomerTier(customerLoyalty.id);

    return customerLoyalty;
  }

  async getCustomerLoyalty(customerId: string, programId?: string) {
    const where = programId 
      ? { customerId, programId }
      : { customerId };

    return await prisma.customerLoyalty.findMany({
      where,
      include: {
        program: true,
        tier: true,
        pointsTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        customerRewards: {
          where: { status: 'AVAILABLE' },
          include: { reward: true },
        },
      },
    });
  }

  // Points Management
  async calculatePointsForPurchase(programId: string, purchaseAmount: number, customerId?: string): Promise<number> {
    const program = await prisma.loyaltyProgram.findUnique({
      where: { id: programId },
    });

    if (!program || purchaseAmount < program.minimumPurchase) {
      return 0;
    }

    let basePoints = Math.floor(purchaseAmount * program.pointsPerPurchase);

    // Apply tier multiplier if customer exists
    if (customerId) {
      const customerLoyalty = await prisma.customerLoyalty.findUnique({
        where: {
          customerId_programId: {
            customerId,
            programId,
          },
        },
        include: { tier: true },
      });

      if (customerLoyalty?.tier) {
        basePoints = Math.floor(basePoints * customerLoyalty.tier.multiplier);
      }
    }

    return basePoints;
  }

  async addPointsForPurchase(customerId: string, programId: string, saleId: string, purchaseAmount: number, userId?: string) {
    const points = await this.calculatePointsForPurchase(programId, purchaseAmount, customerId);
    
    if (points <= 0) {
      return null;
    }

    const customerLoyalty = await prisma.customerLoyalty.findUnique({
      where: {
        customerId_programId: {
          customerId,
          programId,
        },
      },
    });

    if (!customerLoyalty) {
      throw new Error('Cliente no inscrito en el programa de lealtad');
    }

    // Update customer loyalty points
    const updatedLoyalty = await prisma.customerLoyalty.update({
      where: { id: customerLoyalty.id },
      data: {
        currentPoints: { increment: points },
        totalPointsEarned: { increment: points },
        lastActivity: new Date(),
      },
    });

    // Add points transaction
    const program = await prisma.loyaltyProgram.findUnique({
      where: { id: programId },
    });

    const expiresAt = program?.pointsExpirationDays 
      ? new Date(Date.now() + program.pointsExpirationDays * 24 * 60 * 60 * 1000)
      : null;

    await this.addPointsTransaction(
      customerLoyalty.id,
      'EARNED',
      points,
      `Puntos ganados por compra #${saleId}`,
      'SALE',
      saleId,
      expiresAt,
      userId
    );

    // Update tier if necessary
    await this.updateCustomerTier(customerLoyalty.id);

    return updatedLoyalty;
  }

  async addPointsTransaction(
    customerLoyaltyId: string,
    type: 'EARNED' | 'REDEEMED' | 'EXPIRED' | 'ADJUSTED' | 'BONUS',
    points: number,
    description: string,
    referenceType?: string,
    referenceId?: string,
    expiresAt?: Date | null,
    createdBy?: string
  ) {
    return await prisma.pointsTransaction.create({
      data: {
        customerLoyaltyId,
        type,
        points,
        description,
        referenceType,
        referenceId,
        expiresAt,
        createdBy,
      },
    });
  }

  async updateCustomerTier(customerLoyaltyId: string) {
    const customerLoyalty = await prisma.customerLoyalty.findUnique({
      where: { id: customerLoyaltyId },
      include: { program: { include: { tiers: { orderBy: { minPoints: 'asc' } } } } },
    });

    if (!customerLoyalty) {
      throw new Error('Registro de lealtad no encontrado');
    }

    const currentPoints = customerLoyalty.currentPoints;
    const tiers = customerLoyalty.program.tiers;

    // Find the appropriate tier
    let newTier = null;
    for (const tier of tiers.reverse()) { // Start from highest tier
      if (currentPoints >= tier.minPoints && 
          (tier.maxPoints === null || currentPoints <= tier.maxPoints)) {
        newTier = tier;
        break;
      }
    }

    // Update tier if changed
    if (newTier && newTier.id !== customerLoyalty.tierId) {
      await prisma.customerLoyalty.update({
        where: { id: customerLoyaltyId },
        data: { tierId: newTier.id },
      });
    }

    return newTier;
  }

  // Reward Management
  async createReward(programId: string, config: RewardConfig) {
    return await prisma.reward.create({
      data: {
        programId,
        name: config.name,
        description: config.description,
        type: config.type,
        value: config.value,
        pointsCost: config.pointsCost,
        maxRedemptions: config.maxRedemptions,
        validFrom: config.validFrom,
        validUntil: config.validUntil,
        terms: config.terms,
        productId: config.productId,
        categoryId: config.categoryId,
        minPurchase: config.minPurchase,
      },
    });
  }

  async listRewards(programId: string, opts?: { isActive?: boolean; type?: RewardConfig['type']; includeValidity?: boolean }) {
    const where: any = { programId };
    if (opts?.isActive !== undefined) where.isActive = opts.isActive;
    if (opts?.type) where.type = opts.type;
    if (opts?.includeValidity === false) {
      // no validity filter
    }
    return await prisma.reward.findMany({
      where,
      include: { product: true, category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateReward(rewardId: string, config: Partial<RewardConfig & { isActive: boolean }>) {
    const reward = await prisma.reward.findUnique({ where: { id: rewardId } });
    if (!reward) throw new Error('Recompensa no encontrada');
    return await prisma.reward.update({
      where: { id: rewardId },
      data: {
        name: config.name ?? reward.name,
        description: config.description ?? reward.description,
        type: (config.type as any) ?? reward.type,
        value: config.value ?? reward.value,
        pointsCost: config.pointsCost ?? reward.pointsCost,
        maxRedemptions: config.maxRedemptions ?? reward.maxRedemptions,
        validFrom: config.validFrom ?? reward.validFrom,
        validUntil: config.validUntil ?? reward.validUntil,
        terms: config.terms ?? reward.terms,
        productId: config.productId ?? reward.productId,
        categoryId: config.categoryId ?? reward.categoryId,
        minPurchase: config.minPurchase ?? reward.minPurchase,
        isActive: config.isActive ?? reward.isActive,
      },
    });
  }

  async deleteReward(rewardId: string) {
    // Prefer soft-delete to retain history
    const existing = await prisma.reward.findUnique({ where: { id: rewardId } });
    if (!existing) throw new Error('Recompensa no encontrada');
    await prisma.reward.update({ where: { id: rewardId }, data: { isActive: false } });
    return true;
  }

  async getAvailableRewards(programId: string, customerId?: string) {
    const now = new Date();
    const where: any = {
      programId,
      isActive: true,
      OR: [
        { validFrom: null },
        { validFrom: { lte: now } },
      ],
      AND: [
        {
          OR: [
            { validUntil: null },
            { validUntil: { gte: now } },
          ],
        },
        {
          OR: [
            { maxRedemptions: null },
            { currentRedemptions: { lt: prisma.reward.fields.maxRedemptions } },
          ],
        },
      ],
    };

    const rewards = await prisma.reward.findMany({
      where,
      include: {
        product: true,
        category: true,
      },
      orderBy: { pointsCost: 'asc' },
    });

    // If customer is provided, filter by available points
    if (customerId) {
      const customerLoyalty = await prisma.customerLoyalty.findUnique({
        where: {
          customerId_programId: {
            customerId,
            programId,
          },
        },
      });

      if (customerLoyalty) {
        return rewards.filter(reward => reward.pointsCost <= customerLoyalty.currentPoints);
      }
    }

    return rewards;
  }

  async redeemReward(customerId: string, programId: string, rewardId: string, userId?: string) {
    const customerLoyalty = await prisma.customerLoyalty.findUnique({
      where: {
        customerId_programId: {
          customerId,
          programId,
        },
      },
    });

    if (!customerLoyalty) {
      throw new Error('Cliente no inscrito en el programa de lealtad');
    }

    const reward = await prisma.reward.findUnique({
      where: { id: rewardId },
    });

    if (!reward || !reward.isActive) {
      throw new Error('Recompensa no disponible');
    }

    if (customerLoyalty.currentPoints < reward.pointsCost) {
      throw new Error('Puntos insuficientes para canjear esta recompensa');
    }

    // Check redemption limits
    if (reward.maxRedemptions && reward.currentRedemptions >= reward.maxRedemptions) {
      throw new Error('Límite de canjes alcanzado para esta recompensa');
    }

    // Check validity dates
    const now = new Date();
    if (reward.validFrom && now < reward.validFrom) {
      throw new Error('Esta recompensa aún no está disponible');
    }
    if (reward.validUntil && now > reward.validUntil) {
      throw new Error('Esta recompensa ha expirado');
    }

    // Create customer reward
    const customerReward = await prisma.customerReward.create({
      data: {
        customerLoyaltyId: customerLoyalty.id,
        rewardId: reward.id,
        redeemedAt: new Date(),
        expiresAt: reward.validUntil,
      },
    });

    // Deduct points
    await prisma.customerLoyalty.update({
      where: { id: customerLoyalty.id },
      data: {
        currentPoints: { decrement: reward.pointsCost },
        totalPointsUsed: { increment: reward.pointsCost },
        lastActivity: new Date(),
      },
    });

    // Add points transaction
    await this.addPointsTransaction(
      customerLoyalty.id,
      'REDEEMED',
      -reward.pointsCost,
      `Puntos canjeados por: ${reward.name}`,
      'REWARD',
      reward.id,
      null,
      userId
    );

    // Update reward redemption count
    await prisma.reward.update({
      where: { id: rewardId },
      data: {
        currentRedemptions: { increment: 1 },
      },
    });

    return customerReward;
  }

  async getCustomerRewards(customerId: string, programId: string, status?: 'AVAILABLE' | 'USED' | 'EXPIRED') {
    const customerLoyalty = await prisma.customerLoyalty.findUnique({
      where: {
        customerId_programId: {
          customerId,
          programId,
        },
      },
    });

    if (!customerLoyalty) {
      return [];
    }

    const where: any = {
      customerLoyaltyId: customerLoyalty.id,
    };

    if (status) {
      where.status = status;
    }

    return await prisma.customerReward.findMany({
      where,
      include: {
        reward: {
          include: {
            product: true,
            category: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listPointsTransactions(params: {
    programId?: string;
    customerId?: string;
    type?: 'EARNED' | 'REDEEMED' | 'EXPIRED' | 'ADJUSTED' | 'BONUS';
    referenceType?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    pageSize?: number;
  }) {
    const { programId, customerId, type, referenceType, startDate, endDate, page = 1, pageSize = 20 } = params;
    const where: any = {};
    if (type) where.type = type;
    if (referenceType) where.referenceType = referenceType;
    if (startDate && endDate) where.createdAt = { gte: startDate, lte: endDate };
    if (programId || customerId) {
      where.customerLoyalty = {};
      if (programId) where.customerLoyalty.programId = programId;
      if (customerId) where.customerLoyalty.customerId = customerId;
    }

    const [total, items] = await prisma.$transaction([
      prisma.pointsTransaction.count({ where }),
      prisma.pointsTransaction.findMany({
        where,
        include: { customerLoyalty: { include: { customer: true, program: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items, page, pageSize, total };
  }

  async adjustPoints(
    customerLoyaltyId: string,
    points: number,
    description: string,
    referenceType?: string,
    expiresAt?: Date | null,
    createdBy?: string
  ) {
    const loyalty = await prisma.customerLoyalty.findUnique({ where: { id: customerLoyaltyId } });
    if (!loyalty) throw new Error('Registro de lealtad no encontrado');
    // Points can be positive or negative; update aggregates accordingly
    const isPositive = points > 0;
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.customerLoyalty.update({
        where: { id: customerLoyaltyId },
        data: {
          currentPoints: { increment: points },
          totalPointsEarned: isPositive ? { increment: points } : loyalty.totalPointsEarned,
          totalPointsUsed: !isPositive ? { increment: Math.abs(points) } : loyalty.totalPointsUsed,
          lastActivity: new Date(),
        },
      });
      await tx.pointsTransaction.create({
        data: {
          customerLoyaltyId,
          type: 'ADJUSTED',
          points,
          description,
          referenceType,
          expiresAt,
          createdBy,
        },
      });
      return updated;
    });
  }

  async listProgramCustomers(
    programId: string,
    opts?: { isActive?: boolean; tierId?: string; minPoints?: number; maxPoints?: number; page?: number; pageSize?: number }
  ) {
    const { isActive, tierId, minPoints, maxPoints, page = 1, pageSize = 20 } = opts || {};
    const where: any = { programId };
    if (isActive !== undefined) where.isActive = isActive;
    if (tierId) where.tierId = tierId;
    if (minPoints !== undefined || maxPoints !== undefined) {
      where.currentPoints = {};
      if (minPoints !== undefined) where.currentPoints.gte = minPoints;
      if (maxPoints !== undefined) where.currentPoints.lte = maxPoints;
    }
    const [total, items] = await prisma.$transaction([
      prisma.customerLoyalty.count({ where }),
      prisma.customerLoyalty.findMany({
        where,
        include: { customer: true, tier: true },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items, page, pageSize, total };
  }

  async unenrollCustomer(customerLoyaltyId: string) {
    const loyalty = await prisma.customerLoyalty.findUnique({ where: { id: customerLoyaltyId } });
    if (!loyalty) throw new Error('Registro de lealtad no encontrado');
    await prisma.customerLoyalty.update({
      where: { id: customerLoyaltyId },
      data: { isActive: false },
    });
    return true;
  }

  async useCustomerReward(customerRewardId: string, saleId: string) {
    const customerReward = await prisma.customerReward.findUnique({
      where: { id: customerRewardId },
      include: { reward: true },
    });

    if (!customerReward) {
      throw new Error('Recompensa no encontrada');
    }

    if (customerReward.status !== 'AVAILABLE') {
      throw new Error('Esta recompensa ya no está disponible');
    }

    // Check if expired
    if (customerReward.expiresAt && new Date() > customerReward.expiresAt) {
      await prisma.customerReward.update({
        where: { id: customerRewardId },
        data: { status: 'EXPIRED' },
      });
      throw new Error('Esta recompensa ha expirado');
    }

    // Mark as used
    await prisma.customerReward.update({
      where: { id: customerRewardId },
      data: {
        status: 'USED',
        usedAt: new Date(),
        usedInSaleId: saleId,
      },
    });

    return customerReward;
  }

  // Analytics and Reports
  async getLoyaltyAnalytics(programId: string, startDate?: Date, endDate?: Date) {
    const dateFilter = startDate && endDate ? {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    } : {};

    const [
      totalCustomers,
      activeCustomers,
      totalPointsEarned,
      totalPointsRedeemed,
      totalRewardsRedeemed,
      topCustomers,
      pointsTransactions,
      loyalties,
      usedRewards,
    ] = await Promise.all([
      // Total customers enrolled
      prisma.customerLoyalty.count({
        where: { programId },
      }),

      // Active customers (with activity in the period)
      prisma.customerLoyalty.count({
        where: {
          programId,
          lastActivity: dateFilter.createdAt,
        },
      }),

      // Total points earned
      prisma.pointsTransaction.aggregate({
        where: {
          customerLoyalty: { programId },
          type: { in: ['EARNED', 'BONUS'] },
          ...dateFilter,
        },
        _sum: { points: true },
      }),

      // Total points redeemed
      prisma.pointsTransaction.aggregate({
        where: {
          customerLoyalty: { programId },
          type: 'REDEEMED',
          ...dateFilter,
        },
        _sum: { points: true },
      }),

      // Total rewards redeemed
      prisma.customerReward.count({
        where: {
          customerLoyalty: { programId },
          status: 'USED',
          usedAt: dateFilter.createdAt,
        },
      }),

      // Top customers by points
      prisma.customerLoyalty.findMany({
        where: { programId },
        include: {
          customer: true,
          tier: true,
        },
        orderBy: { totalPointsEarned: 'desc' },
        take: 10,
      }),

      // Recent points transactions
      prisma.pointsTransaction.findMany({
        where: {
          customerLoyalty: { programId },
          ...dateFilter,
        },
        include: {
          customerLoyalty: {
            include: { customer: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),

      prisma.customerLoyalty.findMany({
        where: { programId },
        include: { tier: true },
      }),

      prisma.customerReward.findMany({
        where: {
          customerLoyalty: { programId },
          status: 'USED',
          usedAt: dateFilter.createdAt,
        },
        orderBy: { usedAt: 'asc' },
      }),
    ]);

    const totalIssued = totalPointsEarned._sum.points || 0;
    const totalRedeemedAbs = Math.abs(totalPointsRedeemed._sum.points || 0);

    const avgPointsPerCustomer = totalCustomers > 0 ? Math.floor(totalIssued / totalCustomers) : 0;

    const customersByTierMap = new Map<string, { tier: any; count: number }>();
    for (const cl of loyalties) {
      const key = cl.tier?.id || 'none';
      const prev = customersByTierMap.get(key);
      customersByTierMap.set(key, {
        tier: cl.tier || null,
        count: (prev?.count || 0) + 1,
      });
    }
    const customersByTier = Array.from(customersByTierMap.values()).sort((a, b) => b.count - a.count);
    const topTier = customersByTier[0]?.tier || null;

    const dateFilterSql1 = startDate && endDate ? Prisma.sql` AND pt.created_at BETWEEN ${startDate} AND ${endDate} ` : Prisma.sql``;
    const pointsIssuedByMonth = await prisma.$queryRaw<Array<{ month: string; points: number }>>(Prisma.sql`
      SELECT to_char(date_trunc('month', pt.created_at), 'YYYY-MM') AS month,
             SUM(pt.points)::int AS points
      FROM points_transactions pt
      JOIN customer_loyalties cl ON cl.id = pt.customer_loyalty_id
      WHERE cl.program_id = ${programId}
        AND pt.type IN ('EARNED','BONUS')
        ${dateFilterSql1}
      GROUP BY month
      ORDER BY month ASC
    `);

    const dateFilterSql2 = startDate && endDate ? Prisma.sql` AND cr.used_at BETWEEN ${startDate} AND ${endDate} ` : Prisma.sql``;
    const rewardsRedeemedByMonth = await prisma.$queryRaw<Array<{ month: string; count: number }>>(Prisma.sql`
      SELECT to_char(date_trunc('month', cr.used_at), 'YYYY-MM') AS month,
             COUNT(*)::int AS count
      FROM customer_rewards cr
      JOIN customer_loyalties cl ON cl.id = cr.customer_loyalty_id
      WHERE cl.program_id = ${programId}
        AND cr.status = 'USED'
        ${dateFilterSql2}
      GROUP BY month
      ORDER BY month ASC
    `);

    return {
      totalCustomers,
      activeCustomers,
      totalPointsIssued: totalIssued,
      totalPointsRedeemed: totalRedeemedAbs,
      totalRewardsRedeemed,
      averagePointsPerCustomer: avgPointsPerCustomer,
      topTier,
      customersByTier,
      pointsIssuedByMonth,
      rewardsRedeemedByMonth,
      topCustomers,
      recentTransactions: pointsTransactions,
    } as any;
  }

  // Utility Methods
  async expirePoints() {
    const now = new Date();
    
    // Find expired points
    const expiredTransactions = await prisma.pointsTransaction.findMany({
      where: {
        type: { in: ['EARNED', 'BONUS'] },
        expiresAt: { lte: now },
      },
      include: { customerLoyalty: true },
    });

    for (const transaction of expiredTransactions) {
      // Create expiration transaction
      await this.addPointsTransaction(
        transaction.customerLoyaltyId,
        'EXPIRED',
        -transaction.points,
        `Puntos expirados de transacción: ${transaction.description}`,
        'EXPIRATION',
        transaction.id
      );

      // Update customer points
      await prisma.customerLoyalty.update({
        where: { id: transaction.customerLoyaltyId },
        data: {
          currentPoints: { decrement: transaction.points },
        },
      });
    }

    return expiredTransactions.length;
  }

  async processBirthdayBonuses() {
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

    // Find customers with birthdays today
    const customers = await prisma.customer.findMany({
      where: {
        birthDate: {
          not: null,
        },
        isActive: true,
      },
      include: {
        loyalties: {
          include: { program: true },
        },
      },
    });

    const birthdayCustomers = customers.filter(customer => {
      if (!customer.birthDate) return false;
      const birthDate = new Date(customer.birthDate);
      return birthDate.getMonth() + 1 === todayMonth && birthDate.getDate() === todayDay;
    });

    let processedCount = 0;

    for (const customer of birthdayCustomers) {
      for (const loyalty of customer.loyalties) {
        if (loyalty.program.birthdayBonus > 0) {
          // Check if birthday bonus was already given this year
          const thisYear = today.getFullYear();
          const existingBonus = await prisma.pointsTransaction.findFirst({
            where: {
              customerLoyaltyId: loyalty.id,
              type: 'BONUS',
              referenceType: 'BIRTHDAY',
              createdAt: {
                gte: new Date(thisYear, 0, 1),
                lt: new Date(thisYear + 1, 0, 1),
              },
            },
          });

          if (!existingBonus) {
            // Add birthday bonus
            await prisma.customerLoyalty.update({
              where: { id: loyalty.id },
              data: {
                currentPoints: { increment: loyalty.program.birthdayBonus },
                totalPointsEarned: { increment: loyalty.program.birthdayBonus },
                lastActivity: new Date(),
              },
            });

            await this.addPointsTransaction(
              loyalty.id,
              'BONUS',
              loyalty.program.birthdayBonus,
              'Bono de cumpleaños',
              'BIRTHDAY',
              customer.id
            );

            processedCount++;
          }
        }
      }
    }

    return processedCount;
  }
}

export const loyaltyService = new LoyaltyService();