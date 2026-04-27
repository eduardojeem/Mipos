'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from '@/lib/toast';
import { Progress } from '@/components/ui/progress';
import { 
  Search, 
  MoreVertical, 
  XCircle, 
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate } from '@/lib/utils';

interface Subscription {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  planId: string;
  planName: string;
  planPrice: number;
  planInterval: string;
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'paused';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
  trialStart?: string;
  trialEnd?: string;
  createdAt: string;
}

interface SubscriptionUsage {
  usage: {
    usersCount: number;
    productsCount: number;
    salesCount: number;
    storageUsed: number;
    apiCallsCount: number;
  };
  limits: {
    users: number;
    products: number;
    sales: number;
    storage: number;
    apiCalls: number;
  };
}

export default function SubscriptionsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page] = useState(1);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [isUsageDialogOpen, setIsUsageDialogOpen] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch subscriptions
  const { data, isLoading } = useQuery({
    queryKey: ['subscriptions', page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(statusFilter !== 'all' && { status: statusFilter })
      });
      
      const response = await fetch(`/api/superadmin/subscriptions-v2?${params}`);
      if (!response.ok) throw new Error('Failed to fetch subscriptions');
      return response.json();
    }
  });

  // Fetch usage for selected subscription
  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ['subscription-usage', selectedSubscription?.id],
    queryFn: async () => {
      if (!selectedSubscription) return null;
      const response = await fetch(`/api/superadmin/subscriptions-v2/${selectedSubscription.id}/usage`);
      if (!response.ok) throw new Error('Failed to fetch usage');
      const json = await response.json();
      return json.data as SubscriptionUsage;
    },
    enabled: !!selectedSubscription && isUsageDialogOpen
  });

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: async ({ id, immediate }: { id: string; immediate: boolean }) => {
      const response = await fetch(`/api/superadmin/subscriptions-v2/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ immediate })
      });
      if (!response.ok) throw new Error('Failed to cancel subscription');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast({
        title: 'Suscripción cancelada',
        description: 'La suscripción se canceló exitosamente'
      });
    }
  });

  // Reactivate subscription mutation
  const reactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/superadmin/subscriptions-v2/${id}/reactivate`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to reactivate subscription');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast({
        title: 'Suscripción reactivada',
        description: 'La suscripción se reactivó exitosamente'
      });
    }
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      active: { variant: 'default', label: 'Activa' },
      trialing: { variant: 'secondary', label: 'Prueba' },
      past_due: { variant: 'destructive', label: 'Vencida' },
      canceled: { variant: 'outline', label: 'Cancelada' },
      paused: { variant: 'secondary', label: 'Pausada' }
    };
    const config = variants[status] || variants.active;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const getIntervalLabel = (interval: string) => {
    const labels: Record<string, string> = {
      monthly: 'mes',
      yearly: 'año',
      quarterly: 'trimestre'
    };
    return labels[interval] || interval;
  };

  const calculateUsagePercentage = (current: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 95) return 'text-red-600';
    if (percentage >= 80) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Suscripciones</h1>
          <p className="text-muted-foreground">
            Gestiona las suscripciones activas de las organizaciones
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por organización..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activas</SelectItem>
                <SelectItem value="trialing">En prueba</SelectItem>
                <SelectItem value="past_due">Vencidas</SelectItem>
                <SelectItem value="canceled">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Suscripciones</CardTitle>
          <CardDescription>
            {data?.pagination?.total || 0} suscripciones en total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organización</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Período Actual</TableHead>
                <TableHead>Creada</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : data?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No se encontraron suscripciones
                  </TableCell>
                </TableRow>
              ) : (
                data?.data?.map((sub: Subscription) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{sub.organizationName}</div>
                        <div className="text-sm text-muted-foreground">{sub.organizationSlug}</div>
                      </div>
                    </TableCell>
                    <TableCell>{sub.planName}</TableCell>
                    <TableCell>
                      <div className="flex items-baseline gap-1">
                        <span className="font-medium">{formatPrice(sub.planPrice)}</span>
                        <span className="text-xs text-muted-foreground">/{getIntervalLabel(sub.planInterval)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getStatusBadge(sub.status)}
                        {sub.cancelAtPeriodEnd && (
                          <div className="text-xs text-muted-foreground">
                            Cancela: {formatDate(sub.currentPeriodEnd)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{formatDate(sub.currentPeriodStart)}</div>
                        <div className="text-muted-foreground">hasta {formatDate(sub.currentPeriodEnd)}</div>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(sub.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedSubscription(sub);
                            setIsUsageDialogOpen(true);
                          }}>
                            <TrendingUp className="mr-2 h-4 w-4" />
                            Ver Uso
                          </DropdownMenuItem>
                          {sub.status === 'active' && !sub.cancelAtPeriodEnd && (
                            <DropdownMenuItem 
                              onClick={() => cancelMutation.mutate({ id: sub.id, immediate: false })}
                              className="text-destructive"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancelar
                            </DropdownMenuItem>
                          )}
                          {(sub.status === 'canceled' || sub.cancelAtPeriodEnd) && (
                            <DropdownMenuItem onClick={() => reactivateMutation.mutate(sub.id)}>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Reactivar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Usage Dialog */}
      <Dialog open={isUsageDialogOpen} onOpenChange={setIsUsageDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Uso de Recursos</DialogTitle>
            <DialogDescription>
              {selectedSubscription?.organizationName} - {selectedSubscription?.planName}
            </DialogDescription>
          </DialogHeader>
          
          {usageLoading ? (
            <div className="py-8 text-center">Cargando uso...</div>
          ) : usageData ? (
            <div className="space-y-6">
              {/* Usuarios */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Usuarios</Label>
                  <span className="text-sm font-medium">
                    {usageData.usage.usersCount} / {usageData.limits.users === -1 ? '∞' : usageData.limits.users}
                  </span>
                </div>
                <Progress 
                  value={calculateUsagePercentage(usageData.usage.usersCount, usageData.limits.users)} 
                  className="h-2"
                />
                <p className={`text-xs ${getUsageColor(calculateUsagePercentage(usageData.usage.usersCount, usageData.limits.users))}`}>
                  {calculateUsagePercentage(usageData.usage.usersCount, usageData.limits.users).toFixed(1)}% usado
                </p>
              </div>

              {/* Productos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Productos</Label>
                  <span className="text-sm font-medium">
                    {usageData.usage.productsCount} / {usageData.limits.products === -1 ? '∞' : usageData.limits.products}
                  </span>
                </div>
                <Progress 
                  value={calculateUsagePercentage(usageData.usage.productsCount, usageData.limits.products)} 
                  className="h-2"
                />
                <p className={`text-xs ${getUsageColor(calculateUsagePercentage(usageData.usage.productsCount, usageData.limits.products))}`}>
                  {calculateUsagePercentage(usageData.usage.productsCount, usageData.limits.products).toFixed(1)}% usado
                </p>
              </div>

              {/* Almacenamiento */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Almacenamiento</Label>
                  <span className="text-sm font-medium">
                    {(usageData.usage.storageUsed / (1024 * 1024 * 1024)).toFixed(2)} GB / {usageData.limits.storage === -1 ? '∞' : usageData.limits.storage} GB
                  </span>
                </div>
                <Progress 
                  value={calculateUsagePercentage(usageData.usage.storageUsed / (1024 * 1024 * 1024), usageData.limits.storage)} 
                  className="h-2"
                />
                <p className={`text-xs ${getUsageColor(calculateUsagePercentage(usageData.usage.storageUsed / (1024 * 1024 * 1024), usageData.limits.storage))}`}>
                  {calculateUsagePercentage(usageData.usage.storageUsed / (1024 * 1024 * 1024), usageData.limits.storage).toFixed(1)}% usado
                </p>
              </div>

              {/* Ventas (este mes) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Ventas (este mes)</Label>
                  <span className="text-sm font-medium">
                    {usageData.usage.salesCount} / {usageData.limits.sales === -1 ? '∞' : usageData.limits.sales}
                  </span>
                </div>
                {usageData.limits.sales !== -1 && (
                  <>
                    <Progress 
                      value={calculateUsagePercentage(usageData.usage.salesCount, usageData.limits.sales)} 
                      className="h-2"
                    />
                    <p className={`text-xs ${getUsageColor(calculateUsagePercentage(usageData.usage.salesCount, usageData.limits.sales))}`}>
                      {calculateUsagePercentage(usageData.usage.salesCount, usageData.limits.sales).toFixed(1)}% usado
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUsageDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
