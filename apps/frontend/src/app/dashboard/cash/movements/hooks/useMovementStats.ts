import { useMemo } from 'react';
import type { CashMovement } from '@/types/cash';
import { calculateMovementStats } from '../utils/movementHelpers';

export function useMovementStats(movements: CashMovement[]) {
    return useMemo(() => calculateMovementStats(movements), [movements]);
}
