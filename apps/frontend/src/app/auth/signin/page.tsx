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
  Sparkles,
  ArrowRight,
  Briefcase
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
    } catch (e) {
      // ignore localStorage errors
    }
  }, [setValue]);

  const fetchUserOrganizations = async (userId: string) => {
    setLoadingOrgs(true);
    try {
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userId);

      if (memberError) throw memberError;

      if (!memberData || memberData.length === 0) {
        toast({
          title: 'Sin organizaciones',
          description: 'No perteneces a ninguna organización. Contacta al administrador.',
          variant: 'destructive',
        });
        setLoadingOrgs(false);
        return;
      }

      const orgIds = memberData.map(m => m.organization_id);

      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, slug, subscription_plan, subscription_status')
        .in('id', orgIds)
        .eq('subscription_status', 'ACTIVE');

      if (orgsError) throw orgsError;

      if (orgsData && orgsData.length > 0) {
        setUserOrganizations(orgsData);

        if (orgsData.length === 1) {
          await selectOrganization(orgsData[0]);
        } else {
          setShowOrgSelector(true);
        }
      } else {
        toast({
          title: 'Sin organizaciones activas',
          description: 'No tienes acceso a organizaciones activas.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error fetching organizations:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las organizaciones.',
        variant: 'destructive',
      });
    } finally {
      setLoadingOrgs(false);
    }
  };

  const selectOrganization = async (org: Organization) => {
    try {
      localStorage.setItem('selected_organization', JSON.stringify(org));

      toast({
        title: '¡Bienvenido!',
        description: `Accediendo a ${org.name}...`,
      });

      setTimeout(() => {
        const returnUrl = searchParams.get('returnUrl') || '/dashboard';
        router.push(returnUrl);
      }, 800);
    } catch (error: any) {
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

      if (currentUser) {
        const rawRole = currentUser.user_metadata?.role;
        const role = typeof rawRole === 'string' ? rawRole.toUpperCase() : '';

        if (role === 'SUPER_ADMIN') {
          toast({
            title: 'Bienvenido Super Admin',
            description: 'Redirigiendo al panel de administración global...',
          });
          setTimeout(() => {
            router.push('/superadmin');
          }, 800);
          return;
        }

        await fetchUserOrganizations(currentUser.id);
      } else {
        toast({
          title: '¡Bienvenido!',
          description: 'Has iniciado sesión correctamente.',
        });
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
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
          <OrganizationSelector organizations={userOrganizations} onSelect={selectOrganization} loading={loadingOrgs} />
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

// Login Section Component
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
    <section className="py-20 lg:py-32 bg-[#0a0a0a] relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 radial-gradient-purple opacity-20" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 radial-gradient-blue opacity-20" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-6 md:mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-4 md:mb-6">
              <Shield className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-medium text-gray-300">
                Acceso seguro y encriptado
              </span>
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 md:mb-4">
              Iniciar <span className="gradient-text">Sesión</span>
            </h2>
            <p className="text-gray-400 text-sm md:text-base">
              Accede a tu panel de control
            </p>
          </div>

          {/* Login Form */}
          <div className="glass-card rounded-2xl p-6 md:p-8">
            <form onSubmit={onSubmit} className="space-y-5 md:space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-purple-400" />
                  Correo Electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@empresa.com"
                  className={cn(
                    "bg-white/5 border-white/10 text-white placeholder:text-gray-500",
                    "focus:border-purple-500 focus:ring-purple-500/20",
                    errors.email && "border-red-500"
                  )}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-purple-400" />
                  Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={cn(
                      "pr-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500",
                      "focus:border-purple-500 focus:ring-purple-500/20",
                      errors.password && "border-red-500"
                    )}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Remember me & Forgot password */}
              <div className="flex items-center justify-between">
                <label htmlFor="remember" className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer group">
                  <input
                    id="remember"
                    type="checkbox"
                    {...register('remember')}
                    className="rounded border-white/10 bg-white/5 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <span className="group-hover:text-white transition-colors">
                    Recordar sesión
                  </span>
                </label>
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                className={cn(
                  "w-full gradient-primary text-white py-5 md:py-6 text-base rounded-xl shadow-dark-lg glow-purple hover:scale-105 transition-all duration-300",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-[#0a0a0a] text-gray-400">
                    ¿No tienes cuenta?
                  </span>
                </div>
              </div>

              {/* Create account link */}
              <Link href="/inicio">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full glass-card border-white/10 text-white hover:border-purple-500/50 hover:bg-white/5"
                >
                  Ver Planes y Crear Cuenta
                </Button>
              </Link>
            </form>
          </div>

          {/* Trust indicator */}
          <div className="mt-6 md:mt-8 text-center">
            <p className="text-xs md:text-sm text-gray-500 flex items-center justify-center gap-2">
              <Shield className="h-4 w-4 text-green-400" />
              Conexión segura con encriptación SSL
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// Organization Selector Component
function OrganizationSelector({
  organizations,
  onSelect,
  loading
}: {
  organizations: Organization[];
  onSelect: (org: Organization) => void;
  loading: boolean;
}) {
  return (
    <section className="py-20 lg:py-32 bg-[#0a0a0a] relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 radial-gradient-purple opacity-20" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 radial-gradient-blue opacity-20" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6 md:mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 gradient-primary rounded-2xl mb-4 md:mb-6">
              <Briefcase className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2">
              Selecciona tu <span className="gradient-text">Organización</span>
            </h2>
            <p className="text-gray-400 text-sm md:text-base">
              Tienes acceso a {organizations.length} {organizations.length === 1 ? 'organización' : 'organizaciones'}
            </p>
          </div>

          {/* Organizations Grid */}
          <div className="space-y-3 md:space-y-4">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => onSelect(org)}
                disabled={loading}
                className={cn(
                  "group w-full glass-card p-4 md:p-6 rounded-xl hover-glow transition-all duration-300",
                  "hover:scale-105 active:scale-95",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                )}
              >
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-xl gradient-primary flex items-center justify-center">
                    <Building2 className="w-6 h-6 md:w-8 md:h-8 text-white" />
                  </div>

                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-lg md:text-xl text-white group-hover:text-purple-300 transition-colors">
                      {org.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        org.subscription_plan === 'ENTERPRISE'
                          ? "bg-purple-500/20 text-purple-300"
                          : org.subscription_plan === 'PRO'
                            ? "bg-blue-500/20 text-blue-300"
                            : "bg-gray-500/20 text-gray-300"
                      )}>
                        {org.subscription_plan}
                      </span>
                      <span className="text-sm text-gray-500">
                        {org.slug}
                      </span>
                    </div>
                  </div>

                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-all group-hover:translate-x-1" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Forgot Password Section Component
function ForgotPasswordSection({
  onBack,
  onSubmit
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
    <section className="py-20 lg:py-32 bg-[#0a0a0a] relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 radial-gradient-purple opacity-20" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 radial-gradient-blue opacity-20" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-md mx-auto">
          <div className="glass-card rounded-2xl p-6 md:p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 gradient-primary rounded-2xl mb-4">
                <Lock className="w-7 h-7 md:w-8 md:h-8 text-white" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
                Recuperar Contraseña
              </h2>
              <p className="text-gray-400 text-sm md:text-base">
                Ingresa tu email para recibir un enlace de recuperación
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
              <div className="space-y-2">
                <Label htmlFor="recovery-email" className="text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-purple-400" />
                  Correo Electrónico
                </Label>
                <Input
                  id="recovery-email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500/20"
                  required
                />
              </div>

              <div className="space-y-3">
                <Button
                  type="submit"
                  className="w-full gradient-primary text-white py-5 md:py-6 text-base rounded-xl shadow-dark-lg glow-purple hover:scale-105 transition-all duration-300"
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
                  className="w-full glass-card border-white/10 text-white hover:border-purple-500/50 hover:bg-white/5"
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