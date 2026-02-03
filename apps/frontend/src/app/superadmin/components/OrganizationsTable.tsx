'use client';

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  ExternalLink,
  Edit,
  Trash2,
  PauseCircle,
  PlayCircle,
  ArrowUpDown,
  CreditCard,
  Users,
  ChevronDown,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Organization } from '../hooks/useAdminData';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface OrganizationsTableProps {
  organizations: Organization[];
  onUpdate?: (id: string, updates: Partial<Organization>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onSuspend?: (id: string) => Promise<void>;
  onActivate?: (id: string) => Promise<void>;
  updatingId?: string | null;
}

export function OrganizationsTable({
  organizations,
  onDelete,
  onSuspend,
  onActivate,
  updatingId,
}: OrganizationsTableProps) {
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const sortedOrganizations = useMemo(() => {
    const arr = [...organizations];
    return arr.sort((a, b) => {
    const key = sortBy as keyof Organization;
    const aVal = a[key];
    const bVal = b[key];

    if (sortBy === 'created_at') {
      const aTime = new Date(aVal as string).getTime();
      const bTime = new Date(bVal as string).getTime();
        return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
    }

    const aString = String(aVal).toLowerCase();
    const bString = String(bVal).toLowerCase();

      if (sortOrder === 'asc') {
        return aString > bString ? 1 : -1;
      } else {
        return aString < bString ? 1 : -1;
      }
    });
  }, [organizations, sortBy, sortOrder]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className: string; label: string }> = {
      ACTIVE: { variant: 'default', className: 'bg-green-500 hover:bg-green-600 text-white', label: 'Activo' },
      TRIAL: { variant: 'secondary', className: 'bg-blue-500 hover:bg-blue-600 text-white', label: 'Prueba' },
      SUSPENDED: { variant: 'secondary', className: 'bg-amber-500 hover:bg-amber-600 text-white', label: 'Suspendido' },
      CANCELLED: { variant: 'secondary', className: 'bg-red-500 hover:bg-red-600 text-white', label: 'Cancelado' },
    };

    const config = variants[status] || variants.ACTIVE;
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getPlanBadge = (plan: string) => {
    const variants: Record<string, { className: string }> = {
      FREE: { className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100' },
      PRO: { className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' },
      ENTERPRISE: { className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100' },
    };

    const config = variants[plan] || variants.FREE;
    return (
      <Badge variant="outline" className={config.className}>
        {plan}
      </Badge>
    );
  };

  const calculateRevenue = (org: Organization) => {
    if (org.subscription_status !== 'ACTIVE') return 0;
    if (org.subscription_plan === 'PRO') return 29;
    if (org.subscription_plan === 'ENTERPRISE') return 99;
    return 0;
  };

  const toggleRowExpanded = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('name')}
                className="font-medium hover:bg-transparent"
              >
                Nombre
                <ArrowUpDown className="ml-2 h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">MRR</TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('created_at')}
                className="font-medium hover:bg-transparent"
              >
                Fecha Registro
                <ArrowUpDown className="ml-2 h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedOrganizations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <p>No hay organizaciones registradas.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            sortedOrganizations.map((org) => (
              <React.Fragment key={org.id}>
                <TableRow className="hover:bg-muted/50 transition-colors">
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleRowExpanded(org.id)}
                      className="h-6 w-6 p-0"
                    >
                      {expandedRow === org.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {org.slug}
                  </TableCell>
                  <TableCell>{getPlanBadge(org.subscription_plan)}</TableCell>
                  <TableCell>{getStatusBadge(org.subscription_status)}</TableCell>
                  <TableCell className="text-right font-mono">
                    ${calculateRevenue(org)}
                  </TableCell>
                  <TableCell>
                    {format(new Date(org.created_at), 'dd MMM yyyy', { locale: es })}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          disabled={updatingId === org.id}
                        >
                          {updatingId === org.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled={updatingId === org.id}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Ver Detalles
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={updatingId === org.id}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={updatingId === org.id}>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Gestionar Suscripción
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {org.subscription_status === 'ACTIVE' ? (
                          <DropdownMenuItem
                            onClick={() => onSuspend?.(org.id)}
                            className="text-amber-600"
                            disabled={updatingId === org.id}
                          >
                            <PauseCircle className="mr-2 h-4 w-4" />
                            Suspender
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => onActivate?.(org.id)}
                            className="text-green-600"
                            disabled={updatingId === org.id}
                          >
                            <PlayCircle className="mr-2 h-4 w-4" />
                            Activar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => onDelete?.(org.id)}
                          className="text-destructive"
                          disabled={updatingId === org.id}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>

                {/* Expanded Row Details */}
                {expandedRow === org.id && (
                  <TableRow>
                    <TableCell colSpan={8} className="bg-muted/50">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Información General
                          </h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">ID:</span>
                              <span className="font-mono text-xs">{org.id}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Miembros:</span>
                               <span>{org.members?.[0]?.count ?? org.organization_members?.[0]?.count ?? 0}</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Facturación
                          </h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">MRR:</span>
                              <span className="font-semibold">${calculateRevenue(org)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">ARR:</span>
                              <span className="font-semibold">${calculateRevenue(org) * 12}</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">Enlaces Rápidos</h4>
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm">
                              Ver Dashboard
                            </Button>
                            <Button variant="outline" size="sm">
                              Ver Miembros
                            </Button>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
