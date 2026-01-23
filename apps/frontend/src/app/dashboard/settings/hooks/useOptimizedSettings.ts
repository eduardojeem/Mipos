import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';

// Types
interface UserSettings {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  avatar: string;
  theme: 'light' | 'dark' | 'system';
  theme_dark_intensity?: 'dim' | 'normal' | 'black';
  theme_dark_tone?: 'blue' | 'gray' | 'pure';
  theme_schedule_enabled?: boolean;
  theme_schedule_start?: string;
  theme_schedule_end?: string;
  theme_smooth_transitions?: boolean;
  language: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  dashboard_layout: 'compact' | 'comfortable' | 'spacious';
  sidebar_collapsed: boolean;
  show_tooltips: boolean;
  enable_animations: boolean;
  auto_save: boolean;
  primary_color: string;
  border_radius: string;
  enable_glassmorphism: boolean;
  enable_gradients: boolean;
  enable_shadows: boolean;
}

interface SystemSettings {
  store_name?: string;
  store_address?: string;
  store_phone?: string;
  store_email?: string;
  store_website?: string;
  store_logo_url?: string;
  tax_rate?: number;
  currency?: string;
  receipt_footer?: string;
  low_stock_threshold?: number;
  auto_backup?: boolean;
  backup_frequency?: 'daily' | 'weekly' | 'monthly';
  email_notifications?: boolean;
  sms_notifications?: boolean;
  push_notifications?: boolean;
  timezone?: string;
  date_format?: string;
  time_format?: '12h' | '24h';
  decimal_places?: number;
  enable_barcode_scanner?: boolean;
  enable_receipt_printer?: boolean;
  enable_cash_drawer?: boolean;
  max_discount_percentage?: number;
  require_customer_info?: boolean;
  enable_loyalty_program?: boolean;
  // Campos del API
  businessName?: string;
  enableInventoryTracking?: boolean;
  enableLoyaltyProgram?: boolean;
  enableNotifications?: boolean;
  backupFrequency?: 'daily' | 'weekly' | 'monthly';
  dateFormat?: string;
  timeFormat?: '12h' | '24h' | '24h'; // Fix type mismatch if API returns different literal
  taxRate?: number;
}

interface SecuritySettings {
  two_factor_enabled: boolean;
  session_timeout: number;
  password_expiry_days: number;
  max_login_attempts: number;
  require_password_change: boolean;
  enable_login_notifications: boolean;
  allowed_ip_addresses: string[];
}

// Default values
const DEFAULT_USER_SETTINGS: UserSettings = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  avatar: '',
  theme: 'system',
  theme_dark_intensity: 'normal',
  theme_dark_tone: 'blue',
  theme_schedule_enabled: false,
  theme_schedule_start: '19:00',
  theme_schedule_end: '07:00',
  theme_smooth_transitions: true,
  language: 'es',
  notifications_enabled: true,
  email_notifications: true,
  push_notifications: true,
  dashboard_layout: 'comfortable',
  sidebar_collapsed: false,
  show_tooltips: true,
  enable_animations: true,
  auto_save: true,
  primary_color: 'blue',
  border_radius: '0.5',
  enable_glassmorphism: true,
  enable_gradients: true,
  enable_shadows: true,
};

const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  store_name: '',
  store_address: '',
  store_phone: '',
  store_email: '',
  store_website: '',
  store_logo_url: '',
  tax_rate: 0,
  currency: 'PYG',
  receipt_footer: '',
  low_stock_threshold: 10,
  auto_backup: true,
  backup_frequency: 'daily',
  email_notifications: true,
  sms_notifications: false,
  push_notifications: true,
  timezone: 'America/Asuncion',
  date_format: 'DD/MM/YYYY',
  time_format: '24h',
  decimal_places: 0,
  enable_barcode_scanner: true,
  enable_receipt_printer: true,
  enable_cash_drawer: true,
  max_discount_percentage: 50,
  require_customer_info: false,
  enable_loyalty_program: false
};

const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  two_factor_enabled: false,
  session_timeout: 30,
  password_expiry_days: 90,
  max_login_attempts: 5,
  require_password_change: false,
  enable_login_notifications: true,
  allowed_ip_addresses: []
};

