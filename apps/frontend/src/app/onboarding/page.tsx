'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Palette,
  Phone,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/use-auth';
import {
  useCurrentOrganizationId,
  useCurrentOrganizationName,
} from '@/hooks/use-current-organization';
import { hasCompletedOnboarding, markOnboardingCompleted } from '@/lib/onboarding-storage';
import planService, {
  type CompanyProfile,
  type PlanData,
} from '@/lib/services/plan-service';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------
type CompanySize = 'micro' | 'small' | 'medium' | 'large';
type StepId = 'business' | 'contact' | 'brand';

interface FormState {
  name: string;
  rfc: string;
  industry: string;
  size: CompanySize;
  tagline: string;
  phone: string;
  email: string;
  website: string;
  country: string;
  city: string;
  department: string;
  primary_color: string;
}

type MarketplaceCategoryOption = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  is_featured?: boolean;
  sort_order?: number;
  org_count?: number;
  product_count?: number;
};

const SIZE_OPTIONS: Array<{ value: CompanySize; label: string; hint: string; minUsers: number; minLocations: number; recommendedPlan: string }> = [
  { value: 'micro', label: 'Micro', hint: '1-3 personas · Inicia o emprende', minUsers: 1, minLocations: 1, recommendedPlan: 'free' },
  { value: 'small', label: 'Pequeña', hint: '4-10 personas · Tienda activa', minUsers: 4, minLocations: 1, recommendedPlan: 'starter' },
  { value: 'medium', label: 'Mediana', hint: '11-50 personas · Multi-sucursal', minUsers: 11, minLocations: 3, recommendedPlan: 'professional' },
  { value: 'large', label: 'Grande', hint: '51+ personas · Cadena', minUsers: 51, minLocations: 10, recommendedPlan: 'enterprise' },
];

function getPlanLimit(planData: PlanData | null, featureType: string): number {
  if (!planData) return 999999;
  const limit = planData.limits.find(l => l.feature_type === featureType);
  return limit ? (limit.is_unlimited ? 999999 : limit.limit_value) : 999999;
}

function isSizeAllowedForPlan(size: CompanySize, planData: PlanData | null): boolean {
  const sizeOption = SIZE_OPTIONS.find(o => o.value === size);
  if (!sizeOption || !planData) return true;
  
  const maxUsers = getPlanLimit(planData, 'users');
  const maxLocations = getPlanLimit(planData, 'locations');
  
  return (maxUsers === 999999 || sizeOption.minUsers <= maxUsers) &&
         (maxLocations === 999999 || sizeOption.minLocations <= maxLocations);
}

// Países disponibles. Hoy solo Paraguay; el campo queda preparado para
// expandir a otros países sin cambiar el flujo.
const COUNTRY_OPTIONS: Array<readonly [string, string]> = [
  ['PY', 'Paraguay'],
];

// 17 departamentos de Paraguay + capital. Ciudades cubren los principales
// centros urbanos y municipios cabecera (no exhaustivo a nivel distrital).
const CITIES_BY_DEPARTMENT: Record<string, string[]> = {
  'Asunción': ['Asunción'],
  'Central': [
    'San Lorenzo', 'Luque', 'Fernando de la Mora', 'Lambaré', 'Capiatá',
    'Limpio', 'Ñemby', 'Mariano Roque Alonso', 'Villa Elisa', 'San Antonio',
    'Itauguá', 'Areguá', 'Ypacaraí', 'Guarambaré', 'J. Augusto Saldívar',
    'Nueva Italia', 'Itá', 'Villeta', 'Ypané',
  ],
  'Alto Paraná': [
    'Ciudad del Este', 'Presidente Franco', 'Hernandarias', 'Minga Guazú',
    'Santa Rita', 'San Alberto', 'Itakyry', 'Naranjal', 'Yguazú',
    'Mbaracayú', 'Doctor Juan León Mallorquín', 'Los Cedrales',
  ],
  'Itapúa': [
    'Encarnación', 'Hohenau', 'Obligado', 'Bella Vista', 'Capitán Miranda',
    'Trinidad', 'Jesús', 'Cambyretá', 'Carmen del Paraná', 'Coronel Bogado',
    'San Pedro del Paraná', 'Pirapó', 'María Auxiliadora', 'Edelira',
  ],
  'Caaguazú': [
    'Coronel Oviedo', 'Caaguazú', 'Doctor J. Eulogio Estigarribia',
    'Repatriación', 'Yhú', 'San Joaquín', 'Mariscal Francisco Solano López',
    'Raúl Arsenio Oviedo', 'Vaquería', 'San José de los Arroyos',
  ],
  'Cordillera': [
    'Caacupé', 'Tobatí', 'Eusebio Ayala', 'Piribebuy', 'San Bernardino',
    'Atyrá', 'Altos', 'Arroyos y Esteros', 'Mbocayaty del Yhaguy',
    'Loma Grande', 'Primero de Marzo', 'Itacurubí de la Cordillera',
    'Emboscada', 'Valenzuela',
  ],
  'Canindeyú': [
    'Salto del Guairá', 'Curuguaty', 'Katueté', 'Ypejhú', 'La Paloma',
    'Maracaná', 'Ygatimí', 'Corpus Christi', 'Nueva Esperanza',
  ],
  'Paraguarí': [
    'Paraguarí', 'Yaguarón', 'Pirayú', 'Carapeguá', 'Acahay', 'Quiindy',
    'Ybycuí', 'Quyquyhó', 'Sapucai', 'Caapucú', 'Caballero',
  ],
  'San Pedro': [
    'San Pedro del Ycuamandiyú', 'Santa Rosa del Aguaray', 'Choré',
    'Itacurubí del Rosario', 'General Resquín', 'Lima', 'Capiibary',
    'Antequera', 'Tacuatí', 'Unión', 'Yataity del Norte',
  ],
  'Guairá': [
    'Villarrica', 'Iturbe', 'Independencia', 'Mauricio José Troche',
    'Borja', 'Doctor Bottrell', 'Coronel Martínez', 'Yataity',
    'Félix Pérez Cardozo',
  ],
  'Concepción': [
    'Concepción', 'Horqueta', 'Belén', 'San Lázaro', 'Loreto',
    'Yby Yaú', 'Paso Barreto',
  ],
  'Amambay': [
    'Pedro Juan Caballero', 'Capitán Bado', 'Bella Vista Norte',
    'Zanja Pyta', 'Karapaí',
  ],
  'Caazapá': [
    'Caazapá', 'Yuty', 'San Juan Nepomuceno', 'Tavaí', 'Buena Vista',
    'Maciel', 'Doctor Moisés S. Bertoni', 'Avaí', 'Abaí',
  ],
  'Misiones': [
    'San Juan Bautista', 'Ayolas', 'San Ignacio', 'Santa María',
    'Santiago', 'Yabebyry', 'Villa Florida', 'San Patricio', 'San Miguel',
  ],
  'Ñeembucú': [
    'Pilar', 'Alberdi', 'Mayor José J. Martínez', 'Tacuaras',
    'Humaitá', 'Villalbín', 'Cerrito',
  ],
  'Presidente Hayes': [
    'Villa Hayes', 'Benjamín Aceval', 'Pozo Colorado', 'Puerto Pinasco',
    'Teniente Esteban Martínez', 'Nanawa', 'Tte. Irala Fernández',
  ],
  'Boquerón': [
    'Filadelfia', 'Loma Plata', 'Neuland', 'Mariscal Estigarribia',
  ],
  'Alto Paraguay': [
    'Fuerte Olimpo', 'Bahía Negra', 'Puerto Casado', 'Carmelo Peralta',
  ],
};
const DEPARTMENTS = Object.keys(CITIES_BY_DEPARTMENT);

