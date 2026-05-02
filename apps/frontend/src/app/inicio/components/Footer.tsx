'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, Mail, MapPin } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();
  const pathname = usePathname();
  const router = useRouter();

  const scrollToLandingSection = (sectionId: string) => {
    if (pathname === '/inicio' || pathname === '/') {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    router.push(`/inicio#${sectionId}`);
  };

  return (
    <footer className="landing-divider border-t bg-slate-950/80 py-14">
      <div className="landing-container">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="col-span-2 space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="landing-brand-mark flex h-11 w-11 items-center justify-center rounded-xl">
                <Building2 className="h-5 w-5 text-white" aria-hidden="true" />
              </div>
              <div>
                <p className="text-lg font-semibold text-white">MiPOS</p>
                <p className="text-xs text-slate-400">Ventas, inventario y operacion</p>
              </div>
            </div>
            <p className="max-w-xs text-sm leading-6 text-slate-400">
              Sistema empresarial de nueva generacion para gestionar tu negocio desde cualquier
              lugar.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
              Producto
            </h3>
            <ul className="space-y-3 text-sm text-slate-400">
              <li>
                <button
                  onClick={() => scrollToLandingSection('como-funciona')}
                  className="transition-colors hover:text-emerald-300 focus:outline-none focus:text-emerald-300"
                >
                  Caracteristicas
                </button>
              </li>
              <li>
                <Link href="/inicio/planes" className="transition-colors hover:text-emerald-300">
                  Precios
                </Link>
              </li>
              <li>
                <Link href="/inicio/registro" className="transition-colors hover:text-emerald-300">
                  Registro
                </Link>
              </li>
              <li>
                <Link href="/home/catalogo" className="transition-colors hover:text-emerald-300">
                  Catalogo publico
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
              Acceso
            </h3>
            <ul className="space-y-3 text-sm text-slate-400">
              <li>
                <Link href="/auth/signin" className="transition-colors hover:text-emerald-300">
                  Iniciar sesion
                </Link>
              </li>
              <li>
                <Link href="/inicio/registro" className="transition-colors hover:text-emerald-300">
                  Crear cuenta
                </Link>
              </li>
              <li>
                <Link href="/empresas" className="transition-colors hover:text-emerald-300">
                  Empresas publicadas
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
              Contacto
            </h3>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-amber-300" aria-hidden="true" />
                <a href="mailto:soporte@mipos.com.py" className="transition-colors hover:text-emerald-300">
                  soporte@mipos.com.py
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" aria-hidden="true" />
                <span>Asuncion, Paraguay</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="landing-divider mt-10 flex flex-col items-start justify-between gap-4 border-t pt-8 text-sm text-slate-500 md:flex-row md:items-center">
          <p>&copy; {currentYear} MiPOS. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            <Link href="/inicio" className="transition-colors hover:text-emerald-300">
              Terminos
            </Link>
            <Link href="/inicio" className="transition-colors hover:text-emerald-300">
              Privacidad
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