// Optimized hooks
export function useUserSettings() {
  return useQuery({
    queryKey: ['user-settings'],
    queryFn: async (): Promise<UserSettings> => {
      try {
        const response = await api.get('/user/settings');
        return { ...DEFAULT_USER_SETTINGS, ...response.data.data };
      } catch (error) {
        console.warn('Failed to load user settings, using defaults');
        return DEFAULT_USER_SETTINGS;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1
  });
}

export function useSystemSettings() {
  return useQuery({
    queryKey: ['system-settings'],
    queryFn: async (): Promise<SystemSettings> => {
      try {
        const response = await api.get('/system/settings');
        // Usar los datos directamente, ya que el endpoint devuelve un objeto plano
        // si data.data existe úsalo, si no, usa data
        const settings = response.data.data || response.data;
        return { ...DEFAULT_SYSTEM_SETTINGS, ...settings };
      } catch (error) {
        console.warn('Failed to load system settings, using defaults');
        return DEFAULT_SYSTEM_SETTINGS;
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1
  });
}

export function useSecuritySettings() {
  return useQuery({
    queryKey: ['security-settings'],
    queryFn: async (): Promise<SecuritySettings> => {
      try {
        const response = await api.get('/security/settings');
        return { ...DEFAULT_SECURITY_SETTINGS, ...response.data.data };
      } catch (error) {
        console.warn('Failed to load security settings, using defaults');
        return DEFAULT_SECURITY_SETTINGS;
      }
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 1
  });
}

// Mutation hooks
export function useUpdateUserSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (settings: Partial<UserSettings>) => {
      try {
        const response = await api.put('/user/settings', settings, {
          _noRetry: true,
        } as any);
        return response.data;
      } catch (error: any) {
        if (error?.response?.status === 431) {
          throw error;
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      toast({
        title: 'Éxito',
        description: 'Configuración actualizada correctamente.',
      });
    },
    onError: (error: any) => {
      console.error('Error saving user settings:', error);

      let title = 'Error al guardar';
      let errorMessage = 'No se pudo actualizar la configuración del perfil';

      if (error?.response?.status === 431) {
        title = 'Sesión demasiado pesada (431)';
        errorMessage = 'Tu token de acceso es demasiado grande. Esto sucede por guardar datos pesados (como imágenes) en el perfil. Por favor, cierra sesión y vuelve a entrar para limpiar tu token.';
      } else if (error?.response?.status === 413) {
        errorMessage = 'Los datos enviados son demasiado grandes.';
      }

      toast({
        title,
        description: errorMessage,
        variant: 'destructive'
      });
    }
  });
}

export function useUpdateSystemSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (settings: Partial<SystemSettings>) => {
      try {
        // Crear una configuración de request más simple para evitar headers grandes
        const response = await api.put('/system/settings', settings, {
          headers: {
            'Content-Type': 'application/json',
          },
          // Evitar retry automático para esta operación (casting a any porque _noRetry no está en tipos estándar)
          _noRetry: true,
        } as any);
        return response.data;
      } catch (error: any) {
        // Si es error 431, intentar con menos datos
        if (error?.response?.status === 431) {
          console.warn('Headers too large, retrying with minimal data');
          const minimalSettings = {
            businessName: settings.businessName,
            currency: settings.currency,
            timezone: settings.timezone,
          };
          const response = await api.put('/system/settings', minimalSettings, {
            headers: {
              'Content-Type': 'application/json',
            },
            _noRetry: true,
          } as any);
          return response.data;
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast({
        title: 'Éxito',
        description: 'Configuración del sistema actualizada correctamente',
      });
    },
    onError: (error: any) => {
      console.error('Error saving system settings:', error);

      let errorMessage = 'No se pudo actualizar la configuración del sistema';

      if (error?.response?.status === 431) {
        errorMessage = 'Los datos son demasiado grandes. Intenta con menos información.';
      } else if (error?.response?.status === 413) {
        errorMessage = 'Los datos enviados son demasiado grandes.';
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  });
}

export function useUpdateSecuritySettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (settings: Partial<SecuritySettings>) => {
      const response = await api.put('/security/settings', settings);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-settings'] });
      toast({
        title: 'Éxito',
        description: 'Configuración de seguridad actualizada correctamente',
      });
    },
    onError: (error) => {
      console.error('Error saving security settings:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la configuración de seguridad',
        variant: 'destructive'
      });
    }
  });
}

export function useChangePassword() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (passwordData: {
      current_password: string;
      new_password: string;
    }) => {
      const response = await api.put('/user/password', passwordData);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'Éxito',
        description: 'Contraseña actualizada correctamente',
      });
    },
    onError: (error) => {
      console.error('Error changing password:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cambiar la contraseña. Verifica tu contraseña actual.',
        variant: 'destructive'
      });
    }
  });
}

// Export types
export type { UserSettings, SystemSettings, SecuritySettings };