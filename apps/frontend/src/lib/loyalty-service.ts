export interface LoyaltyPoints {
  id: string;
  customerId: string;
  points: number;
  earnedPoints: number;
  redeemedPoints: number;
  expiringPoints: number;
  expirationDate?: string;
  lastUpdated: string;
}

export interface PointsTransaction {
  id: string;
  customerId: string;
  type: 'earned' | 'redeemed' | 'expired' | 'bonus' | 'adjustment';
  points: number;
  description: string;
  orderId?: string;
  rewardId?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  type: 'discount' | 'product' | 'service' | 'cashback';
  value: number; // Percentage for discount, amount for cashback
  productId?: string;
  isActive: boolean;
  validFrom: string;
  validUntil?: string;
  usageLimit?: number;
  usedCount: number;
  conditions?: {
    minPurchase?: number;
    applicableCategories?: string[];
    customerTiers?: string[];
  };
  imageUrl?: string;
}

export interface LoyaltyTier {
  id: string;
  name: string;
  minPoints: number;
  maxPoints?: number;
  benefits: {
    pointsMultiplier: number; // 1.0 = normal, 1.5 = 50% bonus
    discountPercentage: number;
    freeShipping: boolean;
    prioritySupport: boolean;
    exclusiveRewards: boolean;
    birthdayBonus: number;
  };
  color: string;
  icon: string;
}

export interface CustomerLoyalty {
  customerId: string;
  currentTier: string;
  totalPointsEarned: number;
  currentPoints: number;
  pointsToNextTier: number;
  memberSince: string;
  lastActivity: string;
  achievements: string[];
  preferences: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    preferredRewardTypes: string[];
  };
}

export interface LoyaltyProgram {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  pointsPerDollar: number;
  pointsExpireDays?: number;
  welcomeBonus: number;
  birthdayBonus: number;
  referralBonus: number;
  minimumRedemption: number;
  tiers: LoyaltyTier[];
  rules: {
    earnOnPurchase: boolean;
    earnOnReferral: boolean;
    earnOnReview: boolean;
    earnOnSocialShare: boolean;
    doublePointsDays?: string[]; // ['monday', 'friday']
    bonusCategories?: { categoryId: string; multiplier: number }[];
  };
}

export interface LoyaltyStats {
  totalMembers: number;
  activeMembers: number;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  averagePointsPerCustomer: number;
  topRewards: Array<{
    rewardId: string;
    name: string;
    redemptions: number;
  }>;
  tierDistribution: Array<{
    tierId: string;
    name: string;
    count: number;
    percentage: number;
  }>;
  monthlyActivity: Array<{
    month: string;
    pointsEarned: number;
    pointsRedeemed: number;
    newMembers: number;
  }>;
}

class LoyaltyService {
  private readonly STORAGE_KEYS = {
    POINTS: 'loyalty_points',
    TRANSACTIONS: 'loyalty_transactions',
    REWARDS: 'loyalty_rewards',
    TIERS: 'loyalty_tiers',
    CUSTOMER_LOYALTY: 'customer_loyalty',
    PROGRAM: 'loyalty_program'
  };

