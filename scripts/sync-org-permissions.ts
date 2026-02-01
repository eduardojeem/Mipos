
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../apps/frontend/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const PLAN_LIMITS = {
  free: { maxUsers: 2, maxProducts: 50, maxTransactionsPerMonth: 200, maxLocations: 1 },
  starter: { maxUsers: 5, maxProducts: 500, maxTransactionsPerMonth: 1000, maxLocations: 1 },
  pro: { maxUsers: 10, maxProducts: 2000, maxTransactionsPerMonth: 5000, maxLocations: 3 },
  professional: { maxUsers: 10, maxProducts: 2000, maxTransactionsPerMonth: 5000, maxLocations: 3 },
  premium: { maxUsers: -1, maxProducts: -1, maxTransactionsPerMonth: -1, maxLocations: -1 },
  enterprise: { maxUsers: -1, maxProducts: -1, maxTransactionsPerMonth: -1, maxLocations: -1 }
};

const PLAN_FEATURES_DESC = {
  free: ['Soporte por email', 'Reportes básicos', 'Gestión de inventario simple'],
  starter: ['Soporte prioritario', 'Reportes detallados', 'Gestión de clientes', 'Control de stock avanzado'],
  pro: ['Múltiples sucursales', 'API de integración', 'Roles y permisos avanzados', 'Soporte 24/7'],
  professional: ['Múltiples sucursales', 'API de integración', 'Roles y permisos avanzados', 'Soporte 24/7'],
  premium: ['Todo ilimitado', 'Gerente de cuenta dedicado', 'Auditoría de logs', 'Marca blanca'],
  enterprise: ['Todo ilimitado', 'Gerente de cuenta dedicado', 'Auditoría de logs', 'Marca blanca']
};

const PLAN_PERMISSIONS = {
  free: {
    can_access_analytics: false,
    can_export_reports: false,
    can_manage_team: false,
    can_access_admin_panel: false,
    can_manage_inventory_advanced: false
  },
  starter: {
    can_access_analytics: true,
    can_export_reports: false,
    can_manage_team: true,
    can_access_admin_panel: false,
    can_manage_inventory_advanced: true
  },
  pro: {
    can_access_analytics: true,
    can_export_reports: true,
    can_manage_team: true,
    can_access_admin_panel: true,
    can_manage_inventory_advanced: true
  },
  professional: {
    can_access_analytics: true,
    can_export_reports: true,
    can_manage_team: true,
    can_access_admin_panel: true,
    can_manage_inventory_advanced: true
  },
  premium: {
    can_access_analytics: true,
    can_export_reports: true,
    can_manage_team: true,
    can_access_admin_panel: true,
    can_manage_inventory_advanced: true
  },
  enterprise: {
    can_access_analytics: true,
    can_export_reports: true,
    can_manage_team: true,
    can_access_admin_panel: true,
    can_manage_inventory_advanced: true
  }
};

async function syncOrgPermissions() {
  console.log('Sincronizando permisos técnicos de organizaciones...');
  
  const { data: organizations, error } = await supabase
    .from('organizations')
    .select('*');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  for (const org of organizations) {
    const planKey = (org.subscription_plan || 'free').toLowerCase();
    
    const limits = PLAN_LIMITS[planKey as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free;
    const featuresDesc = PLAN_FEATURES_DESC[planKey as keyof typeof PLAN_FEATURES_DESC] || PLAN_FEATURES_DESC.free;
    const permissions = PLAN_PERMISSIONS[planKey as keyof typeof PLAN_PERMISSIONS] || PLAN_PERMISSIONS.free;

    const currentSettings = org.settings || {};
    const newSettings = {
      ...currentSettings,
      limits: limits,
      features: featuresDesc,
      permissions: permissions // Adding technical permissions
    };

    console.log(`Actualizando [${org.slug}] - Plan: ${planKey}`);
    
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ settings: newSettings })
      .eq('id', org.id);

    if (updateError) {
      console.error(`❌ Error actualizando ${org.slug}:`, updateError.message);
    } else {
      console.log(`✅ ${org.slug} actualizado correctamente.`);
    }
  }
}

syncOrgPermissions();
