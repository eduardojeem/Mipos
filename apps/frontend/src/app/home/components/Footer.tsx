"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BusinessConfig } from '@/types/business-config';
import { Sparkles, Facebook, Instagram, Twitter, Phone, Mail, MapPin } from 'lucide-react';
import { memo } from 'react';

interface FooterProps {
  config: BusinessConfig;
  onNavigate: (sectionId: string) => void;
}

function FooterComponent({ config, onNavigate }: FooterProps) {
  // Defensive guard: ensure address object exists to avoid runtime crashes
  const address = config?.address ?? {} as Partial<BusinessConfig['address']>;
  const hours = Array.isArray(config.businessHours) ? config.businessHours : [];

  return (
    <footer className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-16 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-sky-600/30 to-blue-600/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-emerald-600/30 to-teal-600/30 rounded-full blur-3xl"></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Logo y descripción */}
          <div className="space-y-4">
            <div className="flex items-center">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/50"
                style={{ backgroundImage: `linear-gradient(135deg, ${config?.branding?.primaryColor || '#ec4899'}, ${config?.branding?.secondaryColor || '#9333ea'})` }}
              >
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="ml-3 text-xl font-bold bg-gradient-to-r from-sky-400 to-blue-400 bg-clip-text text-transparent">{config.businessName}</span>
            </div>
            <p className="text-gray-300 text-sm">{config.tagline}. {config.heroDescription}</p>
            <div className="flex space-x-4">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-sky-600/20 p-2 rounded-full transition-all duration-300 hover:scale-110">
                <Facebook className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-emerald-600/20 p-2 rounded-full transition-all duration-300 hover:scale-110">
                <Instagram className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-amber-600/20 p-2 rounded-full transition-all duration-300 hover:scale-110">
                <Twitter className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Enlaces rápidos */}
          <div>
            <h3 className="font-semibold mb-4 text-sky-300">Enlaces Rápidos</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => onNavigate('inicio')} className="text-gray-300 hover:text-sky-400 transition-colors duration-200">
                  Inicio
                </button>
              </li>
              <li>
                <Link href="/offers" className="text-gray-300 hover:text-blue-400 transition-colors duration-200">
                  Ofertas
                </Link>
              </li>
              <li>
                <button onClick={() => onNavigate('productos')} className="text-gray-300 hover:text-cyan-400 transition-colors duration-200">
                  Productos
                </button>
              </li>
              <li>
                <Link href="/catalog" className="text-gray-300 hover:text-emerald-400 transition-colors duration-200">
                  Productos
                </Link>
              </li>
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h3 className="font-semibold mb-4 text-emerald-300">Contacto</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-center hover:text-sky-400 transition-colors duration-200">
                <Phone className="w-4 h-4 mr-2 text-sky-400" />
                {config.contact.phone}
              </li>
              <li className="flex items-center hover:text-emerald-400 transition-colors duration-200">
                <Mail className="w-4 h-4 mr-2 text-emerald-400" />
                {config.contact.email}
              </li>
              <li className="flex items-center hover:text-teal-400 transition-colors duration-200">
                <MapPin className="w-4 h-4 mr-2 text-teal-400" />
                {address.street ?? ''}, {address.department ?? ''}
              </li>
            </ul>
          </div>

          {/* Horarios */}
          <div>
            <h3 className="font-semibold mb-4 text-amber-300">Horarios</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              {hours.map((schedule, index) => (
                <li key={index} className="hover:text-amber-400 transition-colors duration-200">{schedule}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-sky-500/30 mt-12 pt-8 text-center">
          <p className="text-gray-300 text-sm">© 2024 <span className="bg-gradient-to-r from-sky-400 to-blue-400 bg-clip-text text-transparent font-semibold">{config.businessName}</span>. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}

export const Footer = memo(FooterComponent);
export default Footer;