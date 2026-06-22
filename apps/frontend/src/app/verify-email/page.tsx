'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

type VerificationStep = 'loading' | 'code-input' | 'verifying' | 'success' | 'error';

interface VerificationError {
  message: string;
  code?: string;
}

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  const email = searchParams.get('email');

  const [step, setStep] = useState<VerificationStep>('loading');
  const [code, setCode] = useState('');
  const [error, setError] = useState<VerificationError | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Auto-verify if token is in URL (from email link)
  useEffect(() => {
    const token = searchParams.get('token');
    if (token && userId) {
      verifyWithToken(token);
    } else if (userId && email) {
      setStep('code-input');
    } else {
      setStep('error');
      setError({ message: 'Parámetros inválidos. Verifica el enlace de tu email.' });
    }
  }, []);

  // Resend countdown timer
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const verifyWithToken = async (token: string) => {
    setStep('verifying');
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStep('error');
        setError({
          message: data.error || 'No pudimos verificar tu email',
          code: data.code,
        });
        return;
      }

      setStep('success');
      toast.success('Email verificado correctamente! 🎉');

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/onboarding');
      }, 2000);
    } catch (err) {
      setStep('error');
      setError({ message: 'Error de conexión. Por favor intenta de nuevo.' });
      console.error('Verification error:', err);
    }
  };

  const verifyWithCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code || code.length !== 6) {
      setError({ message: 'Por favor ingresa un código de 6 dígitos' });
      return;
    }

    setStep('verifying');
    setError(null);

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStep('code-input');
        setError({
          message: data.error || 'Código inválido o expirado',
          code: data.code,
        });
        return;
      }

      setStep('success');
      toast.success('Email verificado correctamente! 🎉');

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/onboarding');
      }, 2000);
    } catch (err) {
      setStep('code-input');
      setError({ message: 'Error de conexión. Por favor intenta de nuevo.' });
      console.error('Verification error:', err);
    }
  };

  const resendCode = async () => {
    if (resendCountdown > 0 || !userId || !email) return;

    try {
      const response = await fetch(`/api/auth/verify-email?userId=${userId}&email=${email}`);
      const data = await response.json();

      if (response.ok) {
        toast.success('Código enviado a tu email');
        setResendCountdown(60); // 60 seconds until can resend
      } else {
        toast.error(data.error || 'No pudimos enviar el código');
      }
    } catch (err) {
      toast.error('Error al enviar el código');
      console.error('Resend error:', err);
    }
  };

  // Loading state
  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-950 dark:to-slate-900">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Verificando tu email...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-slate-950 dark:to-slate-900">
        <Card className="w-full max-w-md border-emerald-200 dark:border-emerald-900">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 mb-2">
              ¡Email Verificado!
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Tu email ha sido verificado correctamente. Redirigiendo a tu panel...
            </p>
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 dark:from-slate-950 dark:to-slate-900">
        <Card className="w-full max-w-md border-red-200 dark:border-red-900">
          <CardHeader className="text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950 mx-auto">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-red-900 dark:text-red-100">Verificación fallida</CardTitle>
            <CardDescription>{error?.message}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button
              onClick={() => {
                router.push('/');
              }}
              variant="outline"
              className="w-full"
            >
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Code input state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 mx-auto">
            <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle>Verifica tu email</CardTitle>
          <CardDescription>
            Enviamos un código de verificación a<br />
            <span className="font-semibold text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-800 dark:text-red-200">
                {error.message}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={verifyWithCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Código de verificación</label>
              <Input
                type="text"
                placeholder="000000"
                value={code}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(val);
                  if (error) setError(null);
                }}
                maxLength={6}
                className="text-center text-lg tracking-widest font-mono"
                disabled={step === 'verifying'}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Ingresa el código de 6 dígitos que recibiste en tu email
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={step === 'verifying' || code.length !== 6}
            >
              {step === 'verifying' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Verificar código'
              )}
            </Button>
          </form>

          <div className="border-t pt-4 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              ¿No recibiste el código?
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={resendCode}
              disabled={resendCountdown > 0}
              className="text-primary"
            >
              {resendCountdown > 0 ? `Espera ${resendCountdown}s` : 'Reenviar código'}
            </Button>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-xs text-muted-foreground">
              💡 El código es válido por 24 horas. Si caduca, puedes solicitar uno nuevo desde este enlace.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
