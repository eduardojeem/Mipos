import { useState, useEffect } from 'react';

export interface ResponsiveBreakpoints {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLarge: boolean;
  width: number;
  height: number;
}

/**
 * Hook para detectar el tamaño de pantalla y proporcionar información responsiva
 */
export const useResponsiveLayout = (): ResponsiveBreakpoints => {
  const [dimensions, setDimensions] = useState<ResponsiveBreakpoints>(() => {
    // Valores por defecto para SSR
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isLarge: true,
        width: 1024,
        height: 768
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    
    return {
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024,
      isLarge: width >= 1280,
      width,
      height
    };
  });

  useEffect(() => {
    const updateDimensions = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setDimensions({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        isLarge: width >= 1280,
        width,
        height
      });
    };

    // Usar ResizeObserver si está disponible, sino usar resize event
    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(updateDimensions);
      resizeObserver.observe(document.documentElement);
      
      return () => {
        resizeObserver.disconnect();
      };
    } else {
      window.addEventListener('resize', updateDimensions);
      return () => window.removeEventListener('resize', updateDimensions);
    }
  }, []);

  return dimensions;
};

/**
 * Hook para detectar si estamos en un dispositivo táctil
 */
export const useTouchDevice = (): boolean => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore
        navigator.msMaxTouchPoints > 0
      );
    };

    checkTouchDevice();
  }, []);

  return isTouchDevice;
};

/**
 * Hook para obtener la configuración de layout basada en el dispositivo
 */
export const useLayoutConfig = () => {
  const { isMobile, isTablet, isDesktop } = useResponsiveLayout();
  const isTouchDevice = useTouchDevice();

  return {
    // Configuración de modal
    modal: {
      maxWidth: isMobile ? '100vw' : isTablet ? '90vw' : '4xl',
      height: isMobile ? '100vh' : 'auto',
      maxHeight: isMobile ? '100vh' : '90vh',
      padding: isMobile ? '0' : isTablet ? '4' : '6',
      borderRadius: isMobile ? '0' : 'lg',
      margin: isMobile ? '0' : 'auto'
    },
    
    // Configuración de grid
    grid: {
      columns: isMobile ? 1 : isTablet ? 2 : 3,
      gap: isMobile ? '3' : '4',
      padding: isMobile ? '4' : '6'
    },
    
    // Configuración de texto
    text: {
      title: isMobile ? 'text-xl' : 'text-2xl',
      subtitle: isMobile ? 'text-sm' : 'text-base',
      body: isMobile ? 'text-sm' : 'text-base'
    },
    
    // Configuración de botones
    button: {
      size: isMobile ? 'sm' : 'default',
      padding: isMobile ? 'px-3 py-2' : 'px-4 py-2',
      gap: isMobile ? 'gap-1' : 'gap-2'
    },
    
    // Configuración de navegación
    navigation: {
      showLabels: !isMobile || isTablet,
      iconSize: isMobile ? 'h-4 w-4' : 'h-5 w-5',
      spacing: isMobile ? 'space-x-1' : 'space-x-2'
    },
    
    // Flags útiles
    flags: {
      isMobile,
      isTablet,
      isDesktop,
      isTouchDevice,
      shouldUseDrawer: isMobile,
      shouldShowSidebar: isDesktop,
      shouldStackVertically: isMobile,
      shouldUseCompactLayout: isMobile || isTablet
    }
  };
};