  // Default loyalty program configuration
  private defaultProgram: LoyaltyProgram = {
    id: 'default',
    name: 'Programa de Fidelidad',
    description: 'Gana puntos con cada compra y canjéalos por increíbles recompensas',
    isActive: true,
    pointsPerDollar: 1,
    pointsExpireDays: 365,
    welcomeBonus: 100,
    birthdayBonus: 50,
    referralBonus: 200,
    minimumRedemption: 100,
    tiers: [
      {
        id: 'bronze',
        name: 'Bronce',
        minPoints: 0,
        maxPoints: 999,
        benefits: {
          pointsMultiplier: 1.0,
          discountPercentage: 0,
          freeShipping: false,
          prioritySupport: false,
          exclusiveRewards: false,
          birthdayBonus: 50
        },
        color: '#CD7F32',
        icon: '🥉'
      },
      {
        id: 'silver',
        name: 'Plata',
        minPoints: 1000,
        maxPoints: 2999,
        benefits: {
          pointsMultiplier: 1.2,
          discountPercentage: 5,
          freeShipping: false,
          prioritySupport: false,
          exclusiveRewards: false,
          birthdayBonus: 75
        },
        color: '#C0C0C0',
        icon: '🥈'
      },
      {
        id: 'gold',
        name: 'Oro',
        minPoints: 3000,
        maxPoints: 7999,
        benefits: {
          pointsMultiplier: 1.5,
          discountPercentage: 10,
          freeShipping: true,
          prioritySupport: true,
          exclusiveRewards: false,
          birthdayBonus: 100
        },
        color: '#FFD700',
        icon: '🥇'
      },
      {
        id: 'platinum',
        name: 'Platino',
        minPoints: 8000,
        benefits: {
          pointsMultiplier: 2.0,
          discountPercentage: 15,
          freeShipping: true,
          prioritySupport: true,
          exclusiveRewards: true,
          birthdayBonus: 150
        },
        color: '#E5E4E2',
        icon: '💎'
      }
    ],
    rules: {
      earnOnPurchase: true,
      earnOnReferral: true,
      earnOnReview: true,
      earnOnSocialShare: false,
      doublePointsDays: ['friday'],
      bonusCategories: []
    }
  };

  private defaultRewards: LoyaltyReward[] = [
    {
      id: '1',
      name: '5% de Descuento',
      description: 'Obtén 5% de descuento en tu próxima compra',
      pointsCost: 500,
      type: 'discount',
      value: 5,
      isActive: true,
      validFrom: new Date().toISOString(),
      usageLimit: 1,
      usedCount: 0,
      conditions: {
        minPurchase: 50
      }
    },
    {
      id: '2',
      name: '10% de Descuento',
      description: 'Obtén 10% de descuento en tu próxima compra',
      pointsCost: 1000,
      type: 'discount',
      value: 10,
      isActive: true,
      validFrom: new Date().toISOString(),
      usageLimit: 1,
      usedCount: 0,
      conditions: {
        minPurchase: 100
      }
    },
    {
      id: '3',
      name: 'Envío Gratis',
      description: 'Envío gratuito en tu próximo pedido',
      pointsCost: 300,
      type: 'service',
      value: 0,
      isActive: true,
      validFrom: new Date().toISOString(),
      usageLimit: 1,
      usedCount: 0
    },
    {
      id: '4',
      name: '$10 de Cashback',
      description: 'Recibe $10 de crédito en tu cuenta',
      pointsCost: 1500,
      type: 'cashback',
      value: 10,
      isActive: true,
      validFrom: new Date().toISOString(),
      usageLimit: 1,
      usedCount: 0
    }
  ];

