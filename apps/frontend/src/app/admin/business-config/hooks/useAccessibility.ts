'use client';

import { useEffect, useState } from 'react';

/**
 * Hook para mejorar la accesibilidad
 * - Detecta preferencias de usuario
 * - Maneja navegación por teclado
 * - Contraste automático
 */
export function useAccessibility() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);
  const [focusVisible, setFocusVisible] = useState(false);

  useEffect(() => {
    // Detectar preferencias de movimiento reducido
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(motionQuery.matches);
    
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    motionQuery.addEventListener('change', handleMotionChange);

    // Detectar preferencias de alto contraste
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    setPrefersHighContrast(contrastQuery.matches);
    
    const handleContrastChange = (e: MediaQueryListEvent) => {
      setPrefersHighContrast(e.matches);
    };
    
    contrastQuery.addEventListener('change', handleContrastChange);

    // Detectar navegación por teclado
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setFocusVisible(true);
      }
    };

    const handleMouseDown = () => {
      setFocusVisible(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      motionQuery.removeEventListener('change', handleMotionChange);
      contrastQuery.removeEventListener('change', handleContrastChange);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  // Función para calcular contraste entre dos colores
  const calculateContrast = (color1: string, color2: string): number => {
    const getLuminance = (hex: string): number => {
      const rgb = parseInt(hex.slice(1), 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = (rgb >> 0) & 0xff;
      
      const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };

    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  };

  // Función para obtener color de texto accesible
  const getAccessibleTextColor = (backgroundColor: string): string => {
    const whiteContrast = calculateContrast(backgroundColor, '#ffffff');
    const blackContrast = calculateContrast(backgroundColor, '#000000');
    
    // WCAG AA requiere al menos 4.5:1 para texto normal
    if (whiteContrast >= 4.5 && whiteContrast > blackContrast) {
      return '#ffffff';
    } else if (blackContrast >= 4.5) {
      return '#000000';
    } else {
      // Si ninguno cumple, usar el que tenga mejor contraste
      return whiteContrast > blackContrast ? '#ffffff' : '#000000';
    }
  };

  // Función para validar accesibilidad de colores
  const validateColorAccessibility = (foreground: string, background: string) => {
    const contrast = calculateContrast(foreground, background);
    
    return {
      contrast,
      wcagAA: contrast >= 4.5,
      wcagAAA: contrast >= 7,
      level: contrast >= 7 ? 'AAA' : contrast >= 4.5 ? 'AA' : 'Fail'
    };
  };

  return {
    prefersReducedMotion,
    prefersHighContrast,
    focusVisible,
    calculateContrast,
    getAccessibleTextColor,
    validateColorAccessibility
  };
}