"use client";

import { useState } from 'react';
import Link from 'next/link';
import {
  Home,
  Tag,
  ShoppingBag,
  Package,
  Menu,
  X,
  Search,
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const primary = config?.branding?.primaryColor || '#ec4899';
  const secondary = config?.branding?.secondaryColor || '#9333ea';

  const handleNavigate = (id: string) => {
    onNavigate(id);
    setIsMenuOpen(false);
  };

  const navLinks = [
    { id: 'inicio', label: 'Inicio', icon: Home, action: () => handleNavigate('inicio') },
    { id: 'ofertas', label: 'Ofertas', icon: Tag, href: '/offers?status=active' },
    { id: 'catalogo', label: 'Catálogo', icon: ShoppingBag, href: '/catalog' },
    { id: 'seguimiento', label: 'Seguir Pedido', icon: Package, href: '/orders/track' },
  ];

  return (
    <header
      role="banner"
      className="sticky top-0 z-50 w-full border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60 shadow-sm"
    >
      {/* Skip to content */}
      <a
        href="#inicio"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-purple-600 focus:text-white focus:rounded-lg focus:shadow-lg"
      >
        Saltar al contenido
      </a>

      <nav aria-label="Navegación principal" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">

          {/* Logo - Simplified */}
          <Link
            href="/home"
            className="flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            {/* Logo icon - usando gradiente premium */}
            <div
              className="relative flex h-10 w-10 items-center justify-center rounded-xl shadow-md transition-transform hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${primary}, ${secondary})`
              }}
            >
              <span className="text-lg font-bold text-white">
                {config.businessName?.charAt(0) || 'M'}
              </span>
            </div>

            {/* Business name - clean typography */}
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                {config.businessName}
              </h1>
              {config.tagline && (
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {config.tagline}
                </p>
              )}
            </div>
          </Link>

          {/* Desktop Navigation - Clean & Simple */}
          <div className="hidden lg:flex lg:items-center lg:gap-6">
            <nav className="flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = activeSection === link.id;
                const Icon = link.icon;

                if (link.href) {
                  return (
                    <Link
                      key={link.id}
                      href={link.href}
                      className={`
                        group relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
                        transition-all duration-200
                        ${isActive
                          ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30'
                          : 'text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }
                      `}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{link.label}</span>
                    </Link>
                  );
                }

                return (
                  <button
                    key={link.id}
                    onClick={link.action}
                    className={`
                      group relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
                      transition-all duration-200
                      ${isActive
                        ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30'
                        : 'text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Divider */}
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

            {/* Actions - Right side */}
            <div className="flex items-center gap-3">
              {/* Search Bar */}
              <div className="w-64">
                <PublicSearchBar />
              </div>

              {/* Cart Button */}
              <CartButton />

              {/* Theme Toggle */}
              <SimpleThemeToggle />
            </div>
          </div>

          {/* Mobile Actions */}
          <div className="flex items-center gap-2 lg:hidden">
            {/* Mobile Search Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              aria-label={isSearchOpen ? 'Cerrar búsqueda' : 'Abrir búsqueda'}
              className="h-9 w-9 p-0"
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Cart */}
            <CartButton />

            {/* Theme Toggle */}
            <SimpleThemeToggle />

            {/* Menu Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              className="h-9 w-9 p-0"
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {isSearchOpen && (
          <div className="border-t border-slate-200 dark:border-slate-700 py-4 lg:hidden animate-slide-up">
            <PublicSearchBar />
          </div>
        )}

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div
            className="border-t border-slate-200 dark:border-slate-700 py-4 lg:hidden animate-slide-up"
            role="menu"
            aria-label="Menú de navegación móvil"
          >
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => {
                const isActive = activeSection === link.id;
                const Icon = link.icon;

                if (link.href) {
                  return (
                    <Link
                      key={link.id}
                      href={link.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3 text-base font-medium rounded-lg
                        transition-all duration-200
                        ${isActive
                          ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }
                      `}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{link.label}</span>
                    </Link>
                  );
                }

                return (
                  <button
                    key={link.id}
                    onClick={link.action}
                    className={`
                      flex items-center gap-3 px-4 py-3 text-base font-medium rounded-lg
                      transition-all duration-200 text-left
                      ${isActive
                        ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{link.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </nav>
    </header>
  );
}

export const NavBar = NavBarComponent;
export default NavBarComponent;
