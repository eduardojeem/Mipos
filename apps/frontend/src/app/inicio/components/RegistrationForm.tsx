'use client';

import Link from 'next/link';
import { useState } from 'react';
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

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'El nombre es requerido';
    }

    if (!formData.email.trim()) {
      errors.email = 'El email es requerido';
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Email invalido';
    }

    if (!formData.organizationName.trim()) {
      errors.organizationName = 'El nombre de la organizacion es requerido';
    }

    if (!formData.password) {
      errors.password = 'La contrasena es requerida';
    } else if (formData.password.length < 6) {
      errors.password = 'La contrasena debe tener al menos 6 caracteres';
    }

    if (formData.password !== formData.confirmPassword) {
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

    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseClient();
      await supabase.auth.signOut();

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          organizationName: formData.organizationName,
          password: formData.password,
          planSlug: selectedPlan.slug,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al crear la cuenta');
      }

      toast.success('Cuenta creada exitosamente', {
        description: data.message || 'Bienvenido a MiPOS',
      });

      window.setTimeout(() => {
        onSuccess();
      }, 1000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error
        ? err.message
        : 'Error al crear la cuenta. Por favor intenta de nuevo.';

      console.error('Registration error:', err);
      setError(errorMessage);
      toast.error('Error al registrarse', {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="name" className="text-white">
          Nombre completo <span className="text-red-400">*</span>
        </Label>
        <Input
          id="name"
          type="text"
          placeholder="Juan Perez"
          value={formData.name}
          onChange={(event) => handleInputChange('name', event.target.value)}
          disabled={loading}
          className={`bg-white/5 border-white/10 text-white placeholder:text-gray-500 ${validationErrors.name ? 'border-red-500' : ''}`}
        />
        {validationErrors.name ? (
          <p className="text-sm text-red-500">{validationErrors.name}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-white">
          Email <span className="text-red-400">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="tu@email.com"
          value={formData.email}
          onChange={(event) => handleInputChange('email', event.target.value)}
          disabled={loading}
          className={`bg-white/5 border-white/10 text-white placeholder:text-gray-500 ${validationErrors.email ? 'border-red-500' : ''}`}
        />
        {validationErrors.email ? (
          <p className="text-sm text-red-500">{validationErrors.email}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="organizationName" className="text-white">
          Nombre de tu negocio <span className="text-red-400">*</span>
        </Label>
        <Input
          id="organizationName"
          type="text"
          placeholder="Mi Tienda"
          value={formData.organizationName}
          onChange={(event) => handleInputChange('organizationName', event.target.value)}
          disabled={loading}
          className={`bg-white/5 border-white/10 text-white placeholder:text-gray-500 ${validationErrors.organizationName ? 'border-red-500' : ''}`}
        />
        {validationErrors.organizationName ? (
          <p className="text-sm text-red-500">{validationErrors.organizationName}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-white">
          Contrasena <span className="text-red-400">*</span>
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Minimo 6 caracteres"
            value={formData.password}
            onChange={(event) => handleInputChange('password', event.target.value)}
            disabled={loading}
            className={`pr-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 ${validationErrors.password ? 'border-red-500' : ''}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
            aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {validationErrors.password ? (
          <p className="text-sm text-red-500">{validationErrors.password}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-white">
          Confirmar contrasena <span className="text-red-400">*</span>
        </Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Repite tu contrasena"
            value={formData.confirmPassword}
            onChange={(event) => handleInputChange('confirmPassword', event.target.value)}
            disabled={loading}
            className={`pr-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 ${validationErrors.confirmPassword ? 'border-red-500' : ''}`}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((current) => !current)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
            aria-label={showConfirmPassword ? 'Ocultar confirmacion de contrasena' : 'Mostrar confirmacion de contrasena'}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {validationErrors.confirmPassword ? (
          <p className="text-sm text-red-500">{validationErrors.confirmPassword}</p>
        ) : null}
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="gradient-primary w-full rounded-lg px-4 py-6 text-lg text-white shadow-[0_18px_40px_-20px_rgba(16,185,129,0.95)] transition-opacity hover:opacity-95"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Creando cuenta...
          </>
        ) : (
          <>
            <CheckCircle2 className="mr-2 h-5 w-5" />
            Crear mi cuenta
          </>
        )}
      </Button>

      <p className="text-center text-sm text-gray-400">
        Al crear una cuenta, aceptas nuestros{' '}
        <Link href="/terminos" className="text-emerald-300 underline transition-colors hover:text-emerald-200">
          Terminos de Servicio
        </Link>{' '}
        y{' '}
        <Link href="/privacidad" className="text-emerald-300 underline transition-colors hover:text-emerald-200">
          Politica de Privacidad
        </Link>
      </p>
    </form>
  );
}
