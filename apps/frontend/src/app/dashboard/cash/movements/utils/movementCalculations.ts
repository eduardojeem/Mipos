import type { CashMovement } from '@/types/cash';

/**
 * Movement type constants
 */
export const MOVEMENT_TYPES = {
    IN: 'IN',
    OUT: 'OUT',
    SALE: 'SALE',
    RETURN: 'RETURN',
    ADJUSTMENT: 'ADJUSTMENT',
} as const;

export type MovementType = typeof MOVEMENT_TYPES[keyof typeof MOVEMENT_TYPES];

/**
 * Movement direction for adjustments
 */
export const MOVEMENT_DIRECTION = {
    INCREASE: 'increase',
    DECREASE: 'decrease',
} as const;

export type MovementDirection = typeof MOVEMENT_DIRECTION[keyof typeof MOVEMENT_DIRECTION];

/**
 * Movement summary interface
 */
export interface MovementSummary {
    in: number;
    out: number;
    sale: number;
    return: number;
    adjustment: number;
    balance: number;
}

/**
 * Validate if a string is a valid movement type
 */
export function isValidMovementType(type: string): type is MovementType {
    return Object.values(MOVEMENT_TYPES).includes(type as MovementType);
}

/**
 * Get the sign multiplier for a movement type
 * @returns 1 for increases, -1 for decreases
 */
export function getMovementSign(type: MovementType): 1 | -1 {
    switch (type) {
        case MOVEMENT_TYPES.IN:
        case MOVEMENT_TYPES.SALE:
            return 1; // Increases balance
        case MOVEMENT_TYPES.OUT:
        case MOVEMENT_TYPES.RETURN:
            return -1; // Decreases balance
        case MOVEMENT_TYPES.ADJUSTMENT:
            return 1; // Sign comes from the amount itself
        default:
            return 1;
    }
}

/**
 * Calculate movement summary from a list of movements
 * 
 * Convention:
 * - All amounts are stored as their actual values in the database
 * - IN, SALE: positive amounts that increase balance
 * - OUT, RETURN: positive amounts that decrease balance
 * - ADJUSTMENT: can be positive (increase) or negative (decrease)
 * 
 * @param movements Array of cash movements
 * @returns Summary with totals and balance
 */
export function calculateMovementSummary(movements: CashMovement[]): MovementSummary {
    return movements.reduce(
        (acc, m) => {
            const rawAmount = Number(m.amount) || 0;

            switch (m.type) {
                case MOVEMENT_TYPES.IN: {
                    const amount = Math.abs(rawAmount);
                    acc.in += amount;
                    acc.balance += amount;
                    break;
                }
                case MOVEMENT_TYPES.OUT: {
                    const amount = Math.abs(rawAmount);
                    acc.out += amount;
                    acc.balance -= amount;
                    break;
                }
                case MOVEMENT_TYPES.SALE: {
                    const amount = Math.abs(rawAmount);
                    acc.sale += amount;
                    acc.balance += amount;
                    break;
                }
                case MOVEMENT_TYPES.RETURN: {
                    const amount = Math.abs(rawAmount);
                    acc.return += amount;
                    acc.balance -= amount;
                    break;
                }
                case MOVEMENT_TYPES.ADJUSTMENT: {
                    // For adjustments, preserve the sign
                    acc.adjustment += rawAmount;
                    acc.balance += rawAmount;
                    break;
                }
            }
            return acc;
        },
        { in: 0, out: 0, sale: 0, return: 0, adjustment: 0, balance: 0 }
    );
}

/**
 * Validate movement amount
 * @throws Error if amount is invalid
 */
export function validateMovementAmount(amount: number, type: MovementType): void {
    if (typeof amount !== 'number' || !Number.isFinite(amount)) {
        throw new Error('El monto es inválido');
    }

    if (amount === 0) {
        throw new Error('El monto debe ser diferente de cero');
    }

    if (Math.abs(amount) > 10000000) {
        throw new Error('El monto es demasiado alto (máximo: $10,000,000)');
    }

    // For non-adjustment types, amount should be positive
    if (type !== MOVEMENT_TYPES.ADJUSTMENT && amount < 0) {
        throw new Error('El monto debe ser positivo');
    }
}

/**
 * Normalize movement amount based on type
 * Ensures consistent storage: positive for IN/OUT/SALE/RETURN, signed for ADJUSTMENT
 */
export function normalizeMovementAmount(amount: number, type: MovementType, direction?: MovementDirection): number {
    if (type === MOVEMENT_TYPES.ADJUSTMENT) {
        // For adjustments, use direction to determine sign
        if (direction === MOVEMENT_DIRECTION.DECREASE) {
            return -Math.abs(amount);
        }
        return Math.abs(amount);
    }

    // For other types, always store as positive
    return Math.abs(amount);
}
