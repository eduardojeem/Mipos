'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { unstable_batchedUpdates } from 'react-dom';

// Debounced state hook
export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 300
): [T, T, (value: T | ((prev: T) => T)) => void] {
  const [immediateValue, setImmediateValue] = useState<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    const newValue = value instanceof Function ? value(immediateValue) : value;
    setImmediateValue(newValue);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(newValue);
    }, delay);
  }, [immediateValue, delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [immediateValue, debouncedValue, setValue];
}

// Throttled state hook
export function useThrottledState<T>(
  initialValue: T,
  delay: number = 300
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(initialValue);
  const lastExecuted = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const throttledSetValue = useCallback((newValue: T | ((prev: T) => T)) => {
    const now = Date.now();
    
    if (now - lastExecuted.current >= delay) {
      setValue(newValue);
      lastExecuted.current = now;
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        setValue(newValue);
        lastExecuted.current = Date.now();
      }, delay - (now - lastExecuted.current));
    }
  }, [delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [value, throttledSetValue];
}

// Batched state updates hook
export function useBatchedState<T extends Record<string, any>>(
  initialState: T
): [T, (updates: Partial<T> | ((prev: T) => Partial<T>)) => void, () => void] {
  const [state, setState] = useState<T>(initialState);
  const pendingUpdates = useRef<Partial<T>>({});
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const flushUpdates = useCallback(() => {
    if (Object.keys(pendingUpdates.current).length > 0) {
      unstable_batchedUpdates(() => {
        setState(prev => ({ ...prev, ...pendingUpdates.current }));
        pendingUpdates.current = {};
      });
    }
  }, []);

  const batchUpdate = useCallback((updates: Partial<T> | ((prev: T) => Partial<T>)) => {
    const newUpdates = updates instanceof Function ? updates(state) : updates;
    
    Object.assign(pendingUpdates.current, newUpdates);

    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }

    batchTimeoutRef.current = setTimeout(flushUpdates, 0);
  }, [state, flushUpdates]);

  useEffect(() => {
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, []);

  return [state, batchUpdate, flushUpdates];
}

// Optimized array state hook
export function useOptimizedArray<T>(
  initialArray: T[] = [],
  keyExtractor?: (item: T) => string | number
): {
  items: T[];
  add: (item: T) => void;
  remove: (index: number | string) => void;
  update: (index: number | string, item: T) => void;
  clear: () => void;
  move: (fromIndex: number, toIndex: number) => void;
  filter: (predicate: (item: T) => boolean) => void;
  sort: (compareFn?: (a: T, b: T) => number) => void;
} {
  const [items, setItems] = useState<T[]>(initialArray);
  const itemsMap = useRef<Map<string | number, number>>(new Map());

  // Update map when items change
  useEffect(() => {
    if (keyExtractor) {
      itemsMap.current.clear();
      items.forEach((item, index) => {
        const key = keyExtractor(item);
        itemsMap.current.set(key, index);
      });
    }
  }, [items, keyExtractor]);

  const add = useCallback((item: T) => {
    setItems(prev => {
      const newItems = [...prev, item];
      if (keyExtractor) {
        const key = keyExtractor(item);
        itemsMap.current.set(key, newItems.length - 1);
      }
      return newItems;
    });
  }, [keyExtractor]);

  const remove = useCallback((indexOrKey: number | string) => {
    setItems(prev => {
      let index: number;
      
      if (typeof indexOrKey === 'number') {
        index = indexOrKey;
      } else if (keyExtractor) {
        index = itemsMap.current.get(indexOrKey) ?? -1;
      } else {
        return prev;
      }

      if (index < 0 || index >= prev.length) return prev;

      const newItems = prev.filter((_, i) => i !== index);
      
      // Update map
      if (keyExtractor) {
        itemsMap.current.clear();
        newItems.forEach((item, i) => {
          const key = keyExtractor(item);
          itemsMap.current.set(key, i);
        });
      }
      
      return newItems;
    });
  }, [keyExtractor]);

  const update = useCallback((indexOrKey: number | string, newItem: T) => {
    setItems(prev => {
      let index: number;
      
      if (typeof indexOrKey === 'number') {
        index = indexOrKey;
      } else if (keyExtractor) {
        index = itemsMap.current.get(indexOrKey) ?? -1;
      } else {
        return prev;
      }

      if (index < 0 || index >= prev.length) return prev;

      const newItems = [...prev];
      newItems[index] = newItem;
      
      // Update map if key changed
      if (keyExtractor) {
        const newKey = keyExtractor(newItem);
        itemsMap.current.set(newKey, index);
      }
      
      return newItems;
    });
  }, [keyExtractor]);

  const clear = useCallback(() => {
    setItems([]);
    itemsMap.current.clear();
  }, []);

  const move = useCallback((fromIndex: number, toIndex: number) => {
    setItems(prev => {
      if (fromIndex < 0 || fromIndex >= prev.length || 
          toIndex < 0 || toIndex >= prev.length) {
        return prev;
      }

      const newItems = [...prev];
      const [movedItem] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, movedItem);
      
      // Update map
      if (keyExtractor) {
        itemsMap.current.clear();
        newItems.forEach((item, i) => {
          const key = keyExtractor(item);
          itemsMap.current.set(key, i);
        });
      }
      
      return newItems;
    });
  }, [keyExtractor]);

  const filter = useCallback((predicate: (item: T) => boolean) => {
    setItems(prev => {
      const newItems = prev.filter(predicate);
      
      // Update map
      if (keyExtractor) {
        itemsMap.current.clear();
        newItems.forEach((item, i) => {
          const key = keyExtractor(item);
          itemsMap.current.set(key, i);
        });
      }
      
      return newItems;
    });
  }, [keyExtractor]);

  const sort = useCallback((compareFn?: (a: T, b: T) => number) => {
    setItems(prev => {
      const newItems = [...prev].sort(compareFn);
      
      // Update map
      if (keyExtractor) {
        itemsMap.current.clear();
        newItems.forEach((item, i) => {
          const key = keyExtractor(item);
          itemsMap.current.set(key, i);
        });
      }
      
      return newItems;
    });
  }, [keyExtractor]);

  return {
    items,
    add,
    remove,
    update,
    clear,
    move,
    filter,
    sort
  };
}

