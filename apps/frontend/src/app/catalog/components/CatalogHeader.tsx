'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, Sparkles } from 'lucide-react';
interface CatalogHeaderProps {
    searchQuery: string;
    config: { businessName: string };
    onSearchChange: (query: string) => void;
}

export default function CatalogHeader({
    searchQuery,
    config,
    onSearchChange,
}: CatalogHeaderProps) {
    return (
        <header className="sticky top-16 z-40 border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-14">
                    {/* Logo y navegación */}
                    <div className="flex items-center space-x-4">
                        <Link href="/home">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-slate-600 hover:text-foreground"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Volver al Inicio
                            </Button>
                        </Link>
                        <Separator orientation="vertical" className="h-6" />
                        <Link href="/home" className="flex items-center">
                            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div className="ml-3">
                                <h1 className="text-lg font-bold text-foreground">Catálogo</h1>
                                <p className="text-xs text-muted-foreground">{config.businessName}</p>
                            </div>
                        </Link>
                    </div>

                    {/* Barra de búsqueda */}
                    <div className="flex-1 max-w-md mx-8 hidden md:block">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                placeholder="Buscar productos..."
                                value={searchQuery}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="pl-10 bg-background border-input focus-visible:ring-ring focus-visible:outline-none"
                            />
                        </div>
                    </div>

                    {/* Cart Button está en el NavBar principal */}
                </div>
            </div>
        </header>
    );
}
