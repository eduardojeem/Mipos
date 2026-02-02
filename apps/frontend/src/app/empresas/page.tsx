'use client';

import { useEffect, useState } from 'react';
import { Building2, TrendingUp, Users, Loader2, Sparkles, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LandingHeader } from '@/app/inicio/components/LandingHeader';
import { Footer } from '@/app/inicio/components/Footer';
import Link from 'next/link';
import '@/app/inicio/landing.css';

interface Organization {
    id: string;
    name: string;
    slug: string;
    created_at: string;
}

export default function EmpresasPage() {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrganizations();
    }, []);

    const fetchOrganizations = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/organizations/public');
            const data = await response.json();
            if (data.success) {
                setOrganizations(data.organizations || []);
            }
        } catch (error) {
            console.error('Error fetching organizations:', error);
        } finally {
            setLoading(false);
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a]">
            <LandingHeader />

            <main>
                <BusinessesSection
                    organizations={organizations}
                    loading={loading}
                    getInitials={getInitials}
                />
            </main>

            <Footer />
        </div>
    );
}

// Businesses Section Component
function BusinessesSection({
    organizations,
    loading,
    getInitials
}: {
    organizations: Organization[];
    loading: boolean;
    getInitials: (name: string) => string;
}) {
    return (
        <section className="py-20 lg:py-32 bg-[#0a0a0a] relative overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0">
                <div className="absolute bottom-1/4 right-1/3 w-96 h-96 radial-gradient-blue opacity-20" />
                <div className="absolute top-1/3 left-1/4 w-96 h-96 radial-gradient-purple opacity-15" />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6">
                        <Building2 className="h-4 w-4 text-purple-400" />
                        <span className="text-sm font-medium text-gray-300">
                            Empresas que confían en nosotros
                        </span>
                    </div>

                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
                        Negocios que ya <span className="gradient-text">optimizaron</span> su gestión
                    </h1>
                    <p className="text-lg text-gray-400">
                        Únete a cientos de empresas que transformaron su forma de trabajar
                    </p>
                </div>

                {/* Stats Cards - Bento style */}
                <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-16">
                    <div className="glass-card p-8 rounded-2xl hover-glow text-center group">
                        <div className="inline-flex items-center justify-center w-16 h-16 gradient-primary rounded-xl mb-4 group-hover:scale-110 transition-transform">
                            <Building2 className="h-8 w-8 text-white" />
                        </div>
                        <div className="text-4xl font-bold gradient-text mb-2">{organizations.length || 500}+</div>
                        <div className="text-sm text-gray-400">Negocios Activos</div>
                        <div className="mt-3 flex items-center justify-center gap-1 text-xs text-green-400">
                            <TrendingUp className="h-3 w-3" />
                            <span>Creciendo cada día</span>
                        </div>
                    </div>

                    <div className="glass-card p-8 rounded-2xl hover-glow text-center group">
                        <div className="inline-flex items-center justify-center w-16 h-16 gradient-primary rounded-xl mb-4 group-hover:scale-110 transition-transform">
                            <Users className="h-8 w-8 text-white" />
                        </div>
                        <div className="text-4xl font-bold gradient-text mb-2">98%</div>
                        <div className="text-sm text-gray-400">Satisfacción del Cliente</div>
                        <div className="mt-3 flex items-center justify-center gap-1 text-xs text-purple-400">
                            <CheckCircle className="h-3 w-3" />
                            <span>Calificación promedio</span>
                        </div>
                    </div>

                    <div className="glass-card p-8 rounded-2xl hover-glow text-center group">
                        <div className="inline-flex items-center justify-center w-16 h-16 gradient-primary rounded-xl mb-4 group-hover:scale-110 transition-transform">
                            <Sparkles className="h-8 w-8 text-white" />
                        </div>
                        <div className="text-4xl font-bold gradient-text mb-2">5+</div>
                        <div className="text-sm text-gray-400">Años de Experiencia</div>
                        <div className="mt-3 flex items-center justify-center gap-1 text-xs text-blue-400">
                            <CheckCircle className="h-3 w-3" />
                            <span>Innovando siempre</span>
                        </div>
                    </div>
                </div>

                {/* Organizations Grid - Premium Bento style */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto mb-4" />
                            <p className="text-gray-400">Cargando negocios...</p>
                        </div>
                    </div>
                ) : organizations.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="inline-flex items-center justify-center w-20 h-20 glass-card rounded-2xl mb-6">
                            <Building2 className="h-10 w-10 text-gray-600" />
                        </div>
                        <p className="text-xl text-gray-400 mb-2">Próximamente más negocios</p>
                        <p className="text-sm text-gray-500">Sé de los primeros en unirte</p>
                    </div>
                ) : (
                    <>
                        <div className="bento-grid max-w-6xl mx-auto mb-12">
                            {organizations.map((org) => (
                                <div
                                    key={org.id}
                                    className="glass-card p-6 rounded-xl hover-glow group cursor-pointer"
                                >
                                    <div className="flex flex-col items-center text-center">
                                        <div className="w-20 h-20 rounded-xl gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <span className="text-white font-bold text-xl">
                                                {getInitials(org.name)}
                                            </span>
                                        </div>

                                        <h3 className="font-semibold text-white text-base line-clamp-2 mb-2 group-hover:text-purple-300 transition-colors">
                                            {org.name}
                                        </h3>
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                            <CheckCircle className="h-3 w-3 text-green-400" />
                                            Desde {new Date(org.created_at).getFullYear()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination info */}
                        <div className="text-center mb-12">
                            <p className="text-sm text-gray-400">
                                Mostrando <span className="text-purple-400 font-semibold">{organizations.length}</span> empresas activas
                            </p>
                        </div>
                    </>
                )}

                {/* CTA Section */}
                <div className="mt-16 text-center">
                    <div className="glass-card max-w-2xl mx-auto p-8 rounded-2xl">
                        <h3 className="text-2xl font-bold text-white mb-3">
                            ¿Quieres ser parte de esta comunidad?
                        </h3>
                        <p className="text-gray-400 mb-6">
                            Únete a cientos de negocios que ya optimizaron su gestión empresarial
                        </p>
                        <Link href="/inicio#planes">
                            <Button className="gradient-primary px-8 py-6 text-base rounded-xl glow-purple hover:scale-105 transition-transform">
                                Ver Planes y Precios
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
