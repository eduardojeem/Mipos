'use client';

import React, { useEffect } from 'react';
import { useTheme } from 'next-themes';

/**
 * DarkModeEnhancer - Componente que mejora automáticamente el modo oscuro
 * del dashboard de productos aplicando clases CSS optimizadas
 */
export function DarkModeEnhancer({ children }: { children: React.ReactNode }) {
  const { theme, systemTheme } = useTheme();
  
  useEffect(() => {
    // Determinar si estamos en modo oscuro
    const isDark = theme === 'dark' || (theme === 'system' && systemTheme === 'dark');
    
    if (isDark) {
      // Aplicar clases mejoradas para modo oscuro
      document.documentElement.classList.add('products-dark-enhanced');
      
      // Aplicar clases específicas a elementos del dashboard
      const applyDarkModeClasses = () => {
        // Container principal
        const container = document.querySelector('[role="main"]');
        if (container) {
          container.classList.add('products-dashboard');
        }

        // Headers
        const headers = document.querySelectorAll('.flex.items-center.justify-between');
        headers.forEach(header => {
          header.classList.add('products-header');
        });

        // Cards
        const cards = document.querySelectorAll('[class*="bg-card"], [class*="bg-white"]');
        cards.forEach(card => {
          card.classList.add('products-card');
        });

        // Botones primarios
        const primaryButtons = document.querySelectorAll('button[class*="bg-primary"], button[class*="bg-blue"]');
        primaryButtons.forEach(btn => {
          btn.classList.add('products-button-primary');
        });

        // Botones secundarios
        const secondaryButtons = document.querySelectorAll('button[variant="outline"], button[class*="border"]');
        secondaryButtons.forEach(btn => {
          btn.classList.add('products-button-secondary');
        });

        // Inputs
        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
          input.classList.add('products-input');
        });

        // Tablas
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
          table.classList.add('products-table');
          
          // Headers de tabla
          const tableHeaders = table.querySelectorAll('th');
          tableHeaders.forEach(th => th.classList.add('products-table-header'));
          
          // Filas de tabla
          const tableRows = table.querySelectorAll('tr');
          tableRows.forEach(tr => tr.classList.add('products-table-row'));
          
          // Celdas de tabla
          const tableCells = table.querySelectorAll('td');
          tableCells.forEach(td => td.classList.add('products-table-cell'));
        });

        // Badges
        const badges = document.querySelectorAll('[class*="badge"], [class*="bg-green"], [class*="bg-red"], [class*="bg-yellow"]');
        badges.forEach(badge => {
          if (badge.textContent?.toLowerCase().includes('activo') || badge.classList.toString().includes('green')) {
            badge.classList.add('products-badge-success');
          } else if (badge.textContent?.toLowerCase().includes('inactivo') || badge.classList.toString().includes('red')) {
            badge.classList.add('products-badge-error');
          } else if (badge.textContent?.toLowerCase().includes('pendiente') || badge.classList.toString().includes('yellow')) {
            badge.classList.add('products-badge-warning');
          } else {
            badge.classList.add('products-badge-info');
          }
        });

        // Stats cards
        const statCards = document.querySelectorAll('[class*="text-2xl"], [class*="text-3xl"]');
        statCards.forEach(stat => {
          const parent = stat.closest('div');
          if (parent) {
            parent.classList.add('products-stat-card');
            stat.classList.add('products-stat-value');
          }
        });

        // Scrollable areas
        const scrollableAreas = document.querySelectorAll('[class*="overflow"], .scroll');
        scrollableAreas.forEach(area => {
          area.classList.add('products-scrollable');
        });

        // Tabs
        const tabsLists = document.querySelectorAll('[role="tablist"]');
        tabsLists.forEach(tabsList => {
          tabsList.classList.add('products-tabs');
          
          const tabTriggers = tabsList.querySelectorAll('[role="tab"]');
          tabTriggers.forEach(trigger => {
            trigger.classList.add('products-tab-trigger');
          });
        });

        // Search containers
        const searchContainers = document.querySelectorAll('input[placeholder*="buscar"], input[placeholder*="Buscar"]');
        searchContainers.forEach(search => {
          const container = search.closest('div');
          if (container) {
            container.classList.add('products-search-container');
            search.classList.add('products-search-input');
          }
        });

        // Modal overlays
        const modalOverlays = document.querySelectorAll('[class*="fixed"][class*="inset-0"]');
        modalOverlays.forEach(overlay => {
          overlay.classList.add('products-modal-overlay');
        });

        // Modal content
        const modalContents = document.querySelectorAll('[role="dialog"]');
        modalContents.forEach(modal => {
          modal.classList.add('products-modal-content');
          
          const header = modal.querySelector('header, .modal-header, h1, h2');
          if (header) {
            header.classList.add('products-modal-header');
            const title = header.querySelector('h1, h2, h3');
            if (title) title.classList.add('products-modal-title');
          }
        });

        // Loading skeletons
        const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
        skeletons.forEach(skeleton => {
          skeleton.classList.add('products-skeleton');
        });

        // Alerts
        const alerts = document.querySelectorAll('[class*="bg-green-"], [class*="bg-red-"], [class*="bg-yellow-"], [class*="bg-blue-"]');
        alerts.forEach(alert => {
          alert.classList.add('products-alert');
          
          if (alert.classList.toString().includes('green')) {
            alert.classList.add('success');
          } else if (alert.classList.toString().includes('red')) {
            alert.classList.add('error');
          } else if (alert.classList.toString().includes('yellow')) {
            alert.classList.add('warning');
          } else if (alert.classList.toString().includes('blue')) {
            alert.classList.add('info');
          }
        });

        // Progress bars
        const progressBars = document.querySelectorAll('[class*="progress"], [role="progressbar"]');
        progressBars.forEach(progress => {
          progress.classList.add('products-progress-bar');
          
          const fill = progress.querySelector('[class*="bg-"]');
          if (fill) fill.classList.add('products-progress-fill');
        });
      };

      // Aplicar clases inmediatamente
      applyDarkModeClasses();

      // Observar cambios en el DOM para aplicar clases a elementos nuevos
      const observer = new MutationObserver((mutations) => {
        let shouldReapply = false;
        
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            shouldReapply = true;
          }
        });

        if (shouldReapply) {
          // Debounce para evitar múltiples ejecuciones
          setTimeout(applyDarkModeClasses, 100);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // Cleanup
      return () => {
        observer.disconnect();
      };
    } else {
      // Remover clases de modo oscuro
      document.documentElement.classList.remove('products-dark-enhanced');
      
      // Remover todas las clases específicas
      const elementsWithProductsClasses = document.querySelectorAll('[class*="products-"]');
      elementsWithProductsClasses.forEach(element => {
        const classList = Array.from(element.classList);
        classList.forEach(className => {
          if (className.startsWith('products-')) {
            element.classList.remove(className);
          }
        });
      });
    }
  }, [theme, systemTheme]);

  return <>{children}</>;
}

