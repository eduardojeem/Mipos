export interface CashError {
    code: string;
    message: string;
    status?: number;
    details?: unknown;
}

export type MovementType = 'IN' | 'OUT' | 'SALE' | 'RETURN' | 'ADJUSTMENT';

export interface CashMutationPayload {
    type: MovementType;
    amount: number;
    reason?: string;
    direction?: 'increase' | 'decrease';
}

export interface CashSessionState {
    session: import('@/types/cash').CashSession | null;
    isLoading: boolean;
    error: CashError | null;
}

export interface CashMovementsState {
    movements: import('@/types/cash').CashMovement[];
    isLoading: boolean;
    isFetching: boolean;
    error: CashError | null;
}

export interface CashFilterState {
    type: string;
    from: string;
    to: string;
    search: string;
    amountMin: string;
    amountMax: string;
    referenceType: string;
    userId: string;
}

export interface CashSummary {
    in: number;
    out: number;
    adjustment: number;
    sale: number;
    return: number;
    balance: number;
}

export interface LoadingStates {
    openingSession: boolean;
    closingSession: boolean;
    registeringMovement: boolean;
    fetchingData: boolean;
}

export interface ExportOptions {
    filename?: string;
    includeFilters?: boolean;
    format?: 'csv' | 'excel';
}
