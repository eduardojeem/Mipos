import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { assertAdmin } from '@/app/api/_utils/auth';
import { getUserOrganizationId } from '@/app/api/_utils/organization';
import { logAudit } from '@/app/api/admin/_utils/audit';
import { validateBusinessConfig } from '@/app/api/admin/_utils/business-config-validation';
import { setCachedConfig } from '@/app/api/business-config/cache';
import type { BusinessConfig } from '@/types/business-config';
import { defaultBusinessConfig } from '@/types/business-config';

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>;
type SystemSettingsPayload = Record<string, unknown>;

const CURRENCY_SYMBOLS: Record<string, string> = {
  PYG: '\u20b2',
  USD: '$',
  EUR: '\u20ac',
  BRL: 'R$',
  ARS: '$',
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwn(object: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function numberValue(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] || currency;
}

function normalizeTimeFormat(value: unknown): '12h' | '24h' {
  const raw = String(value || '').toLowerCase();
  return raw === '12h' || raw.includes('12') ? '12h' : '24h';
}

function taxRateToPercent(rate: unknown): number {
  const numeric = numberValue(rate, defaultBusinessConfig.storeSettings.taxRate);
  return numeric > 1 ? numeric : numeric * 100;
}

function taxPercentToRate(rate: unknown): number {
  const numeric = numberValue(rate, defaultBusinessConfig.storeSettings.taxRate * 100);
  return numeric > 1 ? numeric / 100 : numeric;
}

function mergeBusinessConfig(input?: Partial<BusinessConfig> | null): BusinessConfig {
  const raw = isObject(input) ? input : {};
  const systemSettings = (isObject(raw.systemSettings) ? raw.systemSettings : {}) as Record<string, unknown>;
  const security = (isObject(systemSettings.security) ? systemSettings.security : {}) as Record<string, unknown>;
  const email = (isObject(systemSettings.email) ? systemSettings.email : {}) as Record<string, unknown>;

  return {
    ...defaultBusinessConfig,
    ...raw,
    legalInfo: {
      ...defaultBusinessConfig.legalInfo,
      ...(isObject(raw.legalInfo) ? raw.legalInfo : {}),
    },
    legalDocuments: {
      ...defaultBusinessConfig.legalDocuments,
      ...(isObject(raw.legalDocuments) ? raw.legalDocuments : {}),
    },
    contact: {
      ...defaultBusinessConfig.contact,
      ...(isObject(raw.contact) ? raw.contact : {}),
    },
    address: {
      ...defaultBusinessConfig.address,
      ...(isObject(raw.address) ? raw.address : {}),
    },
    socialMedia: {
      ...defaultBusinessConfig.socialMedia,
      ...(isObject(raw.socialMedia) ? raw.socialMedia : {}),
    },
    branding: {
      ...defaultBusinessConfig.branding,
      ...(isObject(raw.branding) ? raw.branding : {}),
    },
    storeSettings: {
      ...defaultBusinessConfig.storeSettings,
      ...(isObject(raw.storeSettings) ? raw.storeSettings : {}),
    },
    systemSettings: {
      ...defaultBusinessConfig.systemSettings!,
      ...systemSettings,
      security: {
        ...defaultBusinessConfig.systemSettings!.security,
        ...security,
      },
      email: {
        ...defaultBusinessConfig.systemSettings!.email,
        ...email,
        provider: 'smtp',
      },
    },
    carousel: {
      ...defaultBusinessConfig.carousel,
      ...(isObject(raw.carousel) ? raw.carousel : {}),
      images: Array.isArray(raw.carousel?.images)
        ? raw.carousel.images
        : defaultBusinessConfig.carousel.images,
    },
    homeOffersCarousel: {
      ...defaultBusinessConfig.homeOffersCarousel!,
      ...(isObject(raw.homeOffersCarousel) ? raw.homeOffersCarousel : {}),
    },
    publicSite: {
      sections: {
        ...defaultBusinessConfig.publicSite!.sections,
        ...(isObject(raw.publicSite?.sections) ? raw.publicSite!.sections : {}),
      },
      content: {
        ...defaultBusinessConfig.publicSite!.content,
        ...(isObject(raw.publicSite?.content) ? raw.publicSite!.content : {}),
      },
    },
    notifications: {
      ...defaultBusinessConfig.notifications,
      ...(isObject(raw.notifications) ? raw.notifications : {}),
    },
    regional: {
      ...defaultBusinessConfig.regional,
      ...(isObject(raw.regional) ? raw.regional : {}),
    },
    businessHours: Array.isArray(raw.businessHours)
      ? raw.businessHours
      : defaultBusinessConfig.businessHours,
    createdAt: stringValue(raw.createdAt, defaultBusinessConfig.createdAt),
    updatedAt: stringValue(raw.updatedAt, new Date().toISOString()),
  };
}

function legacyRowToBusinessConfig(row: Record<string, unknown> | null | undefined): BusinessConfig {
  if (!row) return mergeBusinessConfig();

  return mergeBusinessConfig({
    businessName: stringValue(row.business_name, defaultBusinessConfig.businessName),
    contact: {
      ...defaultBusinessConfig.contact,
      phone: stringValue(row.phone, defaultBusinessConfig.contact.phone),
      email: stringValue(row.email, defaultBusinessConfig.contact.email),
      website: stringValue(row.website, defaultBusinessConfig.contact.website),
    },
    address: {
      ...defaultBusinessConfig.address,
      street: stringValue(row.address, defaultBusinessConfig.address.street),
    },
    branding: {
      ...defaultBusinessConfig.branding,
      logo: stringValue(row.logo_url, defaultBusinessConfig.branding.logo),
    },
    storeSettings: {
      ...defaultBusinessConfig.storeSettings,
      currency: stringValue(row.currency, defaultBusinessConfig.storeSettings.currency),
      currencySymbol: currencySymbol(stringValue(row.currency, defaultBusinessConfig.storeSettings.currency)),
      taxRate: taxPercentToRate(row.tax_rate),
      enableInventoryTracking: booleanValue(row.enable_inventory_tracking, true),
      lowStockThreshold: numberValue(row.low_stock_threshold, defaultBusinessConfig.storeSettings.lowStockThreshold || 10),
      enableBarcodeScanner: booleanValue(row.enable_barcode_scanner, true),
      printReceipts: booleanValue(row.enable_receipt_printer, true),
      enableCashDrawer: booleanValue(row.enable_cash_drawer, true),
      ...(row.max_discount_percentage !== undefined
        ? { maxDiscountPercentage: numberValue(row.max_discount_percentage, 50) }
        : {}),
      ...(row.require_customer_info !== undefined
        ? { requireCustomerInfo: booleanValue(row.require_customer_info, false) }
        : {}),
      ...(row.enable_loyalty_program !== undefined
        ? { enableLoyaltyProgram: booleanValue(row.enable_loyalty_program, false) }
        : {}),
      ...(row.loyalty_points_per_purchase !== undefined
        ? { loyaltyPointsPerPurchase: numberValue(row.loyalty_points_per_purchase, 1) }
        : {}),
      ...(row.loyalty_points_for_reward !== undefined
        ? { loyaltyPointsForReward: numberValue(row.loyalty_points_for_reward, 100) }
        : {}),
    } as BusinessConfig['storeSettings'],
    systemSettings: {
      ...defaultBusinessConfig.systemSettings!,
      autoBackup: booleanValue(row.auto_backup, defaultBusinessConfig.systemSettings!.autoBackup),
      backupFrequency: stringValue(row.backup_frequency, defaultBusinessConfig.systemSettings!.backupFrequency) as NonNullable<BusinessConfig['systemSettings']>['backupFrequency'],
      email: {
        ...defaultBusinessConfig.systemSettings!.email,
        provider: 'smtp',
        smtpHost: stringValue(row.smtp_host),
        smtpPort: numberValue(row.smtp_port, 587),
        smtpUser: stringValue(row.smtp_user),
        ...(typeof row.smtp_password === 'string' && row.smtp_password.length > 0
          ? { smtpPassword: row.smtp_password }
          : {}),
      },
    },
    notifications: {
      emailNotifications: booleanValue(row.email_notifications, defaultBusinessConfig.notifications.emailNotifications),
      smsNotifications: booleanValue(row.sms_notifications, defaultBusinessConfig.notifications.smsNotifications),
      pushNotifications: booleanValue(row.push_notifications, defaultBusinessConfig.notifications.pushNotifications),
    },
    regional: {
      ...defaultBusinessConfig.regional,
      timezone: stringValue(row.timezone, defaultBusinessConfig.regional.timezone),
      dateFormat: stringValue(row.date_format, 'DD/MM/YYYY'),
      timeFormat: normalizeTimeFormat(row.time_format),
      language: stringValue(row.language, defaultBusinessConfig.regional.language),
    },
    updatedAt: stringValue(row.updated_at, new Date().toISOString()),
  });
}

function businessConfigToSystemSettings(config: BusinessConfig) {
  const storeSettings = config.storeSettings as BusinessConfig['storeSettings'] & Record<string, unknown>;
  const systemSettings = config.systemSettings || defaultBusinessConfig.systemSettings!;
  const email = systemSettings.email || defaultBusinessConfig.systemSettings!.email;
  const notifications = config.notifications || defaultBusinessConfig.notifications;
  const regional = config.regional || defaultBusinessConfig.regional;

  return {
    business_name: config.businessName || '',
    address: config.address?.street || '',
    phone: config.contact?.phone || '',
    email: config.contact?.email || '',
    website: config.contact?.website || '',
    logo_url: config.branding?.logo || '',
    currency: storeSettings.currency || 'PYG',
    timezone: regional.timezone || 'America/Asuncion',
    language: regional.language || 'es-PY',
    date_format: regional.dateFormat || 'DD/MM/YYYY',
    time_format: normalizeTimeFormat(regional.timeFormat),
    tax_rate: taxRateToPercent(storeSettings.taxRate),
    decimal_places: storeSettings.currency === 'PYG' ? 0 : 2,
    receipt_footer: '',
    enable_inventory_tracking: storeSettings.enableInventoryTracking ?? true,
    enable_loyalty_program: Boolean(storeSettings.enableLoyaltyProgram ?? false),
    email_notifications: notifications.emailNotifications ?? true,
    sms_notifications: notifications.smsNotifications ?? false,
    push_notifications: notifications.pushNotifications ?? true,
    enable_notifications: Boolean(
      (notifications.emailNotifications ?? true) ||
      (notifications.smsNotifications ?? false) ||
      (notifications.pushNotifications ?? true)
    ),
    auto_backup: systemSettings.autoBackup ?? true,
    backup_frequency: systemSettings.backupFrequency || 'daily',
    low_stock_threshold: storeSettings.lowStockThreshold ?? 10,
    enable_barcode_scanner: storeSettings.enableBarcodeScanner ?? true,
    enable_receipt_printer: storeSettings.printReceipts ?? true,
    enable_cash_drawer: storeSettings.enableCashDrawer ?? true,
    max_discount_percentage: numberValue(storeSettings.maxDiscountPercentage, 50),
    require_customer_info: Boolean(storeSettings.requireCustomerInfo ?? false),
    loyalty_points_per_purchase: numberValue(storeSettings.loyaltyPointsPerPurchase, 1),
    loyalty_points_for_reward: numberValue(storeSettings.loyaltyPointsForReward, 100),
    smtp_host: email.smtpHost || '',
    smtp_port: email.smtpPort || 587,
    smtp_user: email.smtpUser || '',
    smtp_password: '',
    smtp_secure: true,
    smtp_from_email: '',
    smtp_from_name: '',
    smtp_password_configured: Boolean(email.smtpPassword),
  };
}

function validateSettings(settings: SystemSettingsPayload) {
  const validationErrors: string[] = [];

  if (settings.tax_rate !== undefined) {
    const taxRate = Number(settings.tax_rate);
    if (Number.isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
      validationErrors.push('La tasa de impuesto debe estar entre 0 y 100');
    }
  }

  if (settings.currency && !['PYG', 'USD', 'EUR', 'BRL', 'ARS'].includes(String(settings.currency))) {
    validationErrors.push('Moneda no soportada');
  }

  if (settings.time_format && !['12h', '24h'].includes(String(settings.time_format))) {
    validationErrors.push('Formato de hora invalido');
  }

  if (settings.backup_frequency && !['hourly', 'daily', 'weekly', 'monthly'].includes(String(settings.backup_frequency))) {
    validationErrors.push('Frecuencia de respaldo invalida');
  }

  if (settings.smtp_port !== undefined) {
    const smtpPort = Number(settings.smtp_port);
    if (!Number.isInteger(smtpPort) || smtpPort <= 0 || smtpPort > 65535) {
      validationErrors.push('Puerto SMTP invalido');
    }
  }

  if (settings.decimal_places !== undefined) {
    const decimalPlaces = Number(settings.decimal_places);
    if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0 || decimalPlaces > 6) {
      validationErrors.push('La cantidad de decimales debe estar entre 0 y 6');
    }
  }

  if (settings.low_stock_threshold !== undefined) {
    const lowStockThreshold = Number(settings.low_stock_threshold);
    if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0) {
      validationErrors.push('El umbral de stock bajo debe ser un entero positivo');
    }
  }

  if (settings.max_discount_percentage !== undefined) {
    const maxDiscountPercentage = Number(settings.max_discount_percentage);
    if (Number.isNaN(maxDiscountPercentage) || maxDiscountPercentage < 0 || maxDiscountPercentage > 100) {
      validationErrors.push('El descuento maximo debe estar entre 0 y 100');
    }
  }

  if (settings.loyalty_points_per_purchase !== undefined) {
    const points = Number(settings.loyalty_points_per_purchase);
    if (!Number.isInteger(points) || points < 1 || points > 100) {
      validationErrors.push('Los puntos por compra deben estar entre 1 y 100');
    }
  }

  if (settings.loyalty_points_for_reward !== undefined) {
    const points = Number(settings.loyalty_points_for_reward);
    if (!Number.isInteger(points) || points < 10 || points > 10000) {
      validationErrors.push('Los puntos para recompensa deben estar entre 10 y 10000');
    }
  }

  return validationErrors;
}

