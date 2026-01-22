'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, Lock, User, CheckCircle2, ShoppingCart, AlertCircle, Shield, Zap, BarChart3, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { cn } from '@/lib/utils';
// framer-motion removido para evitar desajustes de hidratación

const signInSchema = z.object({
  email: z.string().email('Ingresa un email válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  remember: z.boolean().default(false),
});

type SignInFormData = z.infer<typeof signInSchema>;

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { config } = useBusinessConfig();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading, signIn, resetPassword } = useAuth();

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



  const onSubmit = async (data: SignInFormData) => {
    setIsLoading(true);
    try {
      await signIn(data.email, data.password);
      // manage remember flag and saved email
      if (data.remember) {
        localStorage.setItem('saved_login_email', data.email);
        localStorage.setItem('remember_login', 'true');
      } else {
        localStorage.removeItem('saved_login_email');
        localStorage.setItem('remember_login', 'false');
      }
      setLoginSuccess(true);
      toast({
        title: '¡Bienvenido!',
        description: 'Has iniciado sesión correctamente.',
      });
      // Delay para la animación de éxito
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (error: any) {
      toast({
        title: 'Error al iniciar sesión',
        description: error.message || 'Credenciales inválidas. Verifica tu email y contraseña.',
        variant: 'destructive',
      });
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

  return (
    <div suppressHydrationWarning className="relative min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-rose-50 via-violet-100 to-indigo-100 dark:from-slate-950 dark:via-violet-950 dark:to-blue-950 p-4 overflow-hidden">
      {/* Decoración de fondo mejorada */}
      <div suppressHydrationWarning className="absolute inset-0 -z-10 pointer-events-none">
        {/* Capa aurora con gradiente cónico lento */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[110vmax] h-[110vmax] rounded-full bg-[conic-gradient(from_180deg_at_50%_50%,#fecdd3_0%,#c4b5fd_25%,#93c5fd_50%,#a5b4fc_75%,#fecdd3_100%)] opacity-20 blur-[80px] motion-safe:animate-spin"
          style={{ animationDuration: '120s' }}
        />
        {/* Rayos cónicos sutiles para textura aurora */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vmax] h-[100vmax] rounded-full bg-[repeating-conic-gradient(from_0deg,rgba(255,255,255,0.06)_0deg,transparent_10deg)] opacity-20 blur-[64px] mix-blend-overlay" />
        {/* Destellos radiales suaves de color */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(244,114,182,0.18),transparent_60%),radial-gradient(ellipse_at_80%_30%,rgba(129,140,248,0.16),transparent_60%),radial-gradient(ellipse_at_50%_80%,rgba(99,102,241,0.14),transparent_60%)] blur-2xl" />
        {/* Textura radial adicional sutil para enriquecer los bordes */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_50%,rgba(255,255,255,0.05)_0%,transparent_45%),radial-gradient(circle_at_88%_50%,rgba(255,255,255,0.05)_0%,transparent_45%),repeating-radial-gradient(circle_at_center,rgba(255,255,255,0.025)_0px,rgba(255,255,255,0.025)_2px,transparent_3px)] opacity-30 mix-blend-soft-light pointer-events-none" />
        {/* Blobs existentes */}
        <div className="absolute -top-16 -left-16 w-72 h-72 rounded-full bg-gradient-to-tr from-pink-300 to-violet-300 opacity-40 blur-3xl motion-safe:animate-pulse" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-gradient-to-tr from-indigo-300 to-blue-300 opacity-40 blur-3xl motion-safe:animate-pulse" />
        <div className="absolute top-1/2 -translate-y-1/2 right-1/3 w-40 h-40 rounded-full bg-gradient-to-tr from-amber-200 to-pink-200 opacity-40 blur-2xl motion-safe:animate-pulse" />
        {/* Viñeta sutil para foco visual */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(8,8,16,0.12)_100%)]" />
      </div>
      <div className="w-full max-w-md">
        {/* Logo y título (sincronizado con configuración del sistema) */}
        <div className="text-center mb-8">
          {config.branding?.logo ? (
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 shadow-lg ring-4 ring-white/40 dark:ring-slate-800/40 overflow-hidden bg-white dark:bg-slate-900">
              <img
                src={config.branding.logo}
                alt="Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-pink-500 via-violet-600 to-indigo-600 rounded-full mb-4 shadow-lg ring-4 ring-white/40 dark:ring-slate-800/40">
              <ShoppingCart className="w-8 h-8 text-white animate-pulse" />
            </div>
          )}
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            {config.businessName || 'BeautyPOS'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {config.businessName ? `Accede a ${config.businessName}` : 'Accede a tu sistema'}
          </p>
          {config.contact?.website ? (
            <p className="text-xs text-muted-foreground mt-1">
              <a href={config.contact.website} target="_blank" rel="noreferrer" className="hover:underline">
                {config.contact.website}
              </a>
            </p>
          ) : null}
        </div>
        <>
          {!showForgotPassword ? (
            /* Formulario de Login */
            <div
              key="signin"
              className="relative"
            >
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-pink-500 via-violet-500 to-blue-500 opacity-30 blur-md pointer-events-none" />
              <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-pink-300/25 via-violet-300/25 to-indigo-300/25 opacity-30 blur-2xl pointer-events-none" />
              <Card className="relative shadow-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm ring-1 ring-pink-200/60 dark:ring-violet-700/40">
                <CardHeader className="space-y-1 pb-6">
                  <CardTitle className="text-2xl font-semibold text-center bg-gradient-to-r from-pink-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">Iniciar Sesión</CardTitle>
                  <CardDescription className="text-center">
                    Ingresa tus credenciales para acceder al sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Campo Email */}
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-violet-700 dark:text-violet-300">
                        Email
                      </Label>
                      <div className="relative group">
                        <div className="absolute inset-0 rounded-md bg-gradient-to-r from-pink-500/10 via-violet-500/10 to-indigo-500/10 opacity-0 transition-opacity duration-500 group-focus-within:opacity-100 group-hover:opacity-100 blur-lg pointer-events-none"></div>
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-violet-500 h-4 w-4" />
                        <Input
                          id="email"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          placeholder="tu@email.com"
                          className={cn(
                            "pl-10 h-12 transition-all duration-200 focus:ring-2",
                            errors.email
                              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                              : "focus:border-blue-500 focus:ring-blue-500"
                          )}
                          aria-invalid={!!errors.email}
                          aria-describedby={errors.email ? 'email-error' : undefined}
                          {...register('email')}
                        />
                      </div>
                      {errors.email && (
                        <p id="email-error" className="text-sm text-red-500 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {errors.email.message}
                        </p>
                      )}
                    </div>

                    {/* Campo Contraseña */}
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium text-violet-700 dark:text-violet-300">
                        Contraseña
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-violet-500 h-4 w-4" />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          placeholder="••••••••"
                          className={cn(
                            "pl-10 h-12 transition-all duration-200 focus:ring-2",
                            errors.password
                              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                              : "focus:border-blue-500 focus:ring-blue-500"
                          )}
                          aria-invalid={!!errors.password}
                          aria-describedby={errors.password ? 'password-error' : undefined}
                          {...register('password')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {errors.password && (
                        <p id="password-error" className="text-sm text-red-500 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {errors.password.message}
                        </p>
                      )}
                    </div>

                    {/* Recordar contraseña */}
                    <div className="flex items-center justify-between">
                      <label htmlFor="remember" className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <input
                          id="remember"
                          type="checkbox"
                          {...register('remember')}
                          className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                        />
                        Recordar contraseña
                      </label>
                    </div>



                    {/* Botón de Login */}
                    <Button
                      type="submit"
                      className={cn(
                        "w-full h-12 text-base font-medium transition-all duration-200",
                        loginSuccess
                          ? "bg-green-600 hover:bg-green-700"
                          : "bg-gradient-to-r from-pink-600 via-violet-600 to-indigo-600 hover:from-pink-700 hover:via-violet-700 hover:to-indigo-700",
                        "shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                      )}
                      disabled={isLoading || loginSuccess || !isValid}
                    >
                      {loginSuccess ? (
                        <>
                          <CheckCircle2 className="mr-2 h-5 w-5" />
                          ¡Acceso exitoso!
                        </>
                      ) : isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Iniciando sesión...
                        </>
                      ) : (
                        'Iniciar Sesión'
                      )}
                    </Button>

                    {/* Enlaces */}
                    <div className="space-y-3 text-center">
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-sm text-violet-600 hover:text-violet-500 hover:underline transition-colors"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>

                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        ¿No tienes cuenta?{' '}
                        <Link
                          href="/auth/signup"
                          className="font-medium bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent hover:from-violet-500 hover:to-indigo-500 hover:underline transition-colors"
                        >
                          Regístrate aquí
                        </Link>
                      </div>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          ) : (
            /* Formulario de Recuperación de Contraseña */
            <div
              key="forgot"
            >
              <ForgotPasswordForm
                onBack={() => setShowForgotPassword(false)}
                onSubmit={handleForgotPassword}
              />
            </div>
          )}
        </>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400">
          <p>© 2024 Sistema POS. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
}

// Componente para recuperación de contraseña
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
    <Card className="shadow-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm">
      <CardHeader className="space-y-1 pb-6">
        <CardTitle className="text-2xl font-semibold text-center bg-gradient-to-r from-pink-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">Recuperar Contraseña</CardTitle>
        <CardDescription className="text-center">
          Ingresa tu email para recibir un enlace de recuperación
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="recovery-email" className="text-sm font-medium text-violet-700 dark:text-violet-300">
              Email
            </Label>
            <div className="relative group">
              <div className="absolute inset-0 rounded-md bg-gradient-to-r from-pink-500/10 via-violet-500/10 to-indigo-500/10 opacity-0 transition-opacity duration-500 group-focus-within:opacity-100 group-hover:opacity-100 blur-lg"></div>
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-violet-500 h-4 w-4" />
              <Input
                id="recovery-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 focus:border-blue-500 focus:ring-blue-500 focus:ring-2"
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-base font-medium"
              disabled={isLoading || !email}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Enlace de Recuperación'
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="w-full h-12 text-base font-medium"
            >
              Volver al Login
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}