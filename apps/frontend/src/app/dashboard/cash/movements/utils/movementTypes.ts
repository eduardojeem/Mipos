// Movement type definitions and constants

export const MOVEMENT_TYPES = {
    SALE: 'SALE',
    IN: 'IN',
    OUT: 'OUT',
    RETURN: 'RETURN',
    ADJUSTMENT: 'ADJUSTMENT',
    OPENING: 'OPENING',
    CLOSING: 'CLOSING',
    DEPOSIT: 'DEPOSIT',
    WITHDRAWAL: 'WITHDRAWAL',
} as const;

export type MovementType = typeof MOVEMENT_TYPES[keyof typeof MOVEMENT_TYPES];

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
    SALE: 'Venta',
    IN: 'Ingreso',
    OUT: 'Egreso',
    RETURN: 'Devolución',
    ADJUSTMENT: 'Ajuste',
    OPENING: 'Apertura',
    CLOSING: 'Cierre',
    DEPOSIT: 'Depósito',
    WITHDRAWAL: 'Retiro',
};

export const MOVEMENT_TYPE_COLORS: Record<MovementType, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    SALE: 'secondary',
    IN: 'default',
    OUT: 'destructive',
    RETURN: 'outline',
    ADJUSTMENT: 'secondary',
    OPENING: 'default',
    CLOSING: 'default',
    DEPOSIT: 'default',
    WITHDRAWAL: 'destructive',
};

export const REFERENCE_TYPES = {
    SALE: 'SALE',
    RETURN: 'RETURN',
    MANUAL: 'MANUAL',
} as const;

export type ReferenceType = typeof REFERENCE_TYPES[keyof typeof REFERENCE_TYPES];