async function resolveOrganizationId(
  request: NextRequest,
  userId: string,
  orgFromAuth: string | null,
  isSuperAdmin: boolean,
  adminClient: AdminClient
) {
  const { searchParams } = new URL(request.url);
  const requestedOrg =
    searchParams.get('organizationId') ||
    searchParams.get('organization_id') ||
    request.headers.get('x-organization-id') ||
    request.cookies.get('x-organization-id')?.value ||
    null;

  const organizationId = requestedOrg || orgFromAuth || await getUserOrganizationId(userId);
  if (!organizationId) return null;
  if (isSuperAdmin || userId === 'mock-user') return organizationId;

  const { data } = await adminClient
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  return data?.organization_id || null;
}

async function loadBusinessConfig(adminClient: AdminClient, organizationId: string): Promise<BusinessConfig> {
  const { data: settingsRow, error: settingsError } = await adminClient
    .from('settings')
    .select('value')
    .eq('key', 'business_config')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (settingsError) {
    throw settingsError;
  }

  if (settingsRow?.value && isObject(settingsRow.value)) {
    return mergeBusinessConfig(settingsRow.value as Partial<BusinessConfig>);
  }

  const { data: legacyRow, error: legacyError } = await adminClient
    .from('business_config')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (legacyError) {
    throw legacyError;
  }

  return legacyRow ? legacyRowToBusinessConfig(legacyRow) : mergeBusinessConfig();
}

