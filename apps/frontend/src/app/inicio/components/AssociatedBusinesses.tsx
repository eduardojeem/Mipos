'use client';

import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Building2, Loader2 } from 'lucide-react';

interface Organization {
    id: string;
    name: string;
    slug: string;
    created_at: string;
}

interface AssociatedBusinessesProps {
    open: boolean;
    onClose: () => void;
}

export function AssociatedBusinesses({ open, onClose }: AssociatedBusinessesProps) {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (open) {
            fetchOrganizations();
        }
    }, [open]);

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
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <Building2 className="h-6 w-6 text-pink-600" />
                        Negocios Asociados
                    </DialogTitle>
                    <DialogDescription>
                        Empresas y organizaciones que confían en nuestro sistema
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
                    </div>
                ) : organizations.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No hay negocios asociados para mostrar</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 py-4">
                        {organizations.map((org) => (
                            <div
                                key={org.id}
                                className="group relative p-6 rounded-xl border border-gray-200 hover:border-pink-300 bg-white hover:shadow-lg transition-all duration-300"
                            >
                                <div className="flex flex-col items-center text-center space-y-3">
                                    {/* Logo placeholder con iniciales */}
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg group-hover:scale-110 transition-transform">
                                        {getInitials(org.name)}
                                    </div>

                                    {/* Nombre del negocio */}
                                    <div>
                                        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">
                                            {org.name}
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Cliente desde {new Date(org.created_at).getFullYear()}
                                        </p>
                                    </div>
                                </div>

                                {/* Efecto hover */}
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-pink-500/0 to-purple-600/0 group-hover:from-pink-500/5 group-hover:to-purple-600/5 transition-all pointer-events-none" />
                            </div>
                        ))}
                    </div>
                )}

                {!loading && organizations.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 text-center text-sm text-gray-500">
                        {organizations.length} {organizations.length === 1 ? 'negocio' : 'negocios'} usando nuestro sistema
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
