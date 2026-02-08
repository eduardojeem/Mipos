/**
 * Helpers centralizados para formateo de datos de ventas
 * Elimina duplicación entre componentes y hooks
 */

/**
 * Formatea el estado de una venta
 */
export function formatStatus(status: string): string {
    switch (status) {
        case 'COMPLETED':
            return 'Completada';
        case 'PENDING':
            return 'Pendiente';
        case 'CANCELLED':
            return 'Cancelada';
        case 'REFUNDED':
            return 'Reembolsada';
        default:
            return status;
    }
}

/**
 * Formatea el método de pago
 */
export function formatPaymentMethod(method: string): string {
    switch (method) {
        case 'CASH':
            return 'Efectivo';
        case 'CARD':
            return 'Tarjeta';
        case 'TRANSFER':
            return 'Transferencia';
        case 'DIGITAL_WALLET':
            return 'Billetera Digital';
        case 'OTHER':
            return 'Otro';
        default:
            return method;
    }
}

/**
 * Formatea el tipo de venta
 */
export function formatSaleType(type: string): string {
    switch (type) {
        case 'RETAIL':
            return 'Minorista';
        case 'WHOLESALE':
            return 'Mayorista';
        default:
            return type;
    }
}

/**
 * Obtiene la variante de badge según el estado
 */
export function getStatusBadgeVariant(
    status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (status) {
        case 'COMPLETED':
            return 'default';
        case 'PENDING':
            return 'secondary';
        case 'CANCELLED':
        case 'REFUNDED':
            return 'destructive';
        default:
            return 'outline';
    }
}
