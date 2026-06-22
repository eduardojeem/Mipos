'use client';

import { useCallback, useEffect, useState } from 'react';
import { useCurrentOrganizationId } from '@/hooks/use-current-organization';

export interface BranchOption {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

const STORAGE_KEY_ID = 'selected_branch_id';
const STORAGE_KEY_NAME = 'selected_branch_name';
const EVENT_NAME = 'branch-changed';

function readStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(key);
  if (!raw || raw === 'null' || raw === 'undefined') return null;
  return raw.trim() || null;
}

function writeStorage(id: string | null, name: string | null) {
  if (typeof window === 'undefined') return;
  if (id) {
    window.localStorage.setItem(STORAGE_KEY_ID, id);
  } else {
    window.localStorage.removeItem(STORAGE_KEY_ID);
  }
  if (name) {
    window.localStorage.setItem(STORAGE_KEY_NAME, name);
  } else {
    window.localStorage.removeItem(STORAGE_KEY_NAME);
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { id, name } }));
}

export function getSelectedBranchId(): string | null {
  return readStorage(STORAGE_KEY_ID);
}

export function getSelectedBranchName(): string | null {
  return readStorage(STORAGE_KEY_NAME);
}

export function useBranchContext() {
  const organizationId = useCurrentOrganizationId();
  const [branchId, setBranchIdState] = useState<string | null>(() => readStorage(STORAGE_KEY_ID));
  const [branchName, setBranchNameState] = useState<string | null>(() => readStorage(STORAGE_KEY_NAME));
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Sync from storage events (other tabs or components)
  useEffect(() => {
    const sync = () => {
      setBranchIdState(readStorage(STORAGE_KEY_ID));
      setBranchNameState(readStorage(STORAGE_KEY_NAME));
    };
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  // Load branches for the current org
  useEffect(() => {
    if (!organizationId) return;
    setIsLoading(true);
    const headers: HeadersInit = { 'x-organization-id': organizationId };
    fetch('/api/branches?activeOnly=true', { cache: 'no-store', headers })
      .then((r) => r.json())
      .then((payload) => {
        const list: BranchOption[] = Array.isArray(payload?.data) ? payload.data : [];
        setBranches(list);
        // Auto-select if only one branch and none selected
        if (list.length === 1 && !readStorage(STORAGE_KEY_ID)) {
          writeStorage(list[0].id, list[0].name);
          setBranchIdState(list[0].id);
          setBranchNameState(list[0].name);
        }
        // Clear selection if current branch no longer belongs to org
        const currentId = readStorage(STORAGE_KEY_ID);
        if (currentId && !list.find((b) => b.id === currentId)) {
          writeStorage(null, null);
          setBranchIdState(null);
          setBranchNameState(null);
        }
      })
      .catch(() => setBranches([]))
      .finally(() => setIsLoading(false));
  }, [organizationId]);

  const selectBranch = useCallback((branch: BranchOption | null) => {
    writeStorage(branch?.id ?? null, branch?.name ?? null);
    setBranchIdState(branch?.id ?? null);
    setBranchNameState(branch?.name ?? null);
  }, []);

  const clearBranch = useCallback(() => {
    writeStorage(null, null);
    setBranchIdState(null);
    setBranchNameState(null);
  }, []);

  return {
    branchId,
    branchName,
    branches,
    isLoading,
    selectBranch,
    clearBranch,
    hasBranches: branches.length > 0,
    isMultiBranch: branches.length > 1,
    selectedBranch: branches.find((b) => b.id === branchId) ?? null,
  };
}
