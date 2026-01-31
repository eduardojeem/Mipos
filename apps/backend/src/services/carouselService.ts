/**
 * Carousel Service
 * 
 * Business logic for managing the promotions carousel.
 * Handles CRUD operations, validation, and audit logging.
 * 
 * Requirements: 1.2, 9.1, 9.2, 9.3, 9.4
 */

import { createClient } from '@supabase/supabase-js';
import { carouselValidator, ValidationResult } from '../validators/carouselValidator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

/**
 * Carousel data structure
 */
export interface CarouselData {
  ids: string[];
  lastModified: Date;
  modifiedBy: string;
  version: number;
}

/**
 * Carousel item from database
 */
export interface CarouselItem {
  id: string;
  promotion_id: string;
  position: number;
  modified_by?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Audit log entry
 */
export interface AuditEntry {
  id: string;
  userId: string;
  userName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'REORDER' | 'REVERT';
  previousState: string[];
  newState: string[];
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

/**
 * Request context for audit logging
 */
export interface RequestContext {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * CarouselService class
 * 
 * Provides business logic for carousel operations
 */
export class CarouselService {
  /**
   * Get current carousel configuration
   * 
   * @returns Promise<CarouselData> - Current carousel state
   */
  async getCarousel(orgId?: string): Promise<CarouselData> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    let q = supabase
      .from('promotions_carousel')
      .select('*')
      .order('position', { ascending: true });
    if (orgId) q = q.eq('organization_id', orgId);
    const { data, error } = await q;

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    const items = (data || []) as CarouselItem[];
    const ids = items.map((item) => item.promotion_id);
    const lastModified = items[0]?.updated_at ? new Date(items[0].updated_at) : new Date();
    const modifiedBy = items[0]?.modified_by || 'system';

    return {
      ids,
      lastModified,
      modifiedBy,
      version: items.length > 0 ? 1 : 0,
    };
  }

  /**
   * Save carousel configuration
   * 
   * Validates input, updates database, and creates audit log
   * 
   * @param ids - Array of promotion IDs
   * @param context - Request context for audit logging
   * @returns Promise<CarouselData> - Updated carousel state
   */
  async saveCarousel(ids: string[], context: RequestContext, orgId?: string): Promise<CarouselData> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    // Validate input
    const validation = await carouselValidator.validateForSave(ids);
    if (!validation.valid) {
      const errorMessages = validation.errors.map((e) => e.message).join(', ');
      throw new Error(`Validation failed: ${errorMessages}`);
    }

    // Sanitize input
    const sanitizedIds = carouselValidator.sanitizeInput(ids);

    // Get current state for audit
    let currentState: CarouselData;
    try {
      currentState = await this.getCarousel(orgId);
    } catch (error) {
      // If carousel doesn't exist yet, use empty state
      currentState = {
        ids: [],
        lastModified: new Date(),
        modifiedBy: 'system',
        version: 0,
      };
    }

    // Delete existing carousel items
    let dq = supabase.from('promotions_carousel').delete().neq('position', -1);
    if (orgId) dq = dq.eq('organization_id', orgId);
    const { error: deleteError } = await dq;

    if (deleteError) {
      throw new Error(`Delete error: ${deleteError.message}`);
    }

    // Insert new carousel items
    if (sanitizedIds.length > 0) {
      const payload = sanitizedIds.map((id, idx) => ({
        promotion_id: id,
        position: idx,
        modified_by: context.userId,
        updated_at: new Date().toISOString(),
        organization_id: orgId,
      }));

      const { data: inserted, error: insertError } = await supabase
        .from('promotions_carousel')
        .insert(payload)
        .select('*');

      if (insertError) {
        throw new Error(`Insert error: ${insertError.message}`);
      }
    }

    // Create audit log
    await this.createAuditLog({
      userId: context.userId,
      action: currentState.ids.length === 0 ? 'CREATE' : 'UPDATE',
      previousState: currentState.ids,
      newState: sanitizedIds,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return {
      ids: sanitizedIds,
      lastModified: new Date(),
      modifiedBy: context.userId,
      version: currentState.version + 1,
    };
  }

  /**
   * Create an audit log entry
   * 
   * @param entry - Audit entry data
   * @returns Promise<string> - ID of created audit log entry
   */
  async createAuditLog(
    entry: Omit<AuditEntry, 'id' | 'userName' | 'createdAt'>
  ): Promise<string> {
    if (!supabase) {
      console.warn('Supabase client not initialized, skipping audit log');
      return '';
    }

    try {
      const { data, error } = await supabase.rpc('log_carousel_change', {
        p_user_id: entry.userId,
        p_action: entry.action,
        p_previous_state: entry.previousState,
        p_new_state: entry.newState,
        p_ip_address: entry.ipAddress || null,
        p_user_agent: entry.userAgent || null,
        p_metadata: entry.metadata || {},
      });

      if (error) {
        console.error('Failed to create audit log:', error);
        return '';
      }

      return data || '';
    } catch (error) {
      console.error('Error creating audit log:', error);
      return '';
    }
  }

  /**
   * Get audit log entries
   * 
   * @param limit - Maximum number of entries to return
   * @param offset - Number of entries to skip
   * @returns Promise<AuditEntry[]> - Array of audit log entries
   */
  async getAuditLog(limit: number = 50, offset: number = 0): Promise<AuditEntry[]> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await supabase.rpc('get_carousel_audit_log', {
        p_limit: limit,
        p_offset: offset,
      });

      if (error) {
        throw new Error(`Audit log error: ${error.message}`);
      }

      return (data || []).map((log: any) => ({
        id: log.id,
        userId: log.user_id,
        userName: log.user_email || 'Unknown',
        action: log.action,
        previousState: log.previous_state || [],
        newState: log.new_state || [],
        ipAddress: log.ip_address,
        userAgent: log.user_agent,
        metadata: log.metadata || {},
        createdAt: new Date(log.created_at),
      }));
    } catch (error: any) {
      throw new Error(`Failed to get audit log: ${error.message}`);
    }
  }

