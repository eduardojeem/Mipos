// Servicio orientado a API HTTP; evita instanciar clientes Supabase en el cliente

export interface CompanyProfile {
  id: string;
  name: string;
  rfc?: string;
  industry: string;
  size: 'micro' | 'small' | 'medium' | 'large';
  logo_url?: string;
  primary_color: string;
  plan_type: string;
  subscription_start?: string;
  subscription_end?: string;
}

export interface PlanLimit {
  feature_type: string;
  limit_value: number;
  current_usage: number;
  period: string;
  reset_date: string;
  usage_percentage: number;
  is_unlimited: boolean;
}

export interface PlanData {
  plan_type: string;
  subscription_start: string;
  subscription_end: string;
  limits: PlanLimit[];
}

export interface FeatureAvailability {
  available: boolean;
  current_usage: number;
  limit_value: number;
  usage_percentage: number;
  message?: string;
}

class PlanService {

  private buildHeaders(organizationId?: string | null) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const org = (organizationId || '').trim();
    if (org) headers['x-organization-id'] = org;
    return headers;
  }

  /**
   * Get current user's company profile
   */
  async getCompanyProfile(organizationId?: string | null): Promise<CompanyProfile | null> {
    try {
      const response = await fetch('/api/company/profile', {
        method: 'GET',
        headers: this.buildHeaders(organizationId),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }

        if (response.status === 401 || response.status === 403) {
          return null;
        }

        const fallbackMessage = 'Error al obtener perfil de empresa';
        try {
          const errorBody = await response.json();
          throw new Error(errorBody?.error || fallbackMessage);
        } catch {
          throw new Error(fallbackMessage);
        }
      }

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.warn('Company profile unavailable:', error);
      return null;
    }
  }

  /**
   * Update company profile
   */
  async updateCompanyProfile(profile: Partial<CompanyProfile>, organizationId?: string | null): Promise<boolean> {
    try {
      const response = await fetch('/api/company/profile', {
        method: 'PUT',
        headers: this.buildHeaders(organizationId),
        body: JSON.stringify(profile),
      });

      if (!response.ok) {
        let serverMsg = 'Error al actualizar perfil de empresa';
        try {
          const errJson = await response.json();
          serverMsg = errJson?.error || serverMsg;
        } catch {}
        throw new Error(serverMsg);
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Error updating company profile:', error);
      return false;
    }
  }

  /**
   * Get current plan limits and usage
   */
  async getPlanLimits(organizationId?: string | null): Promise<PlanData | null> {
    try {
      const response = await fetch('/api/plan/limits', {
        method: 'GET',
        headers: this.buildHeaders(organizationId),
      });

      if (!response.ok) {
        let serverMsg = 'Error al obtener límites del plan';
        try {
          const errJson = await response.json();
          serverMsg = errJson?.error || serverMsg;
        } catch {}
        throw new Error(serverMsg);
      }

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Error getting plan limits:', error);
      return null;
    }
  }

  /**
   * Track feature usage
   */
  async trackFeatureUsage(featureType: string, quantity: number = 1, organizationId?: string | null): Promise<boolean> {
    try {
      const response = await fetch('/api/plan/limits', {
        method: 'POST',
        headers: this.buildHeaders(organizationId),
        body: JSON.stringify({
          feature_type: featureType,
          quantity,
          action: 'increment'
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Error tracking feature usage:', error);
      return false;
    }
  }

  /**
   * Check if feature is available
   */
  async checkFeatureAvailability(
    featureType: string,
    requestedQuantity: number = 1,
    organizationId?: string | null
  ): Promise<FeatureAvailability> {
    try {
      const planData = await this.getPlanLimits(organizationId);
      
      if (!planData) {
        return {
          available: false,
          current_usage: 0,
          limit_value: 0,
          usage_percentage: 0,
          message: 'No se pudo obtener información del plan'
        };
      }

      const limit = planData.limits.find(l => l.feature_type === featureType);
      
      if (!limit) {
        return {
          available: false,
          current_usage: 0,
          limit_value: 0,
          usage_percentage: 0,
          message: 'Característica no encontrada en el plan actual'
        };
      }

      const wouldExceed = !limit.is_unlimited && 
        (limit.current_usage + requestedQuantity) > limit.limit_value;

      return {
        available: !wouldExceed,
        current_usage: limit.current_usage,
        limit_value: limit.limit_value,
        usage_percentage: limit.usage_percentage,
        message: wouldExceed ? 'Límite de plan excedido' : undefined
      };
    } catch (error) {
      console.error('Error checking feature availability:', error);
      return {
        available: false,
        current_usage: 0,
        limit_value: 0,
        usage_percentage: 0,
        message: 'Error al verificar disponibilidad'
      };
    }
  }

  /**
   * Get plan upgrade recommendations
   */
  getUpgradeRecommendations(currentPlan: string, usageData: PlanData): string[] {
    const recommendations: string[] = [];
    const highUsageThreshold = 80;

    // Check for high usage across different features
    const highUsageFeatures = usageData.limits.filter(
      limit => !limit.is_unlimited && limit.usage_percentage >= highUsageThreshold
    );

    if (highUsageFeatures.length > 0) {
      if (currentPlan === 'free') {
        recommendations.push('Considera actualizar a Premium para obtener más límites');
      } else if (currentPlan === 'premium') {
        recommendations.push('Considera Enterprise para límites ilimitados');
      }
    }

    // Specific recommendations based on feature usage
    const userLimit = usageData.limits.find(l => l.feature_type === 'users');
    if (userLimit && userLimit.usage_percentage >= 90) {
      recommendations.push('Estás cerca del límite de usuarios');
    }

    const storageLimit = usageData.limits.find(l => l.feature_type === 'storage_mb');
    if (storageLimit && storageLimit.usage_percentage >= 85) {
      recommendations.push('Considera aumentar tu almacenamiento');
    }

    const transactionLimit = usageData.limits.find(l => l.feature_type === 'monthly_transactions');
    if (transactionLimit && transactionLimit.usage_percentage >= 80) {
      recommendations.push('Alto volumen de transacciones este mes');
    }

    return recommendations;
  }

  /**
   * Check if user needs onboarding
   */
  async needsOnboarding(organizationId?: string | null): Promise<boolean> {
    try {
      const companyProfile = await this.getCompanyProfile(organizationId);
      
      if (!companyProfile) {
        return true;
      }

      // Check if company has basic info filled
      const hasBasicInfo = companyProfile.name !== 'Mi Empresa' && 
                          companyProfile.industry !== 'retail';

      return !hasBasicInfo;
    } catch (error) {
      console.error('Error checking onboarding needs:', error);
      return true;
    }
  }

  /**
   * Get plan color based on plan type
   */
  getPlanColor(planType: string): string {
    switch (planType.toLowerCase()) {
      case 'free':
        return '#2563EB'; // Blue
      case 'starter':
        return '#059669'; // Green
      case 'professional':
        return '#7C3AED'; // Purple
      default:
        return '#6B7280'; // Gray
    }
  }

  /**
   * Get plan display name
   */
  getPlanDisplayName(planType: string): string {
    switch (planType.toLowerCase()) {
      case 'free':
        return 'Free';
      case 'starter':
        return 'Starter';
      case 'professional':
        return 'Professional';
      default:
        return 'Desconocido';
    }
  }

  /**
   * Get feature display name
   */
  getFeatureDisplayName(featureType: string): string {
    switch (featureType) {
      case 'users':
        return 'Usuarios';
      case 'products':
        return 'Productos';
      case 'locations':
        return 'Sucursales';
      case 'storage_mb':
        return 'Almacenamiento (MB)';
      case 'monthly_transactions':
        return 'Transacciones Mensuales';
      case 'integrations':
        return 'Integraciones';
      case 'notifications':
        return 'Notificaciones';
      default:
        return featureType.charAt(0).toUpperCase() + featureType.slice(1);
    }
  }

  /**
   * Backward-compatible alias for older components
   */
  formatFeatureName(featureType: string): string {
    return this.getFeatureDisplayName(featureType);
  }

  /**
   * Format usage display like "current / limit"
   */
  formatFeatureUsage(featureType: string, currentUsage: number, limitValue: number): string {
    const current = currentUsage.toLocaleString();
    const limit = this.formatLimitValue(limitValue, featureType);
    return `${current} / ${limit}`;
  }

  /**
   * Format limit value for display
   */
  formatLimitValue(value: number, featureType: string): string {
    if (value === 999999) {
      return 'Ilimitado';
    }
    
    if (featureType === 'storage_mb') {
      if (value >= 1000) {
        return `${(value / 1000).toFixed(1)} GB`;
      }
      return `${value} MB`;
    }
    
    return value.toLocaleString();
  }
}

export const planService = new PlanService();
export default planService;
