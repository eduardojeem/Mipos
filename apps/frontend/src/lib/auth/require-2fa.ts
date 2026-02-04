/**
 * Middleware para requerir 2FA en Super Admins
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface TwoFactorStatus {
  enabled: boolean;
  verified: boolean;
  method?: '2fa' | 'totp' | 'sms';
}

/**
 * Verifica si el usuario tiene 2FA habilitado
 */
export async function check2FAStatus(userId: string): Promise<TwoFactorStatus> {
  try {
    const supabase = await createClient();
    
    // Verificar en la tabla de usuarios
    const { data: userData, error } = await supabase
      .from('users')
      .select('two_factor_enabled, two_factor_method, two_factor_verified_at')
      .eq('id', userId)
      .single();
    
    if (error || !userData) {
      return { enabled: false, verified: false };
    }
    
    return {
      enabled: userData.two_factor_enabled || false,
      verified: !!userData.two_factor_verified_at,
      method: userData.two_factor_method || undefined,
    };
  } catch (error) {
    console.error('Error checking 2FA status:', error);
    return { enabled: false, verified: false };
  }
}

/**
 * Verifica si el usuario es super admin
 */
async function isSuperAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    // Verificar en user_roles
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role:roles(name)')
      .eq('user_id', userId)
      .eq('is_active', true);
    
    if (userRoles && userRoles.length > 0) {
      const isSA = userRoles.some((ur: { role: { name: string } | null }) => 
        String(ur.role?.name || '').toUpperCase() === 'SUPER_ADMIN'
      );
      if (isSA) return true;
    }
    
    // Verificar en users table
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (userData && String(userData.role || '').toUpperCase() === 'SUPER_ADMIN') {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking super admin status:', error);
    return false;
  }
}

/**
 * Middleware que requiere 2FA para super admins
 */
export async function require2FA(request: NextRequest): Promise<NextResponse | null> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    // Verificar si es super admin
    const isAdmin = await isSuperAdmin(user.id);
    
    if (!isAdmin) {
      // No es super admin, no requiere 2FA
      return null;
    }
    
    // Verificar estado de 2FA
    const twoFactorStatus = await check2FAStatus(user.id);
    
    if (!twoFactorStatus.enabled || !twoFactorStatus.verified) {
      return NextResponse.json(
        {
          error: '2FA requerido',
          message: 'Los super administradores deben tener autenticación de dos factores habilitada.',
          code: '2FA_REQUIRED',
          redirectTo: '/dashboard/profile/two-factor',
        },
        { status: 403 }
      );
    }
    
    // 2FA está habilitado y verificado
    return null;
  } catch (error) {
    console.error('Error in require2FA middleware:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * Helper para verificar 2FA en route handlers
 */
export async function verify2FARequired(request: NextRequest): Promise<{
  success: boolean;
  error?: string;
  code?: string;
  redirectTo?: string;
}> {
  const response = await require2FA(request);
  
  if (response) {
    const data = await response.json();
    return {
      success: false,
      error: data.error,
      code: data.code,
      redirectTo: data.redirectTo,
    };
  }
  
  return { success: true };
}
