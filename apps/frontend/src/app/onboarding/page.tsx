'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  Globe,
  Layers3,
  Loader2,
  Mail,
  MapPin,
  Moon,
  PackageSearch,
  Palette,
  Pencil,
  Phone,
  ShieldCheck,
  Sparkles,
  Store,
  Sun,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
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
import { useCurrentOrganizationId, useCurrentOrganizationName } from '@/hooks/use-current-organization';
import { hasCompletedOnboarding, markOnboardingCompleted } from '@/lib/onboarding-storage';
import planService, { type CompanyProfile, type PlanData } from '@/lib/services/plan-service';
import { cn } from '@/lib/utils';

type CompanySize = 'micro' | 'small' | 'medium' | 'large';
type SaveTarget = 'dashboard' | 'settings' | 'business-config';
type FormState = {
  name: string; rfc: string; industry: string; size: CompanySize; tagline: string;
  phone: string; email: string; website: string; city: string; department: string; primary_color: string;
  darkMode: boolean;
};

const INDUSTRY_OPTIONS = [
  ['retail', 'Retail'], ['wholesale', 'Mayorista'], ['food_service', 'Gastronomía'],
  ['beauty', 'Belleza'], ['pharmacy', 'Farmacia'], ['fashion', 'Moda'],
  ['electronics', 'Electrónica'], ['services', 'Servicios'], ['other', 'Otro'],
] as const;
const SIZE_OPTIONS: Array<{ value: CompanySize; label: string; hint: string }> = [
  { value: 'micro', label: 'Micro', hint: '1-3 personas' },
  { value: 'small', label: 'Pequeña', hint: '4-10 personas' },
  { value: 'medium', label: 'Mediana', hint: '11-50 personas' },
  { value: 'large', label: 'Grande', hint: '51+ personas' },
];

const CITIES_BY_DEPARTMENT: Record<string, string[]> = {
  'Asunción': ['Asunción'],
  'Central': ['San Lorenzo', 'Luque', 'Fernando de la Mora', 'Lambaré', 'Capiatá', 'Limpio', 'Ñemby', 'Mariano Roque Alonso', 'Villa Elisa', 'San Antonio', 'Itauguá', 'Areguá', 'Ypacaraí', 'Guarambaré'],
  'Alto Paraná': ['Ciudad del Este', 'Presidente Franco', 'Hernandarias', 'Minga Guazú', 'Santa Rita', 'San Alberto'],
  'Itapúa': ['Encarnación', 'Hohenau', 'Obligado', 'Bella Vista', 'Capitán Miranda', 'Trinidad', 'Jesús'],
  'Caaguazú': ['Coronel Oviedo', 'Caaguazú', 'J. Eulogio Estigarribia'],
  'Cordillera': ['Caacupé', 'Tobatí', 'Eusebio Ayala', 'Piribebuy', 'San Bernardino'],
  'Canindeyú': ['Salto del Guairá', 'Curuguaty'],
  'Paraguarí': ['Paraguarí', 'Yaguarón', 'Pirayú', 'Carapeguá'],
  'San Pedro': ['San Pedro del Ycuamandiyú', 'Santa Rosa del Aguaray'],
  'Guairá': ['Villarrica', 'Iturbe'],
  'Concepción': ['Concepción', 'Horqueta'],
  'Amambay': ['Pedro Juan Caballero', 'Capitán Bado'],
  'Caazapá': ['Caazapá', 'Yuty'],
  'Misiones': ['San Juan Bautista', 'Ayolas', 'San Ignacio'],
  'Ñeembucú': ['Pilar'],
  'Presidente Hayes': ['Villa Hayes', 'Benjamín Aceval'],
  'Boquerón': ['Filadelfia', 'Loma Plata', 'Neuland'],
};
const DEPARTMENTS = Object.keys(CITIES_BY_DEPARTMENT);

const COLOR_PRESETS = [
  '#059669', '#0d9488', '#2563eb', '#7c3aed', '#e11d48', '#f59e0b',
  '#0891b2', '#4f46e5', '#c026d3', '#ea580c', '#16a34a', '#64748b',
];
const DEFAULT_FORM: FormState = {
  name: '', rfc: '', industry: 'retail', size: 'micro', tagline: '', phone: '',
  email: '', website: '', city: '', department: '', primary_color: '#059669',
  darkMode: true,
};

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

