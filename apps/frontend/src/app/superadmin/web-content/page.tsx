"use client";

import Link from 'next/link';
import { ArrowRight, Globe, LayoutTemplate, Store } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const sections = [
  {
    title: 'Página de inicio',
    description: 'Administra el contenido de /inicio: hero principal, pasos de activacion, beneficios y textos del sistema.',
    href: '/superadmin/web-content/landing',
    icon: LayoutTemplate,
    badge: 'SaaS Landing',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    items: ['Hero y CTA principal', 'Senales de valor', 'Como funciona (pasos)', 'Capacidades del sistema', 'Beneficios operativos'],
  },
  {
    title: 'Marketplace publico',
    description: 'Administra el contenido de /home: hero del marketplace, titulos de secciones de empresas, categorias y productos.',
    href: '/superadmin/web-content/marketplace',
    icon: Store,
    badge: 'Marketplace',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    items: ['Hero y descripcion', 'Seccion de empresas', 'Seccion de categorias', 'Seccion de catalogo'],
  },
];

export default function WebContentPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
              Contenido web publico
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Administra los textos y contenido de las paginas publicas del sistema SaaS.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.href} className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <section.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-50">
                      {section.title}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={`mt-1 h-5 text-[10px] font-semibold ${section.badgeColor}`}
                    >
                      {section.badge}
                    </Badge>
                  </div>
                </div>
              </div>
              <CardDescription className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                {section.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <ul className="space-y-1.5">
                {section.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href={section.href}>
                <Button className="w-full gap-2" variant="outline">
                  Editar contenido
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
        <CardContent className="p-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Los cambios guardados se aplican en la proxima solicitud al servidor. La pagina publica se actualiza automaticamente (cache de 5 min).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
