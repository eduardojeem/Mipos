/**
 * Transformadores de datos para normalizar entre backend y frontend
 */

// DTOs del backend (snake_case)
export interface LoyaltyProgramDTO {
  id: string;
  name: string;
  description?: string;
  points_per_purchase?: number;
  pointsPerPurchase?: number;
  minimum_purchase?: number;
  minimumPurchase?: number;
  is_active?: boolean;
  isActive?: boolean;
  welcome_bonus?: number;
  welcomeBonus?: number;
  birthday_bonus?: number;
  birthdayBonus?: number;
  referral_bonus?: number;
  referralBonus?: number;
  points_expiration_days?: number;
  pointsExpirationDays?: number;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export interface LoyaltyRewardDTO {
  id: string;
  name: string;
  description?: string;
  type: string;
  value: number;
  points_cost?: number;
  pointsCost?: number;
  is_active?: boolean;
  isActive?: boolean;
  current_redemptions?: number;
  currentRedemptions?: number;
  category_id?: string;
  categoryId?: string;
  valid_until?: string;
  validUntil?: string;
}

// Modelos del frontend (camelCase)
export interface LoyaltyProgram {
  id: string;
  name: string;
  description: string;
  pointsPerPurchase: number;
  minimumPurchase: number;
  isActive: boolean;
  members: number;
  createdAt: string;
  tier?: string;
  color?: string;
  welcomeBonus?: number;
  birthdayBonus?: number;
  referralBonus?: number;
  pointsExpirationDays?: number;
}

export interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  type: string;
  value: number;
  pointsCost: number;
  isActive: boolean;
  timesRedeemed: number;
  category?: string;
  expiresAt?: string;
}

/**
 * Transforma un programa de lealtad del backend al frontend
 */
export function transformLoyaltyProgram(dto: LoyaltyProgramDTO): LoyaltyProgram {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description || '',
    pointsPerPurchase: Number(dto.pointsPerPurchase ?? dto.points_per_purchase ?? 0),
    minimumPurchase: Number(dto.minimumPurchase ?? dto.minimum_purchase ?? 0),
    isActive: Boolean(dto.isActive ?? dto.is_active ?? true),
    members: 0, // Se calcula por separado
    createdAt: dto.createdAt || dto.created_at || '',
    tier: '',
    color: '#3b82f6',
    welcomeBonus: Number(dto.welcomeBonus ?? dto.welcome_bonus ?? 0),
    birthdayBonus: Number(dto.birthdayBonus ?? dto.birthday_bonus ?? 0),
    referralBonus: Number(dto.referralBonus ?? dto.referral_bonus ?? 0),
    pointsExpirationDays: Number(dto.pointsExpirationDays ?? dto.points_expiration_days ?? 0),
  };
}

/**
 * Transforma una recompensa del backend al frontend
 */
export function transformLoyaltyReward(dto: LoyaltyRewardDTO): LoyaltyReward {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description || '',
    type: dto.type,
    value: Number(dto.value || 0),
    pointsCost: Number(dto.pointsCost ?? dto.points_cost ?? 0),
    isActive: Boolean(dto.isActive ?? true),
    timesRedeemed: Number(dto.currentRedemptions ?? dto.current_redemptions ?? 0),
    category: dto.categoryId || dto.category_id || undefined,
    expiresAt: dto.validUntil || dto.valid_until || undefined,
  };
}

/**
 * Transforma múltiples programas
 */
export function transformLoyaltyPrograms(dtos: LoyaltyProgramDTO[]): LoyaltyProgram[] {
  return (dtos || []).map(transformLoyaltyProgram);
}

/**
 * Transforma múltiples recompensas
 */
export function transformLoyaltyRewards(dtos: LoyaltyRewardDTO[]): LoyaltyReward[] {
  return (dtos || []).map(transformLoyaltyReward);
}
