// Centralized Supplier Types
export interface Supplier {
  id: string;
  name: string;
  category: string;
  status: 'active' | 'inactive' | 'pending';
  contactInfo: {
    email?: string;
    phone?: string;
    address?: string;
    contactPerson?: string;
    website?: string;
  };
  taxId?: string;
  notes?: string;
  commercialConditions?: {
    paymentTerms?: number;
    creditLimit?: number;
    discount?: number;
  };
  rating?: number;
  totalOrders?: number;
  totalPurchases?: number;
  lastPurchase?: string;
  location?: string;
  registrationDate?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    purchases: number;
  };
}

export interface SupplierWithStats extends Supplier {
  averageOrderValue?: number;
  orderFrequency?: number;
  paymentTerms?: number;
  deliveryPerformance?: number;
  qualityScore?: number;
  responseTime?: number;
  contractValue?: number;
  riskLevel?: 'low' | 'medium' | 'high';
}

export interface SupplierStats {
  totalSuppliers: number;
  newThisMonth: number;
  activeSuppliers: number;
  totalPurchases: number;
  totalOrders: number;
}

export interface SupplierFilters {
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  category?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'totalPurchases' | 'totalOrders' | 'lastPurchase' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// Contract Types
export interface Contract {
  id: string;
  contractNumber: string;
  title: string;
  description: string;
  type: 'supply' | 'service' | 'maintenance' | 'consulting' | 'lease' | 'partnership' | 'other';
  status: 'draft' | 'active' | 'expired' | 'terminated' | 'renewed' | 'pending_renewal';
  supplierId: string;
  supplierName: string;
  supplierEmail?: string;
  supplierPhone?: string;
  supplierAddress?: string;
  startDate: string;
  endDate: string;
  renewalDate?: string;
  autoRenewal: boolean;
  renewalPeriod?: number;
  value: number;
  currency: string;
  paymentTerms: string;
  paymentSchedule: 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'milestone' | 'one_time';
  deliveryTerms?: string;
  penaltyClause?: string;
  terminationClause?: string;
  confidentialityClause?: string;
  sla?: ServiceLevelAgreement;
  terms: ContractTerm[];
  documents: ContractDocument[];
  milestones: ContractMilestone[];
  amendments: ContractAmendment[];
  notifications: ContractNotification[];
  createdBy: string;
  createdByName: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceLevelAgreement {
  deliveryTime: number;
  qualityStandard: string;
  responseTime: number;
  availabilityPercentage: number;
  penaltyPercentage: number;
}

export interface ContractTerm {
  id: string;
  title: string;
  description: string;
  order: number;
}

export interface ContractDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface ContractMilestone {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  completedAt?: string;
}

export interface ContractAmendment {
  id: string;
  description: string;
  effectiveDate: string;
  createdBy: string;
  createdAt: string;
}

export interface ContractNotification {
  id: string;
  type: 'renewal' | 'expiration' | 'milestone' | 'payment' | 'other';
  message: string;
  sentAt: string;
  readAt?: string;
}

// Segmentation Types
export interface SegmentationRule {
  id: string;
  name: string;
  description: string;
  conditions: SegmentCondition[];
  isActive: boolean;
  priority: number;
  createdAt: string;
  lastUpdated: string;
  supplierCount: number;
}

export interface SegmentCondition {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'between' | 'contains' | 'in';
  value: any;
}

export interface SupplierSegment {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  suppliers: Supplier[];
  rules: SegmentationRule[];
  stats: {
    totalSuppliers: number;
    totalSpend: number;
    averageRating: number;
    activeContracts: number;
  };
}

// Alert Types
export interface SupplierAlert {
  id: string;
  type: 'contract_expiry' | 'payment_due' | 'quality_issue' | 'delivery_delay' | 'price_change' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  supplierId: string;
  supplierName: string;
  title: string;
  message: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  status: 'active' | 'resolved' | 'dismissed';
}

// Communication Types
export interface SupplierMessage {
  id: string;
  supplierId: string;
  supplierName: string;
  subject: string;
  body: string;
  type: 'email' | 'sms' | 'notification' | 'internal';
  status: 'draft' | 'sent' | 'delivered' | 'read' | 'failed';
  sentBy: string;
  sentByName: string;
  sentAt?: string;
  readAt?: string;
  attachments?: MessageAttachment[];
  createdAt: string;
}

export interface MessageAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

// Performance Types
export interface SupplierPerformance {
  supplierId: string;
  supplierName: string;
  period: {
    start: string;
    end: string;
  };
  metrics: {
    deliveryOnTime: number;
    qualityScore: number;
    responseTime: number;
    orderAccuracy: number;
    priceCompetitiveness: number;
    overallScore: number;
  };
  trends: {
    deliveryTrend: 'up' | 'down' | 'stable';
    qualityTrend: 'up' | 'down' | 'stable';
    priceTrend: 'up' | 'down' | 'stable';
  };
  issues: PerformanceIssue[];
}

export interface PerformanceIssue {
  id: string;
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  occurredAt: string;
  resolvedAt?: string;
}

// Price History Types
export interface PriceHistory {
  id: string;
  supplierId: string;
  supplierName: string;
  productId?: string;
  productName?: string;
  price: number;
  currency: string;
  effectiveDate: string;
  endDate?: string;
  changePercentage?: number;
  reason?: string;
  recordedBy: string;
  recordedAt: string;
}

// Comparison Types
export interface SupplierComparison {
  suppliers: Supplier[];
  metrics: ComparisonMetric[];
  winner?: {
    supplierId: string;
    score: number;
  };
}

export interface ComparisonMetric {
  name: string;
  weight: number;
  values: {
    supplierId: string;
    value: number;
    score: number;
  }[];
}

// Tag Types
export interface SupplierTag {
  id: string;
  name: string;
  color: string;
  category: 'performance' | 'location' | 'product' | 'relationship' | 'custom';
  description?: string;
  supplierCount: number;
  createdAt: string;
  updatedAt: string;
}
