import { useState, useCallback, useEffect } from 'react';

/**
 * Hook para persistir el estado de pestañas en localStorage
 */
export const useTabPersistence = (
  key: string,
  defaultTab: string = 'overview',
  options: {
    sessionOnly?: boolean;
    expireAfter?: number; // en milisegundos
  } = {}
) => {
  const { sessionOnly = false, expireAfter } = options;
  const storageKey = `tab-state-${key}`;
  
  // Función para obtener el valor inicial
  const getInitialTab = useCallback(() => {
    if (typeof window === 'undefined') return defaultTab;
    
    try {
      const storage = sessionOnly ? sessionStorage : localStorage;
      const stored = storage.getItem(storageKey);
      
      if (!stored) return defaultTab;
      
      const parsed = JSON.parse(stored);
      
      // Verificar expiración si está configurada
      if (expireAfter && parsed.timestamp) {
        const now = Date.now();
        if (now - parsed.timestamp > expireAfter) {
          storage.removeItem(storageKey);
          return defaultTab;
        }
      }
      
      return parsed.tab || defaultTab;
    } catch (error) {
      console.warn('Error reading tab state from storage:', error);
      return defaultTab;
    }
  }, [storageKey, defaultTab, sessionOnly, expireAfter]);

  const [activeTab, setActiveTab] = useState<string>(getInitialTab);

  // Función para actualizar la pestaña y persistir
  const setPersistedTab = useCallback((tab: string) => {
    setActiveTab(tab);
    
    if (typeof window === 'undefined') return;
    
    try {
      const storage = sessionOnly ? sessionStorage : localStorage;
      const data = {
        tab,
        timestamp: Date.now()
      };
      
      storage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Error saving tab state to storage:', error);
    }
  }, [storageKey, sessionOnly]);

  // Función para limpiar el estado persistido
  const clearPersistedTab = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const storage = sessionOnly ? sessionStorage : localStorage;
      storage.removeItem(storageKey);
      setActiveTab(defaultTab);
    } catch (error) {
      console.warn('Error clearing tab state from storage:', error);
    }
  }, [storageKey, defaultTab, sessionOnly]);

  // Limpiar automáticamente al desmontar si es sessionOnly
  useEffect(() => {
    if (sessionOnly) {
      return () => {
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.removeItem(storageKey);
          } catch (error) {
            console.warn('Error cleaning up session storage:', error);
          }
        }
      };
    }
  }, [storageKey, sessionOnly]);

  return {
    activeTab,
    setActiveTab: setPersistedTab,
    clearTab: clearPersistedTab,
    resetToDefault: () => setPersistedTab(defaultTab)
  };
};

/**
 * Hook para navegación por teclado en pestañas
 */
export const useKeyboardTabNavigation = (
  tabs: string[],
  activeTab: string,
  setActiveTab: (tab: string) => void,
  enabled: boolean = true
) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Solo actuar si el modal/dialog está enfocado
      const dialogElement = document.querySelector('[role="dialog"]');
      if (!dialogElement?.contains(document.activeElement)) {
        return;
      }

      const currentIndex = tabs.indexOf(activeTab);
      if (currentIndex === -1) return;

      let newIndex = currentIndex;
      let handled = false;

      // Navegación con flechas (Ctrl/Cmd + Arrow)
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'ArrowLeft':
            newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
            handled = true;
            break;
          case 'ArrowRight':
            newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
            handled = true;
            break;
        }
      }

      // Navegación con números (Ctrl/Cmd + 1-9)
      if ((e.ctrlKey || e.metaKey) && /^[1-9]$/.test(e.key)) {
        const tabIndex = parseInt(e.key) - 1;
        if (tabIndex < tabs.length) {
          newIndex = tabIndex;
          handled = true;
        }
      }

      if (handled) {
        e.preventDefault();
        e.stopPropagation();
        setActiveTab(tabs[newIndex]);
        
        // Enfocar la pestaña activa para feedback visual
        const tabElement = document.querySelector(`[role="tab"][aria-selected="true"]`) as HTMLElement;
        if (tabElement) {
          tabElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [tabs, activeTab, setActiveTab, enabled]);
};

/**
 * Hook combinado para pestañas con persistencia y navegación por teclado
 */
export const useEnhancedTabs = (
  key: string,
  tabs: string[],
  defaultTab?: string,
  options?: {
    sessionOnly?: boolean;
    expireAfter?: number;
    keyboardNavigation?: boolean;
  }
) => {
  const { keyboardNavigation = true, ...persistenceOptions } = options || {};
  
  const {
    activeTab,
    setActiveTab,
    clearTab,
    resetToDefault
  } = useTabPersistence(key, defaultTab || tabs[0], persistenceOptions);

  useKeyboardTabNavigation(tabs, activeTab, setActiveTab, keyboardNavigation);

  return {
    activeTab,
    setActiveTab,
    clearTab,
    resetToDefault,
    // Utilidades adicionales
    isFirstTab: activeTab === tabs[0],
    isLastTab: activeTab === tabs[tabs.length - 1],
    currentIndex: tabs.indexOf(activeTab),
    totalTabs: tabs.length,
    nextTab: () => {
      const currentIndex = tabs.indexOf(activeTab);
      const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
      setActiveTab(tabs[nextIndex]);
    },
    previousTab: () => {
      const currentIndex = tabs.indexOf(activeTab);
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
      setActiveTab(tabs[prevIndex]);
    }
  };
};