'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AlertCircle, Briefcase, CheckCircle2, Eye, EyeOff, Loader2, Scissors, Store } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Plan } from '@/hooks/use-subscription';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import { toast } from '@/lib/toast';
import { DEFAULT_VERTICAL, VERTICAL_OPTIONS, type BusinessVertical, normalizeVertical } from '@/config/verticals';
import { cn } from '@/lib/utils';

interface RegistrationFormProps {
  selectedPlan: Plan;
  billingCycle?: 'monthly' | 'yearly';
  onSuccess: () => void;
  defaultVertical?: string | null;
}

type RegistrationField = 'name' | 'email' | 'organizationName' | 'vertical' | 'password' | 'confirmPassword';

function BusinessVerticalIcon({ vertical }: { vertical: BusinessVertical }) {
  if (vertical === 'BARBERSHOP') return <Scissors className="h-4.5 w-4.5" />;
  if (vertical === 'RETAIL') return <Store className="h-4.5 w-4.5" />;
  return <Briefcase className="h-4.5 w-4.5" />;
}

function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(email);
}

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' };

  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score, label: 'Muy débil', color: 'bg-red-500' };
  if (score === 2) return { score, label: 'Débil', color: 'bg-orange-500' };
  if (score === 3) return { score, label: 'Aceptable', color: 'bg-amber-400' };
  if (score === 4) return { score, label: 'Buena', color: 'bg-emerald-400' };
  return { score, label: 'Fuerte', color: 'bg-emerald-500' };
}

