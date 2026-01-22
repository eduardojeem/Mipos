import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface DiscountLimit {
  role: string
  maxDiscountAmount: number // Máximo descuento en dinero
  maxDiscountPercent: number // Máximo descuento en porcentaje
  requireApproval: boolean // Requiere aprobación para descuentos grandes
  approverRoles: string[] // Roles que pueden aprobar descuentos
}

export interface DiscountConfig {
  enabled: boolean
  limits: DiscountLimit[]
  globalMaxDiscount: number // Máximo descuento global en dinero
  globalMaxPercent: number // Máximo descuento global en porcentaje
  approvalWorkflow: {
    enabled: boolean
    thresholdAmount: number // Umbral para requerir aprobación
    thresholdPercent: number // Umbral en porcentaje para requerir aprobación
  }
}

interface DiscountConfigState {
  config: DiscountConfig
  isLoading: boolean
  error: string | null
  
  // Actions
  setConfig: (config: DiscountConfig) => void
  updateLimit: (role: string, updates: Partial<DiscountLimit>) => void
  addLimit: (limit: DiscountLimit) => void
  removeLimit: (role: string) => void
  setEnabled: (enabled: boolean) => void
  setGlobalLimits: (maxAmount: number, maxPercent: number) => void
  setApprovalWorkflow: (workflow: Partial<DiscountConfig['approvalWorkflow']>) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  resetToDefaults: () => void
}

const DEFAULT_DISCOUNT_CONFIG: DiscountConfig = {
  enabled: true,
  globalMaxDiscount: 10000, // $10,000 máximo global
  globalMaxPercent: 50, // 50% máximo global
  limits: [
    {
      role: 'ADMIN',
      maxDiscountAmount: Infinity,
      maxDiscountPercent: 100,
      requireApproval: false,
      approverRoles: ['ADMIN', 'SUPER_ADMIN']
    },
    {
      role: 'SUPER_ADMIN',
      maxDiscountAmount: Infinity,
      maxDiscountPercent: 100,
      requireApproval: false,
      approverRoles: ['SUPER_ADMIN']
    },
    {
      role: 'MANAGER',
      maxDiscountAmount: 1000,
      maxDiscountPercent: 20,
      requireApproval: true,
      approverRoles: ['ADMIN', 'SUPER_ADMIN']
    },
    {
      role: 'CASHIER',
      maxDiscountAmount: 200,
      maxDiscountPercent: 10,
      requireApproval: true,
      approverRoles: ['MANAGER', 'ADMIN', 'SUPER_ADMIN']
    },
    {
      role: 'VIEWER',
      maxDiscountAmount: 0,
      maxDiscountPercent: 0,
      requireApproval: true,
      approverRoles: ['ADMIN', 'SUPER_ADMIN']
    }
  ],
  approvalWorkflow: {
    enabled: true,
    thresholdAmount: 500, // Requerir aprobación para descuentos > $500
    thresholdPercent: 15 // Requerir aprobación para descuentos > 15%
  }
}

export const useDiscountConfig = create<DiscountConfigState>()(
  persist(
    (set, get) => ({
      config: DEFAULT_DISCOUNT_CONFIG,
      isLoading: false,
      error: null,

      setConfig: (config) => set({ config }),

      updateLimit: (role, updates) => {
        const { config } = get()
        const updatedLimits = config.limits.map(limit =>
          limit.role === role ? { ...limit, ...updates } : limit
        )
        set({
          config: {
            ...config,
            limits: updatedLimits
          }
        })
      },

      addLimit: (limit) => {
        const { config } = get()
        const existingIndex = config.limits.findIndex(l => l.role === limit.role)
        
        if (existingIndex >= 0) {
          // Actualizar límite existente
          const updatedLimits = [...config.limits]
          updatedLimits[existingIndex] = limit
          set({
            config: {
              ...config,
              limits: updatedLimits
            }
          })
        } else {
          // Agregar nuevo límite
          set({
            config: {
              ...config,
              limits: [...config.limits, limit]
            }
          })
        }
      },

      removeLimit: (role) => {
        const { config } = get()
        set({
          config: {
            ...config,
            limits: config.limits.filter(limit => limit.role !== role)
          }
        })
      },

      setEnabled: (enabled) => {
        const { config } = get()
        set({
          config: {
            ...config,
            enabled
          }
        })
      },

      setGlobalLimits: (maxAmount, maxPercent) => {
        const { config } = get()
        set({
          config: {
            ...config,
            globalMaxDiscount: maxAmount,
            globalMaxPercent: maxPercent
          }
        })
      },

      setApprovalWorkflow: (workflow) => {
        const { config } = get()
        set({
          config: {
            ...config,
            approvalWorkflow: {
              ...config.approvalWorkflow,
              ...workflow
            }
          }
        })
      },

      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      resetToDefaults: () => set({ config: DEFAULT_DISCOUNT_CONFIG })
    }),
    {
      name: 'discount-config-storage',
      skipHydration: true
    }
  )
)