const COLOR_PRESETS = [
  '#059669', '#0d9488', '#2563eb', '#7c3aed', '#e11d48', '#f59e0b',
  '#0891b2', '#4f46e5', '#c026d3', '#ea580c', '#16a34a', '#64748b',
];

const STEPS: Array<{ id: StepId; title: string; icon: typeof Briefcase }> = [
  { id: 'business', title: 'Tu negocio', icon: Briefcase },
  { id: 'contact', title: 'Contacto y ubicación', icon: MapPin },
  { id: 'brand', title: 'Marca', icon: Palette },
];

const DEFAULT_FORM: FormState = {
  name: '',
  rfc: '',
  industry: '',
  size: 'micro',
  tagline: '',
  phone: '',
  email: '',
  website: '',
  country: 'PY',
  city: '',
  department: '',
  primary_color: '#059669',
};

function areFormsEqual(a: FormState, b: FormState): boolean {
  return (
    a.name === b.name &&
    a.rfc === b.rfc &&
    a.industry === b.industry &&
    a.size === b.size &&
    a.tagline === b.tagline &&
    a.phone === b.phone &&
    a.email === b.email &&
    a.website === b.website &&
    a.country === b.country &&
    a.city === b.city &&
    a.department === b.department &&
    a.primary_color === b.primary_color
  );
}

function getOnboardingDraftKey(userId: string | null | undefined, organizationId: string) {
  return userId
    ? `onboarding_draft:${userId}:${organizationId}`
    : `onboarding_draft:${organizationId}`;
}

function readOnboardingDraft(userId: string | null | undefined, organizationId: string): Partial<FormState> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getOnboardingDraftKey(userId, organizationId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const draft = parsed?.draft;
    return typeof draft === 'object' && draft ? (draft as Partial<FormState>) : null;
  } catch {
    return null;
  }
}

function writeOnboardingDraft(userId: string | null | undefined, organizationId: string, draft: FormState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      getOnboardingDraftKey(userId, organizationId),
      JSON.stringify({ draft, savedAt: new Date().toISOString() })
    );
  } catch {}
}

function clearOnboardingDraft(userId: string | null | undefined, organizationId: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(getOnboardingDraftKey(userId, organizationId));
  } catch {}
}