function applySystemSettings(config: BusinessConfig, settings: SystemSettingsPayload): BusinessConfig {
  const next = mergeBusinessConfig(config);
  const storeSettings = { ...next.storeSettings } as BusinessConfig['storeSettings'] & Record<string, unknown>;
  const systemSettings = { ...(next.systemSettings || defaultBusinessConfig.systemSettings!) };
  const security = {
    ...defaultBusinessConfig.systemSettings!.security,
    ...(systemSettings.security || {}),
  };
  const email = {
    ...defaultBusinessConfig.systemSettings!.email,
    ...(systemSettings.email || {}),
    provider: 'smtp' as const,
  };
  const notifications = { ...next.notifications };
  const regional = { ...next.regional };

  if (hasOwn(settings, 'business_name')) next.businessName = stringValue(settings.business_name, next.businessName);
  if (hasOwn(settings, 'address')) next.address = { ...next.address, street: stringValue(settings.address, next.address.street) };
  if (hasOwn(settings, 'phone')) next.contact = { ...next.contact, phone: stringValue(settings.phone, next.contact.phone) };
  if (hasOwn(settings, 'email')) next.contact = { ...next.contact, email: stringValue(settings.email, next.contact.email) };
  if (hasOwn(settings, 'website')) next.contact = { ...next.contact, website: stringValue(settings.website, next.contact.website) };
  if (hasOwn(settings, 'logo_url')) next.branding = { ...next.branding, logo: stringValue(settings.logo_url, next.branding.logo) };

  if (hasOwn(settings, 'currency')) {
    const currency = stringValue(settings.currency, storeSettings.currency);
    storeSettings.currency = currency;
    storeSettings.currencySymbol = currencySymbol(currency);
  }
  if (hasOwn(settings, 'tax_rate')) storeSettings.taxRate = taxPercentToRate(settings.tax_rate);
  if (hasOwn(settings, 'enable_inventory_tracking')) storeSettings.enableInventoryTracking = booleanValue(settings.enable_inventory_tracking, true);
  if (hasOwn(settings, 'low_stock_threshold')) storeSettings.lowStockThreshold = numberValue(settings.low_stock_threshold, storeSettings.lowStockThreshold || 10);
  if (hasOwn(settings, 'enable_barcode_scanner')) storeSettings.enableBarcodeScanner = booleanValue(settings.enable_barcode_scanner, true);
  if (hasOwn(settings, 'enable_receipt_printer')) storeSettings.printReceipts = booleanValue(settings.enable_receipt_printer, true);
  if (hasOwn(settings, 'enable_cash_drawer')) storeSettings.enableCashDrawer = booleanValue(settings.enable_cash_drawer, true);
  if (hasOwn(settings, 'max_discount_percentage')) storeSettings.maxDiscountPercentage = numberValue(settings.max_discount_percentage, 50);
  if (hasOwn(settings, 'require_customer_info')) storeSettings.requireCustomerInfo = booleanValue(settings.require_customer_info, false);
  if (hasOwn(settings, 'enable_loyalty_program')) storeSettings.enableLoyaltyProgram = booleanValue(settings.enable_loyalty_program, false);
  if (hasOwn(settings, 'loyalty_points_per_purchase')) storeSettings.loyaltyPointsPerPurchase = numberValue(settings.loyalty_points_per_purchase, 1);
  if (hasOwn(settings, 'loyalty_points_for_reward')) storeSettings.loyaltyPointsForReward = numberValue(settings.loyalty_points_for_reward, 100);

  if (hasOwn(settings, 'timezone')) regional.timezone = stringValue(settings.timezone, regional.timezone);
  if (hasOwn(settings, 'date_format')) regional.dateFormat = stringValue(settings.date_format, regional.dateFormat);
  if (hasOwn(settings, 'time_format')) regional.timeFormat = normalizeTimeFormat(settings.time_format);
  if (hasOwn(settings, 'language')) regional.language = stringValue(settings.language, regional.language);

  if (hasOwn(settings, 'email_notifications')) notifications.emailNotifications = booleanValue(settings.email_notifications, notifications.emailNotifications);
  if (hasOwn(settings, 'sms_notifications')) notifications.smsNotifications = booleanValue(settings.sms_notifications, notifications.smsNotifications);
  if (hasOwn(settings, 'push_notifications')) notifications.pushNotifications = booleanValue(settings.push_notifications, notifications.pushNotifications);
  if (hasOwn(settings, 'enable_notifications') && !settings.enable_notifications) {
    notifications.emailNotifications = false;
    notifications.smsNotifications = false;
    notifications.pushNotifications = false;
  }

  if (hasOwn(settings, 'auto_backup')) systemSettings.autoBackup = booleanValue(settings.auto_backup, systemSettings.autoBackup);
  if (hasOwn(settings, 'backup_frequency')) {
    systemSettings.backupFrequency = stringValue(settings.backup_frequency, systemSettings.backupFrequency) as NonNullable<BusinessConfig['systemSettings']>['backupFrequency'];
  }
  if (hasOwn(settings, 'session_timeout')) systemSettings.sessionTimeout = numberValue(settings.session_timeout, systemSettings.sessionTimeout);

  if (hasOwn(settings, 'smtp_host')) email.smtpHost = stringValue(settings.smtp_host, email.smtpHost);
  if (hasOwn(settings, 'smtp_port')) email.smtpPort = numberValue(settings.smtp_port, email.smtpPort);
  if (hasOwn(settings, 'smtp_user')) email.smtpUser = stringValue(settings.smtp_user, email.smtpUser);
  if (hasOwn(settings, 'smtp_password') && stringValue(settings.smtp_password).length > 0) {
    email.smtpPassword = stringValue(settings.smtp_password);
  }

  next.storeSettings = storeSettings;
  next.notifications = notifications;
  next.regional = regional;
  next.systemSettings = {
    ...systemSettings,
    security,
    email,
  };
  next.updatedAt = new Date().toISOString();

  return next;
}

