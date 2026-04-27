"use client";

import Link from 'next/link';
import {
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Twitter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BusinessConfig } from '@/types/business-config';
import { hexToRgba } from '@/lib/color-utils';
import { useTenantPublicRouting } from '@/hooks/useTenantPublicRouting';
import {
  buildWhatsAppHref,
  getTenantPublicContent,
  getTenantPublicSections,
} from '@/lib/public-site/tenant-public-config';

interface FooterProps {
  config: BusinessConfig;
  onNavigate: (sectionId: string) => void;
}

function FooterComponent({ config, onNavigate }: FooterProps) {
  const { tenantHref } = useTenantPublicRouting();
  const sections = getTenantPublicSections(config);
  const content = getTenantPublicContent(config);
  const primary = config.branding?.primaryColor || '#0f766e';
  const secondary = config.branding?.secondaryColor || '#1d4ed8';
  const whatsappHref = buildWhatsAppHref(config, 'Hola, necesito ayuda con una compra.');
  const socialLinks = [
    { href: config.socialMedia?.facebook, icon: Facebook, label: 'Facebook' },
    { href: config.socialMedia?.instagram, icon: Instagram, label: 'Instagram' },
    { href: config.socialMedia?.twitter, icon: Twitter, label: 'Twitter' },
    { href: config.socialMedia?.linkedin, icon: Linkedin, label: 'LinkedIn' },
  ].filter((item) => Boolean(item.href));

  const location = [config.address?.street, config.address?.city, config.address?.department]
    .filter(Boolean)
    .join(', ');

  return (
    <footer className="mt-16 border-t border-slate-200/70 bg-slate-950 text-slate-100">
      <div
        className="border-b border-white/10"
        style={{
          background: `linear-gradient(120deg, ${hexToRgba(primary, 0.18)}, ${hexToRgba(
            secondary,
            0.16
          )})`,
        }}
      >
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1.25fr_0.75fr] lg:px-8">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
              {config.businessName}
            </p>
            <h2 className="max-w-2xl text-2xl font-semibold tracking-tight text-white">
              {content.footerHeadline || 'Experiencia publica alineada con el branding del negocio.'}
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-300">
              {content.supportMessage ||
                'Configura catalogo, promociones, contacto y horarios desde el panel administrativo.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <Button asChild className="rounded-full" style={{ backgroundColor: primary }}>
              <Link href={tenantHref('/home')}>Volver al inicio</Link>
            </Button>
            {whatsappHref ? (
              <Button asChild variant="outline" className="rounded-full border-white/20 bg-transparent text-white hover:bg-white/10">
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Soporte comercial
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-white">Tienda</p>
          <p className="text-sm leading-7 text-slate-400">
            {config.tagline || config.heroDescription || 'Negocio publicado en MiPOS.'}
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-white">Navegacion</p>
          <div className="flex flex-col gap-2 text-sm text-slate-400">
            <button onClick={() => onNavigate('inicio')} className="text-left transition-colors hover:text-white">
              Inicio
            </button>
            {sections.showCatalog ? (
              <Link href={tenantHref('/catalog')} className="transition-colors hover:text-white">
                Catalogo
              </Link>
            ) : null}
            {sections.showOffers ? (
              <Link href={tenantHref('/offers')} className="transition-colors hover:text-white">
                Ofertas
              </Link>
            ) : null}
            {sections.showOrderTracking ? (
              <Link href={tenantHref('/orders/track')} className="transition-colors hover:text-white">
                Seguimiento
              </Link>
            ) : null}
            {(sections.showContactInfo || sections.showLocation) ? (
              <button onClick={() => onNavigate('contacto')} className="text-left transition-colors hover:text-white">
                Contacto
              </button>
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-white">Informacion visible</p>
          <div className="space-y-2 text-sm text-slate-400">
            {sections.showContactInfo && config.contact?.phone ? (
              <p className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 flex-none" />
                <span>{config.contact.phone}</span>
              </p>
            ) : null}
            {sections.showContactInfo && config.contact?.email ? (
              <p className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 flex-none" />
                <span>{config.contact.email}</span>
              </p>
            ) : null}
            {sections.showLocation && location ? (
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 flex-none" />
                <span>{location}</span>
              </p>
            ) : null}
            {!sections.showContactInfo && !sections.showLocation ? (
              <p>Los datos de contacto no estan publicados.</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-white">Presencia publica</p>
          {sections.showBusinessHours && Array.isArray(config.businessHours) && config.businessHours.length > 0 ? (
            <div className="space-y-2 text-sm text-slate-400">
              {config.businessHours.slice(0, 4).map((hour) => (
                <p key={hour}>{hour}</p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Horarios no publicados.</p>
          )}

          {sections.showSocialLinks && socialLinks.length > 0 ? (
            <div className="flex items-center gap-2 pt-2">
              {socialLinks.map((item) => (
                <Button
                  key={item.label}
                  asChild
                  variant="ghost"
                  size="icon"
                  className="rounded-full bg-white/5 text-slate-200 hover:bg-white/12 hover:text-white"
                >
                  <a href={item.href!} target="_blank" rel="noopener noreferrer" aria-label={item.label}>
                    <item.icon className="h-4 w-4" />
                  </a>
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-xs text-slate-500 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p>
            {new Date().getFullYear()} {config.businessName}. Todos los derechos reservados.
          </p>
          <p>Frontend publico del tenant sincronizado con Business Config.</p>
        </div>
      </div>
    </footer>
  );
}

export const Footer = FooterComponent;
export default FooterComponent;