function mergeDraftIntoBase(base: FormState, draft: Partial<FormState> | null): FormState {
  if (!draft) return base;
  const next: FormState = { ...base };
  (Object.keys(next) as Array<keyof FormState>).forEach((key) => {
    const draftValue = draft[key];
    if (typeof draftValue !== 'string') return;
    if (next[key].trim().length > 0) return;
    next[key] = draftValue;
  });
  if (draft.size && base.size === 'micro' && draft.size !== 'micro') {
    next.size = draft.size as CompanySize;
  }
  return next;
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------
function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidUrl(value: string) {
  try {
    new URL(value.startsWith('http://') || value.startsWith('https://') ? value : `https://${value}`);
    return true;
  } catch {
    return false;
  }
}

function normalizeWebsite(value: string) {
  const next = value.trim();
  if (!next) return '';
  return next.startsWith('http://') || next.startsWith('https://') ? next : `https://${next}`;
}

function resolveMarketplaceCategoryValue(profile: CompanyProfile | null, categories: MarketplaceCategoryOption[]) {
  const candidates = [
    profile?.marketplace_category_id,
    profile?.marketplace_category_slug,
    profile?.industry,
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim().toLowerCase());

  if (candidates.length === 0) return categories[0]?.id || '';

  const match = categories.find((category) => {
    const values = [category.id, category.slug, category.name].map((value) => value.toLowerCase());
    return values.some((value) => candidates.includes(value));
  });

  return match?.id || categories[0]?.id || '';
}

async function fetchMarketplaceCategories(): Promise<MarketplaceCategoryOption[]> {
  const response = await fetch('/api/marketplace/categories', { cache: 'no-store' });
  if (!response.ok) throw new Error('No se pudieron cargar los rubros del marketplace');
  const data = await response.json();
  const categories = Array.isArray(data?.categories) ? data.categories : [];
  return categories
    .filter((category: MarketplaceCategoryOption) => category?.id && category?.name && category?.slug)
    .sort((a: MarketplaceCategoryOption, b: MarketplaceCategoryOption) => {
      const featuredDiff = Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured));
      if (featuredDiff !== 0) return featuredDiff;
      return (a.sort_order || 0) - (b.sort_order || 0) || a.name.localeCompare(b.name);
    });
}

function buildForm(
  profile: CompanyProfile | null,
  organizationName: string | null,
  marketplaceCategories: MarketplaceCategoryOption[]
): FormState {
  return {
    name: profile?.name || organizationName || '',
    rfc: profile?.rfc || '',
    industry: resolveMarketplaceCategoryValue(profile, marketplaceCategories),
    size: (profile?.size as CompanySize) || 'micro',
    tagline: profile?.tagline || '',
    phone: profile?.phone || '',
    email: profile?.email || '',
    website: profile?.website || '',
    country: 'PY', // Por ahora solo Paraguay; extensible cuando agreguemos otros países.
    city: profile?.city || '',
    department: profile?.department || '',
    primary_color: profile?.primary_color || '#059669',
  };
}

function validateStep(stepId: StepId, form: FormState): Record<string, string> {
  const errors: Record<string, string> = {};

  if (stepId === 'business') {
    if (!form.name.trim()) errors.name = 'El nombre del negocio es obligatorio.';
    else if (form.name.trim().length < 3) errors.name = 'Mínimo 3 caracteres.';
    if (!form.industry.trim()) errors.industry = 'Seleccioná el rubro principal.';
    if (form.rfc.trim() && form.rfc.trim().length < 5) {
      errors.rfc = 'El RUC debe tener al menos 5 caracteres.';
    }
  }

  if (stepId === 'contact') {
    if (!form.phone.trim()) {
      errors.contact = 'Completa un telefono publico para que tus clientes te contacten.';
    }
    if (form.phone.trim() && !/^\+?[\d\s\-()]{7,}$/.test(form.phone.trim())) {
      errors.phone = 'El teléfono no parece válido. Ej: +595 981 000000';
    }
    if (form.email.trim() && !isValidEmail(form.email.trim())) {
      errors.email = 'El email no es válido. Ej: ventas@empresa.com';
    }
    if (form.website.trim() && !isValidUrl(form.website.trim())) {
      errors.website = 'La web no es válida. Ej: miempresa.com.py';
    }
    if (!form.department.trim()) errors.department = 'Seleccioná el departamento.';
    if (!form.city.trim()) errors.city = 'Seleccioná la ciudad.';
  }

  if (stepId === 'brand') {
    if (!form.primary_color.trim()) errors.primary_color = 'Elegí un color.';
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Loading & fallback states
// ---------------------------------------------------------------------------
function LoadingState() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-white/10" />
        <div className="mt-8 h-12 animate-pulse rounded-lg bg-white/5" />
        <div className="mt-6 h-96 animate-pulse rounded-xl bg-white/5" />
      </div>
    </div>
  );
}