  /**
   * Get audit log entries for a specific user
   * 
   * @param userId - User ID to filter by
   * @param limit - Maximum number of entries to return
   * @returns Promise<AuditEntry[]> - Array of audit log entries
   */
  async getUserAuditLog(userId: string, limit: number = 50): Promise<AuditEntry[]> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await supabase.rpc('get_user_carousel_audit_log', {
        p_user_id: userId,
        p_limit: limit,
      });

      if (error) {
        throw new Error(`Audit log error: ${error.message}`);
      }

      return (data || []).map((log: any) => ({
        id: log.id,
        userId,
        userName: 'User', // Function doesn't return email for user-specific logs
        action: log.action,
        previousState: log.previous_state || [],
        newState: log.new_state || [],
        createdAt: new Date(log.created_at),
      }));
    } catch (error: any) {
      throw new Error(`Failed to get user audit log: ${error.message}`);
    }
  }

  /**
   * Revert carousel to a previous version
   * 
   * @param versionId - ID of the audit log entry to revert to
   * @param context - Request context for audit logging
   * @returns Promise<CarouselData> - Reverted carousel state
   */
  async revertToVersion(versionId: string, context: RequestContext): Promise<CarouselData> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    // Get the audit log entry
    const { data: log, error } = await supabase
      .from('carousel_audit_log')
      .select('*')
      .eq('id', versionId)
      .single();

    if (error || !log) {
      throw new Error('Version not found');
    }

    // Get current state for audit
    const currentState = await this.getCarousel(orgId);

    // Revert to the previous state from that log entry
    const previousIds = log.previous_state || [];
    
    // Save the reverted state
    const result = await this.saveCarousel(previousIds, context);

    // Create additional audit log for the revert action
    await this.createAuditLog({
      userId: context.userId,
      action: 'REVERT',
      previousState: currentState.ids,
      newState: previousIds,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: {
        revertedFromVersion: versionId,
        revertedFromAction: log.action,
      },
    });

    return result;
  }

  /**
   * Get carousel state at a specific point in time
   * 
   * @param timestamp - Point in time to get state for
   * @returns Promise<string[]> - Array of promotion IDs at that time
   */
  async getCarouselStateAtTime(timestamp: Date): Promise<string[]> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await supabase.rpc('get_carousel_state_at_time', {
        p_timestamp: timestamp.toISOString(),
      });

      if (error) {
        throw new Error(`Error getting historical state: ${error.message}`);
      }

      return data || [];
    } catch (error: any) {
      throw new Error(`Failed to get historical state: ${error.message}`);
    }
  }

  /**
   * Validate carousel configuration without saving
   * 
   * @param ids - Array of promotion IDs to validate
   * @returns Promise<ValidationResult> - Validation result
   */
  async validateCarousel(ids: string[]): Promise<ValidationResult> {
    return await carouselValidator.validateForSave(ids);
  }

  /**
   * Clear the entire carousel
   * 
   * @param context - Request context for audit logging
   * @returns Promise<CarouselData> - Empty carousel state
   */
  async clearCarousel(context: RequestContext): Promise<CarouselData> {
    return await this.saveCarousel([], context);
  }

  /**
   * Add a promotion to the carousel
   * 
   * @param promotionId - ID of promotion to add
   * @param context - Request context for audit logging
   * @returns Promise<CarouselData> - Updated carousel state
   */
  async addPromotion(promotionId: string, context: RequestContext): Promise<CarouselData> {
    const current = await this.getCarousel();
    const newIds = [...current.ids, promotionId];
    return await this.saveCarousel(newIds, context);
  }

  /**
   * Remove a promotion from the carousel
   * 
   * @param promotionId - ID of promotion to remove
   * @param context - Request context for audit logging
   * @returns Promise<CarouselData> - Updated carousel state
   */
  async removePromotion(promotionId: string, context: RequestContext): Promise<CarouselData> {
    const current = await this.getCarousel();
    const newIds = current.ids.filter((id) => id !== promotionId);
    return await this.saveCarousel(newIds, context);
  }

  /**
   * Reorder promotions in the carousel
   * 
   * @param fromIndex - Current index of promotion
   * @param toIndex - Target index for promotion
   * @param context - Request context for audit logging
   * @returns Promise<CarouselData> - Updated carousel state
   */
  async reorderPromotion(
    fromIndex: number,
    toIndex: number,
    context: RequestContext
  ): Promise<CarouselData> {
    const current = await this.getCarousel();
    const newIds = [...current.ids];

    // Validate indices
    if (fromIndex < 0 || fromIndex >= newIds.length || toIndex < 0 || toIndex >= newIds.length) {
      throw new Error('Invalid index for reordering');
    }

    // Perform reorder
    const [movedItem] = newIds.splice(fromIndex, 1);
    newIds.splice(toIndex, 0, movedItem);

    return await this.saveCarousel(newIds, context);
  }
}

// Export singleton instance
export const carouselService = new CarouselService();
