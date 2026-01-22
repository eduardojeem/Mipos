'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const forgotPasswordSchema = z.object({
  email: z.string().email('Ingresa un email válido'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, touchedFields },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onChange',
  });

  const watchedEmail = watch('email');
  const emailValid = touchedFields.email && !errors.email && watchedEmail;

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setEmailSent(true);
      toast({
        title: 'Email enviado',
        description: 'Revisa tu bandeja de entrada para restablecer tu contraseña.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'No se pudo enviar el email. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Email enviado
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Revisa tu bandeja de entrada
          </p>
        </div>

        <Card className="w-full border-0 shadow-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Hemos enviado un enlace de restablecimiento de contraseña a tu email.
              Si no lo encuentras, revisa tu carpeta de spam.
            </p>
            <div className="pt-4">
              <Link href="/auth/signin">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver al inicio de sesión
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
          <Mail className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          ¿Olvidaste tu contraseña?
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Ingresa tu email para recibir un enlace de restablecimiento
        </p>
      </div>

      <Card className="w-full border-0 shadow-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-xl text-center">Restablecer Contraseña</CardTitle>
          <CardDescription className="text-center">
            Te enviaremos un enlace para crear una nueva contraseña
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Correo Electrónico
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className={cn(
                    "h-4 w-4 transition-colors",
                    emailFocused ? "text-blue-500" : "text-gray-400",
                    errors.email && "text-red-500"
                  )} />
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  {...register('email')}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  className={cn(
                    "pl-10 pr-10 h-12 transition-all duration-200",
                    emailFocused && "ring-2 ring-blue-500/20 border-blue-500",
                    errors.email && "border-red-500 ring-2 ring-red-500/20",
                    emailValid && "border-green-500 ring-2 ring-green-500/20"
                  )}
                />
                {touchedFields.email && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    {errors.email ? (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    ) : emailValid ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : null}
                  </div>
                )}
              </div>
              {errors.email && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.email.message}
                </p>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4 pt-2">
            <Button 
              type="submit" 
              className="w-full h-12 text-base font-medium bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Enviando email...
                </>
              ) : (
                'Enviar enlace de restablecimiento'
              )}
            </Button>
            
            <div className="text-center">
              <Link
                href="/auth/signin"
                className="text-sm text-gray-600 hover:text-gray-500 dark:text-gray-400 hover:underline transition-colors inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Volver al inicio de sesión
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}