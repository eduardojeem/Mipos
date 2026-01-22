import { useState, useCallback } from 'react'
import { 
  validateDiscountForRole, 
  requiresApproval,
  getDiscountLimitForRole 
} from '@/lib/pos/discount-config'
import { useAuth } from '@/hooks/use-auth'

export interface DiscountValidation {
  valid: boolean
  message?: string
  requiresApproval?: boolean
  maxAllowed?: number
  maxPercentAllowed?: number
}

export interface UseDiscountValidationReturn {
  validateDiscount: (discountAmount: number, discountPercent: number, originalPrice: number) => DiscountValidation
  checkApprovalRequired: (discountAmount: number, discountPercent: number) => boolean
  getRoleDiscountLimit: () => ReturnType<typeof getDiscountLimitForRole>
  isLoading: boolean
}

/**
 * Hook para validar descuentos según los límites configurados para el rol del usuario
 */
export function useDiscountValidation(): UseDiscountValidationReturn {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const userRole = user?.role || 'VIEWER'

  const validateDiscount = useCallback((
    discountAmount: number,
    discountPercent: number,
    originalPrice: number
  ): DiscountValidation => {
    if (!userRole) {
      return {
        valid: false,
        message: 'Usuario sin rol asignado'
      }
    }

    return validateDiscountForRole(userRole, discountAmount, discountPercent, originalPrice)
  }, [userRole])

  const checkApprovalRequired = useCallback((
    discountAmount: number,
    discountPercent: number
  ): boolean => {
    if (!userRole) {
      return true // Requerir aprobación por defecto si no hay rol
    }

    return requiresApproval(userRole, discountAmount, discountPercent)
  }, [userRole])

  const getRoleDiscountLimit = useCallback(() => {
    return getDiscountLimitForRole(userRole)
  }, [userRole])

  return {
    validateDiscount,
    checkApprovalRequired,
    getRoleDiscountLimit,
    isLoading
  }
}
