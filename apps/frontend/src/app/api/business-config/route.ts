import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/app/api/_utils/auth'
import { getUserOrganizationId } from '@/app/api/_utils/organization'
import { validateBusinessConfig } from '@/app/api/admin/_utils/business-config-validation'
import { logAudit } from '@/app/api/admin/_utils/audit'
import type { BusinessConfig, BusinessConfigUpdate } from '@/types/business-config'
import { defaultBusinessConfig } from '@/types/business-config'
import { getCachedConfig, setCachedConfig } from './cache'

// ✅ Cache per organización (compartido entre rutas)

export async function GET(request: NextRequest) {
  try {
    // ✅ Authentication and authorization
    const auth = await assertAdmin(request)
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status })
    }

    const userId = auth.userId as string
    const userEmail = auth.email
    const isSuperAdmin = auth.isSuperAdmin || false

    // ✅ Get organization context
    const { searchParams } = new URL(request.url)
    const orgFilter = searchParams.get('organizationId') || searchParams.get('organization_id')
    
    let organizationId: string
    if (isSuperAdmin && orgFilter) {
      // Super admin can query any organization
      organizationId = orgFilter
    } else {
      // Regular admin gets their own organization
      const userOrgId = await getUserOrganizationId(userId)
      if (!userOrgId) {
        return NextResponse.json(
          { error: 'Usuario no pertenece a ninguna organización' },
          { status: 403 }
        )
      }
      organizationId = userOrgId
    }

    // Check cache first
    const cached = getCachedConfig(organizationId)
    if (cached) {
      return NextResponse.json({ success: true, config: cached })
    }

    // ✅ Query with RLS-enabled client
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'business_config')
      .eq('organization_id', organizationId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching business config:', error)
      return NextResponse.json(
        { error: 'Error al obtener configuración' },
        { status: 500 }
      )
    }

    // Return default config if not found
    const config = data?.value || defaultBusinessConfig
    setCachedConfig(organizationId, config)

    return NextResponse.json({ success: true, config })
  } catch (error: any) {
    console.error('Error in GET /api/business-config:', error)
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // ✅ Authentication and authorization
    const auth = await assertAdmin(request)
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status })
    }

    const userId = auth.userId as string
    const userEmail = auth.email
    const isSuperAdmin = auth.isSuperAdmin || false

    // ✅ Get organization context
    const { searchParams } = new URL(request.url)
    const orgFilter = searchParams.get('organizationId') || searchParams.get('organization_id')
    
    let organizationId: string
    if (isSuperAdmin && orgFilter) {
      organizationId = orgFilter
    } else {
      const userOrgId = await getUserOrganizationId(userId)
      if (!userOrgId) {
        return NextResponse.json(
          { error: 'Usuario no pertenece a ninguna organización' },
          { status: 403 }
        )
      }
      organizationId = userOrgId
    }

    // Parse and validate request body
    const raw = await request.json()
    const s = (v: any, d: string = '') => (typeof v === 'string' ? v : d)
    const n = (v: any, d: number) => {
      const num = Number(v)
      return Number.isFinite(num) ? num : d
    }
    const b = (v: any, d: boolean) => (typeof v === 'boolean' ? v : d)
    const arrStr = (v: any, d: string[]) => (Array.isArray(v) ? v.filter((x: any) => typeof x === 'string') : d)
    const body: BusinessConfigUpdate = {
      businessName: s(raw?.businessName, defaultBusinessConfig.businessName),
      tagline: s(raw?.tagline, defaultBusinessConfig.tagline),
      heroTitle: s(raw?.heroTitle, defaultBusinessConfig.heroTitle),
      heroHighlight: s(raw?.heroHighlight, defaultBusinessConfig.heroHighlight),
      heroDescription: s(raw?.heroDescription, defaultBusinessConfig.heroDescription),
      legalInfo: {
        ruc: s(raw?.legalInfo?.ruc),
        businessType: s(raw?.legalInfo?.businessType, defaultBusinessConfig.legalInfo.businessType),
        taxRegime: s(raw?.legalInfo?.taxRegime, defaultBusinessConfig.legalInfo.taxRegime),
        economicActivity: s(raw?.legalInfo?.economicActivity, defaultBusinessConfig.legalInfo.economicActivity),
        registrationNumber: s(raw?.legalInfo?.registrationNumber),
      },
      legalDocuments: {
        termsUrl: s(raw?.legalDocuments?.termsUrl),
        privacyUrl: s(raw?.legalDocuments?.privacyUrl),
      },
      contact: {
        phone: s(raw?.contact?.phone, defaultBusinessConfig.contact.phone),
        email: s(raw?.contact?.email, defaultBusinessConfig.contact.email),
        whatsapp: s(raw?.contact?.whatsapp),
        website: s(raw?.contact?.website),
        landline: s(raw?.contact?.landline),
      },
      address: {
        street: s(raw?.address?.street, defaultBusinessConfig.address.street),
        neighborhood: s(raw?.address?.neighborhood, defaultBusinessConfig.address.neighborhood),
        city: s(raw?.address?.city, defaultBusinessConfig.address.city),
        department: s(raw?.address?.department, defaultBusinessConfig.address.department),
        zipCode: s(raw?.address?.zipCode, defaultBusinessConfig.address.zipCode),
        country: s(raw?.address?.country, defaultBusinessConfig.address.country),
        reference: s(raw?.address?.reference),
        mapUrl: s(raw?.address?.mapUrl),
        latitude: Number.isFinite(Number(raw?.address?.latitude)) ? Number(raw?.address?.latitude) : undefined,
        longitude: Number.isFinite(Number(raw?.address?.longitude)) ? Number(raw?.address?.longitude) : undefined,
        mapEmbedEnabled: b(raw?.address?.mapEmbedEnabled, false),
        mapEmbedUrl: s(raw?.address?.mapEmbedUrl),
      },
      socialMedia: {
        facebook: s(raw?.socialMedia?.facebook),
        instagram: s(raw?.socialMedia?.instagram),
        twitter: s(raw?.socialMedia?.twitter),
        tiktok: s(raw?.socialMedia?.tiktok),
        linkedin: s(raw?.socialMedia?.linkedin),
      },
      businessHours: arrStr(raw?.businessHours, defaultBusinessConfig.businessHours),
      branding: {
        primaryColor: s(raw?.branding?.primaryColor, defaultBusinessConfig.branding.primaryColor),
        secondaryColor: s(raw?.branding?.secondaryColor, defaultBusinessConfig.branding.secondaryColor),
        accentColor: s(raw?.branding?.accentColor, defaultBusinessConfig.branding.accentColor),
        backgroundColor: s(raw?.branding?.backgroundColor, defaultBusinessConfig.branding.backgroundColor),
        textColor: s(raw?.branding?.textColor, defaultBusinessConfig.branding.textColor),
        gradientStart: s(raw?.branding?.gradientStart, defaultBusinessConfig.branding.gradientStart),
        gradientEnd: s(raw?.branding?.gradientEnd, defaultBusinessConfig.branding.gradientEnd),
        logo: s(raw?.branding?.logo),
        favicon: s(raw?.branding?.favicon),
      },
      storeSettings: {
        currency: s(raw?.storeSettings?.currency, defaultBusinessConfig.storeSettings.currency),
        currencySymbol: s(raw?.storeSettings?.currencySymbol, defaultBusinessConfig.storeSettings.currencySymbol),
        taxRate: n(raw?.storeSettings?.taxRate, defaultBusinessConfig.storeSettings.taxRate),
        taxEnabled: b(raw?.storeSettings?.taxEnabled, defaultBusinessConfig.storeSettings.taxEnabled),
        taxIncludedInPrices: b(raw?.storeSettings?.taxIncludedInPrices, defaultBusinessConfig.storeSettings.taxIncludedInPrices),
        freeShippingThreshold: n(raw?.storeSettings?.freeShippingThreshold, defaultBusinessConfig.storeSettings.freeShippingThreshold),
        freeShippingEnabled: b(raw?.storeSettings?.freeShippingEnabled, !!defaultBusinessConfig.storeSettings.freeShippingEnabled),
        freeShippingMessage: s(raw?.storeSettings?.freeShippingMessage, defaultBusinessConfig.storeSettings.freeShippingMessage || ''),
        freeShippingRegions: Array.isArray(raw?.storeSettings?.freeShippingRegions) ? raw.storeSettings.freeShippingRegions.map((r: any) => ({ id: s(r?.id), name: s(r?.name), threshold: n(r?.threshold, 0) })) : [],
        minimumOrderAmount: n(raw?.storeSettings?.minimumOrderAmount, defaultBusinessConfig.storeSettings.minimumOrderAmount || 0),
        acceptsCreditCards: b(raw?.storeSettings?.acceptsCreditCards, defaultBusinessConfig.storeSettings.acceptsCreditCards),
        acceptsDebitCards: b(raw?.storeSettings?.acceptsDebitCards, defaultBusinessConfig.storeSettings.acceptsDebitCards),
        acceptsCash: b(raw?.storeSettings?.acceptsCash, defaultBusinessConfig.storeSettings.acceptsCash),
        acceptsBankTransfer: b(raw?.storeSettings?.acceptsBankTransfer, defaultBusinessConfig.storeSettings.acceptsBankTransfer),
        enableInventoryTracking: b(raw?.storeSettings?.enableInventoryTracking, !!defaultBusinessConfig.storeSettings.enableInventoryTracking),
        lowStockThreshold: n(raw?.storeSettings?.lowStockThreshold, defaultBusinessConfig.storeSettings.lowStockThreshold || 0),
        enableBarcodeScanner: b(raw?.storeSettings?.enableBarcodeScanner, !!defaultBusinessConfig.storeSettings.enableBarcodeScanner),
        printReceipts: b(raw?.storeSettings?.printReceipts, !!defaultBusinessConfig.storeSettings.printReceipts),
        enableCashDrawer: b(raw?.storeSettings?.enableCashDrawer, !!defaultBusinessConfig.storeSettings.enableCashDrawer),
      },
      systemSettings: raw?.systemSettings ? {
        autoBackup: b(raw?.systemSettings?.autoBackup, defaultBusinessConfig.systemSettings!.autoBackup),
        backupFrequency: s(raw?.systemSettings?.backupFrequency, defaultBusinessConfig.systemSettings!.backupFrequency),
        maxUsers: n(raw?.systemSettings?.maxUsers, defaultBusinessConfig.systemSettings!.maxUsers),
        sessionTimeout: n(raw?.systemSettings?.sessionTimeout, defaultBusinessConfig.systemSettings!.sessionTimeout),
        enableLogging: b(raw?.systemSettings?.enableLogging, defaultBusinessConfig.systemSettings!.enableLogging),
        logLevel: s(raw?.systemSettings?.logLevel, defaultBusinessConfig.systemSettings!.logLevel),
        security: {
          requireStrongPasswords: b(raw?.systemSettings?.security?.requireStrongPasswords, defaultBusinessConfig.systemSettings!.security.requireStrongPasswords),
          enableTwoFactor: b(raw?.systemSettings?.security?.enableTwoFactor, defaultBusinessConfig.systemSettings!.security.enableTwoFactor),
          maxLoginAttempts: n(raw?.systemSettings?.security?.maxLoginAttempts, defaultBusinessConfig.systemSettings!.security.maxLoginAttempts),
          lockoutDuration: n(raw?.systemSettings?.security?.lockoutDuration, defaultBusinessConfig.systemSettings!.security.lockoutDuration),
        },
        email: {
          provider: 'smtp',
          smtpHost: s(raw?.systemSettings?.email?.smtpHost, ''),
          smtpPort: n(raw?.systemSettings?.email?.smtpPort, 587),
          smtpUser: s(raw?.systemSettings?.email?.smtpUser, ''),
          smtpPassword: s(raw?.systemSettings?.email?.smtpPassword),
        },
      } : defaultBusinessConfig.systemSettings,
      carousel: {
        enabled: b(raw?.carousel?.enabled, defaultBusinessConfig.carousel.enabled),
        transitionSeconds: Math.min(10, Math.max(3, n(raw?.carousel?.transitionSeconds, defaultBusinessConfig.carousel.transitionSeconds))),
        ratio: (Number.isFinite(Number(raw?.carousel?.ratio)) && Number(raw?.carousel?.ratio) > 0) ? Number(raw?.carousel?.ratio) : defaultBusinessConfig.carousel.ratio,
        autoplay: b(raw?.carousel?.autoplay, !!defaultBusinessConfig.carousel.autoplay),
        transitionMs: Math.min(5000, Math.max(0, n(raw?.carousel?.transitionMs, defaultBusinessConfig.carousel.transitionMs || 800))),
        images: Array.isArray(raw?.carousel?.images) ? raw.carousel.images.map((img: any) => ({ id: s(img?.id, ''), url: s(img?.url, ''), alt: s(img?.alt) })).filter((img: any) => !!img.url) : defaultBusinessConfig.carousel.images,
      },
      homeOffersCarousel: raw?.homeOffersCarousel ? {
        enabled: b(raw?.homeOffersCarousel?.enabled, defaultBusinessConfig.homeOffersCarousel!.enabled),
        autoplay: b(raw?.homeOffersCarousel?.autoplay, defaultBusinessConfig.homeOffersCarousel!.autoplay),
        intervalSeconds: Math.min(10, Math.max(3, n(raw?.homeOffersCarousel?.intervalSeconds, defaultBusinessConfig.homeOffersCarousel!.intervalSeconds))),
        transitionMs: Math.min(5000, Math.max(0, n(raw?.homeOffersCarousel?.transitionMs, defaultBusinessConfig.homeOffersCarousel!.transitionMs))),
        ratio: (Number.isFinite(Number(raw?.homeOffersCarousel?.ratio)) && Number(raw?.homeOffersCarousel?.ratio) > 0) ? Number(raw?.homeOffersCarousel?.ratio) : defaultBusinessConfig.homeOffersCarousel!.ratio,
      } : defaultBusinessConfig.homeOffersCarousel,
      notifications: {
        emailNotifications: b(raw?.notifications?.emailNotifications, defaultBusinessConfig.notifications.emailNotifications),
        smsNotifications: b(raw?.notifications?.smsNotifications, defaultBusinessConfig.notifications.smsNotifications),
        pushNotifications: b(raw?.notifications?.pushNotifications, defaultBusinessConfig.notifications.pushNotifications),
      },
      regional: {
        timezone: s(raw?.regional?.timezone, defaultBusinessConfig.regional.timezone),
        dateFormat: s(raw?.regional?.dateFormat, defaultBusinessConfig.regional.dateFormat),
        timeFormat: s(raw?.regional?.timeFormat, defaultBusinessConfig.regional.timeFormat),
        language: s(raw?.regional?.language, defaultBusinessConfig.regional.language),
        locale: s(raw?.regional?.locale, defaultBusinessConfig.regional.locale),
      },
      updatedAt: s(raw?.updatedAt, new Date().toISOString()),
    }
    const validation = validateBusinessConfig(body)
    if (!validation.ok) {
      return NextResponse.json(
        { success: false, errors: validation.errors },
        { status: 400 }
      )
    }

    // Get previous config for audit
    const supabase = await createClient()
    const { data: prevData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'business_config')
      .eq('organization_id', organizationId)
      .single()

    const prevConfig: BusinessConfig | null = prevData?.value || null

    // ✅ Update with organization_id
    const { error } = await supabase
      .from('settings')
      .upsert({
        key: 'business_config',
        value: body,
        organization_id: organizationId,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'organization_id,key'
      })

    if (error) {
      console.error('Error updating business config:', error)
      return NextResponse.json(
        { error: 'Error al actualizar configuración' },
        { status: 500 }
      )
    }

    // Update cache
    setCachedConfig(organizationId, body)

    // Audit log
    await logAudit(
      'business_config.update',
      {
        entityType: 'BUSINESS_CONFIG',
        entityId: organizationId,
        oldData: prevConfig,
        newData: body
      },
      {
        id: userId,
        email: userEmail || null,
        role: isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN'
      }
    )

    return NextResponse.json({ success: true, config: body })
  } catch (error: any) {
    console.error('Error in PUT /api/business-config:', error)
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
