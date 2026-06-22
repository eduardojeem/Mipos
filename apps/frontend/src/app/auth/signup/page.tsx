'use client';

import { useState } from 'react';
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
  User, 
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Building2,
  Sparkles,
  ArrowRight,
  Shield,
  Scissors,
  Store,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { isValidTenantPathSegment } from '@/lib/domain/tenant-public-paths';
import { DEFAULT_VERTICAL, VERTICAL_OPTIONS, type BusinessVertical } from '@/config/verticals';

const signUpSchema = z.object({
  fullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Ingresa un email válido'),
  organizationName: z.string().optional(),
  vertical: z.enum(['RETAIL', 'BARBERSHOP']).default(DEFAULT_VERTICAL),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type SignUpFormData = z.infer<typeof signUpSchema>;

function BusinessVerticalIcon({ vertical }: { vertical: BusinessVertical }) {
  if (vertical === 'BARBERSHOP') return <Scissors className="h-5 w-5" />;
  if (vertical === 'RETAIL') return <Store className="h-5 w-5" />;
  return <Briefcase className="h-5 w-5" />;
}

function getTenantAuthPrefix(returnUrl: string): string {
  const [path] = returnUrl.split(/[?#]/, 1);
  const firstSegment = (path || '').split('/').filter(Boolean)[0];
  return isValidTenantPathSegment(firstSegment) ? `/${firstSegment}` : '';
}

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const signupType = searchParams.get('type') === 'customer' ? 'customer' : 'business';
  const isCustomerSignup = signupType === 'customer';
  const requestedReturnUrl = searchParams.get('returnUrl');
  const returnUrl = requestedReturnUrl && requestedReturnUrl.startsWith('/') && !requestedReturnUrl.startsWith('//')
    ? requestedReturnUrl
    : '/dashboard';
  const signinHref = isCustomerSignup
    ? `${getTenantAuthPrefix(returnUrl)}/auth/signin?type=customer&returnUrl=${encodeURIComponent(returnUrl)}`
    : '/auth/signin?type=business-owner&returnUrl=/dashboard';
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    mode: 'onChange',
    defaultValues: {
      vertical: DEFAULT_VERTICAL,
    },
  });

  const password = watch('password', '');
  const selectedVertical = watch('vertical', DEFAULT_VERTICAL);

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { strength: 0, label: '', color: '' };
    
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;

    if (strength <= 2) return { strength: 1, label: 'Débil', color: 'bg-red-500' };
    if (strength <= 4) return { strength: 2, label: 'Media', color: 'bg-yellow-500' };
    return { strength: 3, label: 'Fuerte', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(password);

  const onSubmit = async (data: SignUpFormData) => {
    setIsLoading(true);
    try {
      const organizationName = (data.organizationName || '').trim();

      if (!isCustomerSignup && organizationName.length < 2) {
        toast({
          title: 'Falta el nombre de la organizacion',
          description: 'Para crear una cuenta de negocio necesitamos el nombre de la empresa.',
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch(isCustomerSignup ? '/api/auth/customer-register' : '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isCustomerSignup
          ? {
              email: data.email,
              password: data.password,
              name: data.fullName,
            }
          : {
              email: data.email,
              password: data.password,
              name: data.fullName,
              organizationName,
              vertical: data.vertical,
              planSlug: 'free',
            }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al crear la cuenta');
      }

      setSignupSuccess(true);

      toast({
        title: 'Cuenta creada exitosamente',
        description: result.linkedExistingUser
          ? 'Creamos tu empresa y la vinculamos a tu cuenta existente.'
          : isCustomerSignup
          ? 'Ya puedes iniciar sesion como cliente.'
          : 'Revisa tu email para confirmar tu cuenta.',
      });

      setTimeout(() => {
        router.push(result.linkedExistingUser ? '/dashboard' : signinHref);
      }, 2000);
    } catch (error: any) {
      toast({
        title: 'Error al crear cuenta',
        description: error.message || 'Ocurrio un error inesperado',
        variant: 'destructive',
      });
      setSignupSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div suppressHydrationWarning className="relative min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 p-4 overflow-hidden">
      {/* Premium Background Decoration */}
      <div suppressHydrationWarning className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(59,130,246,0.12),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(99,102,241,0.10),transparent_50%)]" />
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-blue-400/20 to-indigo-400/20 blur-3xl motion-safe:animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-400/20 to-violet-400/20 blur-3xl motion-safe:animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.04)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_80%)]" />
      </div>

      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 rounded-3xl mb-4 shadow-2xl ring-4 ring-blue-100/50 dark:ring-indigo-900/30 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            {isCustomerSignup ? <User className="w-10 h-10 text-white relative z-10" /> : <Building2 className="w-10 h-10 text-white relative z-10" />}
            <Sparkles className="w-4 h-4 text-yellow-300 absolute top-2 right-2 animate-pulse" />
          </div>
          
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent mb-2">
            {isCustomerSignup ? 'Cuenta de cliente' : 'Unete a MiPOS'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium text-lg">
            {isCustomerSignup ? 'Guarda tus datos y consulta tus pedidos facilmente' : 'Crea tu cuenta y comienza a gestionar tu negocio'}
          </p>
        </div>

        {/* Form Card */}
        <div className="relative">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 opacity-20 blur-xl pointer-events-none" />
          <Card className="relative shadow-2xl border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                {isCustomerSignup ? 'Crear cuenta de cliente' : 'Crear Cuenta'}
              </CardTitle>
              <CardDescription className="text-center text-slate-600 dark:text-slate-400">
                {isCustomerSignup ? 'Completa tus datos para comprar y seguir pedidos' : 'Completa los datos para comenzar'}
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Nombre Completo
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Juan Pérez"
                    className={cn(
                      "h-12 transition-all duration-300 border-2 bg-white dark:bg-slate-950",
                      "focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10",
                      errors.fullName && "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                    )}
                    {...register('fullName')}
                  />
                  {errors.fullName && (
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1 animate-in slide-in-from-left-2">
                      <AlertCircle className="h-4 w-4" />
                      {errors.fullName.message}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Correo Electrónico
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    placeholder="tu@empresa.com"
                    className={cn(
                      "h-12 transition-all duration-300 border-2 bg-white dark:bg-slate-950",
                      "focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10",
                      errors.email && "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                    )}
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1 animate-in slide-in-from-left-2">
                      <AlertCircle className="h-4 w-4" />
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {!isCustomerSignup ? (
                <div className="space-y-2">
                  <Label htmlFor="organizationName" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Nombre de la Organización
                  </Label>
                  <Input
                    id="organizationName"
                    type="text"
                    placeholder="Mi Empresa S.A."
                    className={cn(
                      "h-12 transition-all duration-300 border-2 bg-white dark:bg-slate-950",
                      "focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10",
                      errors.organizationName && "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                    )}
                    {...register('organizationName')}
                  />
                  {errors.organizationName && (
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1 animate-in slide-in-from-left-2">
                      <AlertCircle className="h-4 w-4" />
                      {errors.organizationName.message}
                    </p>
                  )}
                  <fieldset className="space-y-3 pt-2">
                    <legend className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      <Briefcase className="h-4 w-4" />
                      Tipo de negocio
                    </legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {VERTICAL_OPTIONS.map((option) => {
                        const isActive = selectedVertical === option.value;
                        return (
                          <label
                            key={option.value}
                            htmlFor={`vertical-${option.value}`}
                            className={cn(
                              'flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 text-left transition-all',
                              isActive
                                ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-500/10 dark:bg-blue-950/20'
                                : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-slate-600',
                            )}
                          >
                            <input
                              id={`vertical-${option.value}`}
                              type="radio"
                              value={option.value}
                              className="sr-only"
                              {...register('vertical')}
                            />
                            <span
                              className={cn(
                                'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                                isActive
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300',
                              )}
                            >
                              <BusinessVerticalIcon vertical={option.value} />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {option.label}
                              </span>
                              <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                                {option.description}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                </div>
                ) : null}

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Contraseña
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className={cn(
                        "h-12 pr-12 transition-all duration-300 border-2 bg-white dark:bg-slate-950",
                        "focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10",
                        errors.password && "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                      )}
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {password && (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        <div className={cn("h-1 flex-1 rounded-full transition-all", passwordStrength.strength >= 1 ? passwordStrength.color : "bg-slate-200 dark:bg-slate-700")} />
                        <div className={cn("h-1 flex-1 rounded-full transition-all", passwordStrength.strength >= 2 ? passwordStrength.color : "bg-slate-200 dark:bg-slate-700")} />
                        <div className={cn("h-1 flex-1 rounded-full transition-all", passwordStrength.strength >= 3 ? passwordStrength.color : "bg-slate-200 dark:bg-slate-700")} />
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Seguridad: <span className="font-medium">{passwordStrength.label}</span>
                      </p>
                    </div>
                  )}
                  
                  {errors.password && (
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1 animate-in slide-in-from-left-2">
                      <AlertCircle className="h-4 w-4" />
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Confirmar Contraseña
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className={cn(
                        "h-12 pr-12 transition-all duration-300 border-2 bg-white dark:bg-slate-950",
                        "focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10",
                        errors.confirmPassword && "border-red-500 focus:border-red-500 focus:ring-red-500/10"
                      )}
                      {...register('confirmPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1 animate-in slide-in-from-left-2">
                      <AlertCircle className="h-4 w-4" />
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className={cn(
                    "w-full h-12 text-base font-semibold transition-all duration-300 group",
                    signupSuccess
                      ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                      : "bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700",
                    "shadow-lg hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98]",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  )}
                  disabled={isLoading || signupSuccess || !isValid}
                >
                  {signupSuccess ? (
                    <>
                      <CheckCircle2 className="mr-2 h-5 w-5 animate-in zoom-in" />
                      Cuenta creada
                    </>
                  ) : isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creando cuenta...
                    </>
                  ) : (
                    <>
                      {isCustomerSignup ? 'Crear cuenta de cliente' : 'Crear Cuenta'}
                      <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>

                {/* Sign In Link */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    ¿Ya tienes cuenta?{' '}
                    <Link
                      href={signinHref}
                      className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition-colors inline-flex items-center gap-1 group"
                    >
                      Iniciar sesión
                      <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </p>
                </div>

                {/* Terms */}
                <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                  Al crear una cuenta, aceptas nuestros{' '}
                  <Link href="/terms" className="text-blue-600 hover:underline dark:text-blue-400">
                    Términos de Servicio
                  </Link>{' '}
                  y{' '}
                  <Link href="/privacy" className="text-blue-600 hover:underline dark:text-blue-400">
                    Política de Privacidad
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span>Conexión segura y encriptada</span>
          </div>
        </div>
      </div>
    </div>
  );
}
