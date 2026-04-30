'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, Mail, Phone, MapPin } from 'lucide-react';

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
                <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
                    {/* Brand */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="landing-brand-mark flex h-11 w-11 items-center justify-center rounded-xl">
                                <Building2 className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-lg font-semibold text-white">MiPOS</p>
                                <p className="text-xs text-slate-400">Ventas, inventario y operacion</p>
                            </div>
                        </div>
                        <p className="max-w-xs text-sm leading-6 text-slate-400">
                            Sistema empresarial de nueva generacion para gestionar tu negocio.
                        </p>
                    </div>

                    {/* Product */}
                    <div>
                        <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">Producto</h3>
                        <ul className="space-y-3 text-sm text-slate-400">
                            <li>
                                <button
                                    onClick={() => scrollToLandingSection('como-funciona')}
                                    className="transition-colors hover:text-emerald-300"
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
                                <Link href="/demo" className="transition-colors hover:text-emerald-300">
                                    Demo
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">Empresa</h3>
                        <ul className="space-y-3 text-sm text-slate-400">
                            <li>
                                <Link href="/nosotros" className="transition-colors hover:text-emerald-300">
                                    Sobre nosotros
                                </Link>
                            </li>
                            <li>
                                <Link href="/contacto" className="transition-colors hover:text-emerald-300">
                                    Contacto
                                </Link>
                            </li>
                            <li>
                                <Link href="/soporte" className="transition-colors hover:text-emerald-300">
                                    Soporte
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">Contacto</h3>
                        <ul className="space-y-3 text-sm text-slate-400">
                            <li className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-amber-300" />
                                <a href="mailto:contacto@mipos.com" className="transition-colors hover:text-emerald-300">
                                    contacto@mipos.com
                                </a>
                            </li>
                            <li className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-amber-300" />
                                <a href="tel:+595123456789" className="transition-colors hover:text-emerald-300">
                                    +595 123 456 789
                                </a>
                            </li>
                            <li className="flex items-start gap-2">
                                <MapPin className="mt-1 h-4 w-4 flex-shrink-0 text-amber-300" />
                                <span>Asuncion, Paraguay</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom */}
                <div className="landing-divider mt-10 flex flex-col items-start justify-between gap-4 border-t pt-8 text-sm text-slate-500 md:flex-row md:items-center">
                    <p>
                        (c) {currentYear} MiPOS. Todos los derechos reservados.
                    </p>
                    <div className="flex gap-6">
                        <Link href="/terminos" className="transition-colors hover:text-emerald-300">
                            Terminos
                        </Link>
                        <Link href="/privacidad" className="transition-colors hover:text-emerald-300">
                            Privacidad
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
