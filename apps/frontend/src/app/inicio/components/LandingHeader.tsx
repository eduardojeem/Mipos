'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
    Building2,
    Menu,
    X,
    LogIn,
} from 'lucide-react';
import { AssociatedBusinesses } from './AssociatedBusinesses';

export function LandingHeader() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showBusinesses, setShowBusinesses] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const isLandingPage = pathname === '/inicio' || pathname === '/';

    const scrollToSection = (sectionId: string) => {
        // Si no estamos en la landing page, navegar primero
        if (!isLandingPage) {
            router.push(`/inicio#${sectionId}`);
            setMobileMenuOpen(false);
            return;
        }

        // Si estamos en la landing page, hacer scroll
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setMobileMenuOpen(false);
        }
    };

    return (
        <>
            <header className="sticky top-0 z-50 w-full glass-card border-b border-white/5">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between h-16 lg:h-20">
                        {/* Logo */}
                        <Link href="/inicio" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                            <div className="gradient-primary p-2 rounded-lg">
                                <Building2 className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-xl font-bold gradient-text">
                                MiPOS
                            </span>
                        </Link>

                        {/* Desktop Navigation */}
                        <nav className="hidden lg:flex items-center gap-6">
                            <button
                                onClick={() => scrollToSection('como-funciona')}
                                className="text-gray-300 hover:text-white transition-colors font-medium"
                            >
                                Características
                            </button>
                            <Link
                                href="/empresas"
                                className="text-gray-300 hover:text-white transition-colors font-medium"
                            >
                                Negocios
                            </Link>
                            <Link
                                href="/inicio/planes"
                                className="text-gray-300 hover:text-white transition-colors font-medium"
                            >
                                Planes
                            </Link>
                        </nav>

                        {/* Desktop Actions */}
                        <div className="hidden lg:flex items-center gap-3">
                            <Link href="/auth/signin">
                                <Button
                                    variant="ghost"
                                    className="text-gray-300 hover:text-white hover:bg-white/5"
                                >
                                    <LogIn className="h-4 w-4 mr-2" />
                                    Iniciar Sesión
                                </Button>
                            </Link>
                            <Link href="/inicio/planes">
                                <Button className="gradient-primary">
                                    Ver Planes
                                </Button>
                            </Link>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="lg:hidden p-2 text-gray-300 hover:text-white"
                        >
                            {mobileMenuOpen ? (
                                <X className="h-6 w-6" />
                            ) : (
                                <Menu className="h-6 w-6" />
                            )}
                        </button>
                    </div>

                    {/* Mobile Menu */}
                    {mobileMenuOpen && (
                        <div className="lg:hidden py-4 border-t border-white/5 space-y-2">
                            <button
                                onClick={() => scrollToSection('como-funciona')}
                                className="block w-full text-left px-4 py-2 text-gray-300 hover:bg-white/5 rounded-lg"
                            >
                                Características
                            </button>
                            <Link
                                href="/empresas"
                                className="block w-full text-left px-4 py-2 text-gray-300 hover:bg-white/5 rounded-lg"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Negocios
                            </Link>
                            <Link
                                href="/inicio/planes"
                                className="block w-full text-left px-4 py-2 text-gray-300 hover:bg-white/5 rounded-lg"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Planes
                            </Link>

                            <div className="pt-4 border-t border-white/5 space-y-2 px-4">
                                <Link href="/auth/signin" className="block w-full">
                                    <Button
                                        variant="outline"
                                        className="w-full glass-card border-white/10 text-white"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <LogIn className="h-4 w-4 mr-2" />
                                        Iniciar Sesión
                                    </Button>
                                </Link>
                                <Link href="/inicio/planes" className="block w-full">
                                    <Button 
                                        className="w-full gradient-primary"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        Ver Planes
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Associated Businesses Modal */}
            <AssociatedBusinesses
                open={showBusinesses}
                onClose={() => setShowBusinesses(false)}
            />
        </>
    );
}
