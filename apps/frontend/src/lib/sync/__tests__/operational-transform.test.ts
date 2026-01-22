import { describe, it, expect, beforeEach } from 'vitest';
import { OperationalTransform, operationalTransform, OperationUtils, Operation } from '../operational-transform';

describe('OperationalTransform', () => {
  let ot: OperationalTransform;
  const userId = 'user_1';
  const clientId = 'client_1';

  beforeEach(() => {
    ot = new OperationalTransform();
    ot.reset();
  });

  it('applies local UPDATE operations and tracks pending', () => {
    const op = OperationUtils.createUpdateOperation(
      'product', 'p1', 'name', 'Old', 'New', userId, clientId
    );

    const applied = ot.applyLocalOperation(op);
    const state = ot.getState();

    expect(applied.id).toBe(op.id);
    expect(state.localOperations.length).toBe(1);
    expect(state.pendingOperations.has(op.id)).toBe(true);
    expect(typeof applied.version).toBe('number');
  });

  it('transforms remote INSERT against local INSERT (position shift)', () => {
    // local insert at position 5 length 2
    const localInsert: Operation = {
      id: 'local1', type: 'INSERT', entityType: 'doc', entityId: 'd1', field: 'content',
      position: 5, length: 2, content: 'xx', timestamp: Date.now(), userId, clientId, version: 0, oldValue: undefined, newValue: undefined
    };
    ot.applyLocalOperation(localInsert);

    // remote insert at position 6
    const remoteInsert: Operation = {
      id: 'remote1', type: 'INSERT', entityType: 'doc', entityId: 'd1', field: 'content',
      position: 6, length: 1, content: 'y', timestamp: Date.now(), userId: 'user_2', clientId: 'client_2', version: 0, oldValue: undefined, newValue: undefined
    };

    const { transformedOp } = ot.transformRemoteOperation(remoteInsert);
    // After local insert at 5 length 2, remote pos 6 should shift by +2 to 8
    expect(transformedOp.position).toBe(8);
  });

  it('DELETE vs INSERT adjusts position correctly', () => {
    // local delete at position 3 length 2
    const localDelete: Operation = {
      id: 'localDel', type: 'DELETE', entityType: 'doc', entityId: 'd1', field: 'content',
      position: 3, length: 2, timestamp: Date.now(), userId, clientId, version: 0
    } as Operation;
    ot.applyLocalOperation(localDelete);

    // remote insert at position 2
    const remoteInsert: Operation = {
      id: 'remoteIns', type: 'INSERT', entityType: 'doc', entityId: 'd1', field: 'content',
      position: 2, length: 1, content: 'a', timestamp: Date.now(), userId: 'user_2', clientId: 'client_2', version: 0
    } as Operation;

    const { transformedOp } = ot.transformRemoteOperation(remoteInsert);
    // Since insert before delete position, delete position should shift right by +1 when pairwise transforming
    // But transformRemoteOperation returns transformed remote op, so insert stays at 2 (no shift), rules adjust op1 only.
    // Validate no unwanted change
    expect(transformedOp.position).toBe(2);
  });

  it('resolves UPDATE conflicts with merge strategy when fields differ', () => {
    const localUpdate = OperationUtils.createUpdateOperation(
      'product', 'p1', 'price', 10, 12, userId, clientId
    );
    ot.applyLocalOperation(localUpdate);

    const remoteUpdate = OperationUtils.createUpdateOperation(
      'product', 'p1', 'stock', 5, 6, 'user_2', 'client_2'
    );

    const result = ot.transformRemoteOperation(remoteUpdate);
    expect(result.conflictResolved).toBe(true);
    expect(['local','remote','merge']).toContain(result.priority);
    // For different fields, attemptMerge should create a merged op when applicable
    if (result.priority === 'merge') {
      expect(result.transformedOp.id.startsWith('merged_')).toBe(true);
      expect(result.transformedOp.newValue).toBeDefined();
    }
  });

  it('acknowledges operations and cleans up pending', () => {
    const op = OperationUtils.createUpdateOperation(
      'product', 'p1', 'name', 'Old', 'New', userId, clientId
    );
    ot.applyLocalOperation(op);
    const before = ot.getState();
    expect(before.pendingOperations.has(op.id)).toBe(true);

    ot.acknowledgeOperation(op.id);
    const after = ot.getState();
    expect(after.pendingOperations.has(op.id)).toBe(false);
    expect(after.acknowledgedOperations.has(op.id)).toBe(true);
  });
});