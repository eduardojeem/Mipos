'use client';

import { useState, useEffect } from 'react';

export type Orientation = 'portrait' | 'landscape';

/**
 * useOrientation - Hook para detectar orientación del dispositivo
 * 
 * @returns {Orientation} 'portrait' o 'landscape'
 */
export function useOrientation(): Orientation {
  const [orientation, setOrientation] = useState<Orientation>('portrait');

  useEffect(() => {
    const updateOrientation = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      setOrientation(isLandscape ? 'landscape' : 'portrait');
    };

    // Detectar orientación inicial
    updateOrientation();

    // Escuchar cambios
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);

    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  return orientation;
}

/**
 * useIsLandscape - Hook simplificado para saber si está en landscape
 */
export function useIsLandscape(): boolean {
  const orientation = useOrientation();
  return orientation === 'landscape';
}
