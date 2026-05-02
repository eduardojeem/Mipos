'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Plan } from '@/hooks/use-subscription';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import { toast } from '@/lib/toast';

interface RegistrationFormProps {
  selectedPlan: Plan;
  onSuccess: () => void;
}

type RegistrationField = 'name' | 'email' | 'organizationName' | 'password' | 'confirmPassword';

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

  if (score <= 1) return { score, label: 'Muy debil', color: 'bg-red-500' };
  if (score === 2) return { score, label: 'Debil', color: 'bg-orange-500' };
  if (score === 3) return { score, label: 'Aceptable', color: 'bg-amber-400' };
  if (score === 4) return { score, label: 'Buena', color: 'bg-emerald-400' };
  return { score, label: 'Fuerte', color: 'bg-emerald-500' };
}

export function RegistrationForm({ selectedPlan, onSuccess }: RegistrationFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organizationName: '',
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
      errors.email = 'Ingresa un email valido (ej: nombre@empresa.com)';
    }

    if (!formData.organizationName.trim()) {
      errors.organizationName = 'El nombre del negocio es requerido';
    } else if (formData.organizationName.trim().length < 2) {
      errors.organizationName = 'El nombre debe tener al menos 2 caracteres';
    }

    if (!formData.password) {
      errors.password = 'La contrasena es requerida';
    } else if (formData.password.length < 6) {
      errors.password = 'Minimo 6 caracteres';
    } else if (passwordStrength.score < 2) {
      errors.password = 'Agrega mayusculas, numeros o simbolos para mayor seguridad';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Confirma tu contrasena';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Las contrasenas no coinciden';
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
          password: formData.password,
          planSlug: selectedPlan.slug,
        }),
      });

      let data: Record<string, unknown> = {};
      try {
        data = await response.json();
      } catch {
        throw new Error('Error de conexion. Verifica tu internet e intenta de nuevo.');
      }

      if (!response.ok || !data.success) {
        const serverError = String(data.error || '');
        if (serverError.includes('already registered') || serverError.includes('ya esta registrado')) {
          throw new Error('Este email ya tiene una cuenta. Querias iniciar sesion?');
        }
        throw new Error(serverError || 'Error al crear la cuenta');
      }

      toast.success('Cuenta creada', {
        description: String(data.message || 'Bienvenido a MiPOS'),
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
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="reg-name" className="text-sm text-white">
          Nombre completo <span className="text-red-400">*</span>
        </Label>
        <Input
          id="reg-name"
          type="text"
          autoComplete="name"
          placeholder="Juan Perez"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          disabled={loading}
          aria-invalid={!!validationErrors.name}
          aria-describedby={validationErrors.name ? 'reg-name-error' : undefined}
          className={`border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-400/50 ${validationErrors.name ? 'border-red-500' : ''}`}
        />
        {validationErrors.name && (
          <p id="reg-name-error" className="text-xs text-red-400" role="alert">{validationErrors.name}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-email" className="text-sm text-white">
          Email <span className="text-red-400">*</span>
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
          className={`border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-400/50 ${validationErrors.email ? 'border-red-500' : ''}`}
        />
        {validationErrors.email && (
          <p id="reg-email-error" className="text-xs text-red-400" role="alert">{validationErrors.email}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-org" className="text-sm text-white">
          Nombre de tu negocio <span className="text-red-400">*</span>
        </Label>
        <Input
          id="reg-org"
          type="text"
          autoComplete="organization"
          placeholder="Mi Tienda"
          value={formData.organizationName}
          onChange={(e) => handleInputChange('organizationName', e.target.value)}
          disabled={loading}
          aria-invalid={!!validationErrors.organizationName}
          aria-describedby={validationErrors.organizationName ? 'reg-org-error' : undefined}
          className={`border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-400/50 ${validationErrors.organizationName ? 'border-red-500' : ''}`}
        />
        {validationErrors.organizationName && (
          <p id="reg-org-error" className="text-xs text-red-400" role="alert">{validationErrors.organizationName}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-password" className="text-sm text-white">
          Contrasena <span className="text-red-400">*</span>
        </Label>
        <div className="relative">
          <Input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Minimo 6 caracteres"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            disabled={loading}
            aria-invalid={!!validationErrors.password}
            aria-describedby="reg-password-strength"
            className={`border-white/10 bg-white/5 pr-10 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-400/50 ${validationErrors.password ? 'border-red-500' : ''}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((c) => !c)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded text-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
        {formData.password && (
          <div id="reg-password-strength" className="space-y-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    level <= passwordStrength.score ? passwordStrength.color : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              Seguridad: <span className="font-medium text-slate-300">{passwordStrength.label}</span>
            </p>
          </div>
        )}
        {validationErrors.password && (
          <p className="text-xs text-red-400" role="alert">{validationErrors.password}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-confirm" className="text-sm text-white">
          Confirmar contrasena <span className="text-red-400">*</span>
        </Label>
        <div className="relative">
          <Input
            id="reg-confirm"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Repite tu contrasena"
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            disabled={loading}
            aria-invalid={!!validationErrors.confirmPassword}
            aria-describedby={validationErrors.confirmPassword ? 'reg-confirm-error' : undefined}
            className={`border-white/10 bg-white/5 pr-10 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-400/50 ${validationErrors.confirmPassword ? 'border-red-500' : ''}`}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((c) => !c)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded text-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            aria-label={showConfirmPassword ? 'Ocultar confirmacion' : 'Mostrar confirmacion'}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
        {formData.confirmPassword && formData.password === formData.confirmPassword && (
          <p className="flex items-center gap-1 text-[11px] text-emerald-400">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            Las contrasenas coinciden
          </p>
        )}
        {validationErrors.confirmPassword && (
          <p id="reg-confirm-error" className="text-xs text-red-400" role="alert">{validationErrors.confirmPassword}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="gradient-primary w-full rounded-lg px-4 py-6 text-lg text-white shadow-[0_18px_40px_-20px_rgba(16,185,129,0.95)] transition-opacity hover:opacity-95 focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-950"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
            Creando cuenta...
          </>
        ) : (
          <>
            <CheckCircle2 className="mr-2 h-5 w-5" aria-hidden="true" />
            {isFreePlan ? 'Crear gratis' : 'Crear mi cuenta'}
          </>
        )}
      </Button>

      {isFreePlan ? (
        <p className="text-center text-[11px] text-emerald-300">
          Empiezas sin tarjeta y puedes mejorar el plan cuando quieras.
        </p>
      ) : (
        <p className="text-center text-[11px] text-slate-500">
          Puedes cambiar este plan mas adelante desde suscripcion.
        </p>
      )}

      <p className="text-center text-xs text-slate-500">
        Ya tienes cuenta?{' '}
        <Link href="/auth/signin" className="font-medium text-emerald-300 underline transition-colors hover:text-emerald-200">
          Inicia sesion
        </Link>
      </p>

      <p className="text-center text-[11px] text-slate-600">
        Al crear una cuenta, aceptas nuestros{' '}
        <Link href="/inicio" className="text-slate-400 underline hover:text-slate-300">
          Terminos de Servicio
        </Link>{' '}
        y{' '}
        <Link href="/inicio" className="text-slate-400 underline hover:text-slate-300">
          Politica de Privacidad
        </Link>
      </p>
    </form>
  );
}
