'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Edit,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  PauseCircle,
  PlayCircle,
  Trash2,
  Users,
} from 'lucide-react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { normalizePlanSlug } from '@/lib/plan-catalog';
import { Organization } from '../hooks/useAdminData';

interface OrganizationsTableProps {
  organizations: Organization[];
  onDelete?: (id: string) => Promise<void>;
  onSuspend?: (id: string) => Promise<void>;
  onActivate?: (id: string) => Promise<void>;
  updatingId?: string | null;
  compact?: boolean;
}

function getMemberCount(org: Organization) {
  return org.members?.[0]?.count ?? org.organization_members?.[0]?.count ?? org.member_count ?? 0;
}

export function OrganizationsTable({
  organizations,
  onDelete,
  onSuspend,
  onActivate,
  updatingId,
  compact = false,
}: OrganizationsTableProps) {
  const [sortBy, setSortBy] = useState<keyof Organization>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const handleSort = (column: keyof Organization) => {
    if (sortBy === column) {
      setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const sortedOrganizations = useMemo(() => {
    return [...organizations].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];

      if (sortBy === 'created_at') {
        const aTime = new Date(String(aVal || '')).getTime();
        const bTime = new Date(String(bVal || '')).getTime();
        return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
      }

      const aString = String(aVal || '').toLowerCase();
      const bString = String(bVal || '').toLowerCase();
      return sortOrder === 'asc' ? aString.localeCompare(bString) : bString.localeCompare(aString);
    });
  }, [organizations, sortBy, sortOrder]);

  const getStatusBadge = (status: string) => {
    const normalized = String(status || 'ACTIVE').toUpperCase();
    const variants: Record<string, string> = {
      ACTIVE: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300',
      TRIAL: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300',
      TRIALING: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300',
      SUSPENDED: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300',
      CANCELLED: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300',
    };

    return (
      <Badge variant="outline" className={`rounded-md ${variants[normalized] || variants.ACTIVE}`}>
        {normalized}
      </Badge>
    );
  };

  const getPlanBadge = (plan: string) => {
    const normalized = normalizePlanSlug(plan).toUpperCase();
    const variants: Record<string, string> = {
      FREE: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
      STARTER: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
      PROFESSIONAL: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100',
      ENTERPRISE: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
    };

    return (
      <Badge variant="outline" className={`rounded-md ${variants[normalized] || variants.FREE}`}>
        {normalized}
      </Badge>
    );
  };

  const colSpan = compact ? 7 : 8;

  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12" />
            <TableHead>
              <Button variant="ghost" size="sm" onClick={() => handleSort('name')} className="font-medium hover:bg-transparent">
                Nombre
                <ArrowUpDown className="ml-2 h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Estado</TableHead>
            {!compact && <TableHead>Miembros</TableHead>}
            <TableHead>
              <Button variant="ghost" size="sm" onClick={() => handleSort('created_at')} className="font-medium hover:bg-transparent">
                Registro
                <ArrowUpDown className="ml-2 h-3 w-3" />
              </Button>
            </TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedOrganizations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colSpan} className="h-24 text-center text-muted-foreground">
                No hay organizaciones registradas.
              </TableCell>
            </TableRow>
          ) : (
            sortedOrganizations.map((org) => (
              <React.Fragment key={org.id}>
                <TableRow className="transition-colors hover:bg-muted/50">
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedRow(expandedRow === org.id ? null : org.id)}
                      className="h-6 w-6 p-0"
                    >
                      {expandedRow === org.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{org.slug}</TableCell>
                  <TableCell>{getPlanBadge(org.subscription_plan)}</TableCell>
                  <TableCell>{getStatusBadge(org.subscription_status)}</TableCell>
                  {!compact && <TableCell>{getMemberCount(org)}</TableCell>}
                  <TableCell>{format(new Date(org.created_at), 'dd MMM yyyy', { locale: es })}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={updatingId === org.id}>
                          {updatingId === org.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/superadmin/organizations/${org.id}`}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Ver detalles
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/superadmin/organizations/${org.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/superadmin/organizations/${org.id}`}>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Gestionar suscripción
                          </Link>
                        </DropdownMenuItem>
                        {(onSuspend || onActivate || onDelete) && <DropdownMenuSeparator />}
                        {onSuspend && org.subscription_status === 'ACTIVE' && (
                          <DropdownMenuItem onClick={() => onSuspend(org.id)} className="text-amber-600" disabled={updatingId === org.id}>
                            <PauseCircle className="mr-2 h-4 w-4" />
                            Suspender
                          </DropdownMenuItem>
                        )}
                        {onActivate && org.subscription_status !== 'ACTIVE' && (
                          <DropdownMenuItem onClick={() => onActivate(org.id)} className="text-green-600" disabled={updatingId === org.id}>
                            <PlayCircle className="mr-2 h-4 w-4" />
                            Activar
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <DropdownMenuItem onClick={() => onDelete(org.id)} className="text-destructive" disabled={updatingId === org.id}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>

                {expandedRow === org.id && (
                  <TableRow>
                    <TableCell colSpan={colSpan} className="bg-muted/50">
                      <div className="grid gap-4 p-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <h4 className="flex items-center gap-2 text-sm font-semibold">
                            <Users className="h-4 w-4" />
                            Informacion general
                          </h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between gap-3">
                              <span className="text-muted-foreground">ID:</span>
                              <span className="truncate font-mono text-xs">{org.id}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Miembros:</span>
                              <span>{getMemberCount(org)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="flex items-center gap-2 text-sm font-semibold">
                            <CreditCard className="h-4 w-4" />
                            Suscripcion
                          </h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Plan:</span>
                              <span className="font-semibold">{normalizePlanSlug(org.subscription_plan).toUpperCase()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Estado:</span>
                              <span className="font-semibold">{String(org.subscription_status || 'ACTIVE').toUpperCase()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold">Enlaces rapidos</h4>
                          <div className="flex flex-wrap gap-2">
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/superadmin/organizations/${org.id}`}>Ver detalles</Link>
                            </Button>
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/superadmin/organizations/${org.id}`}>Ver miembros</Link>
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
