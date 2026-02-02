'use client';

import Link from 'next/link';
import { Building2, Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-[#0a0a0a] border-t border-white/5 py-12">
            <div className="container mx-auto px-4">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
                    {/* Brand */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="gradient-primary p-2 rounded-lg">
                                <Building2 className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-xl font-bold gradient-text">
                                MiPOS
                            </span>
                        </div>
                        <p className="text-sm text-gray-400">
                            Sistema empresarial de nueva generación para gestionar tu negocio.
                        </p>
                    </div>

                    {/* Product */}
                    <div>
                        <h3 className="font-semibold text-white mb-4">Producto</h3>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li>
                                <button
                                    onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}
                                    className="hover:text-purple-400 transition-colors"
                                >
                                    Características
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => document.getElementById('planes')?.scrollIntoView({ behavior: 'smooth' })}
                                    className="hover:text-purple-400 transition-colors"
                                >
                                    Precios
                                </button>
                            </li>
                            <li>
                                <Link href="/demo" className="hover:text-purple-400 transition-colors">
                                    Demo
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h3 className="font-semibold text-white mb-4">Empresa</h3>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li>
                                <Link href="/nosotros" className="hover:text-purple-400 transition-colors">
                                    Sobre nosotros
                                </Link>
                            </li>
                            <li>
                                <Link href="/contacto" className="hover:text-purple-400 transition-colors">
                                    Contacto
                                </Link>
                            </li>
                            <li>
                                <Link href="/soporte" className="hover:text-purple-400 transition-colors">
                                    Soporte
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="font-semibold text-white mb-4">Contacto</h3>
                        <ul className="space-y-3 text-sm text-gray-400">
                            <li className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-purple-400" />
                                <a href="mailto:contacto@mipos.com" className="hover:text-purple-400 transition-colors">
                                    contacto@mipos.com
                                </a>
                            </li>
                            <li className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-purple-400" />
                                <a href="tel:+595123456789" className="hover:text-purple-400 transition-colors">
                                    +595 123 456 789
                                </a>
                            </li>
                            <li className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-purple-400 mt-1 flex-shrink-0" />
                                <span>Asunción, Paraguay</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom */}
                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-400 text-sm">
                    <p>
                        © {currentYear} MiPOS. Todos los derechos reservados.
                    </p>
                    <div className="flex gap-6">
                        <Link href="/terminos" className="hover:text-purple-400 transition-colors">
                            Términos
                        </Link>
                        <Link href="/privacidad" className="hover:text-purple-400 transition-colors">
                            Privacidad
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
