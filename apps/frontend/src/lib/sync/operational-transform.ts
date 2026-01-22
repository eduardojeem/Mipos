/**
 * Operational Transformation System for Multi-Device Synchronization
 * Handles conflict resolution when multiple users edit the same data simultaneously
 */

export type OperationType = 'INSERT' | 'DELETE' | 'UPDATE' | 'RETAIN';

export interface Operation {
  id: string;
  type: OperationType;
  entityType: string;
  entityId: string;
  field?: string;
  position?: number;
  length?: number;
  content?: any;
  oldValue?: any;
  newValue?: any;
  timestamp: number;
  userId: string;
  clientId: string;
  version: number;
}

export interface TransformResult {
  transformedOp: Operation;
  priority: 'local' | 'remote' | 'merge';
  conflictResolved: boolean;
}

export interface OperationState {
  localOperations: Operation[];
  remoteOperations: Operation[];
  acknowledgedOperations: Set<string>;
  pendingOperations: Map<string, Operation>;
  currentVersion: number;
}

/**
 * Core Operational Transformation Engine
 */
export class OperationalTransform {
  private state: OperationState;
  private transformRules: Map<string, TransformFunction>;

  constructor() {
    this.state = {
      localOperations: [],
      remoteOperations: [],
      acknowledgedOperations: new Set(),
      pendingOperations: new Map(),
      currentVersion: 0
    };
    this.transformRules = new Map();
    this.initializeTransformRules();
  }

  /**
   * Apply local operation and prepare for synchronization
   */
  applyLocalOperation(operation: Operation): Operation {
    operation.version = this.state.currentVersion++;
    operation.timestamp = Date.now();
    
    this.state.localOperations.push(operation);
    this.state.pendingOperations.set(operation.id, operation);
    
    return operation;
  }

  /**
   * Transform remote operation against local operations
   */
  transformRemoteOperation(remoteOp: Operation): TransformResult {
    let transformedOp = { ...remoteOp };
    let conflictResolved = false;
    let priority: 'local' | 'remote' | 'merge' = 'remote';

    // Find conflicting local operations
    // Only treat UPDATEs as conflicts; text ops (INSERT/DELETE) should be transformed via rules
    const conflictingOps = remoteOp.type === 'UPDATE' ? this.findConflictingOperations(remoteOp) : [];
    
    if (conflictingOps.length > 0) {
      const result = this.resolveConflicts(remoteOp, conflictingOps);
      transformedOp = result.operation;
      conflictResolved = true;
      priority = result.priority;
    }

    // Transform against all pending local operations
    for (const localOp of this.state.localOperations) {
      if (!this.state.acknowledgedOperations.has(localOp.id)) {
        transformedOp = this.transformOperationPair(transformedOp, localOp);
      }
    }

    this.state.remoteOperations.push(transformedOp);
    
    return {
      transformedOp,
      priority,
      conflictResolved
    };
  }

  /**
   * Acknowledge operation completion
   */
  acknowledgeOperation(operationId: string): void {
    this.state.acknowledgedOperations.add(operationId);
    this.state.pendingOperations.delete(operationId);
    
    // Clean up old operations
    this.cleanupOperations();
  }

  /**
   * Find operations that conflict with the given operation
   */
  private findConflictingOperations(operation: Operation): Operation[] {
    return this.state.localOperations.filter(localOp => 
      this.operationsConflict(operation, localOp)
    );
  }

  /**
   * Check if two operations conflict
   */
  private operationsConflict(op1: Operation, op2: Operation): boolean {
    // Same entity
    if (op1.entityType === op2.entityType && op1.entityId === op2.entityId) {
      // Updates on the same entity are considered for conflict resolution (even if fields differ)
      if (op1.type === 'UPDATE' && op2.type === 'UPDATE') {
        return true;
      }
      // Text operations: only consider overlap when operating on the same field
      if (op1.field === op2.field) {
        if ((op1.type === 'INSERT' || op1.type === 'DELETE') &&
            (op2.type === 'INSERT' || op2.type === 'DELETE')) {
          return this.positionsOverlap(op1, op2);
        }
      }
    }
    return false;
  }

  /**
   * Check if operation positions overlap
   */
  private positionsOverlap(op1: Operation, op2: Operation): boolean {
    if (op1.position === undefined || op2.position === undefined) return false;
    
    const end1 = op1.position + (op1.length || 0);
    const end2 = op2.position + (op2.length || 0);
    
    return !(end1 <= op2.position || end2 <= op1.position);
  }

  /**
   * Resolve conflicts between operations
   */
  private resolveConflicts(remoteOp: Operation, conflictingOps: Operation[]): {
    operation: Operation;
    priority: 'local' | 'remote' | 'merge';
  } {
    // Sort by timestamp for consistent resolution
    const sortedOps = [...conflictingOps, remoteOp].sort((a, b) => a.timestamp - b.timestamp);
    
    // Use timestamp-based priority (earlier wins)
    const earliestOp = sortedOps[0];
    
    if (earliestOp.id === remoteOp.id) {
      return { operation: remoteOp, priority: 'remote' };
    }
    
    // For UPDATE operations, try to merge if possible
    if (remoteOp.type === 'UPDATE' && conflictingOps[0].type === 'UPDATE') {
      const mergedOp = this.attemptMerge(remoteOp, conflictingOps[0]);
      if (mergedOp) {
        return { operation: mergedOp, priority: 'merge' };
      }
    }
    
    // Default to local priority for conflicts
    return { operation: conflictingOps[0], priority: 'local' };
  }

