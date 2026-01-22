import { Router, Request, Response } from 'express';
import { loyaltyService, LoyaltyProgramConfig, LoyaltyTierConfig, RewardConfig } from '../services/loyalty';
import { authenticateToken } from '../middleware/auth';
import { auditLogger } from '../middleware/audit';
import { z } from 'zod';
import { validate } from '../middleware/validation';

const router = Router();

const programCreateSchema = {
  body: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    pointsPerPurchase: z.number().min(0),
    minimumPurchase: z.number().min(0),
    pointsExpirationDays: z.number().min(0).optional(),
    welcomeBonus: z.number().int().min(0),
    birthdayBonus: z.number().int().min(0),
    referralBonus: z.number().int().min(0),
  }),
};

const programUpdateSchema = {
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    pointsPerPurchase: z.number().min(0).optional(),
    minimumPurchase: z.number().min(0).optional(),
    pointsExpirationDays: z.number().min(0).optional(),
    welcomeBonus: z.number().int().min(0).optional(),
    birthdayBonus: z.number().int().min(0).optional(),
    referralBonus: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  }),
};

const tiersParamsSchema = z.object({ programId: z.string().min(1) });

const tierCreateSchema = {
  params: tiersParamsSchema,
  body: z.object({
    name: z.string().min(1),
    minPoints: z.number().int().min(0),
    maxPoints: z.number().int().min(0).optional(),
    multiplier: z.number().min(0),
    benefits: z.string().optional(),
    color: z.string().optional(),
  }),
};

const tierUpdateSchema = {
  params: z.object({ tierId: z.string().min(1) }),
  body: z.object({
    name: z.string().min(1).optional(),
    minPoints: z.number().int().min(0).optional(),
    maxPoints: z.number().int().min(0).optional(),
    multiplier: z.number().min(0).optional(),
    benefits: z.string().optional(),
    color: z.string().optional(),
  }),
};

const rewardCreateSchema = {
  params: z.object({ programId: z.string().min(1) }),
  body: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    type: z.enum(['DISCOUNT_PERCENTAGE', 'DISCOUNT_FIXED', 'FREE_PRODUCT', 'FREE_SHIPPING', 'CUSTOM']),
    value: z.number().min(0),
    pointsCost: z.number().int().min(1),
    maxRedemptions: z.number().int().min(0).optional(),
    validFrom: z.string().datetime().optional(),
    validUntil: z.string().datetime().optional(),
    terms: z.string().optional(),
    productId: z.string().optional(),
    categoryId: z.string().optional(),
    minPurchase: z.number().min(0).optional(),
  }),
};

const rewardUpdateSchema = {
  params: z.object({ rewardId: z.string().min(1) }),
  body: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    type: z.enum(['DISCOUNT_PERCENTAGE', 'DISCOUNT_FIXED', 'FREE_PRODUCT', 'FREE_SHIPPING', 'CUSTOM']).optional(),
    value: z.number().min(0).optional(),
    pointsCost: z.number().int().min(1).optional(),
    maxRedemptions: z.number().int().min(0).optional(),
    validFrom: z.string().datetime().optional(),
    validUntil: z.string().datetime().optional(),
    terms: z.string().optional(),
    productId: z.string().optional(),
    categoryId: z.string().optional(),
    minPurchase: z.number().min(0).optional(),
    isActive: z.boolean().optional(),
  }),
};

const analyticsSchema = {
  params: z.object({ programId: z.string().min(1) }),
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
};

type AnalyticsCacheEntry = {
  expireAt: number;
  data: any;
};

const analyticsCache = new Map<string, AnalyticsCacheEntry>();

const listTransactionsSchema = {
  query: z.object({
    programId: z.string().optional(),
    customerId: z.string().optional(),
    type: z.enum(['EARNED', 'REDEEMED', 'EXPIRED', 'ADJUSTED', 'BONUS']).optional(),
    referenceType: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    page: z.string().transform((v) => parseInt(v)).optional(),
    pageSize: z.string().transform((v) => parseInt(v)).optional(),
  }),
};

