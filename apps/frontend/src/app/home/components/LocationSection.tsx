"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BusinessConfig } from '@/types/business-config';
import { MapPin, Truck, Package, Gift } from 'lucide-react';
import { memo } from 'react';

interface LocationSectionProps {
  config: BusinessConfig;
}

function LocationSectionComponent({ config }: LocationSectionProps) {
  // Defensive guard: ensure address object exists to avoid runtime crashes
  const address = config?.address ?? {} as Partial<BusinessConfig['address']>;

  const primary = config?.branding?.primaryColor || '#ec4899';
  const secondary = config?.branding?.secondaryColor || '#9333ea';
  const accent = config?.branding?.accentColor || primary;
  const mapHref = (() => {
    const provided = config?.address?.mapUrl;
    if (provided && provided.trim().length > 0) return provided;
    const parts = [
      config?.address?.street,
      config?.address?.neighborhood,
      config?.address?.city,
      config?.address?.department,
      config?.address?.country
    ].filter(Boolean);
    const q = parts.join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  })();
  const useEmbeddedMap = !!address?.mapEmbedEnabled && typeof address?.mapEmbedUrl === 'string' && /^https?:\/\//.test(address.mapEmbedUrl ?? '')
  const embedSrc = useEmbeddedMap ? address?.mapEmbedUrl! : undefined
  const hexToRgba = (hex: string, alpha: number) => {
    const h = hex.replace('#', '');
    const bigint = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  return (
    <section id="ubicacion" className="py-20 relative overflow-hidden bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-gradient-to-br from-emerald-400/10 to-teal-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-gradient-to-br from-sky-400/10 to-blue-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <Badge className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white border-0 shadow-lg shadow-emerald-500/50 hover:shadow-xl hover:shadow-teal-500/50 transition-all duration-300 hover:scale-105 mb-4">📍 Nuestra Ubicación</Badge>
          <h2 className="home-heading text-3xl lg:text-4xl font-bold mb-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">Visítanos en Nuestra Tienda</h2>
          <p className="text-xl text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
            Te esperamos en nuestro local físico. Ven y descubre todos nuestros productos.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Información de Ubicación */}
          <div className="space-y-8">
            <Card className="shadow-2xl border-2 border-emerald-200/50 dark:border-emerald-500/30 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl">
              <CardContent className="p-8">
                <div className="flex items-start space-x-4 mb-6 group">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/50 group-hover:shadow-xl group-hover:shadow-teal-500/50 transition-all duration-300 group-hover:scale-110">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{config.businessName} - Tienda Principal</h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {address.street ?? ''}
                      <br />
                      {address.neighborhood ?? ''}
                      <br />
                      {address.city ?? ''}, {address.department ?? ''} {address.zipCode ?? ''}
                      <br />
                      {address.country ?? ''}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3 group">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:shadow-sky-500/50 transition-all duration-300 group-hover:scale-110">
                      <Truck className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">Estacionamiento disponible</span>
                  </div>
                  <div className="flex items-center space-x-3 group">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:shadow-emerald-500/50 transition-all duration-300 group-hover:scale-110">
                      <Package className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">Entrega a domicilio</span>
                  </div>
                  <div className="flex items-center space-x-3 group">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:shadow-amber-500/50 transition-all duration-300 group-hover:scale-110">
                      <Gift className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">Envoltorio de regalo gratis</span>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t-2 border-emerald-200/50 dark:border-emerald-500/30">
                  <h4 className="font-semibold mb-3 text-emerald-600 dark:text-emerald-400">Cómo llegar</h4>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    • Metro: Estación Insurgentes (Línea 1)
                    <br />• Metrobús: Estación Dr. Gálvez
                    <br />• Autobús: Rutas 2, 17, 44
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mapa */}
          <div className="relative">
            <Card className="shadow-2xl border-2 border-teal-200/50 dark:border-teal-500/30 overflow-hidden h-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl">
              <div className="relative h-96 lg:h-full min-h-[400px]">
                {useEmbeddedMap && embedSrc ? (
                  <iframe
                    title="Mapa de ubicación"
                    src={embedSrc}
                    className="w-full h-full border-0 rounded-lg"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-100 via-teal-100 to-cyan-100 dark:from-emerald-900/30 dark:via-teal-900/30 dark:to-cyan-900/30">
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-500/50 animate-pulse">
                        <MapPin className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">Mapa Interactivo</h3>
                      <p className="text-gray-700 dark:text-gray-300 mb-4">
                        {address.street ?? ''}
                        <br />
                        {address.neighborhood ?? ''}, {address.department ?? ''}
                      </p>
                      <a href={mapHref} target="_blank" rel="noopener noreferrer">
                        <Button className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 text-white shadow-lg shadow-emerald-500/50 hover:shadow-xl hover:shadow-teal-500/50 transition-all duration-300 hover:scale-105">Ver en Google Maps</Button>
                      </a>
                    </div>
                  </div>
                )}

                {/* Overlay con información rápida */}
                <div className="absolute top-4 left-4 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-xl p-4 shadow-xl border-2 border-green-200/50 dark:border-green-500/30">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 animate-pulse shadow-lg shadow-green-500/50"></div>
                    <span className="text-sm font-semibold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Abierto ahora</span>
                  </div>
                  <p className="text-xs text-gray-700 dark:text-gray-300">Cierra a las 8:00 PM</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

export const LocationSection = memo(LocationSectionComponent);
export default LocationSection;