  /**
   * Attempt to merge two UPDATE operations
   */
  private attemptMerge(op1: Operation, op2: Operation): Operation | null {
    if (op1.type !== 'UPDATE' || op2.type !== 'UPDATE') return null;
    
    // Simple merge for different fields
    if (op1.field !== op2.field) {
      return {
        ...op1,
        id: `merged_${op1.id}_${op2.id}`,
        newValue: {
          ...op1.newValue,
          ...op2.newValue
        },
        timestamp: Math.max(op1.timestamp, op2.timestamp)
      };
    }
    
    return null;
  }

  /**
   * Transform one operation against another
   */
  private transformOperationPair(op1: Operation, op2: Operation): Operation {
    const ruleKey = `${op1.type}_${op2.type}`;
    const transformFn = this.transformRules.get(ruleKey);
    
    if (transformFn) {
      return transformFn(op1, op2);
    }
    
    return op1; // No transformation needed
  }

  /**
   * Initialize transformation rules
   */
  private initializeTransformRules(): void {
    // INSERT vs INSERT
    this.transformRules.set('INSERT_INSERT', (op1, op2) => {
      if (op1.position !== undefined && op2.position !== undefined) {
        if (op2.position <= op1.position) {
          return {
            ...op1,
            position: op1.position + (op2.length || 1)
          };
        }
      }
      return op1;
    });

    // INSERT vs DELETE
    this.transformRules.set('INSERT_DELETE', (op1, op2) => {
      if (op1.position !== undefined && op2.position !== undefined) {
        if (op2.position < op1.position) {
          return {
            ...op1,
            position: op1.position - (op2.length || 1)
          };
        }
      }
      return op1;
    });

    // DELETE vs INSERT
    this.transformRules.set('DELETE_INSERT', (op1, op2) => {
      if (op1.position !== undefined && op2.position !== undefined) {
        if (op2.position <= op1.position) {
          return {
            ...op1,
            position: op1.position + (op2.length || 1)
          };
        }
      }
      return op1;
    });

    // DELETE vs DELETE
    this.transformRules.set('DELETE_DELETE', (op1, op2) => {
      if (op1.position !== undefined && op2.position !== undefined) {
        if (op2.position < op1.position) {
          return {
            ...op1,
            position: op1.position - (op2.length || 1)
          };
        } else if (op2.position === op1.position) {
          // Same position, operation becomes no-op
          return {
            ...op1,
            type: 'RETAIN' as OperationType,
            length: 0
          };
        }
      }
      return op1;
    });

    // UPDATE vs UPDATE (handled in conflict resolution)
    this.transformRules.set('UPDATE_UPDATE', (op1, op2) => op1);
  }

  /**
   * Clean up old acknowledged operations
   */
  private cleanupOperations(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    
    this.state.localOperations = this.state.localOperations.filter(
      op => op.timestamp > cutoffTime || !this.state.acknowledgedOperations.has(op.id)
    );
    
    this.state.remoteOperations = this.state.remoteOperations.filter(
      op => op.timestamp > cutoffTime
    );
  }

  /**
   * Get current state for debugging
   */
  getState(): OperationState {
    return { ...this.state };
  }

  /**
   * Transform server operations against client operations
   */
  transform(clientOps: Operation[], serverOps: Operation[]): Operation[] {
    // Temporarily apply client ops as local
    const originalLocal = [...this.state.localOperations];
    for (const op of clientOps) {
      this.applyLocalOperation(op);
    }
    // Transform server ops
    const transformed: Operation[] = [];
    for (const op of serverOps) {
      const result = this.transformRemoteOperation(op);
      transformed.push(result.transformedOp);
    }
    // Restore original local ops
    this.state.localOperations = originalLocal;
    return transformed;
  }

  /**
   * Reset state (for testing)
   */
  reset(): void {
    this.state = {
      localOperations: [],
      remoteOperations: [],
      acknowledgedOperations: new Set(),
      pendingOperations: new Map(),
      currentVersion: 0
    };
  }
}

type TransformFunction = (op1: Operation, op2: Operation) => Operation;

/**
 * Global Operational Transform instance
 */
export const operationalTransform = new OperationalTransform();

/**
 * Utility functions for creating operations
 */
export const OperationUtils = {
  createUpdateOperation(
    entityType: string,
    entityId: string,
    field: string,
    oldValue: any,
    newValue: any,
    userId: string,
    clientId: string
  ): Operation {
    return {
      id: `${entityType}_${entityId}_${field}_${Date.now()}_${Math.random()}`,
      type: 'UPDATE',
      entityType,
      entityId,
      field,
      oldValue,
      newValue,
      timestamp: Date.now(),
      userId,
      clientId,
      version: 0
    };
  },

  createInsertOperation(
    entityType: string,
    entityId: string,
    field: string,
    position: number,
    content: any,
    userId: string,
    clientId: string
  ): Operation {
    return {
      id: `${entityType}_${entityId}_${field}_${Date.now()}_${Math.random()}`,
      type: 'INSERT',
      entityType,
      entityId,
      field,
      position,
      content,
      length: typeof content === 'string' ? content.length : 1,
      timestamp: Date.now(),
      userId,
      clientId,
      version: 0
    };
  },

  createDeleteOperation(
    entityType: string,
    entityId: string,
    field: string,
    position: number,
    length: number,
    userId: string,
    clientId: string
  ): Operation {
    return {
      id: `${entityType}_${entityId}_${field}_${Date.now()}_${Math.random()}`,
      type: 'DELETE',
      entityType,
      entityId,
      field,
      position,
      length,
      timestamp: Date.now(),
      userId,
      clientId,
      version: 0
    };
  }
};