  // Initialize service with default data
  init(): void {
    if (!localStorage.getItem(this.STORAGE_KEYS.PROGRAM)) {
      localStorage.setItem(this.STORAGE_KEYS.PROGRAM, JSON.stringify(this.defaultProgram));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.REWARDS)) {
      localStorage.setItem(this.STORAGE_KEYS.REWARDS, JSON.stringify(this.defaultRewards));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.TRANSACTIONS)) {
      localStorage.setItem(this.STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.CUSTOMER_LOYALTY)) {
      localStorage.setItem(this.STORAGE_KEYS.CUSTOMER_LOYALTY, JSON.stringify([]));
    }
  }

  // Program Management
  getProgram(): LoyaltyProgram {
    const stored = localStorage.getItem(this.STORAGE_KEYS.PROGRAM);
    return stored ? JSON.parse(stored) : this.defaultProgram;
  }

  updateProgram(program: Partial<LoyaltyProgram>): void {
    const current = this.getProgram();
    const updated = { ...current, ...program };
    localStorage.setItem(this.STORAGE_KEYS.PROGRAM, JSON.stringify(updated));
  }

  // Customer Loyalty Management
  getCustomerLoyalty(customerId: string): CustomerLoyalty | null {
    const stored = localStorage.getItem(this.STORAGE_KEYS.CUSTOMER_LOYALTY);
    const loyalties: CustomerLoyalty[] = stored ? JSON.parse(stored) : [];
    return loyalties.find(l => l.customerId === customerId) || null;
  }

  initializeCustomerLoyalty(customerId: string): CustomerLoyalty {
    const program = this.getProgram();
    const newLoyalty: CustomerLoyalty = {
      customerId,
      currentTier: program.tiers[0].id,
      totalPointsEarned: program.welcomeBonus,
      currentPoints: program.welcomeBonus,
      pointsToNextTier: program.tiers[1]?.minPoints - program.welcomeBonus || 0,
      memberSince: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      achievements: ['welcome'],
      preferences: {
        emailNotifications: true,
        smsNotifications: false,
        preferredRewardTypes: ['discount']
      }
    };

    // Add welcome bonus transaction
    if (program.welcomeBonus > 0) {
      this.addPointsTransaction({
        id: `welcome_${customerId}_${Date.now()}`,
        customerId,
        type: 'bonus',
        points: program.welcomeBonus,
        description: 'Bono de bienvenida',
        createdAt: new Date().toISOString()
      });
    }

    this.saveCustomerLoyalty(newLoyalty);
    return newLoyalty;
  }

  private saveCustomerLoyalty(loyalty: CustomerLoyalty): void {
    const stored = localStorage.getItem(this.STORAGE_KEYS.CUSTOMER_LOYALTY);
    const loyalties: CustomerLoyalty[] = stored ? JSON.parse(stored) : [];
    const index = loyalties.findIndex(l => l.customerId === loyalty.customerId);
    
    if (index >= 0) {
      loyalties[index] = loyalty;
    } else {
      loyalties.push(loyalty);
    }
    
    localStorage.setItem(this.STORAGE_KEYS.CUSTOMER_LOYALTY, JSON.stringify(loyalties));
  }

  // Points Management
  addPoints(customerId: string, points: number, description: string, orderId?: string): void {
    const program = this.getProgram();
    let loyalty = this.getCustomerLoyalty(customerId);
    
    if (!loyalty) {
      loyalty = this.initializeCustomerLoyalty(customerId);
    }

    // Apply tier multiplier
    const tier = this.getTierById(loyalty.currentTier);
    const finalPoints = Math.floor(points * (tier?.benefits.pointsMultiplier || 1));

    // Update loyalty points
    loyalty.totalPointsEarned += finalPoints;
    loyalty.currentPoints += finalPoints;
    loyalty.lastActivity = new Date().toISOString();

    // Check for tier upgrade
    this.checkTierUpgrade(loyalty);

    // Add transaction
    this.addPointsTransaction({
      id: `earn_${customerId}_${Date.now()}`,
      customerId,
      type: 'earned',
      points: finalPoints,
      description,
      orderId,
      createdAt: new Date().toISOString(),
      expiresAt: program.pointsExpireDays ? 
        new Date(Date.now() + program.pointsExpireDays * 24 * 60 * 60 * 1000).toISOString() : 
        undefined
    });

    this.saveCustomerLoyalty(loyalty);
  }

  redeemPoints(customerId: string, points: number, description: string, rewardId?: string): boolean {
    const loyalty = this.getCustomerLoyalty(customerId);
    
    if (!loyalty || loyalty.currentPoints < points) {
      return false;
    }

    loyalty.currentPoints -= points;
    loyalty.lastActivity = new Date().toISOString();

    this.addPointsTransaction({
      id: `redeem_${customerId}_${Date.now()}`,
      customerId,
      type: 'redeemed',
      points: -points,
      description,
      rewardId,
      createdAt: new Date().toISOString()
    });

    this.saveCustomerLoyalty(loyalty);
    return true;
  }

  private addPointsTransaction(transaction: PointsTransaction): void {
    const stored = localStorage.getItem(this.STORAGE_KEYS.TRANSACTIONS);
    const transactions: PointsTransaction[] = stored ? JSON.parse(stored) : [];
    transactions.push(transaction);
    localStorage.setItem(this.STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }

  getPointsTransactions(customerId: string): PointsTransaction[] {
    const stored = localStorage.getItem(this.STORAGE_KEYS.TRANSACTIONS);
    const transactions: PointsTransaction[] = stored ? JSON.parse(stored) : [];
    return transactions
      .filter(t => t.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Tier Management
  getTierById(tierId: string): LoyaltyTier | null {
    const program = this.getProgram();
    return program.tiers.find(t => t.id === tierId) || null;
  }

  private checkTierUpgrade(loyalty: CustomerLoyalty): void {
    const program = this.getProgram();
    const currentTier = this.getTierById(loyalty.currentTier);
    
    // Find the highest tier the customer qualifies for
    const qualifyingTiers = program.tiers
      .filter(tier => loyalty.totalPointsEarned >= tier.minPoints)
      .sort((a, b) => b.minPoints - a.minPoints);
    
    if (qualifyingTiers.length > 0) {
      const newTier = qualifyingTiers[0];
      
      if (newTier.id !== loyalty.currentTier) {
        loyalty.currentTier = newTier.id;
        loyalty.achievements.push(`tier_${newTier.id}`);
        
        // Add tier upgrade transaction
        this.addPointsTransaction({
          id: `tier_upgrade_${loyalty.customerId}_${Date.now()}`,
          customerId: loyalty.customerId,
          type: 'bonus',
          points: 0,
          description: `Ascendido a nivel ${newTier.name}`,
          createdAt: new Date().toISOString()
        });
      }
    }

    // Calculate points to next tier
    const nextTier = program.tiers.find(tier => tier.minPoints > loyalty.totalPointsEarned);
    loyalty.pointsToNextTier = nextTier ? nextTier.minPoints - loyalty.totalPointsEarned : 0;
  }

  // Rewards Management
  getRewards(): LoyaltyReward[] {
    const stored = localStorage.getItem(this.STORAGE_KEYS.REWARDS);
    return stored ? JSON.parse(stored) : this.defaultRewards;
  }

  getAvailableRewards(customerId: string): LoyaltyReward[] {
    const loyalty = this.getCustomerLoyalty(customerId);
    if (!loyalty) return [];

    const tier = this.getTierById(loyalty.currentTier);
    const allRewards = this.getRewards();

    return allRewards.filter(reward => {
      // Check if reward is active
      if (!reward.isActive) return false;

      // Check if customer has enough points
      if (loyalty.currentPoints < reward.pointsCost) return false;

      // Check tier restrictions
      if (reward.conditions?.customerTiers && 
          !reward.conditions.customerTiers.includes(loyalty.currentTier)) {
        return false;
      }

      // Check if reward is still valid
      if (reward.validUntil && new Date(reward.validUntil) < new Date()) {
        return false;
      }

      // Check usage limit
      if (reward.usageLimit && reward.usedCount >= reward.usageLimit) {
        return false;
      }

      return true;
    });
  }

  redeemReward(customerId: string, rewardId: string): boolean {
    const reward = this.getRewards().find(r => r.id === rewardId);
    if (!reward) return false;

    const success = this.redeemPoints(
      customerId, 
      reward.pointsCost, 
      `Canje: ${reward.name}`,
      rewardId
    );

    if (success) {
      // Update reward usage count
      const rewards = this.getRewards();
      const rewardIndex = rewards.findIndex(r => r.id === rewardId);
      if (rewardIndex >= 0) {
        rewards[rewardIndex].usedCount++;
        localStorage.setItem(this.STORAGE_KEYS.REWARDS, JSON.stringify(rewards));
      }
    }

    return success;
  }

  // Statistics
  getLoyaltyStats(): LoyaltyStats {
    const stored = localStorage.getItem(this.STORAGE_KEYS.CUSTOMER_LOYALTY);
    const loyalties: CustomerLoyalty[] = stored ? JSON.parse(stored) : [];
    const transactions = this.getAllTransactions();
    const program = this.getProgram();

    const totalPointsIssued = transactions
      .filter(t => t.type === 'earned' || t.type === 'bonus')
      .reduce((sum, t) => sum + t.points, 0);

    const totalPointsRedeemed = transactions
      .filter(t => t.type === 'redeemed')
      .reduce((sum, t) => sum + Math.abs(t.points), 0);

    const tierDistribution = program.tiers.map(tier => {
      const count = loyalties.filter(l => l.currentTier === tier.id).length;
      return {
        tierId: tier.id,
        name: tier.name,
        count,
        percentage: loyalties.length > 0 ? (count / loyalties.length) * 100 : 0
      };
    });

    return {
      totalMembers: loyalties.length,
      activeMembers: loyalties.filter(l => {
        const lastActivity = new Date(l.lastActivity);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return lastActivity > thirtyDaysAgo;
      }).length,
      totalPointsIssued,
      totalPointsRedeemed,
      averagePointsPerCustomer: loyalties.length > 0 ? 
        loyalties.reduce((sum, l) => sum + l.currentPoints, 0) / loyalties.length : 0,
      topRewards: this.getTopRewards(),
      tierDistribution,
      monthlyActivity: this.getMonthlyActivity()
    };
  }

  private getAllTransactions(): PointsTransaction[] {
    const stored = localStorage.getItem(this.STORAGE_KEYS.TRANSACTIONS);
    return stored ? JSON.parse(stored) : [];
  }

  private getTopRewards(): Array<{ rewardId: string; name: string; redemptions: number }> {
    const rewards = this.getRewards();
    return rewards
      .map(reward => ({
        rewardId: reward.id,
        name: reward.name,
        redemptions: reward.usedCount
      }))
      .sort((a, b) => b.redemptions - a.redemptions)
      .slice(0, 5);
  }

  private getMonthlyActivity(): Array<{
    month: string;
    pointsEarned: number;
    pointsRedeemed: number;
    newMembers: number;
  }> {
    const transactions = this.getAllTransactions();
    const loyalties = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.CUSTOMER_LOYALTY) || '[]');
    
    const monthlyData: Record<string, any> = {};
    
    // Process transactions
    transactions.forEach(transaction => {
      const date = new Date(transaction.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          pointsEarned: 0,
          pointsRedeemed: 0,
          newMembers: 0
        };
      }
      
      if (transaction.type === 'earned' || transaction.type === 'bonus') {
        monthlyData[monthKey].pointsEarned += transaction.points;
      } else if (transaction.type === 'redeemed') {
        monthlyData[monthKey].pointsRedeemed += Math.abs(transaction.points);
      }
    });
    
    // Process new members
    loyalties.forEach((loyalty: CustomerLoyalty) => {
      const date = new Date(loyalty.memberSince);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].newMembers++;
      }
    });
    
    return Object.values(monthlyData)
      .sort((a: any, b: any) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months
  }

  // Special Events
  addBirthdayBonus(customerId: string): void {
    const loyalty = this.getCustomerLoyalty(customerId);
    if (!loyalty) return;

    const tier = this.getTierById(loyalty.currentTier);
    const bonus = tier?.benefits.birthdayBonus || 50;

    this.addPoints(customerId, bonus, 'Bono de cumpleaños 🎂');
  }

  addReferralBonus(referrerId: string, referredId: string): void {
    const program = this.getProgram();
    
    // Bonus for referrer
    this.addPoints(referrerId, program.referralBonus, `Bono por referir cliente`);
    
    // Bonus for referred (usually smaller)
    this.addPoints(referredId, Math.floor(program.referralBonus * 0.5), 'Bono por ser referido');
  }
}

export const loyaltyService = new LoyaltyService();

// Initialize on import
loyaltyService.init();