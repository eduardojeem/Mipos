import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { TERMS_LAST_UPDATED, TERMS_VERSION } from '@/lib/legal/terms';

interface LegalLayoutProps {
  title: string;
  /** Mostrar el aviso de "borrador pendiente de revisión legal". */
  draft?: boolean;
  children: React.ReactNode;
}

/**
 * Contenedor compartido para páginas legales (/terms, /privacy).
 * Tipografía legible, navegación de retorno, versión y fecha.
 */
export function LegalLayout({ title, draft = true, children }: LegalLayoutProps) {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
      <Link
        href="/home"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </Link>

      <header className="mt-6 border-b border-slate-200 pb-6 dark:border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-50">
          {title}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Última actualización: {TERMS_LAST_UPDATED} · Versión {TERMS_VERSION}
        </p>
      </header>

      {draft && (
        <div
          role="note"
          className="mt-6 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            <strong>Borrador.</strong> Este texto es una plantilla de referencia y
            <strong> no constituye asesoramiento legal</strong>. Debe ser revisado y
            aprobado por un abogado antes de considerarse vigente, especialmente
            frente a la legislación de defensa al consumidor de Paraguay.
          </p>
        </div>
      )}

      <article className="legal-prose mt-8 space-y-6 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
        {children}
      </article>
    </main>
  );
}

/** Sección con encabezado h2 consistente. */
export function LegalSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{heading}</h2>
      {children}
    </section>
  );
}