function PublicFallback() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-12 sm:px-6">
        <Badge className="w-fit rounded-full bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
          Activación inicial
        </Badge>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Iniciá sesión para continuar.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
          Si te acabás de registrar, verificá tu correo y luego iniciá sesión para terminar de configurar tu negocio.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button
            asChild
            className="rounded-full bg-emerald-600 px-5 text-white hover:bg-emerald-700"
          >
            <Link href="/auth/signin?returnUrl=%2Fonboarding">
              Iniciar sesión <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-full border-white/20 px-5 text-white hover:bg-white/10"
          >
            <Link href="/inicio/planes">Volver a planes</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function NoOrgFallback() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-12 sm:px-6">
        <Badge className="w-fit rounded-full bg-amber-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-300">
          Sin organización
        </Badge>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Necesitás una empresa para configurar.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
          No detectamos una organización asociada a tu cuenta. Creá una empresa nueva o contactá a soporte si esto no debería pasar.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button
            asChild
            className="rounded-full bg-emerald-600 px-5 text-white hover:bg-emerald-700"
          >
            <Link href="/inicio/registro">
              Crear empresa <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-full border-white/20 px-5 text-white hover:bg-white/10"
          >
            <Link href="/dashboard">Ir al dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { showConfirmation, ConfirmationDialog } = useConfirmationDialog();
  const { user, loading: authLoading } = useAuth();
  const organizationId = useCurrentOrganizationId();
  const organizationName = useCurrentOrganizationName();

  // ---- Org resolution (hook -> localStorage -> API) ----
  const [resolvedOrgId, setResolvedOrgId] = useState<string | null>(organizationId);
  const [resolvedOrgName, setResolvedOrgName] = useState<string | null>(organizationName);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    if (resolvedOrgId) return;
    try {
      const cached = localStorage.getItem('selected_organization');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.id) {
          setResolvedOrgId(parsed.id);
          setResolvedOrgName(parsed.name || null);
        }
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (organizationId) setResolvedOrgId(organizationId);
    if (organizationName) setResolvedOrgName(organizationName);
  }, [organizationId, organizationName]);

  // Auto-detect: post-signup the hook may not have the org yet; pull from API.
  useEffect(() => {
    if (authLoading || !user || resolvedOrgId) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/auth/organizations', {
          cache: 'no-store',
          credentials: 'include',
        });
        const result = await response.json().catch(() => ({}));
        const orgs = Array.isArray(result?.organizations) ? result.organizations : [];
        if (cancelled || orgs.length === 0) return;
        const org = orgs[0];
        localStorage.setItem('selected_organization', JSON.stringify(org));
        setResolvedOrgId(org.id);
        setResolvedOrgName(org.name);
        window.dispatchEvent(new CustomEvent('organization-changed', {
          detail: { organizationId: org.id, organization: org },
        }));
      } catch (err) {
        console.warn('Onboarding: auto-detect org failed:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [authLoading, user, resolvedOrgId]);

  // ---- Form state & data load ----
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [marketplaceCategories, setMarketplaceCategories] = useState<MarketplaceCategoryOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [initialForm, setInitialForm] = useState<FormState | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const autosaveTimer = useRef<number | null>(null);
  const lastDraftSnapshot = useRef<FormState | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !resolvedOrgId) {
      setLoadingData(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingData(true);
      setLoadError(null);
      setCategoriesLoading(true);
      setCategoriesError(null);
      try {
        const [profile, limits, categories] = await Promise.allSettled([
          planService.getCompanyProfile(resolvedOrgId),
          planService.getPlanLimits(resolvedOrgId),
          fetchMarketplaceCategories(),
        ]);
        if (cancelled) return;
        const profileData = profile.status === 'fulfilled' ? profile.value : null;
        const limitsData = limits.status === 'fulfilled' ? limits.value : null;
        const categoryData = categories.status === 'fulfilled' ? categories.value : [];
        setMarketplaceCategories(categoryData);
        if (categories.status !== 'fulfilled') {
          setCategoriesError('No se pudieron cargar los rubros del marketplace.');
        } else if (categoryData.length === 0) {
          setCategoriesError('No hay rubros activos del marketplace.');
        }
        const baseForm = buildForm(profileData, resolvedOrgName, categoryData);
        const draft = readOnboardingDraft(user?.id, resolvedOrgId);
        const merged = mergeDraftIntoBase(baseForm, draft);
        setForm(merged);
        setInitialForm(baseForm);
        try {
          const rawDraft = localStorage.getItem(getOnboardingDraftKey(user?.id, resolvedOrgId));
          const parsed = rawDraft ? JSON.parse(rawDraft) : null;
          const savedAt = typeof parsed?.savedAt === 'string' ? parsed.savedAt : null;
          setDraftSavedAt(savedAt);
        } catch {}
        setPlanData(limitsData);
        const cachedCompleted = hasCompletedOnboarding(user.id, resolvedOrgId);
        if (!cachedCompleted) {
          const isNeeds = await planService.needsOnboarding(resolvedOrgId);
          if (!cancelled) setAlreadyCompleted(!isNeeds);
        } else if (!cancelled) {
          setAlreadyCompleted(true);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading onboarding:', err);
          setLoadError('No se pudo cargar la configuración inicial.');
        }
      } finally {
        if (!cancelled) {
          setLoadingData(false);
          setCategoriesLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [authLoading, resolvedOrgId, resolvedOrgName, user]);

  const isDirty = useMemo(() => {
    if (!initialForm) return false;
    return !areFormsEqual(initialForm, form);
  }, [form, initialForm]);

  useEffect(() => {
    if (!user || !resolvedOrgId) return;
    if (!hydrated) return;
    if (!initialForm) return;
    if (!isDirty) return;

    if (autosaveTimer.current) {
      window.clearTimeout(autosaveTimer.current);
    }

    autosaveTimer.current = window.setTimeout(() => {
      if (!resolvedOrgId) return;
      if (lastDraftSnapshot.current && areFormsEqual(lastDraftSnapshot.current, form)) {
        return;
      }
      writeOnboardingDraft(user.id, resolvedOrgId, form);
      lastDraftSnapshot.current = form;
      setDraftSavedAt(new Date().toISOString());
    }, 450);

    return () => {
      if (autosaveTimer.current) {
        window.clearTimeout(autosaveTimer.current);
        autosaveTimer.current = null;
      }
    };
  }, [form, hydrated, initialForm, isDirty, resolvedOrgId, user]);

  useEffect(() => {
    if (saving) return;
    const id =
      currentStep?.id === 'business'
        ? 'business-name'
        : currentStep?.id === 'contact'
          ? 'contact-phone'
          : null;
    if (!id) return;
    const el = document.getElementById(id) as HTMLInputElement | null;
    el?.focus();
  }, [saving, stepIndex]);

  const reloadMarketplaceCategories = async () => {
    if (!resolvedOrgId) return;
    setCategoriesLoading(true);
    setCategoriesError(null);
    try {
      const categoryData = await fetchMarketplaceCategories();
      setMarketplaceCategories(categoryData);
      if (categoryData.length === 0) {
        setCategoriesError('No hay rubros activos del marketplace.');
        return;
      }
      setForm((current) => {
        const isValid = categoryData.some((category) => category.id === current.industry);
        if (isValid) return current;
        return { ...current, industry: categoryData[0].id };
      });
      setFieldErrors((current) => {
        const next = { ...current };
        delete next.industry;
        return next;
      });
    } catch {
      setCategoriesError('No se pudieron cargar los rubros del marketplace.');
    } finally {
      setCategoriesLoading(false);
    }
  };

  // ---- Field updates ----
  const onField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[field];
      if (field === 'phone' || field === 'email') delete next.contact;
      return next;
    });
  };

  // ---- Step navigation ----
  const currentStep = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;
  const isFirstStep = stepIndex === 0;

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      name: 'Nombre del negocio',
      industry: 'Rubro principal',
      rfc: 'RUC',
      phone: 'Teléfono',
      email: 'Email',
      website: 'Sitio web',
      department: 'Departamento',
      city: 'Ciudad',
      primary_color: 'Color principal',
      contact: 'Datos de contacto'
    };
    return labels[field] || field;
  };

  const handleNext = () => {
    if (currentStep.id === 'business' && marketplaceCategories.length === 0) {
      toast({
        title: 'Faltan rubros del marketplace',
        description: 'Reintentá cargar los rubros para continuar.',
        variant: 'destructive',
      });
      return;
    }
    const errors = validateStep(currentStep.id, form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const missingFields = Object.keys(errors).map(getFieldLabel).join(', ');
      toast({
        title: 'Faltan datos',
        description: `Completá: ${missingFields}`,
        variant: 'destructive',
      });
      return;
    }
    setFieldErrors({});
    setStepIndex((idx) => Math.min(STEPS.length - 1, idx + 1));
  };

  const handleBack = () => {
    setFieldErrors({});
    setStepIndex((idx) => Math.max(0, idx - 1));
  };

  const handleFinish = async () => {
    if (!user) {
      router.push('/auth/signin?returnUrl=%2Fonboarding');
      return;
    }
    if (!resolvedOrgId) {
      toast({
        title: 'Sin organización activa',
        description: 'Volvé a iniciar sesión.',
        variant: 'destructive',
      });
      return;
    }

    // Validate ALL steps before saving — jump back to first one with errors.
    const allErrors: Record<string, string> = {};
    const errorsByStep: Record<number, string[]> = {};
    let firstStepWithErrors: number | null = null;
    STEPS.forEach((step, idx) => {
      const stepErrors = validateStep(step.id, form);
      const stepErrorFields = Object.keys(stepErrors);
      if (stepErrorFields.length > 0) {
        errorsByStep[idx] = stepErrorFields.map(getFieldLabel);
        if (firstStepWithErrors === null) {
          firstStepWithErrors = idx;
        }
      }
      Object.assign(allErrors, stepErrors);
    });

    if (Object.keys(allErrors).length > 0) {
      setFieldErrors(allErrors);
      if (firstStepWithErrors !== null) setStepIndex(firstStepWithErrors);
      
      // Build a detailed error message
      const errorDetails = Object.entries(errorsByStep)
        .map(([stepIdx, fields]) => {
          const step = STEPS[parseInt(stepIdx)];
          return `Paso ${parseInt(stepIdx) + 1} (${step.title}): ${fields.join(', ')}`;
        })
        .join(' · ');
      
      toast({
        title: 'Faltan datos',
        description: errorDetails,
        variant: 'destructive',
        duration: 5000,
      });
      return;
    }

    setSaving(true);
    const selectedMarketplaceCategory = marketplaceCategories.find((category) => category.id === form.industry);
    const success = await planService.updateCompanyProfile({
      name: form.name.trim(),
      rfc: form.rfc.trim(),
      industry: selectedMarketplaceCategory?.slug || form.industry,
      marketplace_category_id: selectedMarketplaceCategory?.id || form.industry,
      marketplace_category_slug: selectedMarketplaceCategory?.slug || null,
      marketplace_category_name: selectedMarketplaceCategory?.name || null,
      size: form.size,
      tagline: form.tagline.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      website: normalizeWebsite(form.website),
      city: form.city.trim(),
      department: form.department.trim(),
      primary_color: form.primary_color,
    }, resolvedOrgId);
    setSaving(false);

    if (!success) {
      toast({
        title: 'No se pudo guardar',
        description: 'Revisá la conexión y volvé a intentar.',
        variant: 'destructive',
      });
      return;
    }

    markOnboardingCompleted(user.id, resolvedOrgId);
    clearOnboardingDraft(user.id, resolvedOrgId);
    toast({
      title: '¡Listo!',
      description: 'Tu negocio quedó configurado.',
    });
    router.replace('/dashboard');
    router.refresh();
  };

  // ---- Render guards ----
  if (!hydrated || (authLoading && !resolvedOrgId)) return <LoadingState />;
  if (!authLoading && !user) return <PublicFallback />;
  if (!loadingData && user && !resolvedOrgId) return <NoOrgFallback />;

  const StepIcon = currentStep.icon;
  const progressPct = Math.round(((stepIndex + 1) / STEPS.length) * 100);
  const canContinueLater = !saving;
  const currentStepErrorFields = useMemo(() => {
    const keys =
      currentStep.id === 'business'
        ? (['name', 'industry', 'rfc'] as const)
        : currentStep.id === 'contact'
          ? (['contact', 'phone', 'email', 'website', 'department', 'city'] as const)
          : (['primary_color'] as const);
    return keys.filter((key) => Boolean(fieldErrors[key]));
  }, [currentStep.id, fieldErrors]);
  const continueLater = () => {
    if (!canContinueLater) return;
    if (!isDirty) {
      router.replace('/dashboard');
      return;
    }
    showConfirmation({
      title: 'Continuar luego',
      description: 'Tu borrador queda guardado en este dispositivo. Podés volver cuando quieras para terminar la configuración.',
      confirmText: 'Ir al dashboard',
      cancelText: 'Seguir acá',
      variant: 'info',
      onConfirm: () => {
        router.replace('/dashboard');
        router.refresh();
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <ConfirmationDialog />
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <Badge className="rounded-full bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
              Configuración inicial
            </Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {resolvedOrgName || 'Tu negocio'}
            </h1>
            {alreadyCompleted ? (
              <p className="mt-1 text-xs text-sky-300">
                Ya configurado anteriormente. Podés actualizar los datos.
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-400">
                Completá los datos básicos para empezar a operar.
              </p>
            )}
            {draftSavedAt ? (
              <p className="mt-2 text-[11px] text-slate-500">
                Borrador guardado.
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="outline"
            className="self-start rounded-full border-white/20 px-4 text-slate-300 hover:bg-white/5 sm:self-auto"
            onClick={continueLater}
            disabled={!canContinueLater}
          >
            Continuar luego
          </Button>
        </div>

        {/* Step indicator */}
        <div className="mx-auto max-w-3xl px-4 pb-6 sm:px-6">
          <div className="mb-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Paso {stepIndex + 1} de {STEPS.length}</span>
              <span>{progressPct}%</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-500 transition-[width]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            {STEPS.map((step, idx) => {
              const isCurrent = idx === stepIndex;
              const isDone = idx < stepIndex;
              const Icon = step.icon;
              const canJump = idx <= stepIndex && !saving;
              return (
                <div key={step.id} className="flex flex-1 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStepIndex(idx)}
                    disabled={!canJump}
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition',
                      canJump ? 'cursor-pointer' : 'cursor-not-allowed opacity-80',
                      isCurrent && 'border-emerald-400 bg-emerald-400/10 text-emerald-300',
                      isDone && 'border-emerald-500 bg-emerald-500 text-white',
                      !isCurrent && !isDone && 'border-white/20 bg-white/5 text-slate-500'
                    )}
                    aria-label={`Ir al paso ${idx + 1}: ${step.title}`}
                  >
                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </button>
                  <div className="hidden sm:block">
                    <div className={cn('text-[10px] uppercase tracking-wider', isCurrent ? 'text-emerald-300' : 'text-slate-500')}>
                      Paso {idx + 1} de {STEPS.length}
                    </div>
                    <div className={cn('text-sm font-medium', isCurrent ? 'text-white' : isDone ? 'text-slate-300' : 'text-slate-500')}>
                      {step.title}
                    </div>
                  </div>
                  {idx < STEPS.length - 1 ? (
                    <div className={cn('h-px flex-1', isDone ? 'bg-emerald-500' : 'bg-white/10')} />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {loadError ? (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {loadError}
          </div>
        ) : null}

        <section className="rounded-xl border border-white/10 bg-white/5 p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <StepIcon className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">{currentStep.title}</h2>
          </div>

          {currentStepErrorFields.length > 0 ? (
            <div role="alert" className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
              <div className="text-sm font-semibold text-red-200">Revisá estos campos</div>
              <div className="mt-2 text-sm text-red-200/90">
                {currentStepErrorFields.map(getFieldLabel).join(' · ')}
              </div>
            </div>
          ) : null}

          {currentStep.id === 'business' ? (
            <BusinessStep
              form={form}
              errors={fieldErrors}
              onField={onField}
              marketplaceCategories={marketplaceCategories}
              planData={planData}
              categoriesLoading={categoriesLoading}
              categoriesError={categoriesError}
              onRetryCategories={reloadMarketplaceCategories}
            />
          ) : null}
          {currentStep.id === 'contact' ? (
            <ContactStep form={form} errors={fieldErrors} onField={onField} />
          ) : null}
          {currentStep.id === 'brand' ? (
            <BrandStep form={form} errors={fieldErrors} onField={onField} planData={planData} />
          ) : null}
        </section>

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-white/20 px-5 text-slate-300 hover:bg-white/10 disabled:opacity-50"
            onClick={handleBack}
            disabled={isFirstStep || saving}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
          </Button>

          {!isLastStep ? (
            <Button
              type="button"
              className="rounded-full bg-emerald-600 px-6 text-white hover:bg-emerald-700"
              onClick={handleNext}
              disabled={
                saving ||
                categoriesLoading ||
                (currentStep.id === 'business' && marketplaceCategories.length === 0)
              }
            >
              Siguiente <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              className="rounded-full bg-emerald-600 px-6 text-white hover:bg-emerald-700"
              onClick={() => void handleFinish()}
              disabled={saving || categoriesLoading}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Guardar y entrar al dashboard
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step components (presentational)
// ---------------------------------------------------------------------------
interface StepProps {
  form: FormState;
  errors: Record<string, string>;
  onField: (field: keyof FormState, value: string) => void;
}

function BusinessStep({
  form,
  errors,
  onField,
  marketplaceCategories,
  planData,
  categoriesLoading,
  categoriesError,
  onRetryCategories,
}: StepProps & {
  marketplaceCategories: MarketplaceCategoryOption[];
  planData: PlanData | null;
  categoriesLoading: boolean;
  categoriesError: string | null;
  onRetryCategories: () => Promise<void>;
}) {
  const selectedCategory = marketplaceCategories.find((category) => category.id === form.industry);
  const selectedSizeOption = SIZE_OPTIONS.find(o => o.value === form.size);
  const isAllowed = isSizeAllowedForPlan(form.size, planData);

  return (
    <div className="grid gap-5">
      <div className="space-y-2">
        <Label htmlFor="business-name" className="text-slate-200">
          Nombre del negocio <span className="text-red-400">*</span>
        </Label>
        <Input
          id="business-name"
          value={form.name}
          onChange={(e) => onField('name', e.target.value)}
          placeholder="Ej. Distribuidora Central"
          className={cn(
            'border-white/10 bg-white/5 text-white placeholder:text-slate-500',
            errors.name && 'border-red-400'
          )}
        />
        {errors.name ? <p className="text-xs text-red-400">{errors.name}</p> : null}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-slate-200">
            Rubro principal <span className="text-red-400">*</span>
          </Label>
          <Select
            value={form.industry}
            onValueChange={(v) => onField('industry', v)}
            disabled={marketplaceCategories.length === 0}
          >
            <SelectTrigger className={cn('border-white/10 bg-white/5 text-white', errors.industry && 'border-red-400')}>
              <SelectValue placeholder={marketplaceCategories.length ? 'Selecciona un rubro' : 'Cargando rubros'} />
            </SelectTrigger>
            <SelectContent>
              {marketplaceCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-slate-500">
            Este rubro sale de los rubros activos del marketplace y define donde aparecera tu empresa publicamente.
          </p>
          {selectedCategory?.description ? (
            <p className="text-[11px] text-emerald-300">{selectedCategory.description}</p>
          ) : null}
          {marketplaceCategories.length === 0 ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <p className="text-xs text-amber-200">
                {categoriesError || 'Cargando rubros del marketplace...'}
              </p>
              <div className="mt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-full border-white/20 px-3 text-xs text-white hover:bg-white/10"
                  onClick={() => void onRetryCategories()}
                  disabled={categoriesLoading}
                >
                  {categoriesLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                  Reintentar cargar rubros
                </Button>
              </div>
            </div>
          ) : null}
          {errors.industry ? <p className="text-xs text-red-400">{errors.industry}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="business-rfc" className="text-slate-200">
            RUC <span className="text-xs text-slate-500">(opcional)</span>
          </Label>
          <Input
            id="business-rfc"
            value={form.rfc}
            onChange={(e) => onField('rfc', e.target.value)}
            placeholder="80012345-6"
            className={cn(
              'border-white/10 bg-white/5 text-white placeholder:text-slate-500',
              errors.rfc && 'border-red-400'
            )}
          />
          {errors.rfc ? <p className="text-xs text-red-400">{errors.rfc}</p> : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-200">Escala</Label>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {SIZE_OPTIONS.map((option) => {
            const active = form.size === option.value;
            const allowed = isSizeAllowedForPlan(option.value, planData);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onField('size', option.value)}
                className={cn(
                  'rounded-lg border px-3 py-3 text-left transition',
                  active
                    ? allowed
                      ? 'border-emerald-400/50 bg-emerald-400/10 text-white'
                      : 'border-amber-400/50 bg-amber-400/10 text-white'
                    : allowed
                      ? 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                      : 'border-white/5 bg-white/2 text-slate-400 hover:border-white/10'
                )}
              >
                <div className="text-sm font-semibold">{option.label}</div>
                <div className={cn('mt-1 text-xs', active ? (allowed ? 'text-emerald-300' : 'text-amber-300') : 'text-slate-500')}>
                  {option.hint}
                </div>
                {!allowed && (
                  <div className="mt-1 text-[10px] text-amber-400">
                    Requiere {planService.getPlanDisplayName(option.recommendedPlan)}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        {!isAllowed && selectedSizeOption && (
          <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 text-amber-400" />
              <div>
                <p className="text-sm font-medium text-amber-200">
                  Esta escala requiere el plan {planService.getPlanDisplayName(selectedSizeOption.recommendedPlan)}
                </p>
                <p className="mt-1 text-xs text-amber-300/80">
                  Podés continuar con esta selección y luego actualizar tu plan en la configuración del negocio.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="business-tagline" className="text-slate-200">
          Tagline <span className="text-xs text-slate-500">(opcional)</span>
        </Label>
        <Textarea
          id="business-tagline"
          value={form.tagline}
          onChange={(e) => onField('tagline', e.target.value)}
          placeholder="Resumen corto de tu propuesta comercial."
          className="min-h-[80px] border-white/10 bg-white/5 text-white placeholder:text-slate-500"
          maxLength={180}
        />
        <p className="text-xs text-slate-500">{form.tagline.length}/180</p>
      </div>
    </div>
  );
}

function ContactStep({ form, errors, onField }: StepProps) {
  return (
    <div className="grid gap-5">
      <p className="text-sm text-slate-400">
        Necesitamos un telefono publico del negocio. El email comercial es opcional y podes completarlo despues en Configuracion del negocio.
      </p>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contact-phone" className="text-slate-200">Telefono <span className="text-red-300">*</span></Label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              id="contact-phone"
              inputMode="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => onField('phone', e.target.value)}
              placeholder="+595 981 000000"
              className={cn(
                'pl-10 border-white/10 bg-white/5 text-white placeholder:text-slate-500',
                (errors.contact || errors.phone) && 'border-red-400'
              )}
            />
          </div>
          {errors.phone ? <p className="text-xs text-red-400">{errors.phone}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-email" className="text-slate-200">Email publico <span className="text-xs text-slate-500">(opcional)</span></Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              id="contact-email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => onField('email', e.target.value)}
              placeholder="ventas@empresa.com"
              className={cn(
                'pl-10 border-white/10 bg-white/5 text-white placeholder:text-slate-500',
                (errors.contact || errors.email) && 'border-red-400'
              )}
            />
          </div>
          {errors.email ? <p className="text-xs text-red-400">{errors.email}</p> : null}
        </div>
      </div>

      {errors.contact ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {errors.contact}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="contact-website" className="text-slate-200">
          Sitio web <span className="text-xs text-slate-500">(opcional)</span>
        </Label>
        <div className="relative">
          <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            id="contact-website"
            inputMode="url"
            autoComplete="url"
            value={form.website}
            onChange={(e) => onField('website', e.target.value)}
            placeholder="empresa.com.py"
            className={cn(
              'pl-10 border-white/10 bg-white/5 text-white placeholder:text-slate-500',
              errors.website && 'border-red-400'
            )}
          />
        </div>
        {errors.website ? <p className="text-xs text-red-400">{errors.website}</p> : null}
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <div className="space-y-2">
          <Label className="text-slate-200">País</Label>
          <Select
            value={form.country}
            onValueChange={(v) => onField('country', v)}
            disabled={COUNTRY_OPTIONS.length === 1}
          >
            <SelectTrigger className="border-white/10 bg-white/5 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNTRY_OPTIONS.map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {COUNTRY_OPTIONS.length === 1 ? (
            <p className="text-[11px] text-slate-500">Por ahora solo Paraguay.</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label className="text-slate-200">
            Departamento <span className="text-red-400">*</span>
          </Label>
          <Select
            value={form.department}
            onValueChange={(v) => { onField('department', v); onField('city', ''); }}
          >
            <SelectTrigger className={cn('border-white/10 bg-white/5 text-white', errors.department && 'border-red-400')}>
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.department ? <p className="text-xs text-red-400">{errors.department}</p> : null}
        </div>

        <div className="space-y-2">
          <Label className="text-slate-200">
            Ciudad <span className="text-red-400">*</span>
          </Label>
          <Select
            value={form.city}
            onValueChange={(v) => onField('city', v)}
            disabled={!form.department}
          >
            <SelectTrigger className={cn('border-white/10 bg-white/5 text-white', errors.city && 'border-red-400')}>
              <SelectValue placeholder={form.department ? 'Ciudad' : 'Primero el departamento'} />
            </SelectTrigger>
            <SelectContent>
              {(CITIES_BY_DEPARTMENT[form.department] || []).map((city) => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.city ? <p className="text-xs text-red-400">{errors.city}</p> : null}
        </div>
      </div>
    </div>
  );
}

function BrandStep({
  form,
  errors,
  onField,
  planData,
}: StepProps & { planData: PlanData | null }) {
  return (
    <div className="grid gap-6">
      <p className="text-sm text-slate-400">
        Elegí el color principal de tu marca. Lo vas a poder cambiar después desde Settings.
      </p>

      <div className="space-y-3">
        <Label className="text-slate-200">
          Color principal <span className="text-red-400">*</span>
        </Label>
        <div className="flex flex-wrap gap-3">
          {COLOR_PRESETS.map((color) => {
            const active = form.primary_color === color;
            return (
              <button
                key={color}
                type="button"
                onClick={() => onField('primary_color', color)}
                className={cn(
                  'relative h-11 w-11 rounded-full border-2 transition',
                  active ? 'scale-110 border-white' : 'border-transparent hover:scale-105'
                )}
                style={{ backgroundColor: color }}
                aria-label={`Seleccionar color ${color}`}
              >
                {active ? (
                  <span className="absolute inset-0 flex items-center justify-center text-white">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <span
            className="inline-flex h-4 w-4 rounded-full border border-white/20"
            style={{ backgroundColor: form.primary_color }}
          />
          <span>{form.primary_color}</span>
        </div>
        {errors.primary_color ? <p className="text-xs text-red-400">{errors.primary_color}</p> : null}
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-300" />
          <p className="text-sm font-semibold text-white">
            Plan {planData ? planService.getPlanDisplayName(planData.plan_type) : 'actual'}
          </p>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Después podés cargar tu catálogo, invitar a tu equipo y empezar a vender desde el dashboard.
        </p>
      </div>
    </div>
  );
}