async function persistBusinessConfig(adminClient: AdminClient, organizationId: string, config: BusinessConfig) {
  const now = new Date().toISOString();
  const { error } = await adminClient
    .from('settings')
    .upsert(
      {
        key: 'business_config',
        value: config,
        organization_id: organizationId,
        updated_at: now,
      },
      { onConflict: 'organization_id,key' }
    );

  if (error) throw error;

  const flat = businessConfigToSystemSettings(config);
  const legacyPayload = Object.fromEntries(
    Object.entries({
      organization_id: organizationId,
      business_name: flat.business_name,
      address: flat.address,
      phone: flat.phone,
      email: flat.email,
      website: flat.website,
      logo_url: flat.logo_url,
      currency: flat.currency,
      timezone: flat.timezone,
      language: flat.language,
      date_format: flat.date_format,
      time_format: flat.time_format,
      tax_rate: flat.tax_rate,
      decimal_places: flat.decimal_places,
      receipt_footer: flat.receipt_footer,
      enable_inventory_tracking: flat.enable_inventory_tracking,
      enable_loyalty_program: flat.enable_loyalty_program,
      email_notifications: flat.email_notifications,
      sms_notifications: flat.sms_notifications,
      push_notifications: flat.push_notifications,
      enable_notifications: flat.enable_notifications,
      auto_backup: flat.auto_backup,
      backup_frequency: flat.backup_frequency,
      low_stock_threshold: flat.low_stock_threshold,
      enable_barcode_scanner: flat.enable_barcode_scanner,
      enable_receipt_printer: flat.enable_receipt_printer,
      enable_cash_drawer: flat.enable_cash_drawer,
      max_discount_percentage: flat.max_discount_percentage,
      require_customer_info: flat.require_customer_info,
      loyalty_points_per_purchase: flat.loyalty_points_per_purchase,
      loyalty_points_for_reward: flat.loyalty_points_for_reward,
      smtp_host: flat.smtp_host,
      smtp_port: flat.smtp_port,
      smtp_user: flat.smtp_user,
      smtp_secure: flat.smtp_secure,
      smtp_from_email: flat.smtp_from_email,
      smtp_from_name: flat.smtp_from_name,
      updated_at: now,
    }).filter(([, value]) => value !== undefined)
  );

  const { error: legacyError } = await adminClient
    .from('business_config')
    .upsert(legacyPayload, { onConflict: 'organization_id' });

  if (legacyError) {
    console.warn('Could not mirror system settings to legacy business_config:', legacyError.message);
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await assertAdmin(request);
    if (!authResult.ok) {
      return NextResponse.json(authResult.body, { status: authResult.status });
    }

    const { userId, organizationId: orgFromAuth, isSuperAdmin } = authResult;
    const adminClient = await createAdminClient();
    const resolvedOrg = await resolveOrganizationId(request, userId, orgFromAuth, isSuperAdmin, adminClient);

    if (!resolvedOrg) {
      return NextResponse.json(
        {
          error: isSuperAdmin
            ? 'Debes indicar una organizacion para consultar esta configuracion'
            : 'No se encontro una organizacion asociada al usuario',
        },
        { status: 400 }
      );
    }

    const config = await loadBusinessConfig(adminClient, resolvedOrg);
    const systemSettings = businessConfigToSystemSettings(config);

    logAudit('system.settings.read', {
      userId,
      organizationId: resolvedOrg,
      isSuperAdmin,
      url: request.url,
    });

    return NextResponse.json(systemSettings);
  } catch (error) {
    console.error('System settings API error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await assertAdmin(request);
    if (!authResult.ok) {
      return NextResponse.json(authResult.body, { status: authResult.status });
    }

    const { userId, organizationId: orgFromAuth, isSuperAdmin } = authResult;
    const adminClient = await createAdminClient();
    const settings = await request.json();
    const resolvedOrg = await resolveOrganizationId(request, userId, orgFromAuth, isSuperAdmin, adminClient);

    if (!resolvedOrg) {
      return NextResponse.json(
        {
          error: isSuperAdmin
            ? 'Debes indicar una organizacion para actualizar esta configuracion'
            : 'No se encontro una organizacion asociada al usuario',
        },
        { status: 400 }
      );
    }

    const validationErrors = validateSettings(settings);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Datos invalidos', details: validationErrors },
        { status: 400 }
      );
    }

    const oldConfig = await loadBusinessConfig(adminClient, resolvedOrg);
    const updatedConfig = applySystemSettings(oldConfig, settings);
    const validation = validateBusinessConfig(updatedConfig);
    if (!validation.ok) {
      return NextResponse.json({ error: 'Datos invalidos', details: validation.errors }, { status: 400 });
    }

    await persistBusinessConfig(adminClient, resolvedOrg, updatedConfig);
    setCachedConfig(resolvedOrg, updatedConfig);

    logAudit('system.settings.update', {
      userId,
      organizationId: resolvedOrg,
      isSuperAdmin,
      oldData: oldConfig,
      newData: updatedConfig,
      url: request.url,
    });

    return NextResponse.json({
      success: true,
      data: businessConfigToSystemSettings(updatedConfig),
      config: updatedConfig,
      message: 'Configuraciones actualizadas correctamente',
    });
  } catch (error) {
    console.error('System settings update error:', error);
    logAudit('system.settings.update.error', {
      error: String(error),
      url: request.url,
    });

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
