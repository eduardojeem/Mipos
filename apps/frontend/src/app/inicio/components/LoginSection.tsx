'use client';

import Link from 'next/link';
import { ArrowRight, LockKeyhole, LogIn, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildPublicRegistrationPath } from '@/lib/public-plan-utils';

const accessNotes = [
  'El acceso principal vive en una pantalla dedicada de inicio de sesion.',
  'La cuenta administradora entra directo al panel y continua configuracion inicial.',
  'Si aun no tienes negocio registrado, primero elige plan y completa el alta publica.',
];

export function LoginSection() {
  return (
    <section id="login" className="border-b border-white/10 py-20 lg:py-24">
      <div className="landing-container">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <div className="landing-panel rounded-lg p-8 md:p-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-300">
                <LockKeyhole className="h-3.5 w-3.5 text-emerald-300" />
                Acceso existente
              </div>

              <h2 className="mt-6 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Ya tienes cuenta. Entra por el flujo de acceso dedicado
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
                El login publico ya no se duplica dentro de la landing. El acceso se gestiona en una pantalla preparada para autenticacion, retorno y continuidad operativa.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/auth/signin">
                  <Button className="gradient-primary rounded-lg text-white">
                    Ir a iniciar sesion
                    <LogIn className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href={buildPublicRegistrationPath('starter')}>
                  <Button
                    variant="outline"
                    className="rounded-lg border-white/10 bg-white/5 text-white hover:bg-white/10"
                  >
                    Crear cuenta nueva
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              <div className="landing-panel rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Flujo mas limpio</p>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      Menos ruido en la landing y mejor separacion entre captacion, registro y acceso.
                    </p>
                  </div>
                </div>
              </div>

              <div className="landing-panel rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Acceso preparado</p>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      El signin conserva validacion, retorno y manejo de organizacion sin depender de un bloque embebido.
                    </p>
                  </div>
                </div>
              </div>

              <div className="landing-panel rounded-lg p-6">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                  Antes de entrar
                </p>
                <ul className="mt-4 space-y-3">
                  {accessNotes.map((item) => (
                    <li key={item} className="text-sm leading-6 text-slate-300">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