function nameToSubdomain(name: string): string {
  return name.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || '';
}

function buildForm(profile: CompanyProfile | null, email: string, organizationName: string | null): FormState {
  return {
    name: profile?.name || organizationName || '',
    rfc: profile?.rfc || '',
    industry: profile?.industry || 'retail',
    size: profile?.size || 'micro',
    tagline: profile?.tagline || '',
    phone: profile?.phone || '',
    email: profile?.email || email,
    website: profile?.website || '',
    city: profile?.city || '',
    department: profile?.department || '',
    primary_color: profile?.primary_color || '#059669',
    darkMode: true,
  };
}

function validate(form: FormState) {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = 'El nombre del negocio es obligatorio.';
  else if (form.name.trim().length < 3) errors.name = 'El nombre debe tener al menos 3 caracteres.';
  if (!form.industry.trim()) errors.industry = 'Selecciona el rubro principal.';
  if (!form.department.trim()) errors.department = 'Selecciona el departamento.';
  if (!form.city.trim()) errors.city = 'Selecciona la ciudad.';
  if (!form.phone.trim() && !form.email.trim()) errors.contact = 'Completa al menos teléfono o email para que tus clientes te contacten.';
  if (form.phone.trim() && !/^\+?[\d\s\-()]{7,}$/.test(form.phone.trim())) errors.phone = 'El teléfono no parece válido. Ej: +595 981 000000';
  if (form.email.trim() && !isValidEmail(form.email.trim())) errors.email = 'El email no es válido. Ej: ventas@empresa.com';
  if (form.website.trim() && !isValidUrl(form.website.trim())) errors.website = 'La web no es válida. Ej: miempresa.com.py';
  if (form.rfc.trim() && form.rfc.trim().length < 5) errors.rfc = 'El RUC debe tener al menos 5 caracteres.';
  return errors;
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-10 w-80 animate-pulse rounded-lg bg-white/10" />
        <div className="mt-8 grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-4"><div className="h-48 animate-pulse rounded-xl bg-white/10" /><div className="h-48 animate-pulse rounded-xl bg-white/10" /></div>
          <div className="space-y-6"><div className="h-64 animate-pulse rounded-xl bg-white/10" /><div className="h-64 animate-pulse rounded-xl bg-white/10" /></div>
        </div>
      </div>
    </div>
  );
}

