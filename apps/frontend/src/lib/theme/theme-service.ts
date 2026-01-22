export interface ThemeOptions {
  theme: 'light' | 'dark' | 'system';
  darkIntensity?: 'dim' | 'normal' | 'black';
  darkTone?: 'blue' | 'gray' | 'pure';
  smoothTransitions?: boolean;
  scheduleEnabled?: boolean;
  scheduleStart?: string;
  scheduleEnd?: string;
}

export interface ThemeValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Servicio para gestionar la configuración de temas sin dependencias circulares
 */
export class ThemeService {
  private static instance: ThemeService;
  
  private constructor() {}
  
  static getInstance(): ThemeService {
    if (!ThemeService.instance) {
      ThemeService.instance = new ThemeService();
    }
    return ThemeService.instance;
  }

  /**
   * Valida las opciones de configuración de tema
   */
  validateThemeOptions(options: ThemeOptions): ThemeValidationResult {
    const errors: string[] = [];

    // Validar tema
    if (!['light', 'dark', 'system'].includes(options.theme)) {
      errors.push('El tema debe ser light, dark o system');
    }

    // Validar intensidad del modo oscuro
    if (options.darkIntensity && !['dim', 'normal', 'black'].includes(options.darkIntensity)) {
      errors.push('La intensidad debe ser dim, normal o black');
    }

    // Validar tono de color
    if (options.darkTone && !['blue', 'gray', 'pure'].includes(options.darkTone)) {
      errors.push('El tono debe ser blue, gray o pure');
    }

    // Validar horarios de programación
    if (options.scheduleEnabled) {
      if (!this.isValidTime(options.scheduleStart)) {
        errors.push('La hora de inicio no es válida (formato HH:MM)');
      }
      if (!this.isValidTime(options.scheduleEnd)) {
        errors.push('La hora de fin no es válida (formato HH:MM)');
      }
      if (options.scheduleStart && options.scheduleEnd && !this.isValidTimeRange(options.scheduleStart, options.scheduleEnd)) {
        errors.push('La hora de fin debe ser posterior a la hora de inicio');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida el formato de hora HH:MM
   */
  private isValidTime(time: string | undefined): boolean {
    if (!time) return false;
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  /**
   * Valida que el rango de tiempo sea válido
   */
  private isValidTimeRange(start: string, end: string): boolean {
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    
    const startTotal = startHour * 60 + startMin;
    const endTotal = endHour * 60 + endMin;
    
    // Si el fin es al día siguiente (ej: 19:00 a 07:00)
    if (endTotal <= startTotal) {
      return true; // Esto es válido para temas nocturnos
    }
    
    return endTotal > startTotal;
  }

  /**
   * Aplica las opciones de tema al DOM
   */
  applyThemeOptions(options: ThemeOptions): void {
    if (typeof window === 'undefined') return;

    const root = window.document.documentElement;
    
    // Aplicar tema base
    root.classList.remove('light', 'dark');
    
    let effectiveTheme = options.theme;
    if (options.theme === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    root.classList.add(effectiveTheme);

    // Aplicar opciones de modo oscuro
    if (effectiveTheme === 'dark') {
      root.classList.remove('theme-dim', 'theme-normal', 'theme-black');
      root.classList.remove('theme-blue', 'theme-gray', 'theme-pure');
      
      if (options.darkIntensity) {
        root.classList.add(`theme-${options.darkIntensity}`);
      }
      
      if (options.darkTone) {
        root.classList.add(`theme-${options.darkTone}`);
      }
    }

    // Aplicar transiciones
    if (options.smoothTransitions) {
      root.classList.add('theme-smooth-transitions');
    } else {
      root.classList.remove('theme-smooth-transitions');
    }

    // Guardar en localStorage
    try {
      localStorage.setItem('pos-ui-theme-options', JSON.stringify(options));
    } catch (error) {
      console.warn('No se pudo guardar la configuración de tema:', error);
    }
  }

  /**
   * Obtiene las opciones actuales del almacenamiento
   */
  getStoredThemeOptions(): ThemeOptions | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem('pos-ui-theme-options');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Error al leer la configuración de tema:', error);
      return null;
    }
  }

  /**
   * Persiste la configuración en el backend
   */
  async persistThemeOptions(options: ThemeOptions): Promise<boolean> {
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: options.theme,
          theme_dark_intensity: options.darkIntensity,
          theme_dark_tone: options.darkTone,
          theme_smooth_transitions: options.smoothTransitions,
          theme_schedule_enabled: options.scheduleEnabled,
          theme_schedule_start: options.scheduleStart,
          theme_schedule_end: options.scheduleEnd
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Error al persistir la configuración de tema:', error);
      return false;
    }
  }

  /**
   * Valida y formatea un campo de tiempo
   */
  formatTimeInput(value: string): string {
    // Remover caracteres no numéricos
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 4) {
      return `${numbers.slice(0, 2)}:${numbers.slice(2)}`;
    } else {
      return `${numbers.slice(0, 2)}:${numbers.slice(2, 4)}`;
    }
  }

  /**
   * Obtiene sugerencias de tiempo basadas en el input
   */
  getTimeSuggestions(partial: string): string[] {
    if (!partial || partial.length < 2) return [];
    
    const suggestions: string[] = [];
    const hour = parseInt(partial.slice(0, 2));
    
    if (hour >= 0 && hour <= 23) {
      // Sugerencias comunes para la hora
      if (partial.length === 2) {
        suggestions.push(`${hour}:00`, `${hour}:30`);
      } else if (partial.length >= 3) {
        const minute = parseInt(partial.slice(2) || '0');
        suggestions.push(`${hour}:${minute.toString().padStart(2, '0')}`);
      }
    }
    
    return suggestions;
  }
}

// Exportar instancia singleton
export const themeService = ThemeService.getInstance();