const listProgramCustomersSchema = {
  params: z.object({ programId: z.string().min(1) }),
  query: z.object({
    isActive: z.string().transform((v) => v === 'true').optional(),
    tierId: z.string().optional(),
    minPoints: z.string().transform((v) => parseInt(v)).optional(),
    maxPoints: z.string().transform((v) => parseInt(v)).optional(),
    page: z.string().transform((v) => parseInt(v)).optional(),
    pageSize: z.string().transform((v) => parseInt(v)).optional(),
  }),
};

const enrollSchema = {
  params: z.object({ customerId: z.string().min(1) }),
  body: z.object({ programId: z.string().min(1) }),
};

const addPurchasePointsSchema = {
  params: z.object({ customerId: z.string().min(1) }),
  body: z.object({
    programId: z.string().min(1),
    saleId: z.string().min(1),
    purchaseAmount: z.number().min(0),
  }),
};

const calcPointsSchema = {
  params: z.object({ customerId: z.string().min(1) }),
  body: z.object({
    programId: z.string().min(1),
    purchaseAmount: z.number().min(0),
  }),
};

const redeemSchema = {
  params: z.object({ customerId: z.string().min(1) }),
  body: z.object({
    programId: z.string().min(1),
    rewardId: z.string().min(1),
  }),
};

const customerRewardsSchema = {
  params: z.object({ customerId: z.string().min(1) }),
  query: z.object({
    programId: z.string().min(1),
    status: z.enum(['AVAILABLE', 'USED', 'EXPIRED']).optional(),
  }),
};

const useCustomerRewardSchema = {
  params: z.object({ customerRewardId: z.string().min(1) }),
  body: z.object({ saleId: z.string().min(1) }),
};

const pointsAdjustmentSchema = {
  body: z.object({
    customerLoyaltyId: z.string().min(1),
    points: z.number().int(),
    description: z.string().min(1),
    referenceType: z.string().optional(),
    expiresAt: z.string().datetime().optional(),
  }),
};

// Apply authentication to all routes
router.use(authenticateToken);

// LOYALTY PROGRAMS ROUTES

