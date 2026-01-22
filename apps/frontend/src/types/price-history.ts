export interface PriceHistoryItem {
    id: string;
    productId: string;
    productName: string;
    supplierId: string;
    supplierName: string;
    price: number;
    currency: string;
    effectiveDate: string; // ISO string
    source: 'invoice' | 'quotation' | 'contract' | 'manual';
    documentRef?: string;
    notes?: string;
    status: 'active' | 'archived' | 'pending';
    changeType: 'increase' | 'decrease' | 'stable' | 'initial';
    changePercentage: number;
    unit: string;
    minOrderQuantity?: number;
}

export interface PriceTrend {
    period: string;
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
    supplierCount: number;
}

export interface PriceAlert {
    id: string;
    productId: string;
    productName: string;
    targetPrice: number;
    condition: 'above' | 'below' | 'change_percent';
    threshold?: number; // percentage for change_percent
    isActive: boolean;
    createdAt: string;
    lastTriggered?: string;
    notificationEmail?: string;
}