// Previous state hook
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  
  useEffect(() => {
    ref.current = value;
  });
  
  return ref.current;
}

// Toggle state hook
export function useToggle(initialValue: boolean = false): [boolean, () => void, (value?: boolean) => void] {
  const [value, setValue] = useState(initialValue);
  
  const toggle = useCallback(() => setValue(prev => !prev), []);
  const setToggle = useCallback((newValue?: boolean) => {
    setValue(newValue !== undefined ? newValue : prev => !prev);
  }, []);
  
  return [value, toggle, setToggle];
}

// Counter hook with bounds
export function useCounter(
  initialValue: number = 0,
  options: {
    min?: number;
    max?: number;
    step?: number;
  } = {}
): {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
  set: (value: number) => void;
} {
  const { min, max, step = 1 } = options;
  const [count, setCount] = useState(initialValue);

  const increment = useCallback(() => {
    setCount(prev => {
      const newValue = prev + step;
      return max !== undefined ? Math.min(newValue, max) : newValue;
    });
  }, [step, max]);

  const decrement = useCallback(() => {
    setCount(prev => {
      const newValue = prev - step;
      return min !== undefined ? Math.max(newValue, min) : newValue;
    });
  }, [step, min]);

  const reset = useCallback(() => {
    setCount(initialValue);
  }, [initialValue]);

  const set = useCallback((value: number) => {
    setCount(prev => {
      let newValue = value;
      if (min !== undefined) newValue = Math.max(newValue, min);
      if (max !== undefined) newValue = Math.min(newValue, max);
      return newValue;
    });
  }, [min, max]);

  return { count, increment, decrement, reset, set };
}

// Undo/Redo state hook
export function useUndoRedo<T>(
  initialState: T,
  maxHistorySize: number = 50
): {
  state: T;
  setState: (newState: T | ((prev: T) => T)) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
} {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const state = history[currentIndex];

  const setState = useCallback((newState: T | ((prev: T) => T)) => {
    const nextState = newState instanceof Function ? newState(state) : newState;
    
    setHistory(prev => {
      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push(nextState);
      
      // Limit history size
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
        setCurrentIndex(prev => prev - 1);
      }
      
      return newHistory;
    });
    
    setCurrentIndex(prev => Math.min(prev + 1, maxHistorySize - 1));
  }, [state, currentIndex, maxHistorySize]);

  const undo = useCallback(() => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  }, []);

  const redo = useCallback(() => {
    setCurrentIndex(prev => Math.min(history.length - 1, prev + 1));
  }, [history.length]);

  const clearHistory = useCallback(() => {
    setHistory([state]);
    setCurrentIndex(0);
  }, [state]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  return {
    state,
    setState,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory
  };
}

// Async state hook
export function useAsyncState<T>(
  asyncFunction: () => Promise<T>,
  dependencies: any[] = []
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await asyncFunction();
      if (mountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [asyncFunction]);

  useEffect(() => {
    execute();
  }, [execute, ...dependencies]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { data, loading, error, refetch: execute };
}
