import { Router } from 'express';
import { getDiscountLimitsForRole } from '../middleware/validateDiscount';

const router = Router();

/**
 * GET /api/discount-limits
 * Returns discount limits for the current user's role
 */
router.get('/', (req, res) => {
  try {
    const userRole = (req as any).user?.role || 'VIEWER';
    const limits = getDiscountLimitsForRole(userRole);

    res.json({
      role: userRole,
      limits,
    });
  } catch (error) {
    console.error('Error getting discount limits:', error);
    res.status(500).json({
      error: 'Error obteniendo límites de descuento',
    });
  }
});

export default router;