export function RegistrationForm({ selectedPlan, billingCycle = 'monthly', onSuccess, defaultVertical }: RegistrationFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organizationName: '',
    vertical: normalizeVertical(defaultVertical),
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const passwordStrength = useMemo(
    () => getPasswordStrength(formData.password),
    [formData.password]
  );
  const isFreePlan = selectedPlan.priceMonthly === 0 || selectedPlan.slug === 'free';

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'El nombre es requerido';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'El nombre debe tener al menos 2 caracteres';
    }

    if (!formData.email.trim()) {
      errors.email = 'El email es requerido';
    } else if (!isValidEmail(formData.email.trim())) {
      errors.email = 'Ingresa un email válido (ej: nombre@empresa.com)';
    }

    if (!formData.organizationName.trim()) {
      errors.organizationName = 'El nombre del negocio es requerido';
    } else if (formData.organizationName.trim().length < 2) {
      errors.organizationName = 'El nombre debe tener al menos 2 caracteres';
    }

    if (!VERTICAL_OPTIONS.some((option) => option.value === formData.vertical)) {
      errors.vertical = 'Selecciona un tipo de negocio válido';
    }

    if (!formData.password) {
      errors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 8) {
      errors.password = 'Mínimo 8 caracteres';
    } else if (passwordStrength.score < 2) {
      errors.password = 'Agrega mayúsculas, números o símbolos para mayor seguridad';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Confirma tu contraseña';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: RegistrationField, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }

    if (error) setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseClient();
      await supabase.auth.signOut();

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          organizationName: formData.organizationName.trim(),
          vertical: formData.vertical,
          password: formData.password,
          planSlug: selectedPlan.slug,
          billingCycle,
        }),
      });

      let data: Record<string, unknown> = {};
      try {
        data = await response.json();
      } catch {
        throw new Error('Error de conexión. Verifica tu internet e intenta de nuevo.');
      }

      if (!response.ok || !data.success) {
        const serverError = String(data.error || '');
        if (serverError.includes('already registered') || serverError.includes('ya esta registrado')) {
          throw new Error('Este email ya tiene una cuenta. ¿Querías iniciar sesión?');
        }
        throw new Error(serverError || 'Error al crear la cuenta');
      }

      // Si Supabase requiere verificación de email, signUp no devuelve sesión
      // y aterrizar en /onboarding falla porque el middleware redirige a
      // signin sin sesión. Comprobamos antes de redirigir.
      const supabaseClient = createSupabaseClient();
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const hasActiveSession = Boolean(sessionData?.session);

      if (!hasActiveSession) {
        toast.success('Cuenta creada', {
          description: 'Te enviamos un email para verificar tu cuenta. Revisá tu bandeja de entrada.',
        });
        // Sin sesión no podemos avanzar al onboarding; quedamos en el form
        // con un estado "post-registro" para que el usuario revise el mail.
        return;
      }

      toast.success('Cuenta creada', {
        description: String(data.message || 'Bienvenido a MITIENDA'),
      });

      window.setTimeout(() => onSuccess(), 1000);
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : 'Error inesperado. Intenta de nuevo en unos segundos.';
      setError(message);
      toast.error('Error al registrarse', { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
        </Alert>
      )}

      {/* Full Name */}
      <div className="space-y-2 animate-in fade-in duration-300">
        <Label htmlFor="reg-name" className="text-xs font-semibold text-slate-300">
          Nombre completo <span className="text-emerald-400">*</span>
        </Label>
        <Input
          id="reg-name"
          type="text"
          autoComplete="name"
          placeholder="Juan Pérez"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          disabled={loading}
          aria-invalid={!!validationErrors.name}
          aria-describedby={validationErrors.name ? 'reg-name-error' : undefined}
          className={cn(
            "h-10 border-white/10 bg-white/5 text-white placeholder:text-slate-500 rounded-xl focus:border-emerald-400/80 focus:ring-emerald-400/20 focus:ring-2 focus-visible:ring-emerald-400/20 focus-visible:ring-2 transition-all duration-300 hover:border-white/20",
            validationErrors.name && 'border-red-500/80 focus:border-red-500 focus:ring-red-500/10'
          )}
        />
        {validationErrors.name && (
          <p id="reg-name-error" className="text-xs text-red-400 font-medium mt-1" role="alert">{validationErrors.name}</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-2 animate-in fade-in duration-300 delay-75">
        <Label htmlFor="reg-email" className="text-xs font-semibold text-slate-300">
          Email corporativo / personal <span className="text-emerald-400">*</span>
        </Label>
        <Input
          id="reg-email"
          type="email"
          autoComplete="email"
          placeholder="tu@empresa.com"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          disabled={loading}
          aria-invalid={!!validationErrors.email}
          aria-describedby={validationErrors.email ? 'reg-email-error' : undefined}
          className={cn(
            "h-10 border-white/10 bg-white/5 text-white placeholder:text-slate-500 rounded-xl focus:border-emerald-400/80 focus:ring-emerald-400/20 focus:ring-2 focus-visible:ring-emerald-400/20 focus-visible:ring-2 transition-all duration-300 hover:border-white/20",
            validationErrors.email && 'border-red-500/80 focus:border-red-500 focus:ring-red-500/10'
          )}
        />
        {validationErrors.email && (
          <p id="reg-email-error" className="text-xs text-red-400 font-medium mt-1" role="alert">{validationErrors.email}</p>
        )}
      </div>

      {/* Business Name */}
      <div className="space-y-2 animate-in fade-in duration-300 delay-100">
        <Label htmlFor="reg-org" className="text-xs font-semibold text-slate-300">
          Nombre de tu negocio <span className="text-emerald-400">*</span>
        </Label>
        <Input
          id="reg-org"
          type="text"
          autoComplete="organization"
          placeholder="Mi Tienda o Barbería"
          value={formData.organizationName}
          onChange={(e) => handleInputChange('organizationName', e.target.value)}
          disabled={loading}
          aria-invalid={!!validationErrors.organizationName}
          aria-describedby={validationErrors.organizationName ? 'reg-org-error' : undefined}
          className={cn(
            "h-10 border-white/10 bg-white/5 text-white placeholder:text-slate-500 rounded-xl focus:border-emerald-400/80 focus:ring-emerald-400/20 focus:ring-2 focus-visible:ring-emerald-400/20 focus-visible:ring-2 transition-all duration-300 hover:border-white/20",
            validationErrors.organizationName && 'border-red-500/80 focus:border-red-500 focus:ring-red-500/10'
          )}
        />
        {validationErrors.organizationName && (
          <p id="reg-org-error" className="text-xs text-red-400 font-medium mt-1" role="alert">{validationErrors.organizationName}</p>
        )}
      </div>

      {/* Business Type Selector (Verticals) */}
      <fieldset className="space-y-3 animate-in fade-in duration-300 delay-150">
        <legend className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <Briefcase className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          <span>Tipo de negocio</span> <span className="text-emerald-400">*</span>
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {VERTICAL_OPTIONS.map((option) => {
            const isActive = formData.vertical === option.value;
            return (
              <label
                key={option.value}
                htmlFor={`reg-vertical-${option.value}`}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-left transition-all duration-300 hover-lift hover-glow",
                  isActive
                    ? 'border-emerald-400 bg-emerald-500/10 text-emerald-50 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-400/30'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/25 hover:bg-white/10'
                )}
              >
                <input
                  id={`reg-vertical-${option.value}`}
                  type="radio"
                  name="vertical"
                  value={option.value}
                  checked={isActive}
                  onChange={(event) => handleInputChange('vertical', event.target.value)}
                  disabled={loading}
                  className="sr-only"
                />
                <span className={cn(
                  "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300",
                  isActive ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/25' : 'bg-white/10 text-slate-400'
                )}>
                  <BusinessVerticalIcon vertical={option.value} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{option.label}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-400 font-medium">{option.description}</span>
                </span>
              </label>
            );
          })}
        </div>
        {validationErrors.vertical && (
          <p className="text-xs text-red-400 font-medium mt-1" role="alert">{validationErrors.vertical}</p>
        )}
      </fieldset>

      {/* Password */}
      <div className="space-y-2 animate-in fade-in duration-300 delay-200">
        <Label htmlFor="reg-password" className="text-xs font-semibold text-slate-300">
          Contraseña <span className="text-emerald-400">*</span>
        </Label>
        <div className="relative">
          <Input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            disabled={loading}
            aria-invalid={!!validationErrors.password}
            aria-describedby="reg-password-strength"
            className={cn(
              "h-10 border-white/10 bg-white/5 pr-10 text-white placeholder:text-slate-500 rounded-xl focus:border-emerald-400/80 focus:ring-emerald-400/20 focus:ring-2 focus-visible:ring-emerald-400/20 focus-visible:ring-2 transition-all duration-300 hover:border-white/20",
              validationErrors.password && 'border-red-500/80 focus:border-red-500 focus:ring-red-500/10'
            )}
          />
          <button
            type="button"
            onClick={() => setShowPassword((c) => !c)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <EyeOff className="h-4.5 w-4.5" aria-hidden="true" /> : <Eye className="h-4.5 w-4.5" aria-hidden="true" />}
          </button>
        </div>
        
        {formData.password && (
          <div id="reg-password-strength" className="space-y-1.5 mt-2 animate-in slide-in-from-top duration-300">
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                    level <= passwordStrength.score ? passwordStrength.color : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
            <p className="text-[10px] text-slate-400 font-semibold">
              Seguridad: <span className="text-slate-300 font-bold">{passwordStrength.label}</span>
            </p>
          </div>
        )}
        {validationErrors.password && (
          <p className="text-xs text-red-400 font-medium mt-1" role="alert">{validationErrors.password}</p>
        )}
      </div>

      {/* Confirm Password */}
      <div className="space-y-2 animate-in fade-in duration-300 delay-200">
        <Label htmlFor="reg-confirm" className="text-xs font-semibold text-slate-300">
          Confirmar contraseña <span className="text-emerald-400">*</span>
        </Label>
        <div className="relative">
          <Input
            id="reg-confirm"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Repite tu contraseña"
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            disabled={loading}
            aria-invalid={!!validationErrors.confirmPassword}
            aria-describedby={validationErrors.confirmPassword ? 'reg-confirm-error' : undefined}
            className={cn(
              "h-10 border-white/10 bg-white/5 pr-10 text-white placeholder:text-slate-500 rounded-xl focus:border-emerald-400/80 focus:ring-emerald-400/20 focus:ring-2 focus-visible:ring-emerald-400/20 focus-visible:ring-2 transition-all duration-300 hover:border-white/20",
              validationErrors.confirmPassword && 'border-red-500/80 focus:border-red-500 focus:ring-red-500/10'
            )}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((c) => !c)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400"
            aria-label={showConfirmPassword ? 'Ocultar confirmacion' : 'Mostrar confirmacion'}
          >
            {showConfirmPassword ? <EyeOff className="h-4.5 w-4.5" aria-hidden="true" /> : <Eye className="h-4.5 w-4.5" aria-hidden="true" />}
          </button>
        </div>
        {formData.confirmPassword && formData.password === formData.confirmPassword && (
          <p className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold mt-1.5 animate-in slide-in-from-top duration-300">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            Las contraseñas coinciden
          </p>
        )}
        {validationErrors.confirmPassword && (
          <p id="reg-confirm-error" className="text-xs text-red-400 font-medium mt-1" role="alert">{validationErrors.confirmPassword}</p>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={loading}
        className="gradient-primary w-full h-12 rounded-xl text-base font-bold text-white shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/25 hover:-translate-y-0.5 active:translate-y-0 focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-950 transition-all duration-300"
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-white" aria-hidden="true" />
            <span>Creando cuenta...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            <span>{isFreePlan ? 'Crear cuenta gratis' : 'Iniciar registro'}</span>
          </div>
        )}
      </Button>

      {/* Explanatory notes */}
      {isFreePlan ? (
        <p className="text-center text-[10px] text-emerald-400 font-semibold tracking-wide animate-in fade-in duration-300">
          Comenzás sin tarjeta y podés actualizar el plan cuando quieras.
        </p>
      ) : (
        <p className="text-center text-[10px] text-slate-500 font-semibold tracking-wide animate-in fade-in duration-300">
          No se cobrará nada ahora. Tu cuenta iniciará en plan Free.
        </p>
      )}

      {/* Existing account link */}
      <p className="text-center text-xs text-slate-400 pt-2 border-t border-white/5">
        ¿Ya tienes cuenta?{' '}
        <Link href="/auth/signin" className="font-bold text-emerald-400 hover:text-emerald-300 underline transition-colors">
          Inicia sesión
        </Link>
      </p>

      {/* Terms & Privacy policies links */}
      <p className="text-center text-[10px] text-slate-500 leading-normal">
        Al crear una cuenta, aceptas nuestros{' '}
        <Link href="/inicio" className="text-slate-400 underline hover:text-slate-300 font-medium">
          Términos de Servicio
        </Link>{' '}
        y{' '}
        <Link href="/inicio" className="text-slate-400 underline hover:text-slate-300 font-medium">
          Política de Privacidad
        </Link>
      </p>
    </form>
  );
}
