'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Search,
    Plus,
    Download,
    Settings,
    RefreshCw,
    Building2,
    UserPlus,
    FileText,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AdminHeaderProps {
    onSearch?: (query: string) => void;
    onRefresh?: () => void;
    lastUpdated?: Date;
    isRefreshing?: boolean;
}

export function AdminHeader({
    onSearch,
    onRefresh,
    lastUpdated,
    isRefreshing = false,
}: AdminHeaderProps) {
    const [searchQuery, setSearchQuery] = React.useState('');

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);
        onSearch?.(value);
    };

    const formatLastUpdated = () => {
        if (!lastUpdated) return 'Nunca';
        const now = new Date();
        const diff = now.getTime() - lastUpdated.getTime();
        const seconds = Math.floor(diff / 1000);

        if (seconds < 60) return 'Hace un momento';
        if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
        return `Hace ${Math.floor(seconds / 3600)} h`;
    };

    return (
        <div className="space-y-4">
            {/* Title and Actions Row */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                            Panel de Administración SaaS
                        </h2>
                        <Badge variant="outline" className="hidden md:flex items-center gap-1 px-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            En línea
                        </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Gestiona organizaciones, usuarios y analíticas de tu plataforma
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Quick Actions Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" />
                                Acciones Rápidas
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Crear Nuevo</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                                <Building2 className="mr-2 h-4 w-4" />
                                Nueva Organización
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Invitar Usuario
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Exportar</DropdownMenuLabel>
                            <DropdownMenuItem>
                                <Download className="mr-2 h-4 w-4" />
                                Exportar Organizaciones
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Download className="mr-2 h-4 w-4" />
                                Exportar Usuarios
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <FileText className="mr-2 h-4 w-4" />
                                Generar Reporte
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Settings Button */}
                    <Button variant="outline" size="icon">
                        <Settings className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Search and Refresh Row */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar organizaciones o usuarios..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        className="pl-10 pr-4"
                    />
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="hidden sm:inline">
                        Última actualización: {formatLastUpdated()}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        className="gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Actualizar</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
