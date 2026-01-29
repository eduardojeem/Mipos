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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

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
  
  const { config } = useBusinessConfig();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, loading, signIn, resetPassword } = useAuth();
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

  // Fetch user organizations after successful login
  const fetchUserOrganizations = async (userId: string) => {
    setLoadingOrgs(true);
    try {
      // First, get organization IDs from organization_members
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userId);

      if (memberError) throw memberError;

      if (!memberData || memberData.length === 0) {
        // No organizations found
        toast({
          title: 'Sin organizaciones',
          description: 'No perteneces a ninguna organización. Contacta al administrador.',
          variant: 'destructive',
        });
        setLoadingOrgs(false);
        return;
      }

      const orgIds = memberData.map(m => m.organization_id);

      // Fetch organization details
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, slug, subscription_plan, subscription_status')
        .in('id', orgIds)
        .eq('subscription_status', 'ACTIVE');

      if (orgsError) throw orgsError;

      if (orgsData && orgsData.length > 0) {
        setUserOrganizations(orgsData);
        
        // If only one organization, auto-select it
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
      // Store selected organization in localStorage
      localStorage.setItem('selected_organization', JSON.stringify(org));
      
      toast({
        title: '¡Bienvenido!',
        description: `Accediendo a ${org.name}...`,
      });

      // Redirect to dashboard
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
      
      // Manage remember flag and saved email
      if (data.remember) {
        localStorage.setItem('saved_login_email', data.email);
        localStorage.setItem('remember_login', 'true');
      } else {
        localStorage.removeItem('saved_login_email');
        localStorage.setItem('remember_login', 'false');
      }
      
      setLoginSuccess(true);

      // Get current user session to fetch organizations
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        await fetchUserOrganizations(sessionData.session.user.id);
      } else {
        // Fallback: redirect to dashboard if no session (mock mode)
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
    return <OrganizationSelector organizations={userOrganizations} onSelect={selectOrganization} loading={loadingOrgs} />;
  }

  return (
    <div suppressHydrationWarning className="relative min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 p-4 overflow-hidden">
      {/* Premium Background Decoration */}
      <div suppressHydrationWarning className="absolute inset-0 -z-10 pointer-events-none">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(59,130,246,0.12),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(99,102,241,0.10),transparent_50%)]" />
        
        {/* Animated blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-blue-400/20 to-indigo-400/20 blur-3xl motion-safe:animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-400/20 to-violet-400/20 blur-3xl motion-safe:animate-pulse" style={{ animationDuration: '10s' }} />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.04)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_80%)]" />
        
        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(15,23,42,0.05)_100%)]" />
      </div>

      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 rounded-3xl mb-4 shadow-2xl ring-4 ring-blue-100/50 dark:ring-indigo-900/30 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <Building2 className="w-10 h-10 text-white relative z-10" />
            <Sparkles className="w-4 h-4 text-yellow-300 absolute top-2 right-2 animate-pulse" />
          </div>
          
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent mb-2">
            {config.businessName || 'MiPOS'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium text-lg">
            Sistema de Gestión SaaS
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-slate-500 dark:text-slate-400">Acceso seguro y encriptado</span>
          </div>
        </div>

        {!showForgotPassword ? (
          /* Login Form */
          <div key="signin" className="relative">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 opacity-20 blur-xl pointer-events-none" />
            <Card className="relative shadow-2xl border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
              <CardHeader className="space-y-1 pb-6">
                <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                  Iniciar Sesión
                </CardTitle>
                <CardDescription className="text-center text-slate-600 dark:text-slate-400">
                  Accede a tu panel de control
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Correo Electrónico
                    </Label>
                    <div className="relative group">
                      <Input
                        id="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="tu@empresa.com"
                        className={cn(
                          "h-12 transition-all duration-300 border-2",
                          "bg-white dark:bg-slate-950",
                          "focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10",
                          "hover:border-slate-400 dark:hover:border-slate-600",
                          errors.email && "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                        )}
                        aria-invalid={!!errors.email}
                        aria-describedby={errors.email ? 'email-error' : undefined}
                        {...register('email')}
                      />
                    </div>
                    {errors.email && (
                      <p id="email-error" className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1 animate-in slide-in-from-left-2">
                        <AlertCircle className="h-4 w-4" />
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Contraseña
                    </Label>
                    <div className="relative group">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className={cn(
                          "h-12 pr-12 transition-all duration-300 border-2",
                          "bg-white dark:bg-slate-950",
                          "focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10",
                          "hover:border-slate-400 dark:hover:border-slate-600",
                          errors.password && "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                        )}
                        aria-invalid={!!errors.password}
                        aria-describedby={errors.password ? 'password-error' : undefined}
                        {...register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p id="password-error" className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1 animate-in slide-in-from-left-2">
                        <AlertCircle className="h-4 w-4" />
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  {/* Remember me */}
                  <div className="flex items-center justify-between">
                    <label htmlFor="remember" className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer group">
                      <input
                        id="remember"
                        type="checkbox"
                        {...register('remember')}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-2 focus:ring-offset-0 cursor-pointer transition-all"
                      />
                      <span className="group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                        Recordar sesión
                      </span>
                    </label>
                  </div>

                  {/* Login Button */}
                  <Button
                    type="submit"
                    className={cn(
                      "w-full h-12 text-base font-semibold transition-all duration-300 group",
                      loginSuccess
                        ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                        : "bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700",
                      "shadow-lg hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98]",
                      "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    )}
                    disabled={isLoading || loginSuccess || loadingOrgs || !isValid}
                  >
                    {loginSuccess ? (
                      <>
                        <CheckCircle2 className="mr-2 h-5 w-5 animate-in zoom-in" />
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
                        <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>

                  {/* Links */}
                  <div className="space-y-3 text-center">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition-colors font-medium inline-flex items-center gap-1 group"
                    >
                      <Lock className="w-3 h-3 transition-transform group-hover:-rotate-12" />
                      ¿Olvidaste tu contraseña?
                    </button>

                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        ¿Primera vez aquí?{' '}
                        <Link
                          href="/auth/signup"
                          className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition-colors inline-flex items-center gap-1 group"
                        >
                          Crear cuenta
                          <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                        </Link>
                      </p>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Forgot Password Form */
          <div key="forgot">
            <ForgotPasswordForm
              onBack={() => setShowForgotPassword(false)}
              onSubmit={handleForgotPassword}
            />
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            © 2024 MiPOS SaaS. Todos los derechos reservados.
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
            <Link href="/terms" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              Términos
            </Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              Privacidad
            </Link>
            <span>•</span>
            <Link href="/support" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              Soporte
            </Link>
          </div>
        </div>
      </div>
    </div>
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
    <div suppressHydrationWarning className="relative min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 p-4 overflow-hidden">
      {/* Background (same as login) */}
      <div suppressHydrationWarning className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(59,130,246,0.12),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(99,102,241,0.10),transparent_50%)]" />
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-blue-400/20 to-indigo-400/20 blur-3xl motion-safe:animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-400/20 to-violet-400/20 blur-3xl motion-safe:animate-pulse" style={{ animationDuration: '10s' }} />
      </div>

      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <Briefcase className="w-16 h-16 mx-auto mb-4 text-blue-600 dark:text-blue-400" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent mb-2">
            Selecciona tu Organización
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Tienes acceso a {organizations.length} {organizations.length === 1 ? 'organización' : 'organizaciones'}
          </p>
        </div>

        <div className="relative">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 opacity-20 blur-xl pointer-events-none" />
          <Card className="relative shadow-2xl border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="grid gap-3">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => onSelect(org)}
                    disabled={loading}
                    className={cn(
                      "group relative p-6 rounded-2xl border-2 transition-all duration-300",
                      "bg-white dark:bg-slate-950",
                      "border-slate-200 dark:border-slate-800",
                      "hover:border-blue-500 dark:hover:border-blue-500",
                      "hover:shadow-xl hover:scale-[1.02]",
                      "active:scale-[0.98]",
                      "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      
                      <div className="flex-1 text-left">
                        <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {org.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                            org.subscription_plan === 'ENTERPRISE' 
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                              : org.subscription_plan === 'PRO'
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          )}>
                            {org.subscription_plan}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {org.slug}
                          </span>
                        </div>
                      </div>

                      <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all group-hover:translate-x-1" />
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Forgot Password Form Component
function ForgotPasswordForm({
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
    <div className="relative">
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 opacity-20 blur-xl pointer-events-none" />
      <Card className="relative shadow-2xl border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            Recuperar Contraseña
          </CardTitle>
          <CardDescription className="text-center text-slate-600 dark:text-slate-400">
            Ingresa tu email para recibir un enlace de recuperación
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="recovery-email" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Correo Electrónico
              </Label>
              <Input
                id="recovery-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="tu@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 border-2 bg-white dark:bg-slate-950 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                required
              />
            </div>

            <div className="space-y-3">
              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700 text-white text-base font-semibold shadow-lg hover:shadow-xl transition-all"
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
                className="w-full h-12 text-base font-medium border-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Volver al Login
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}