function PublicFallback() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
        <Badge className="w-fit rounded-full bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
          Activación inicial
        </Badge>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white">Completa la activación de tu cuenta.</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
          Si acabas de registrarte, verifica tu correo y luego inicia sesión para terminar la configuración del negocio.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild className="rounded-full bg-emerald-600 px-5 text-white hover:bg-emerald-700"><Link href="/auth/signin?returnUrl=%2Fonboarding">Iniciar sesión<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          <Button asChild variant="outline" className="rounded-full border-white/20 px-5 text-white hover:bg-white/10"><Link href="/inicio/planes">Volver a planes</Link></Button>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const organizationId = useCurrentOrganizationId();
  const organizationName = useCurrentOrganizationName();

  // Try to get org from localStorage immediately (no wait)
  const [resolvedOrgId, setResolvedOrgId] = useState<string | null>(organizationId);
  const [resolvedOrgName, setResolvedOrgName] = useState<string | null>(organizationName);
  const [resolvedOrgSlug, setResolvedOrgSlug] = useState<string>('');

  // Hydration-safe: read localStorage after mount
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
    if (resolvedOrgId) return; // Already have org from hook
    try {
      const cached = localStorage.getItem('selected_organization');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.id) {
          setResolvedOrgId(parsed.id);
          setResolvedOrgName(parsed.name || null);
          setResolvedOrgSlug((parsed.slug || '').replace(/-\d{10,}$/, ''));
        }
      }
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [editingOrgName, setEditingOrgName] = useState(false);
  const [editingSubdomain, setEditingSubdomain] = useState(false);
  const [orgNameDraft, setOrgNameDraft] = useState('');
  const [subdomainDraft, setSubdomainDraft] = useState('');
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveTarget, setSaveTarget] = useState<SaveTarget | null>(null);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);

  // Keep resolved org in sync with hook
  useEffect(() => {
    if (organizationId) setResolvedOrgId(organizationId);
    if (organizationName) setResolvedOrgName(organizationName);
  }, [organizationId, organizationName]);

  // Auto-detect organization if none selected
  useEffect(() => {
    if (authLoading || !user || resolvedOrgId) return;
    let cancelled = false;
    const detectOrg = async () => {
      try {
        // Check localStorage first (instant)
        const cached = localStorage.getItem('selected_organization');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed?.id) {
              setResolvedOrgId(parsed.id);
              setResolvedOrgName(parsed.name || null);
              setResolvedOrgSlug(parsed.slug || nameToSubdomain(parsed.name || ''));
              return;
            }
          } catch {}
        }

        const response = await fetch('/api/auth/organizations', {
          cache: 'no-store',
          credentials: 'include',
        });
        const result = await response.json().catch(() => ({}));
        const orgs = Array.isArray(result?.organizations) ? result.organizations : [];
        if (cancelled || orgs.length === 0) return;

        const org = orgs[0];
        localStorage.setItem('selected_organization', JSON.stringify(org));
        document.cookie = `x-organization-id=${encodeURIComponent(org.id)}; path=/; SameSite=Lax`;
        document.cookie = `x-organization-name=${encodeURIComponent(org.name)}; path=/; SameSite=Lax`;
        document.cookie = `x-organization-slug=${encodeURIComponent(org.slug || '')}; path=/; SameSite=Lax`;
        setResolvedOrgId(org.id);
        setResolvedOrgName(org.name);
        setResolvedOrgSlug(org.slug || nameToSubdomain(org.name));
        window.dispatchEvent(new CustomEvent('organization-changed', {
          detail: { organizationId: org.id, organization: org },
        }));
      } catch (err) {
        console.warn('Onboarding: could not auto-detect organization:', err);
      }
    };
    void detectOrg();
    return () => { cancelled = true; };
  }, [authLoading, user, resolvedOrgId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !resolvedOrgId) { setLoadingData(false); return; }
    let cancelled = false;
    const load = async () => {
      setLoadingData(true); setLoadError(null);
      try {
        // Load profile and limits in PARALLEL
        const [profile, limits] = await Promise.allSettled([
          planService.getCompanyProfile(resolvedOrgId),
          planService.getPlanLimits(resolvedOrgId),
        ]);
        if (cancelled) return;
        const profileData = profile.status === 'fulfilled' ? profile.value : null;
        const limitsData = limits.status === 'fulfilled' ? limits.value : null;
        setForm(buildForm(profileData, user.email || '', resolvedOrgName));
        setPlanData(limitsData);
        
        const isNeedsOnboarding = await planService.needsOnboarding(resolvedOrgId);
        setAlreadyCompleted(!isNeedsOnboarding);
      } catch (error) {
        if (!cancelled) { console.error('Error loading onboarding:', error); setLoadError('No se pudo cargar la configuración inicial.'); }
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [authLoading, resolvedOrgId, resolvedOrgName, user]);

  const checks = useMemo(() => ([
    ['Nombre del negocio', !!form.name.trim()],
    ['Rubro principal', !!form.industry.trim()],
    ['Ciudad y departamento', !!(form.city.trim() && form.department.trim())],
    ['Canal de contacto', !!(form.phone.trim() || form.email.trim())],
    ['Color principal', !!form.primary_color.trim()],
  ]), [form]);
  const completion = useMemo(() => Math.round((checks.filter(([, done]) => done).length / checks.length) * 100), [checks]);
  const planPreview = useMemo(() => (planData?.limits || []).slice(0, 4), [planData]);

  const onField = (field: keyof FormState, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: field === 'darkMode' ? value === 'true' : value,
    }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[field];
      if (field === 'phone' || field === 'email') delete next.contact;
      return next;
    });
  };

  const handleCreateOrg = async () => {
    if (!user || newOrgName.trim().length < 2) return;
    setCreatingOrg(true);
    try {
      const slug = newOrgName.trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
        + '-' + Date.now();

      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newOrgName.trim(), slug }),
      });

      let org = null;

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        org = data?.organization || data?.data || data;
      }

      // If API doesn't exist or failed, try direct Supabase insert via admin endpoint
      if (!org?.id) {
        const fallbackRes = await fetch('/api/auth/organizations', { cache: 'no-store', credentials: 'include' });
        const fallbackData = await fallbackRes.json().catch(() => ({}));
        const orgs = Array.isArray(fallbackData?.organizations) ? fallbackData.organizations : [];
        // Check if org was created by the register endpoint
        org = orgs.find((o: { name?: string }) => o.name === newOrgName.trim()) || orgs[0];
      }

      if (!org?.id) {
        // Last resort: create via register-like flow
        const createRes = await fetch('/api/company/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name: newOrgName.trim(), industry: 'retail', size: 'micro' }),
        });
        if (createRes.ok) {
          // Refetch organizations
          const refetchRes = await fetch('/api/auth/organizations', { cache: 'no-store', credentials: 'include' });
          const refetchData = await refetchRes.json().catch(() => ({}));
          const refetchOrgs = Array.isArray(refetchData?.organizations) ? refetchData.organizations : [];
          org = refetchOrgs[0];
        }
      }

      if (org?.id) {
        localStorage.setItem('selected_organization', JSON.stringify(org));
        document.cookie = `x-organization-id=${encodeURIComponent(org.id)}; path=/; SameSite=Lax`;
        document.cookie = `x-organization-name=${encodeURIComponent(org.name || newOrgName.trim())}; path=/; SameSite=Lax`;
        setResolvedOrgId(org.id);
        setResolvedOrgName(org.name || newOrgName.trim());
        setResolvedOrgSlug(org.slug || nameToSubdomain(org.name || newOrgName.trim()));
        onField('name', org.name || newOrgName.trim());
        window.dispatchEvent(new CustomEvent('organization-changed', {
          detail: { organizationId: org.id, organization: org },
        }));
        toast({ title: '¡Organización creada!', description: `${org.name || newOrgName.trim()} está lista.` });
        setNewOrgName('');
      } else {
        toast({ title: 'No se pudo crear', description: 'Intenta de nuevo o contacta soporte.', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Error creating organization:', err);
      toast({ title: 'Error', description: 'No se pudo crear la organización.', variant: 'destructive' });
    } finally {
      setCreatingOrg(false);
    }
  };

  const finish = async (target: SaveTarget) => {
    if (!user) { router.push('/auth/signin?returnUrl=%2Fonboarding'); return; }
    if (!resolvedOrgId) { toast({ title: 'Sin organización activa', description: 'Crea una organización primero.', variant: 'destructive' }); return; }
    const nextErrors = validate(form);
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast({ title: 'Faltan datos', description: 'Completa los campos requeridos antes de continuar.', variant: 'destructive' });
      return;
    }
    setSaveTarget(target);
    const success = await planService.updateCompanyProfile({
      name: form.name.trim(), rfc: form.rfc.trim(), industry: form.industry, size: form.size,
      tagline: form.tagline.trim(), phone: form.phone.trim(), email: form.email.trim(),
      website: normalizeWebsite(form.website), city: form.city.trim(), department: form.department.trim(),
      primary_color: form.primary_color,
    }, resolvedOrgId);
    setSaveTarget(null);
    if (!success) {
      toast({ title: 'No se pudo guardar', description: 'Revisa la conexión o vuelve a intentar.', variant: 'destructive' });
      return;
    }
    markOnboardingCompleted(user.id, resolvedOrgId);
    setAlreadyCompleted(true);
    toast({ title: 'Configuración guardada', description: 'La organización ya quedó lista para seguir operando.' });
    const destinations: Record<SaveTarget, string> = {
      dashboard: '/dashboard',
      settings: '/dashboard/settings?tab=company',
      'business-config': '/admin/business-config',
    };
    router.replace(destinations[target]);
    router.refresh();
  };

  if (!hydrated || (authLoading && !resolvedOrgId)) return <LoadingState />;
  if (!authLoading && !user) return <PublicFallback />;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="rounded-full bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">Configuración inicial</Badge>
              {alreadyCompleted ? <Badge className="rounded-full bg-sky-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">Ya completado</Badge> : null}
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Configura {resolvedOrgName || form.name || 'tu empresa'} para empezar a operar.
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
              Completa los datos básicos de tu negocio. Esto configura tu perfil comercial, contacto y ubicación para que puedas empezar a vender.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"><div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Plan actual</div><div className="mt-1 font-semibold text-white">{planService.getPlanDisplayName(planData?.plan_type || 'free')}</div></div>
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3"><div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300">Progreso</div><div className="mt-1 font-semibold text-white">{completion}% listo</div></div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[320px_minmax(0,1fr)] sm:px-6 lg:px-8">
        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-white">Checklist de activación</p><p className="mt-1 text-sm text-slate-400">Completa lo mínimo para empezar a vender.</p></div><Sparkles className="h-5 w-5 text-emerald-400" /></div>
            <Progress value={completion} className="mt-5 h-2 bg-white/10 [&>div]:bg-emerald-500" />
            <div className="mt-5 space-y-3">{checks.map(([label, done]) => <div key={label} className="flex items-center gap-3 text-sm"><CheckCircle2 className={cn('h-4 w-4', done ? 'text-emerald-400' : 'text-slate-600')} /><span className={done ? 'text-white' : 'text-slate-500'}>{label}</span></div>)}</div>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center gap-2"><Store className="h-4 w-4 text-amber-400" /><p className="text-sm font-semibold text-white">Capacidad del plan</p></div>
            {planPreview.length > 0 ? (
              <div className="mt-4 space-y-4">{planPreview.map((limit) => <div key={limit.feature_type}><div className="flex items-center justify-between gap-3"><span className="text-sm text-slate-300">{planService.getFeatureDisplayName(limit.feature_type)}</span><span className="text-sm font-semibold text-white">{planService.formatFeatureUsage(limit.feature_type, limit.current_usage, limit.limit_value)}</span></div><Progress value={limit.is_unlimited ? 0 : limit.usage_percentage} className="mt-2 h-1.5 bg-white/10 [&>div]:bg-white" /></div>)}</div>
            ) : <p className="mt-4 text-sm leading-6 text-slate-400">Los límites se mostrarán cuando la suscripción esté sincronizada.</p>}
          </section>

          <section className="rounded-xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-sky-400" /><p className="text-sm font-semibold text-white">Después de guardar</p></div>
            <div className="mt-4 space-y-4 text-sm text-slate-300">
              <div className="flex gap-3"><PackageSearch className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" /><span>Carga tu catálogo y activa inventario real.</span></div>
              <div className="flex gap-3"><Layers3 className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" /><span>Completa logo, horarios e integraciones en Settings.</span></div>
              <div className="flex gap-3"><Building2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" /><span>Tus datos quedan guardados de forma segura en la nube.</span></div>
            </div>
          </section>
        </aside>

        <div className="space-y-6">
          {loadError ? <section className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-300"><p className="text-sm font-semibold">No se pudo cargar el onboarding</p><p className="mt-2 text-sm">{loadError}</p></section> : null}

          <section className="rounded-xl border border-white/10 bg-white/5">
            <div className="border-b border-white/10 px-6 py-5">
              <div className="flex items-center gap-3">
                <Briefcase className="h-5 w-5 text-emerald-400" />
                <div>
                  <h2 className="text-lg font-semibold text-white">Perfil del negocio</h2>
                  <p className="mt-1 text-sm text-slate-400">Identidad comercial, rubro y posicionamiento.</p>
                </div>
              </div>
            </div>
            {/* Organization badge */}
            <div className="border-b border-white/10 px-6 py-4">
              {resolvedOrgId ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10">
                        <Building2 className="h-5 w-5 text-emerald-400" />
                      </div>
                      {editingOrgName ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={orgNameDraft}
                            onChange={(e) => setOrgNameDraft(e.target.value)}
                            className="h-9 w-56 border-white/10 bg-white/5 text-sm text-white"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (orgNameDraft.trim().length >= 2) {
                                  setResolvedOrgName(orgNameDraft.trim());
                                  if (!resolvedOrgSlug || resolvedOrgSlug === nameToSubdomain(resolvedOrgName || '')) {
                                    setResolvedOrgSlug(nameToSubdomain(orgNameDraft.trim()));
                                  }
                                  onField('name', orgNameDraft.trim());
                                  setEditingOrgName(false);
                                }
                              }
                              if (e.key === 'Escape') setEditingOrgName(false);
                            }}
                          />
                          <Button type="button" size="sm" className="h-9 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => {
                            if (orgNameDraft.trim().length >= 2) {
                              setResolvedOrgName(orgNameDraft.trim());
                              if (!resolvedOrgSlug || resolvedOrgSlug === nameToSubdomain(resolvedOrgName || '')) {
                                setResolvedOrgSlug(nameToSubdomain(orgNameDraft.trim()));
                              }
                              onField('name', orgNameDraft.trim());
                              setEditingOrgName(false);
                            }
                          }}>
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-semibold text-white">{resolvedOrgName || 'Organización'}</p>
                          <p className="text-xs text-slate-400">Organización activa</p>
                        </div>
                      )}
                    </div>
                    {!editingOrgName && (
                      <button
                        type="button"
                        onClick={() => { setOrgNameDraft(resolvedOrgName || ''); setEditingOrgName(true); }}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                        aria-label="Editar nombre"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {/* Identificador de ruta */}
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-slate-500" />
                      {editingSubdomain ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-500">miposparaguay.vercel.app/</span>
                          <Input
                            value={subdomainDraft}
                            onChange={(e) => setSubdomainDraft(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                            className="h-7 w-40 border-white/10 bg-white/5 text-xs text-white"
                            autoFocus
                            placeholder="4gcelulares"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); setResolvedOrgSlug(subdomainDraft); setEditingSubdomain(false); }
                              if (e.key === 'Escape') setEditingSubdomain(false);
                            }}
                          />
                          <Button type="button" size="sm" className="h-7 w-7 rounded bg-emerald-600 p-0 text-white hover:bg-emerald-700" onClick={() => { setResolvedOrgSlug(subdomainDraft); setEditingSubdomain(false); }}>
                            <CheckCircle2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <span className="text-slate-300">
                            <span className="text-slate-500">miposparaguay.vercel.app/</span>
                            <span className="font-medium text-white">{resolvedOrgSlug || nameToSubdomain(resolvedOrgName || '')}</span>
                          </span>
                          <p className="mt-0.5 text-[10px] text-slate-500">Identificador de ruta pública de tu negocio</p>
                        </div>
                      )}
                    </div>
                    {!editingSubdomain && (
                      <button
                        type="button"
                        onClick={() => { setSubdomainDraft(resolvedOrgSlug || nameToSubdomain(resolvedOrgName || '')); setEditingSubdomain(true); }}
                        className="rounded p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                        aria-label="Editar identificador de ruta"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-400/10">
                      <Building2 className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Sin organización asociada</p>
                      <p className="text-xs text-slate-400">Crea una para guardar los datos de tu negocio</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      placeholder="Nombre de tu negocio"
                      className="h-10 border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                      disabled={creatingOrg}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleCreateOrg();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-10 shrink-0 rounded-lg bg-emerald-600 px-4 text-white hover:bg-emerald-700"
                      disabled={creatingOrg || newOrgName.trim().length < 2}
                      onClick={() => void handleCreateOrg()}
                    >
                      {creatingOrg ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Crear
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="grid gap-6 px-6 py-6 md:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="business-name" className="text-slate-200">Nombre del negocio</Label><Input id="business-name" value={form.name} onChange={(e) => onField('name', e.target.value)} placeholder="Ej. Distribuidora Central" className={cn('border-white/10 bg-white/5 text-white placeholder:text-slate-500', fieldErrors.name ? 'border-red-400' : '')} />{fieldErrors.name ? <p className="text-xs text-red-400">{fieldErrors.name}</p> : null}</div>
              <div className="space-y-2"><Label htmlFor="business-rfc" className="text-slate-200">RUC / documento fiscal</Label><Input id="business-rfc" value={form.rfc} onChange={(e) => onField('rfc', e.target.value)} placeholder="Opcional" className="border-white/10 bg-white/5 text-white placeholder:text-slate-500" />{fieldErrors.rfc ? <p className="text-xs text-red-400">{fieldErrors.rfc}</p> : null}</div>
              <div className="space-y-2"><Label className="text-slate-200">Rubro principal</Label><Select value={form.industry} onValueChange={(value) => onField('industry', value)}><SelectTrigger className={cn('border-white/10 bg-white/5 text-white', fieldErrors.industry ? 'border-red-400' : '')}><SelectValue placeholder="Selecciona un rubro" /></SelectTrigger><SelectContent>{INDUSTRY_OPTIONS.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>{fieldErrors.industry ? <p className="text-xs text-red-400">{fieldErrors.industry}</p> : null}</div>
              <div className="space-y-2"><Label className="text-slate-200">Escala operativa</Label><div className="grid grid-cols-2 gap-3">{SIZE_OPTIONS.map((option) => { const active = form.size === option.value; return <button key={option.value} type="button" onClick={() => onField('size', option.value)} className={cn('rounded-lg border px-4 py-3 text-left transition', active ? 'border-emerald-400/50 bg-emerald-400/10 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20')}><div className="text-sm font-semibold">{option.label}</div><div className={cn('mt-1 text-xs', active ? 'text-emerald-300' : 'text-slate-500')}>{option.hint}</div></button>; })}</div></div>
              <div className="space-y-2 md:col-span-2"><Label htmlFor="business-tagline" className="text-slate-200">Tagline o descripción corta</Label><Textarea id="business-tagline" value={form.tagline} onChange={(e) => onField('tagline', e.target.value)} placeholder="Resumen corto de la propuesta comercial." className="min-h-[100px] border-white/10 bg-white/5 text-white placeholder:text-slate-500" maxLength={180} /><p className="text-xs text-slate-500">{form.tagline.length}/180</p></div>
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/5">
            <div className="border-b border-white/10 px-6 py-5"><div className="flex items-center gap-3"><MapPin className="h-5 w-5 text-emerald-400" /><div><h2 className="text-lg font-semibold text-white">Contacto y ubicación</h2><p className="mt-1 text-sm text-slate-400">Base para directorio público, contacto y contexto operativo.</p></div></div></div>
            <div className="grid gap-6 px-6 py-6 md:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="business-phone" className="text-slate-200">Teléfono</Label><div className="relative"><Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><Input id="business-phone" value={form.phone} onChange={(e) => onField('phone', e.target.value)} placeholder="+595 981 000000" className={cn('pl-10 border-white/10 bg-white/5 text-white placeholder:text-slate-500', fieldErrors.contact || fieldErrors.phone ? 'border-red-400' : '')} /></div>{fieldErrors.phone ? <p className="text-xs text-red-400">{fieldErrors.phone}</p> : null}</div>
              <div className="space-y-2"><Label htmlFor="business-email" className="text-slate-200">Email de contacto</Label><div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><Input id="business-email" type="email" value={form.email} onChange={(e) => onField('email', e.target.value)} placeholder="ventas@empresa.com" className={cn('pl-10 border-white/10 bg-white/5 text-white placeholder:text-slate-500', fieldErrors.email ? 'border-red-400' : '')} /></div>{fieldErrors.email ? <p className="text-xs text-red-400">{fieldErrors.email}</p> : null}</div>
              <div className="space-y-2"><Label htmlFor="business-website" className="text-slate-200">Sitio web</Label><div className="relative"><Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><Input id="business-website" value={form.website} onChange={(e) => onField('website', e.target.value)} placeholder="empresa.com.py" className={cn('pl-10 border-white/10 bg-white/5 text-white placeholder:text-slate-500', fieldErrors.website ? 'border-red-400' : '')} /></div>{fieldErrors.website ? <p className="text-xs text-red-400">{fieldErrors.website}</p> : null}</div>
              <div>{/* spacer */}</div>
              <div className="space-y-2"><Label className="text-slate-200">Departamento</Label><Select value={form.department} onValueChange={(value) => { onField('department', value); onField('city', ''); }}><SelectTrigger className={cn('border-white/10 bg-white/5 text-white', fieldErrors.department ? 'border-red-400' : '')}><SelectValue placeholder="Selecciona un departamento" /></SelectTrigger><SelectContent>{DEPARTMENTS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>{fieldErrors.department ? <p className="text-xs text-red-400">{fieldErrors.department}</p> : null}</div>
              <div className="space-y-2"><Label className="text-slate-200">Ciudad</Label><Select value={form.city} onValueChange={(value) => onField('city', value)} disabled={!form.department}><SelectTrigger className={cn('border-white/10 bg-white/5 text-white', fieldErrors.city ? 'border-red-400' : '')}><SelectValue placeholder={form.department ? 'Selecciona una ciudad' : 'Primero selecciona departamento'} /></SelectTrigger><SelectContent>{(CITIES_BY_DEPARTMENT[form.department] || []).map((city) => <SelectItem key={city} value={city}>{city}</SelectItem>)}</SelectContent></Select>{fieldErrors.city ? <p className="text-xs text-red-400">{fieldErrors.city}</p> : null}</div>
              {fieldErrors.contact ? <div className="md:col-span-2"><p className="flex items-center gap-2 text-xs text-red-400"><Mail className="h-3.5 w-3.5" />{fieldErrors.contact}</p></div> : null}
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/5">
            <div className="border-b border-white/10 px-6 py-5"><div className="flex items-center gap-3"><Palette className="h-5 w-5 text-emerald-400" /><div><h2 className="text-lg font-semibold text-white">Marca y preferencias</h2><p className="mt-1 text-sm text-slate-400">Color principal y modo de visualización.</p></div></div></div>
            <div className="space-y-6 px-6 py-6">
              <div className="space-y-3"><Label className="text-slate-200">Color principal</Label><div className="flex flex-wrap gap-3">{COLOR_PRESETS.map((color) => { const active = form.primary_color === color; return <button key={color} type="button" onClick={() => onField('primary_color', color)} className={cn('relative h-11 w-11 rounded-full border-2 transition', active ? 'border-white scale-105' : 'border-transparent hover:scale-105')} style={{ backgroundColor: color }} aria-label={`Seleccionar color ${color}`}>{active ? <span className="absolute inset-0 flex items-center justify-center text-white"><CheckCircle2 className="h-5 w-5" /></span> : null}</button>; })}</div><div className="flex items-center gap-3 text-sm text-slate-400"><span className="inline-flex h-4 w-4 rounded-full border border-white/20" style={{ backgroundColor: form.primary_color }} /><span>{form.primary_color}</span></div></div>

              {/* Dark mode toggle */}
              <div className="space-y-3">
                <Label className="text-slate-200">Modo de visualización</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => onField('darkMode', 'true')} className={cn('flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition', form.darkMode ? 'border-emerald-400/50 bg-emerald-400/10 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20')}>
                    <Moon className="h-5 w-5" />
                    <div><div className="text-sm font-semibold">Modo oscuro</div><div className={cn('mt-0.5 text-xs', form.darkMode ? 'text-emerald-300' : 'text-slate-500')}>Recomendado</div></div>
                  </button>
                  <button type="button" onClick={() => onField('darkMode', 'false')} className={cn('flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition', !form.darkMode ? 'border-emerald-400/50 bg-emerald-400/10 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20')}>
                    <Sun className="h-5 w-5" />
                    <div><div className="text-sm font-semibold">Modo claro</div><div className={cn('mt-0.5 text-xs', !form.darkMode ? 'text-emerald-300' : 'text-slate-500')}>Clásico</div></div>
                  </button>
                </div>
                <p className="text-xs text-slate-500">El modo oscuro reduce la fatiga visual y es ideal para uso prolongado.</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4"><p className="text-sm font-semibold text-white">Después de esto</p><div className="mt-4 grid gap-4 md:grid-cols-3"><div className="flex gap-3"><Building2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" /><div><div className="text-sm font-medium text-white">Settings</div><p className="mt-1 text-sm leading-6 text-slate-400">Logo, horarios, integraciones y seguridad.</p></div></div><div className="flex gap-3"><Store className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" /><div><div className="text-sm font-medium text-white">Productos</div><p className="mt-1 text-sm leading-6 text-slate-400">Catálogo y stock real.</p></div></div><div className="flex gap-3"><PackageSearch className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" /><div><div className="text-sm font-medium text-white">Dashboard</div><p className="mt-1 text-sm leading-6 text-slate-400">Actividad, límites y módulos.</p></div></div></div></div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
                <div className="text-sm text-slate-500">{alreadyCompleted ? 'Ya existía una versión completada para esta organización.' : 'El progreso se guarda solo para esta organización cuando finalizas.'}</div>
                <div className="flex flex-wrap gap-3">
                  <Button type="button" variant="outline" className="rounded-full border-white/20 px-5 text-white hover:bg-white/10" onClick={() => router.replace('/dashboard')}>Continuar luego</Button>
                  <Button type="button" variant="outline" className="rounded-full border-emerald-400/30 px-5 text-emerald-300 hover:bg-emerald-400/10" onClick={() => void finish('business-config')} disabled={saveTarget !== null}>{saveTarget === 'business-config' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Guardar y configurar empresa</Button>
                  <Button type="button" className="rounded-full bg-emerald-600 px-5 text-white hover:bg-emerald-700" onClick={() => void finish('dashboard')} disabled={saveTarget !== null}>{saveTarget === 'dashboard' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Guardar y entrar al dashboard<ArrowRight className="ml-2 h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
