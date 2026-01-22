"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { BusinessConfig } from '@/types/business-config';
import { Facebook, Instagram, Twitter, Phone, Mail, Clock } from 'lucide-react';
import { memo } from 'react';

interface ContactSectionProps {
  config: BusinessConfig;
}

function ContactSectionComponent({ config }: ContactSectionProps) {
  const { toast } = useToast();
  const primary = config?.branding?.primaryColor || '#ec4899';
  const secondary = config?.branding?.secondaryColor || '#9333ea';
  const accent = config?.branding?.accentColor || primary;
  const hexToRgba = (hex: string, alpha: number) => {
    const h = hex.replace('#', '');
    const bigint = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: 'Mensaje enviado',
      description: 'Nos pondremos en contacto contigo pronto.',
    });
  };

  const hours = Array.isArray(config.businessHours) ? config.businessHours : [];

  return (
    <section id="contacto" className="py-20 relative overflow-hidden bg-white dark:bg-slate-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-sky-400/10 to-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-emerald-400/10 to-teal-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <Badge className="bg-gradient-to-r from-sky-600 via-blue-600 to-cyan-600 text-white border-0 shadow-lg shadow-sky-500/50 hover:shadow-xl hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105 mb-4">📞 Contáctanos</Badge>
          <h2 className="home-heading text-3xl lg:text-4xl font-bold mb-4 bg-gradient-to-r from-sky-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">Estamos Aquí para Ayudarte</h2>
          <p className="text-xl text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
            ¿Tienes preguntas? Nos encantaría escucharte. Envíanos un mensaje.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Información de Contacto */}
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Información de Contacto</h3>
              <div className="space-y-6">
                <div className="flex items-start space-x-4 group">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-sky-500/50 group-hover:shadow-xl group-hover:shadow-blue-500/50 transition-all duration-300 group-hover:scale-110">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="home-heading-sub font-semibold text-gray-900 dark:text-gray-100">Teléfono</h4>
                    <p className="text-gray-700 dark:text-gray-300">{config.contact.phone}</p>
                    {config.contact.whatsapp && <p className="text-gray-700 dark:text-gray-300">{config.contact.whatsapp}</p>}
                  </div>
                </div>

                <div className="flex items-start space-x-4 group">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/50 group-hover:shadow-xl group-hover:shadow-teal-500/50 transition-all duration-300 group-hover:scale-110">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="home-heading-sub font-semibold text-gray-900 dark:text-gray-100">Email</h4>
                    <p className="text-gray-700 dark:text-gray-300">{config.contact.email}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 group">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/50 group-hover:shadow-xl group-hover:shadow-orange-500/50 transition-all duration-300 group-hover:scale-110">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="home-heading-sub font-semibold text-gray-900 dark:text-gray-100">Horarios</h4>
                    {hours.map((schedule, index) => (
                      <p key={index} className="text-gray-700 dark:text-gray-300">
                        {schedule}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Redes Sociales */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Síguenos</h4>
              <div className="flex space-x-4">
                <Button variant="outline" size="sm" className="rounded-full w-10 h-10 p-0 border-2 border-sky-500 text-sky-600 hover:bg-sky-600 hover:text-white hover:scale-110 transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-sky-500/50">
                  <Facebook className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" className="rounded-full w-10 h-10 p-0 border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-600 hover:text-white hover:scale-110 transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-emerald-500/50">
                  <Instagram className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" className="rounded-full w-10 h-10 p-0 border-2 border-amber-500 text-amber-600 hover:bg-amber-600 hover:text-white hover:scale-110 transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-amber-500/50">
                  <Twitter className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Formulario de Contacto */}
          <Card className="shadow-2xl border-2 border-sky-200/50 dark:border-sky-500/30 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-2xl bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">Envíanos un Mensaje</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">Completa el formulario y te responderemos pronto.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleContactSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-gray-900 dark:text-gray-100">Nombre</Label>
                    <Input id="name" placeholder="Tu nombre" required className="border-2 border-gray-300 dark:border-gray-600 focus:border-sky-500 dark:focus:border-sky-400 transition-colors" />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-gray-900 dark:text-gray-100">Email</Label>
                    <Input id="email" type="email" placeholder="tu@email.com" required className="border-2 border-gray-300 dark:border-gray-600 focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="subject" className="text-gray-900 dark:text-gray-100">Asunto</Label>
                  <Input id="subject" placeholder="¿En qué podemos ayudarte?" required className="border-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 transition-colors" />
                </div>
                <div>
                  <Label htmlFor="message" className="text-gray-900 dark:text-gray-100">Mensaje</Label>
                  <Textarea id="message" placeholder="Escribe tu mensaje aquí..." rows={4} required className="border-2 border-gray-300 dark:border-gray-600 focus:border-teal-500 dark:focus:border-teal-400 transition-colors" />
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 hover:from-orange-600 hover:via-amber-600 hover:to-yellow-600 text-white shadow-lg shadow-orange-500/50 hover:shadow-xl hover:shadow-amber-500/50 transition-all duration-300 hover:scale-105">
                  Enviar Mensaje
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

export const ContactSection = memo(ContactSectionComponent);
export default ContactSection;