/**
 * Valida un descuento contra los límites configurados para un rol
 */
export function validateDiscountForRole(
  role: string,
  discountAmount: number,
  discountPercent: number,
  originalPrice: number
): {
  valid: boolean
  message?: string
  requiresApproval?: boolean
  maxAllowed?: number
  maxPercentAllowed?: number
} {
  const { config } = useDiscountConfig.getState()
  
  if (!config.enabled) {
    return { valid: true }
  }

  // Validar límites globales
  if (discountAmount > config.globalMaxDiscount) {
    return { 
      valid: false, 
      message: `El descuento excede el límite global de $${config.globalMaxDiscount}` 
    }
  }

  if (discountPercent > config.globalMaxPercent) {
    return { 
      valid: false, 
      message: `El descuento excede el límite global del ${config.globalMaxPercent}%` 
    }
  }

  // Buscar límite específico para el rol
  const roleLimit = config.limits.find(limit => limit.role === role)
  
  if (!roleLimit) {
    return { 
      valid: false, 
      message: `No hay límites configurados para el rol ${role}` 
    }
  }

  // Validar límite por cantidad
  if (discountAmount > roleLimit.maxDiscountAmount) {
    return { 
      valid: false, 
      message: `El descuento excede el límite permitido para su rol ($${roleLimit.maxDiscountAmount})`,
      maxAllowed: roleLimit.maxDiscountAmount
    }
  }

  // Validar límite por porcentaje
  if (discountPercent > roleLimit.maxDiscountPercent) {
    return { 
      valid: false, 
      message: `El descuento excede el límite de porcentaje permitido para su rol (${roleLimit.maxDiscountPercent}%)`,
      maxPercentAllowed: roleLimit.maxDiscountPercent
    }
  }

  // Verificar si requiere aprobación
  const requiresApproval = roleLimit.requireApproval && 
    (discountAmount > config.approvalWorkflow.thresholdAmount || 
     discountPercent > config.approvalWorkflow.thresholdPercent)

  return { 
    valid: true, 
    requiresApproval,
    maxAllowed: roleLimit.maxDiscountAmount,
    maxPercentAllowed: roleLimit.maxDiscountPercent
  }
}

/**
 * Obtiene el límite de descuento para un rol específico
 */
export function getDiscountLimitForRole(role: string): DiscountLimit | undefined {
  const { config } = useDiscountConfig.getState()
  return config.limits.find(limit => limit.role === role)
}

/**
 * Verifica si un descuento requiere aprobación
 */
export function requiresApproval(
  role: string,
  discountAmount: number,
  discountPercent: number
): boolean {
  const { config } = useDiscountConfig.getState()
  
  if (!config.enabled || !config.approvalWorkflow.enabled) {
    return false
  }

  const roleLimit = config.limits.find(limit => limit.role === role)
  
  if (!roleLimit) {
    return true // Requerir aprobación por defecto si no hay límite configurado
  }

  return roleLimit.requireApproval && 
    (discountAmount > config.approvalWorkflow.thresholdAmount || 
     discountPercent > config.approvalWorkflow.thresholdPercent)
}