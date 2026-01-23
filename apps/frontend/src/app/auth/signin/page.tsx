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
    <div suppressHydrationWarning className="relative min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 p-4 overflow-hidden">
      {/* Decoración de fondo moderna y profesional */}
      <div suppressHydrationWarning className="absolute inset-0 -z-10 pointer-events-none">
        {/* Gradiente base suave */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.08),transparent_50%),radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.06),transparent_50%)]" />
        
        {/* Blobs animados con colores profesionales */}
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-blue-400/20 to-indigo-400/20 blur-3xl motion-safe:animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-400/20 to-violet-400/20 blur-3xl motion-safe:animate-pulse" style={{ animationDuration: '10s' }} />
        
        {/* Grid sutil para textura */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_80%)]" />
        
        {/* Viñeta para foco */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(15,23,42,0.05)_100%)]" />
      </div>
      <div className="w-full max-w-md">
        {/* Logo y título (sincronizado con configuración del sistema) */}
        <div className="text-center mb-8">
          {config.branding?.logo ? (
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-xl ring-2 ring-blue-100 dark:ring-indigo-900/50 overflow-hidden bg-white dark:bg-slate-900">
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
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-4 shadow-xl ring-2 ring-blue-100 dark:ring-indigo-900/50">
              <ShoppingCart className="w-8 h-8 text-white" />
            </div>
          )}
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            {config.businessName || 'BeautyPOS'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium">
            {config.businessName ? `Accede a ${config.businessName}` : 'Accede a tu sistema de forma segura'}
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
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 opacity-10 blur-lg pointer-events-none" />
              <Card className="relative shadow-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 backdrop-blur-sm">
                <CardHeader className="space-y-1 pb-6">
                  <CardTitle className="text-2xl font-semibold text-center text-slate-900 dark:text-slate-100">Iniciar Sesión</CardTitle>
                  <CardDescription className="text-center text-slate-600 dark:text-slate-400">
                    Ingresa tus credenciales para acceder
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Campo Email */}
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Email
                      </Label>
                      <div className="relative group">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 h-5 w-5 transition-colors" />
                        <Input
                          id="email"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          placeholder="tu@email.com"
                          className={cn(
                            "pl-10 h-12 transition-all duration-200 border-slate-300 dark:border-slate-700",
                            "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
                            "hover:border-slate-400 dark:hover:border-slate-600",
                            errors.email && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                          )}
                          aria-invalid={!!errors.email}
                          aria-describedby={errors.email ? 'email-error' : undefined}
                          {...register('email')}
                        />
                      </div>
                      {errors.email && (
                        <p id="email-error" className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {errors.email.message}
                        </p>
                      )}
                    </div>

                    {/* Campo Contraseña */}
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Contraseña
                      </Label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 h-5 w-5 transition-colors" />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          placeholder="••••••••"
                          className={cn(
                            "pl-10 pr-10 h-12 transition-all duration-200 border-slate-300 dark:border-slate-700",
                            "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
                            "hover:border-slate-400 dark:hover:border-slate-600",
                            errors.password && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                          )}
                          aria-invalid={!!errors.password}
                          aria-describedby={errors.password ? 'password-error' : undefined}
                          {...register('password')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
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
                        <p id="password-error" className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {errors.password.message}
                        </p>
                      )}
                    </div>

                    {/* Recordar contraseña */}
                    <div className="flex items-center justify-between">
                      <label htmlFor="remember" className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          id="remember"
                          type="checkbox"
                          {...register('remember')}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-2 focus:ring-offset-0 cursor-pointer"
                        />
                        Recordar contraseña
                      </label>
                    </div>



                    {/* Botón de Login */}
                    <Button
                      type="submit"
                      className={cn(
                        "w-full h-12 text-base font-semibold transition-all duration-200",
                        loginSuccess
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white",
                        "shadow-lg hover:shadow-xl transform hover:scale-[1.01] active:scale-[0.99]",
                        "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
                        className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition-colors font-medium"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>

                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        ¿No tienes cuenta?{' '}
                        <Link
                          href="/auth/signup"
                          className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition-colors"
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
        <div className="text-center mt-8 text-sm text-slate-500 dark:text-slate-400">
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
    <Card className="shadow-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 backdrop-blur-sm">
      <CardHeader className="space-y-1 pb-6">
        <CardTitle className="text-2xl font-semibold text-center text-slate-900 dark:text-slate-100">Recuperar Contraseña</CardTitle>
        <CardDescription className="text-center text-slate-600 dark:text-slate-400">
          Ingresa tu email para recibir un enlace de recuperación
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="recovery-email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Email
            </Label>
            <div className="relative group">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 h-5 w-5 transition-colors" />
              <Input
                id="recovery-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 hover:border-slate-400 dark:hover:border-slate-600 transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-base font-semibold shadow-lg hover:shadow-xl transition-all"
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
              className="w-full h-12 text-base font-medium border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Volver al Login
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}