/**
 * Hook para aplicar clases de modo oscuro mejoradas manualmente
 */
export function useProductsDarkMode() {
  const { theme, systemTheme } = useTheme();
  
  const isDark = theme === 'dark' || (theme === 'system' && systemTheme === 'dark');
  
  const getProductsClasses = (baseClasses: string = '') => {
    if (!isDark) return baseClasses;
    
    const darkClasses = {
      // Layout
      container: 'products-dashboard',
      header: 'products-header',
      
      // Components
      card: 'products-card',
      button: 'products-button-primary',
      buttonSecondary: 'products-button-secondary',
      input: 'products-input',
      
      // Table
      table: 'products-table',
      tableHeader: 'products-table-header',
      tableRow: 'products-table-row',
      tableCell: 'products-table-cell',
      
      // Badges
      badgeSuccess: 'products-badge-success',
      badgeWarning: 'products-badge-warning',
      badgeError: 'products-badge-error',
      badgeInfo: 'products-badge-info',
      
      // Stats
      statCard: 'products-stat-card',
      statValue: 'products-stat-value',
      statLabel: 'products-stat-label',
      
      // Modal
      modalOverlay: 'products-modal-overlay',
      modalContent: 'products-modal-content',
      modalHeader: 'products-modal-header',
      modalTitle: 'products-modal-title',
      
      // Misc
      skeleton: 'products-skeleton',
      scrollable: 'products-scrollable',
      tabs: 'products-tabs',
      tabTrigger: 'products-tab-trigger',
      searchContainer: 'products-search-container',
      searchInput: 'products-search-input',
      alert: 'products-alert',
      progressBar: 'products-progress-bar',
      progressFill: 'products-progress-fill',
      tooltip: 'products-tooltip'
    };
    
    return darkClasses;
  };
  
  return {
    isDark,
    getProductsClasses,
    // Utility function to combine classes
    cn: (...classes: (string | undefined)[]) => {
      return classes.filter(Boolean).join(' ');
    }
  };
}