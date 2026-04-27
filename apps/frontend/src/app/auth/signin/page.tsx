'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  CheckCircle2,
  Building2,
  AlertCircle,
  Shield,
  ArrowRight,
  Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { LandingHeader } from '@/app/inicio/components/LandingHeader';
import { Footer } from '@/app/inicio/components/Footer';
import '@/app/inicio/landing.css';

const signInSchema = z.object({
  email: z.string().email('Ingresa un email válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  remember: z.boolean().default(false),
});

type SignInFormData = z.infer<typeof signInSchema>;

interface Organization {
  id: string;
  name: string;
  slug: string;
  subscription_plan: string;
  subscription_status: string;
}

function isSafeReturnUrl(value: string | null): value is string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//');
}

function writeSelectedOrganizationCookies(org: Organization) {
  if (typeof document === 'undefined') return;

  const base = 'path=/; SameSite=Lax';
  document.cookie = `x-organization-id=${encodeURIComponent(org.id)}; ${base}`;
  document.cookie = `x-organization-name=${encodeURIComponent(org.name)}; ${base}`;
  document.cookie = `x-organization-slug=${encodeURIComponent(org.slug)}; ${base}`;
}

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showOrgSelector, setShowOrgSelector] = useState(false);
  const [userOrganizations, setUserOrganizations] = useState<Organization[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { signIn, resetPassword } = useAuth();
  const supabase = createClient();
  const getReturnUrl = () => {
    const requested = searchParams.get('returnUrl');
    return isSafeReturnUrl(requested) ? requested : '/dashboard';
  };

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isValid },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    mode: 'onChange',
    defaultValues: { remember: false },
  });

  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('saved_login_email');
      const rememberFlag = localStorage.getItem('remember_login') === 'true';
      if (savedEmail) setValue('email', savedEmail);
      setValue('remember', rememberFlag);
    } catch {
      // ignore localStorage errors
    }
  }, [setValue]);

  const waitForServerSessionReady = async () => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      try {
        const response = await fetch('/api/auth/profile', {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
        });

        if (response.ok) {
          return true;
        }
      } catch {}

      await new Promise((resolve) => window.setTimeout(resolve, 150));
    }

    return false;
  };

  const fetchUserOrganizations = async (userId: string) => {
    setLoadingOrgs(true);
    try {
      console.log('Fetching organizations for user:', userId);

      const response = await fetch('/api/auth/organizations', {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.error || 'No se pudieron cargar las organizaciones');
      }

      const orgsData = Array.isArray(result?.organizations) ? result.organizations : [];

      if (!orgsData.length) {
        toast({
          title: 'Sin organizaciones',
          description: 'No perteneces a ninguna organización. Contacta al administrador.',
          variant: 'destructive',
        });
        return;
      }

      setUserOrganizations(orgsData);

      if (orgsData.length === 1) {
        await selectOrganization(orgsData[0]);
      } else {
        setShowOrgSelector(true);
      }
    } catch (err: unknown) {
      const errorObj = (err || {}) as {
        name?: string;
        message?: string;
        code?: string;
        status?: number;
        details?: string;
        hint?: string;
      };
      const name = errorObj?.name || 'Error desconocido';
      const message = errorObj?.message || (typeof err === 'string' ? err : 'No se pudieron cargar las organizaciones');
      const code = errorObj?.code || errorObj?.status || undefined;
      const details = errorObj?.details || errorObj?.hint || undefined;

      console.error('Error fetching organizations:', { name, message, code, details });

      const friendly = String(message).toLowerCase().includes('row-level security')
        ? 'Sin permisos para ver organizaciones. Contacta al administrador.'
        : message;

      toast({
        title: 'Error',
        description: friendly,
        variant: 'destructive',
      });
    } finally {
      setLoadingOrgs(false);
    }
  };

  const selectOrganization = async (org: Organization) => {
    try {
      localStorage.setItem('selected_organization', JSON.stringify(org));
      writeSelectedOrganizationCookies(org);
      window.dispatchEvent(new CustomEvent('organization-changed', {
        detail: { organizationId: org.id, organization: org },
      }));

      toast({
        title: '¡Bienvenido!',
        description: `Accediendo a ${org.name}...`,
      });

      router.replace(getReturnUrl());
      router.refresh();
    } catch (error: unknown) {
      console.error('Error selecting organization:', error);
      toast({
        title: 'Error',
        description: 'No se pudo seleccionar la organización.',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: SignInFormData) => {
    setIsLoading(true);
    try {
      await signIn(data.email, data.password);
      await waitForServerSessionReady();

      if (data.remember) {
        localStorage.setItem('saved_login_email', data.email);
        localStorage.setItem('remember_login', 'true');
      } else {
        localStorage.removeItem('saved_login_email');
        localStorage.setItem('remember_login', 'false');
      }

      setLoginSuccess(true);

      const { data: sessionData } = await supabase.auth.getSession();
      const currentUser = sessionData?.session?.user;
      const returnUrl = getReturnUrl();

      if (currentUser) {
        const rawRole = currentUser.user_metadata?.role;
        const role = typeof rawRole === 'string' ? rawRole.toUpperCase() : '';

        if (role === 'SUPER_ADMIN') {
          toast({
            title: 'Bienvenido Super Admin',
            description: 'Redirigiendo al panel de administración global...',
          });
          router.replace(isSafeReturnUrl(searchParams.get('returnUrl')) ? searchParams.get('returnUrl')! : '/superadmin');
          router.refresh();
          return;
        }

        await fetchUserOrganizations(currentUser.id);
      } else {
        toast({
          title: '¡Bienvenido!',
          description: 'Has iniciado sesión correctamente.',
        });
        router.replace(returnUrl);
        router.refresh();
      }
    } catch (error: any) {
      toast({
        title: 'Error al iniciar sesión',
        description: error.message || 'Credenciales inválidas. Verifica tu email y contraseña.',
        variant: 'destructive',
      });
      setLoginSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (email: string) => {
    try {
      await resetPassword(email);
      toast({
        title: 'Enlace enviado',
        description: 'Si el email existe, recibirás un enlace para restablecer tu contraseña.',
      });
      setShowForgotPassword(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al enviar enlace de recuperación.',
        variant: 'destructive',
      });
    }
  };

  if (showOrgSelector && userOrganizations.length > 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <LandingHeader />
        <main>
          <OrganizationSelector
            organizations={userOrganizations}
            onSelect={selectOrganization}
            loading={loadingOrgs}
          />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <LandingHeader />
      <main>
        {!showForgotPassword ? (
          <LoginSection
            onSubmit={handleSubmit(onSubmit)}
            register={register}
            errors={errors}
            isValid={isValid}
            isLoading={isLoading}
            loginSuccess={loginSuccess}
            loadingOrgs={loadingOrgs}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            onForgotPassword={() => setShowForgotPassword(true)}
          />
        ) : (
          <ForgotPasswordSection
            onBack={() => setShowForgotPassword(false)}
            onSubmit={handleForgotPassword}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}

function LoginSection({
  onSubmit,
  register,
  errors,
  isValid,
  isLoading,
  loginSuccess,
  loadingOrgs,
  showPassword,
  setShowPassword,
  onForgotPassword,
}: any) {
  return (
    <section className="relative overflow-hidden bg-[#0a0a0a] py-20 lg:py-32">
      <div className="absolute inset-0">
        <div className="radial-gradient-purple absolute left-1/4 top-1/4 h-96 w-96 opacity-20" />
        <div className="radial-gradient-blue absolute bottom-1/4 right-1/4 h-96 w-96 opacity-20" />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-md">
          <div className="mb-6 text-center md:mb-8">
            <div className="glass-card mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 md:mb-6">
              <Shield className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-medium text-gray-300">Acceso seguro y encriptado</span>
            </div>

            <h2 className="mb-3 text-3xl font-bold text-white md:mb-4 md:text-4xl lg:text-5xl">
              Iniciar <span className="gradient-text">Sesión</span>
            </h2>
            <p className="text-sm text-gray-400 md:text-base">Accede a tu panel de control</p>
          </div>

          <div className="glass-card rounded-2xl p-6 md:p-8">
            <form onSubmit={onSubmit} className="space-y-5 md:space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2 text-white">
                  <Mail className="h-4 w-4 text-purple-400" />
                  Correo Electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@empresa.com"
                  className={cn(
                    'bg-white/5 text-white placeholder:text-gray-500 border-white/10',
                    'focus:border-purple-500 focus:ring-purple-500/20',
                    errors.email && 'border-red-500',
                  )}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="flex items-center gap-1 text-sm text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2 text-white">
                  <Lock className="h-4 w-4 text-purple-400" />
                  Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={cn(
                      'pr-10 bg-white/5 text-white placeholder:text-gray-500 border-white/10',
                      'focus:border-purple-500 focus:ring-purple-500/20',
                      errors.password && 'border-red-500',
                    )}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-200"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="flex items-center gap-1 text-sm text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <label htmlFor="remember" className="group flex cursor-pointer items-center gap-2 text-sm text-gray-300">
                  <input
                    id="remember"
                    type="checkbox"
                    {...register('remember')}
                    className="cursor-pointer rounded border-white/10 bg-white/5 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="transition-colors group-hover:text-white">Recordar sesión</span>
                </label>
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-sm text-purple-400 transition-colors hover:text-purple-300"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <Button
                type="submit"
                className={cn(
                  'gradient-primary glow-purple shadow-dark-lg w-full rounded-xl py-5 text-base text-white transition-all duration-300 hover:scale-105 md:py-6',
                  'disabled:cursor-not-allowed disabled:transform-none disabled:opacity-50',
                )}
                disabled={isLoading || loginSuccess || loadingOrgs || !isValid}
              >
                {loginSuccess ? (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    ¡Acceso exitoso!
                  </>
                ) : isLoading || loadingOrgs ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {loadingOrgs ? 'Cargando organizaciones...' : 'Iniciando sesión...'}
                  </>
                ) : (
                  <>
                    Iniciar Sesión
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-[#0a0a0a] px-2 text-gray-400">¿No tienes cuenta?</span>
                </div>
              </div>

              <Link href="/inicio">
                <Button
                  type="button"
                  variant="outline"
                  className="glass-card w-full border-white/10 text-white hover:border-purple-500/50 hover:bg-white/5"
                >
                  Ver Planes y Crear Cuenta
                </Button>
              </Link>
            </form>
          </div>

          <div className="mt-6 text-center md:mt-8">
            <p className="flex items-center justify-center gap-2 text-xs text-gray-500 md:text-sm">
              <Shield className="h-4 w-4 text-green-400" />
              Conexión segura con encriptación SSL
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function OrganizationSelector({
  organizations,
  onSelect,
  loading,
}: {
  organizations: Organization[];
  onSelect: (org: Organization) => void;
  loading: boolean;
}) {
  return (
    <section className="relative overflow-hidden bg-[#0a0a0a] py-20 lg:py-32">
      <div className="absolute inset-0">
        <div className="radial-gradient-purple absolute left-1/4 top-1/4 h-96 w-96 opacity-20" />
        <div className="radial-gradient-blue absolute bottom-1/4 right-1/4 h-96 w-96 opacity-20" />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 text-center md:mb-8">
            <div className="gradient-primary mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl md:mb-6 md:h-20 md:w-20">
              <Briefcase className="h-8 w-8 text-white md:h-10 md:w-10" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-white md:text-3xl lg:text-4xl">
              Selecciona tu <span className="gradient-text">Organización</span>
            </h2>
            <p className="text-sm text-gray-400 md:text-base">
              Tienes acceso a {organizations.length}{' '}
              {organizations.length === 1 ? 'organización' : 'organizaciones'}
            </p>
          </div>

          <div className="space-y-3 md:space-y-4">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => onSelect(org)}
                disabled={loading}
                className={cn(
                  'glass-card hover-glow group w-full rounded-xl p-4 transition-all duration-300 md:p-6',
                  'hover:scale-105 active:scale-95',
                  'disabled:cursor-not-allowed disabled:transform-none disabled:opacity-50',
                )}
              >
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="gradient-primary flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl md:h-16 md:w-16">
                    <Building2 className="h-6 w-6 text-white md:h-8 md:w-8" />
                  </div>

                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-semibold text-white transition-colors group-hover:text-purple-300 md:text-xl">
                      {org.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                          org.subscription_plan === 'ENTERPRISE'
                            ? 'bg-purple-500/20 text-purple-300'
                            : org.subscription_plan === 'PRO'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-gray-500/20 text-gray-300',
                        )}
                      >
                        {org.subscription_plan}
                      </span>
                      <span className="text-sm text-gray-500">{org.slug}</span>
                    </div>
                  </div>

                  <ArrowRight className="h-5 w-5 text-gray-400 transition-all group-hover:translate-x-1 group-hover:text-purple-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ForgotPasswordSection({
  onBack,
  onSubmit,
}: {
  onBack: () => void;
  onSubmit: (email: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    await onSubmit(email);
    setIsLoading(false);
  };

  return (
    <section className="relative overflow-hidden bg-[#0a0a0a] py-20 lg:py-32">
      <div className="absolute inset-0">
        <div className="radial-gradient-purple absolute left-1/4 top-1/4 h-96 w-96 opacity-20" />
        <div className="radial-gradient-blue absolute bottom-1/4 right-1/4 h-96 w-96 opacity-20" />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-md">
          <div className="glass-card rounded-2xl p-6 md:p-8">
            <div className="mb-6 text-center">
              <div className="gradient-primary mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl md:h-16 md:w-16">
                <Lock className="h-7 w-7 text-white md:h-8 md:w-8" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-white md:text-2xl">Recuperar Contraseña</h2>
              <p className="text-sm text-gray-400 md:text-base">
                Ingresa tu email para recibir un enlace de recuperación
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
              <div className="space-y-2">
                <Label htmlFor="recovery-email" className="flex items-center gap-2 text-white">
                  <Mail className="h-4 w-4 text-purple-400" />
                  Correo Electrónico
                </Label>
                <Input
                  id="recovery-email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-white/10 bg-white/5 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500/20"
                  required
                />
              </div>

              <div className="space-y-3">
                <Button
                  type="submit"
                  className="gradient-primary glow-purple shadow-dark-lg w-full rounded-xl py-5 text-base text-white transition-all duration-300 hover:scale-105 md:py-6"
                  disabled={isLoading || !email}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      Enviar Enlace
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  className="glass-card w-full border-white/10 text-white hover:border-purple-500/50 hover:bg-white/5"
                >
                  Volver al Login
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