// Get all loyalty programs
router.get('/programs', async (req: Request, res: Response) => {
  try {
    const programs = await loyaltyService.getLoyaltyPrograms();
    res.json({
      success: true,
      data: programs,
    });
  } catch (error) {
    console.error('Error fetching loyalty programs:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener programas de lealtad',
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

// Create loyalty program
router.post('/programs',
  validate(programCreateSchema),
  auditLogger,
  async (req: Request, res: Response) => {
    try {
      const config: LoyaltyProgramConfig = req.body;
      const program = await loyaltyService.createLoyaltyProgram(config);
      
      res.status(201).json({
        success: true,
        message: 'Programa de lealtad creado exitosamente',
        data: program,
      });
    } catch (error) {
      console.error('Error creating loyalty program:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear programa de lealtad',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }
);

// Update loyalty program
router.put('/programs/:id',
  validate(programUpdateSchema),
  auditLogger,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const config: Partial<LoyaltyProgramConfig> = req.body;
      const program = await loyaltyService.updateLoyaltyProgram(id, config);
      
      res.json({
        success: true,
        message: 'Programa de lealtad actualizado exitosamente',
        data: program,
      });
    } catch (error) {
      console.error('Error updating loyalty program:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar programa de lealtad',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }
);

// LOYALTY TIERS ROUTES

// Get tiers for a program
router.get('/programs/:programId/tiers',
  validate({ params: tiersParamsSchema }),
  async (req: Request, res: Response) => {
    try {
      const { programId } = req.params;
      const tiers = await loyaltyService.getLoyaltyTiers(programId);
      
      res.json({
        success: true,
        data: tiers,
      });
    } catch (error) {
      console.error('Error fetching loyalty tiers:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener niveles de lealtad',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }
);

// Create loyalty tier
router.post('/programs/:programId/tiers',
  validate(tierCreateSchema),
  auditLogger,
  async (req: Request, res: Response) => {
    try {
      const { programId } = req.params;
      const config: LoyaltyTierConfig = req.body;
      const tier = await loyaltyService.createLoyaltyTier(programId, config);
      
      res.status(201).json({
        success: true,
        message: 'Nivel de lealtad creado exitosamente',
        data: tier,
      });
    } catch (error) {
      console.error('Error creating loyalty tier:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear nivel de lealtad',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }
);

// Update loyalty tier
router.put('/tiers/:tierId',
  validate(tierUpdateSchema),
  auditLogger,
  async (req: Request, res: Response) => {
    try {
      const { tierId } = req.params;
      const updated = await loyaltyService.updateLoyaltyTier(tierId, req.body);
      res.json({ success: true, message: 'Nivel actualizado exitosamente', data: updated });
    } catch (error) {
      console.error('Error updating tier:', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error al actualizar nivel' });
    }
  }
);

router.put('/programs/:programId/tiers/:tierId',
  validate(tierUpdateSchema),
  auditLogger,
  async (req: Request, res: Response) => {
    try {
      const { tierId } = req.params;
      const updated = await loyaltyService.updateLoyaltyTier(tierId, req.body);
      res.json({ success: true, message: 'Nivel actualizado exitosamente', data: updated });
    } catch (error) {
      console.error('Error updating tier:', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error al actualizar nivel' });
    }
  }
);

// Delete loyalty tier
router.delete('/tiers/:tierId',
  validate({ params: z.object({ tierId: z.string().min(1) }) }),
  auditLogger,
  async (req: Request, res: Response) => {
    try {
      const { tierId } = req.params;
      await loyaltyService.deleteLoyaltyTier(tierId);
      res.json({ success: true, message: 'Nivel eliminado exitosamente' });
    } catch (error) {
      console.error('Error deleting tier:', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error al eliminar nivel' });
    }
  }
);

// CUSTOMER LOYALTY ROUTES

// Enroll customer in loyalty program
router.post('/customers/:customerId/enroll',
  validate(enrollSchema),
  auditLogger,
  async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const { programId } = req.body;
      
      const customerLoyalty = await loyaltyService.enrollCustomer(customerId, programId);
      
      res.status(201).json({
        success: true,
        message: 'Cliente inscrito exitosamente en el programa de lealtad',
        data: customerLoyalty,
      });
    } catch (error) {
      console.error('Error enrolling customer:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al inscribir cliente',
      });
    }
  }
);

// Get customer loyalty information
router.get('/customers/:customerId',
  validate({ params: z.object({ customerId: z.string().min(1) }), query: z.object({ programId: z.string().optional() }) }),
  async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const { programId } = req.query;
      
      const customerLoyalty = await loyaltyService.getCustomerLoyalty(
        customerId, 
        programId as string
      );
      
      res.json({
        success: true,
        data: customerLoyalty,
      });
    } catch (error) {
      console.error('Error fetching customer loyalty:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener información de lealtad del cliente',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }
);

// Add points for purchase
router.post('/customers/:customerId/points/purchase',
  validate(addPurchasePointsSchema),
  auditLogger,
  async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const { programId, saleId, purchaseAmount } = req.body;
      const userId = (req as any).user?.id;
      
      const result = await loyaltyService.addPointsForPurchase(
        customerId,
        programId,
        saleId,
        purchaseAmount,
        userId
      );
      
      if (!result) {
        return res.json({
          success: true,
          message: 'No se otorgaron puntos (compra no cumple requisitos mínimos)',
          data: null,
        });
      }
      
      res.json({
        success: true,
        message: 'Puntos agregados exitosamente',
        data: result,
      });
    } catch (error) {
      console.error('Error adding points for purchase:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al agregar puntos',
      });
    }
  }
);

// Calculate points for purchase (preview)
router.post('/customers/:customerId/points/calculate',
  validate(calcPointsSchema),
  async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const { programId, purchaseAmount } = req.body;
      
      const points = await loyaltyService.calculatePointsForPurchase(
        programId,
        purchaseAmount,
        customerId
      );
      
      res.json({
        success: true,
        data: { points, purchaseAmount },
      });
    } catch (error) {
      console.error('Error calculating points:', error);
      res.status(500).json({
        success: false,
        message: 'Error al calcular puntos',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }
);

// REWARDS ROUTES

// Get available rewards
router.get('/programs/:programId/rewards',
  validate({ params: z.object({ programId: z.string().min(1) }), query: z.object({ customerId: z.string().optional() }) }),
  async (req: Request, res: Response) => {
    try {
      const { programId } = req.params;
      const { customerId } = req.query;
      
      const rewards = await loyaltyService.getAvailableRewards(
        programId,
        customerId as string
      );
      
      res.json({
        success: true,
        data: rewards,
      });
    } catch (error) {
      console.error('Error fetching rewards:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener recompensas',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }
);

// Create reward
router.post('/programs/:programId/rewards',
  validate(rewardCreateSchema),
  auditLogger,
  async (req: Request, res: Response) => {
    try {
      const { programId } = req.params;
      const b = req.body as any;
      const config: RewardConfig = {
        name: b.name,
        description: b.description,
        type: b.type,
        value: b.value,
        pointsCost: b.pointsCost,
        maxRedemptions: b.maxRedemptions,
        validFrom: b.validFrom ? new Date(b.validFrom) : undefined,
        validUntil: b.validUntil ? new Date(b.validUntil) : undefined,
        terms: b.terms,
        productId: b.productId,
        categoryId: b.categoryId,
        minPurchase: b.minPurchase,
      };
      
      const reward = await loyaltyService.createReward(programId, config);
      
      res.status(201).json({
        success: true,
        message: 'Recompensa creada exitosamente',
        data: reward,
      });
    } catch (error) {
      console.error('Error creating reward:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear recompensa',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }
);

// Admin: list rewards (all)
router.get('/programs/:programId/rewards/all',
  validate({ params: z.object({ programId: z.string().min(1) }) }),
  async (req: Request, res: Response) => {
    try {
      const { programId } = req.params;
      const { isActive, type } = req.query as any;
      const rewards = await loyaltyService.listRewards(programId, {
        isActive: isActive != null ? isActive === 'true' : undefined,
        type,
      });
      res.json({ success: true, data: rewards });
    } catch (error) {
      console.error('Error listing rewards:', error);
      res.status(500).json({ success: false, message: 'Error al listar recompensas', error: error instanceof Error ? error.message : 'Error desconocido' });
    }
  }
);

// Update reward
router.put('/rewards/:rewardId',
  validate(rewardUpdateSchema),
  auditLogger,
  async (req: Request, res: Response) => {
    try {
      const { rewardId } = req.params;
      const b = req.body as any;
      const payload: Partial<RewardConfig> & { isActive?: boolean } = {
        name: b.name,
        description: b.description,
        type: b.type,
        value: b.value,
        pointsCost: b.pointsCost,
        maxRedemptions: b.maxRedemptions,
        validFrom: b.validFrom ? new Date(b.validFrom) : undefined,
        validUntil: b.validUntil ? new Date(b.validUntil) : undefined,
        terms: b.terms,
        productId: b.productId,
        categoryId: b.categoryId,
        minPurchase: b.minPurchase,
      };
      const reward = await loyaltyService.updateReward(rewardId, payload as any);
      res.json({ success: true, message: 'Recompensa actualizada', data: reward });
    } catch (error) {
      console.error('Error updating reward:', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error al actualizar recompensa' });
    }
  }
);

router.put('/programs/:programId/rewards/:rewardId',
  validate(rewardUpdateSchema),
  auditLogger,
  async (req: Request, res: Response) => {
    try {
      const { rewardId } = req.params;
      const b = req.body as any;
      const payload: Partial<RewardConfig> & { isActive?: boolean } = {
        name: b.name,
        description: b.description,
        type: b.type,
        value: b.value,
        pointsCost: b.pointsCost,
        maxRedemptions: b.maxRedemptions,
        validFrom: b.validFrom ? new Date(b.validFrom) : undefined,
        validUntil: b.validUntil ? new Date(b.validUntil) : undefined,
        terms: b.terms,
        productId: b.productId,
        categoryId: b.categoryId,
        minPurchase: b.minPurchase,
      };
      const reward = await loyaltyService.updateReward(rewardId, payload as any);
      res.json({ success: true, message: 'Recompensa actualizada', data: reward });
    } catch (error) {
      console.error('Error updating reward:', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error al actualizar recompensa' });
    }
  }
);

// Delete reward (soft-delete)
router.delete('/rewards/:rewardId',
  validate({ params: z.object({ rewardId: z.string().min(1) }) }),
  auditLogger,
  async (req: Request, res: Response) => {
    try {
      const { rewardId } = req.params;
      await loyaltyService.deleteReward(rewardId);
      res.json({ success: true, message: 'Recompensa desactivada' });
    } catch (error) {
      console.error('Error deleting reward:', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error al eliminar recompensa' });
    }
  }
);

// Redeem reward
router.post('/customers/:customerId/rewards/redeem',
  validate(redeemSchema),
  auditLogger,
  async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const { programId, rewardId } = req.body;
      const userId = (req as any).user?.id;
      
      const customerReward = await loyaltyService.redeemReward(
        customerId,
        programId,
        rewardId,
        userId
      );
      
      res.json({
        success: true,
        message: 'Recompensa canjeada exitosamente',
        data: customerReward,
      });
    } catch (error) {
      console.error('Error redeeming reward:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al canjear recompensa',
      });
    }
  }
);

// Get customer rewards
router.get('/customers/:customerId/rewards',
  validate(customerRewardsSchema),
  async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const { programId, status } = req.query;
      
      const rewards = await loyaltyService.getCustomerRewards(
        customerId,
        programId as string,
        status as 'AVAILABLE' | 'USED' | 'EXPIRED'
      );
      
      res.json({
        success: true,
        data: rewards,
      });
    } catch (error) {
      console.error('Error fetching customer rewards:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener recompensas del cliente',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }
);

// Use customer reward in sale
router.post('/rewards/:customerRewardId/use',
  validate(useCustomerRewardSchema),
  auditLogger,
  async (req: Request, res: Response) => {
    try {
      const { customerRewardId } = req.params;
      const { saleId } = req.body;
      
      const result = await loyaltyService.useCustomerReward(customerRewardId, saleId);
      
      res.json({
        success: true,
        message: 'Recompensa aplicada exitosamente',
        data: result,
      });
    } catch (error) {
      console.error('Error using customer reward:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al aplicar recompensa',
      });
    }
  }
);

// ANALYTICS ROUTES

// Get loyalty analytics
router.get('/programs/:programId/analytics',
  validate(analyticsSchema),
  async (req: Request, res: Response) => {
    try {
      const { programId } = req.params;
      const { startDate, endDate } = req.query;
      const s = startDate ? new Date(String(startDate)) : undefined;
      const e = endDate ? new Date(String(endDate)) : undefined;
      const key = `${programId}|${s ? s.toISOString() : ''}|${e ? e.toISOString() : ''}`;
      const cached = analyticsCache.get(key);
      if (cached && cached.expireAt > Date.now()) {
        return res.json({ success: true, data: cached.data, cache: true });
      }
      const analytics = await loyaltyService.getLoyaltyAnalytics(programId, s, e);
      analyticsCache.set(key, { expireAt: Date.now() + 60_000, data: analytics });
      res.json({ success: true, data: analytics });
    } catch (error) {
      console.error('Error fetching loyalty analytics:', error);
      res.status(500).json({ success: false, message: 'Error al obtener analíticas de lealtad', error: error instanceof Error ? error.message : 'Error desconocido' });
    }
  }
);

// UTILITY ROUTES

// Expire points (manual trigger)
router.post('/maintenance/expire-points',
  auditLogger,
  async (req: Request, res: Response) => {
    try {
      const expiredCount = await loyaltyService.expirePoints();
      
      res.json({
        success: true,
        message: `${expiredCount} transacciones de puntos expiradas procesadas`,
        data: { expiredCount },
      });
    } catch (error) {
      console.error('Error expiring points:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar puntos expirados',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }
);

// List points transactions
router.get('/points-transactions',
  validate(listTransactionsSchema),
  async (req: Request, res: Response) => {
    try {
      const { programId, customerId, type, referenceType, startDate, endDate, page, pageSize } = req.query as any;
      const result = await loyaltyService.listPointsTransactions({
        programId,
        customerId,
        type,
        referenceType,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
      });
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ success: false, message: 'Error al obtener transacciones', error: error instanceof Error ? error.message : 'Error desconocido' });
    }
  }
);

// Manual points adjustment (admin only)
router.post('/points-adjustment',
  validate(pointsAdjustmentSchema),
  auditLogger,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user || !['ADMIN', 'MANAGER'].includes(String(user.role))) {
        return res.status(403).json({ success: false, message: 'Permisos insuficientes' });
      }
      const { customerLoyaltyId, points, description, referenceType, expiresAt } = req.body as any;
      const updated = await loyaltyService.adjustPoints(
        customerLoyaltyId,
        Number(points),
        description,
        referenceType,
        expiresAt ? new Date(expiresAt) : undefined,
        user.id
      );
      res.json({ success: true, message: 'Ajuste de puntos aplicado', data: updated });
    } catch (error) {
      console.error('Error adjusting points:', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error al ajustar puntos' });
    }
  }
);

// List program customers
router.get('/programs/:programId/customers',
  validate(listProgramCustomersSchema),
  async (req: Request, res: Response) => {
    try {
      const { programId } = req.params as any;
      const { isActive, tierId, minPoints, maxPoints, page, pageSize } = req.query as any;
      const result = await loyaltyService.listProgramCustomers(programId, {
        isActive: isActive != null ? isActive === 'true' : undefined,
        tierId,
        minPoints: minPoints ? Number(minPoints) : undefined,
        maxPoints: maxPoints ? Number(maxPoints) : undefined,
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
      });
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error listing program customers:', error);
      res.status(500).json({ success: false, message: 'Error al listar clientes', error: error instanceof Error ? error.message : 'Error desconocido' });
    }
  }
);

// Unenroll customer from program (soft deactivate)
router.delete('/customers/loyalties/:customerLoyaltyId',
  validate({ params: z.object({ customerLoyaltyId: z.string().min(1) }) }),
  auditLogger,
  async (req: Request, res: Response) => {
    try {
      const { customerLoyaltyId } = req.params;
      await loyaltyService.unenrollCustomer(customerLoyaltyId);
      res.json({ success: true, message: 'Cliente desinscrito del programa' });
    } catch (error) {
      console.error('Error unenrolling customer:', error);
      res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Error al desinscribir cliente' });
    }
  }
);

// Process birthday bonuses (manual trigger)
router.post('/maintenance/birthday-bonuses',
  auditLogger,
  async (req: Request, res: Response) => {
    try {
      const processedCount = await loyaltyService.processBirthdayBonuses();
      
      res.json({
        success: true,
        message: `${processedCount} bonos de cumpleaños procesados`,
        data: { processedCount },
      });
    } catch (error) {
      console.error('Error processing birthday bonuses:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar bonos de cumpleaños',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }
);

export default router;