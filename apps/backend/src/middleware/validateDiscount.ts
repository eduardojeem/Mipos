/**
 * Discount Validation Middleware
 * 
 * Valida límites de descuentos según el rol del usuario
 */

import { Request, Response, NextFunction } from 'express';

export interface DiscountLimits {
  maxDiscountAmount: number;
  maxDiscountPercent: number;
  requireApproval: boolean;
}

const DISCOUNT_LIMITS_BY_ROLE: Record<string, DiscountLimits> = {
  SUPER_ADMIN: {
    maxDiscountAmount: Infinity,
    maxDiscountPercent: 100,
    requireApproval: false,
  },
  ADMIN: {
    maxDiscountAmount: Infinity,
    maxDiscountPercent: 100,
    requireApproval: false,
  },
  MANAGER: {
    maxDiscountAmount: 1000,
    maxDiscountPercent: 20,
    requireApproval: true,
  },
  CASHIER: {
    maxDiscountAmount: 200,
    maxDiscountPercent: 10,
    requireApproval: true,
  },
  VIEWER: {
    maxDiscountAmount: 0,
    maxDiscountPercent: 0,
    requireApproval: true,
  },
};

export function getDiscountLimitsForRole(role: string): DiscountLimits {
  return DISCOUNT_LIMITS_BY_ROLE[role] || DISCOUNT_LIMITS_BY_ROLE.VIEWER;
}

export function validateDiscountMiddleware(req: Request, res: Response, next: NextFunction) {
  const userRole = (req as any).user?.role || 'VIEWER';
  const { discountType, discountValue, type, value } = req.body;
  
  const dtype = discountType || type;
  const dval = discountValue || value;
  
  if (!dtype || !dval) {
    return next(); // No hay descuento para validar
  }
  
  const limits = getDiscountLimitsForRole(userRole);
  
  if (dtype === 'PERCENTAGE' && dval > limits.maxDiscountPercent) {
    return res.status(403).json({
      success: false,
      message: `El descuento excede el límite para su rol (${limits.maxDiscountPercent}%)`,
      maxAllowed: limits.maxDiscountPercent,
    });
  }
  
  if (dtype === 'FIXED_AMOUNT' && dval > limits.maxDiscountAmount) {
    return res.status(403).json({
      success: false,
      message: `El descuento excede el límite para su rol (${limits.maxDiscountAmount})`,
      maxAllowed: limits.maxDiscountAmount,
    });
  }
  
  next();
}
