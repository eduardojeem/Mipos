'use client';

import { useState } from 'react';
import Link from 'next/link';
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

    const scrollToSection = (sectionId: string) => {
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
                        <div className="flex items-center gap-2">
                            <div className="gradient-primary p-2 rounded-lg">
                                <Building2 className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-xl font-bold gradient-text">
                                MiPOS
                            </span>
                        </div>

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
                            <button
                                onClick={() => scrollToSection('planes')}
                                className="text-gray-300 hover:text-white transition-colors font-medium"
                            >
                                Planes
                            </button>
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
                            <Button
                                onClick={() => scrollToSection('planes')}
                                className="gradient-primary"
                            >
                                Comenzar Gratis
                            </Button>
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
                            >
                                Negocios
                            </Link>
                            <button
                                onClick={() => scrollToSection('planes')}
                                className="block w-full text-left px-4 py-2 text-gray-300 hover:bg-white/5 rounded-lg"
                            >
                                Planes
                            </button>

                            <div className="pt-4 border-t border-white/5 space-y-2 px-4">
                                <Link href="/auth/signin" className="block w-full">
                                    <Button
                                        variant="outline"
                                        className="w-full glass-card border-white/10 text-white"
                                    >
                                        <LogIn className="h-4 w-4 mr-2" />
                                        Iniciar Sesión
                                    </Button>
                                </Link>
                                <Button
                                    onClick={() => scrollToSection('planes')}
                                    className="w-full gradient-primary"
                                >
                                    Comenzar Gratis
                                </Button>
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
