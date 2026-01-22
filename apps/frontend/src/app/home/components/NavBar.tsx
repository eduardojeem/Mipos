"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  Menu,
  X,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BusinessConfig } from '@/types/business-config';
import { SimpleThemeToggle } from '@/components/ui/theme-toggle';
import PublicSearchBar from './PublicSearchBar';
import { CartButton } from './CartButton';

interface NavBarProps {
  config: BusinessConfig;
  activeSection: string;
  onNavigate: (sectionId: string) => void;
}

function NavBarComponent({ config, activeSection, onNavigate }: NavBarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [exploreOpenDesktop, setExploreOpenDesktop] = useState(false);
  const [exploreOpenMobile, setExploreOpenMobile] = useState(false);
  const router = useRouter();

  const primary = config?.branding?.primaryColor || '#ec4899';
  const secondary = config?.branding?.secondaryColor || '#9333ea';
  const accent = config?.branding?.accentColor || primary;

  const handleNavigate = (id: string) => {
    onNavigate(id);
    setIsMenuOpen(false);
    setExploreOpenMobile(false);
  };

  const handleExploreKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    setOpen: (open: boolean) => void
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      // No gestionamos foco programático para mantener simplicidad
      setOpen(true);
    }
  };

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <header role="banner" className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-700/80 shadow-sm">
      <a href="#inicio" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:bg-gradient-to-r focus:from-sky-600 focus:to-blue-600 focus:text-white focus:px-3 focus:py-2 focus:rounded">Saltar al contenido</a>
      <nav aria-label="Navegación principal" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/home" className="flex items-center gap-3 group">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300 group-hover:scale-105"
              aria-hidden="true"
              style={{ backgroundImage: `linear-gradient(135deg, ${primary}, ${secondary})` }}
            >
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="text-xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 dark:from-sky-400 dark:to-blue-400 bg-clip-text text-transparent">
                {config.businessName}
              </span>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{config.tagline}</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            <ul className="flex items-center gap-1" role="menubar">
              <li role="none">
                <button
                  role="menuitem"
                  aria-controls="section-inicio"
                  aria-current={activeSection === 'inicio' ? 'true' : undefined}
                  onClick={() => handleNavigate('inicio')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                    activeSection === 'inicio' 
                      ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30' 
                      : 'text-gray-700 dark:text-gray-300 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  Inicio
                </button>
              </li>
              <li role="none">
                <Link
                  role="menuitem"
                  href="/offers?status=active"
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                    activeSection === 'ofertas' 
                      ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30' 
                      : 'text-gray-700 dark:text-gray-300 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  Ofertas
                </Link>
              </li>
              <li role="none">
                <Link
                  role="menuitem"
                  href="/catalog"
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  Catálogo
                </Link>
              </li>
              <li role="none">
                <Link
                  role="menuitem"
                  href="/orders/track"
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 flex items-center gap-2"
                >
                  <Package className="w-4 h-4" />
                  Seguir Pedido
                </Link>
              </li>
              <li role="none">
                <button
                  role="menuitem"
                  aria-controls="section-contacto"
                  aria-current={activeSection === 'contacto' ? 'true' : undefined}
                  onClick={() => handleNavigate('contacto')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                    activeSection === 'contacto' 
                      ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30' 
                      : 'text-gray-700 dark:text-gray-300 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  Contacto
                </button>
              </li>
              <li role="none">
                <button
                  role="menuitem"
                  aria-controls="section-ubicacion"
                  aria-current={activeSection === 'ubicacion' ? 'true' : undefined}
                  onClick={() => handleNavigate('ubicacion')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                    activeSection === 'ubicacion' 
                      ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30' 
                      : 'text-gray-700 dark:text-gray-300 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  Ubicación
                </button>
              </li>
            </ul>

            <div className="flex items-center gap-3 pl-6 border-l border-gray-200 dark:border-gray-700">
              <div className="w-64">
                <PublicSearchBar />
              </div>
              <CartButton />
              <SimpleThemeToggle />
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center gap-2 lg:hidden">
            <CartButton />
            <SimpleThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              aria-controls="mobile-menu"
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div
          id="mobile-menu"
          className={`${isMenuOpen ? 'block' : 'hidden'} lg:hidden border-t border-gray-200 dark:border-gray-700 py-4 motion-safe:transition-all motion-safe:duration-200`}
          role="menu"
          aria-label="Navegación móvil"
        >
          <ul className="flex flex-col space-y-2">
            <li className="px-2 pb-3">
              <PublicSearchBar />
            </li>
            <li>
              <button
                role="menuitem"
                aria-controls="section-inicio"
                aria-current={activeSection === 'inicio' ? 'true' : undefined}
                onClick={() => handleNavigate('inicio')}
                className={`w-full text-left px-4 py-3 font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                  activeSection === 'inicio'
                    ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                Inicio
              </button>
            </li>
            <li>
              <Link
                role="menuitem"
                href="/offers?status=active"
                className={`block w-full text-left px-4 py-3 font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                  activeSection === 'ofertas'
                    ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                Ofertas
              </Link>
            </li>
            <li>
              <Link
                role="menuitem"
                href="/catalog"
                className="block w-full text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                onClick={() => setIsMenuOpen(false)}
              >
                Catálogo
              </Link>
            </li>
            <li>
              <Link
                role="menuitem"
                href="/orders/track"
                className="flex w-full text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 items-center gap-2"
                onClick={() => setIsMenuOpen(false)}
              >
                <Package className="w-4 h-4" />
                Seguir Pedido
              </Link>
            </li>
            <li>
              <button
                role="menuitem"
                aria-controls="section-contacto"
                aria-current={activeSection === 'contacto' ? 'true' : undefined}
                onClick={() => handleNavigate('contacto')}
                className={`w-full text-left px-4 py-3 font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                  activeSection === 'contacto'
                    ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                Contacto
              </button>
            </li>
            <li>
              <button
                role="menuitem"
                aria-controls="section-ubicacion"
                aria-current={activeSection === 'ubicacion' ? 'true' : undefined}
                onClick={() => handleNavigate('ubicacion')}
                className={`w-full text-left px-4 py-3 font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                  activeSection === 'ubicacion'
                    ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                Ubicación
              </button>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
}

export const NavBar = NavBarComponent;
export default NavBarComponent;
