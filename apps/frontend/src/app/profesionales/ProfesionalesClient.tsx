'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarPlus, Clock3, Scissors, Sparkles, UserRound } from 'lucide-react';
import NavBar from '@/components/public-tenant/NavBar';
import { Footer } from '@/app/home/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { useTenantPublicRouting } from '@/hooks/useTenantPublicRouting';

export type PublicProfessional = {
  id: string;
  name: string;
  specialty: string;
  color?: string | null;
  workingHours: string[];
  walkin_only?: boolean;
};

interface ProfesionalesClientProps {
  professionals: PublicProfessional[];
}

export default function ProfesionalesClient({ professionals }: ProfesionalesClientProps) {
  const { config } = useBusinessConfig();
  const { tenantHref } = useTenantPublicRouting();
  const router = useRouter();
  const primary = config.branding?.primaryColor || '#0f766e';

  const goHomeSection = (sectionId: string) => {
    router.push(tenantHref(`/home#${sectionId}`));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <NavBar
        config={config}
        activeSection="profesionales"
        onNavigate={goHomeSection}
        vertical="BARBERSHOP"
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* HERO BANNER SECTION */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/70 p-6 shadow-xl backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/40 sm:p-8 lg:p-10">
          {/* Decorative background glow lights */}
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-500/5" />
          <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl dark:bg-sky-500/5" />

          <div className="relative grid gap-8 lg:grid-cols-[1fr_0.8fr]">
            <div className="flex flex-col justify-center">
              <div>
                <Badge className="border-0 text-white px-3 py-1 text-xs font-semibold rounded-full shadow-sm" style={{ backgroundColor: primary }}>
                  <Scissors className="mr-1.5 h-3.5 w-3.5" />
                  Equipo Profesional
                </Badge>
              </div>
              <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-950 dark:text-slate-50 sm:text-5xl">
                Elegí quién te atiende en <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-sky-600 dark:from-emerald-400 dark:to-sky-400">{config.businessName || 'la barbería'}</span>
              </h1>
              <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-400 max-w-xl">
                Conocé a nuestros profesionales altamente calificados, sus especialidades y sus horarios para reservar tu turno online con total comodidad.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="rounded-full text-white font-bold shadow-lg shadow-emerald-500/10 hover:opacity-90 transition" style={{ backgroundColor: primary }}>
                  <Link href={tenantHref('/reservar')}>
                    <CalendarPlus className="mr-2 h-4 w-4" />
                    Reservar Turno Online
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/60 font-semibold">
                  <Link href={tenantHref('/home#servicios')}>
                    Ver Servicios
                  </Link>
                </Button>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/50 p-6 backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950/50 shadow-inner">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                <Sparkles className="h-4 w-4" style={{ color: primary }} />
                Cómo Agendar tu Turno
              </h2>
              <div className="mt-4 space-y-4">
                {[
                  { step: "1", title: "Elegí a tu profesional", desc: "Seleccioná al estilista o barbero de tu preferencia o elegí la asignación automática." },
                  { step: "2", title: "Elegí el servicio", desc: "Elegí entre cortes, perfilado de barba, tratamientos o combos especiales." },
                  { step: "3", title: "Confirmá fecha y hora", desc: "Encontrá el horario disponible que mejor se adapte a tu agenda y confirmá." }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.title}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* STAFF LIST SECTION */}
        <section className="mt-10">
          {professionals.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {professionals.map((professional) => (
                <Card key={professional.id} className="group relative overflow-hidden rounded-2xl border-slate-200/80 bg-white/70 shadow-md backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-emerald-500/20 dark:border-slate-800/80 dark:bg-slate-900/40">
                  {/* Styling colored banner at top of card */}
                  <div className="h-20 w-full transition-all duration-300 group-hover:h-24 opacity-80" style={{ backgroundColor: professional.color || primary }} />
                  
                  <CardContent className="px-6 pb-6 pt-0">
                    <div className="flex flex-col items-center text-center">
                      <div
                        className="relative -mt-12 mb-3 h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-white shadow-xl transition-transform duration-300 group-hover:scale-105 dark:border-slate-900"
                        style={{ backgroundColor: `${professional.color || primary}15` }}
                      >
                        {/* Usamos un placeholder premium ilustrado con DiceBear basado en el ID del profesional */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://api.dicebear.com/7.x/micah/svg?seed=${professional.id}&backgroundColor=transparent`}
                          alt={professional.name}
                          className="h-full w-full object-cover drop-shadow-sm"
                        />
                      </div>
                      <div className="min-w-0 w-full">
                        <h2 className="truncate text-xl font-extrabold text-slate-900 dark:text-slate-50 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {professional.name}
                        </h2>
                        <Badge variant="secondary" className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 dark:bg-slate-800/80">
                          {professional.specialty}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-6 space-y-3">
                      {professional.walkin_only ? (
                        <>
                          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            <UserRound className="h-4 w-4" style={{ color: professional.color || primary }} />
                            Modalidad de Trabajo
                          </p>
                          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20 text-center">
                            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Atención por Orden de Llegada</p>
                            <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">Acercate directamente al local para ser atendido.</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            <Clock3 className="h-4 w-4" style={{ color: professional.color || primary }} />
                            Horario de Atención
                          </p>
                          
                          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800/40 dark:bg-slate-950/20">
                            {professional.workingHours.length > 0 ? (
                              <div className="space-y-1.5">
                                {professional.workingHours.slice(0, 7).map((hour, idx) => {
                                  const parts = hour.split(': ');
                                  const day = parts[0];
                                  const time = parts[1] || '';
                                  return (
                                    <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-100/50 last:border-b-0 dark:border-slate-800/30">
                                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{day}</span>
                                      <span className="text-[10px] bg-white border border-slate-150 px-2 py-0.5 rounded-md text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 font-bold font-mono">
                                        {time}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-2">
                                Horarios a confirmar.
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {professional.walkin_only ? (
                      <Button className="mt-6 w-full rounded-xl text-white font-bold opacity-80 cursor-default" style={{ backgroundColor: professional.color || primary }}>
                        <Clock3 className="mr-2 h-4 w-4" />
                        Sin Reserva Previa
                      </Button>
                    ) : (
                      <Button asChild className="mt-6 w-full rounded-xl text-white font-bold hover:opacity-95 transition" style={{ backgroundColor: professional.color || primary }}>
                        <Link href={tenantHref('/reservar')}>
                          <CalendarPlus className="mr-2 h-4 w-4" />
                          Reservar Turno
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 p-12 text-center dark:border-slate-700 dark:bg-slate-900/20 backdrop-blur-sm">
              <UserRound className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" />
              <h2 className="mt-4 text-lg font-bold text-slate-950 dark:text-slate-50">Todavía no hay profesionales públicos</h2>
              <p className="mx-auto mt-2 max-w-sm text-xs text-muted-foreground">
                Cuando cargues profesionales activos desde el panel de administración, aparecerán aquí para que los clientes puedan conocerlos y agendar turnos.
              </p>
            </div>
          )}
        </section>
      </main>

      <Footer config={config} onNavigate={goHomeSection} />
    </div>
  );
}
