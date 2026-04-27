'use client';

import { useUserOrganizations } from '@/hooks/use-user-organizations';
import { useAuth } from '@/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, Check, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

export function OrganizationSwitcher() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const {
    organizations,
    selectedOrganization,
    selectOrganization,
    loading,
  } = useUserOrganizations(user?.id);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm hidden md:inline">Cargando...</span>
      </div>
    );
  }

  if (organizations.length === 0) {
    return null;
  }

  if (organizations.length === 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
        <Building2 className="h-4 w-4 text-primary" />
        <div className="hidden md:flex flex-col">
          <span className="text-sm font-medium">{organizations[0].name}</span>
          <span className="text-xs text-muted-foreground capitalize">
            {organizations[0].subscription_plan.toLowerCase()}
          </span>
        </div>
      </div>
    );
  }

  const refreshQueryKeys: readonly string[][] = [
    ['dashboard-optimized-summary'],
    ['products'],
    ['products-list'],
    ['products-summary'],
    ['product-stats'],
    ['product-categories'],
    ['orders'],
    ['orders-stats'],
    ['sales'],
    ['sales-summary'],
    ['sales-summary-optimized'],
    ['recent-sales'],
    ['recent-sales-optimized'],
    ['customers'],
    ['suppliers'],
    ['company-profile'],
    ['plan-limits'],
    ['system-settings'],
    ['business-config'],
    ['sales-report'],
    ['inventory-report'],
    ['customer-report'],
    ['financial-report'],
    ['stock-alerts'],
    ['stock-alerts-stats'],
    ['cashSession'],
    ['cashSessions'],
    ['cashMovements'],
    ['returns'],
    ['returns-stats'],
    ['loyalty'],
    ['pos'],
  ];

  const handleOrganizationChange = (orgId: string) => {
    const org = organizations.find((item) => item.id === orgId);
    if (!org || selectedOrganization?.id === org.id) return;

    selectOrganization(org);
    refreshQueryKeys.forEach((queryKey) => {
      void queryClient.invalidateQueries({ queryKey });
    });
  };

  const getSubscriptionBadgeColor = (plan: string) => {
    switch (plan.toUpperCase()) {
      case 'ENTERPRISE':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20';
      case 'PRO':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20';
      case 'FREE':
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20';
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20';
    }
  };

  const getStatusIndicator = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return <div className="h-2 w-2 rounded-full bg-green-500" />;
      case 'TRIAL':
        return <div className="h-2 w-2 rounded-full bg-yellow-500" />;
      case 'SUSPENDED':
        return <div className="h-2 w-2 rounded-full bg-red-500" />;
      default:
        return <div className="h-2 w-2 rounded-full bg-gray-500" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="gap-2 h-auto py-2 hover:bg-muted/50 transition-colors"
        >
          <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
          <div className="hidden md:flex flex-col items-start min-w-0">
            <span className="text-sm font-medium truncate max-w-[150px]">
              {selectedOrganization?.name || 'Seleccionar organizacion'}
            </span>
            {selectedOrganization && (
              <span className="text-xs text-muted-foreground capitalize">
                {selectedOrganization.subscription_plan.toLowerCase()}
              </span>
            )}
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Tus Organizaciones</p>
            <p className="text-xs leading-none text-muted-foreground">
              Cambia entre tus organizaciones
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => {
          const isSelected = selectedOrganization?.id === org.id;
          return (
            <DropdownMenuItem
              key={org.id}
              onClick={() => handleOrganizationChange(org.id)}
              className={cn(
                'cursor-pointer py-3 px-2 focus:bg-accent/50',
                isSelected && 'bg-accent/30'
              )}
            >
              <div className="flex items-center justify-between w-full gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    {getStatusIndicator(org.subscription_status)}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {org.name}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs px-1.5 py-0 h-5 font-medium',
                          getSubscriptionBadgeColor(org.subscription_plan)
                        )}
                      >
                        {org.subscription_plan}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {org.slug}
                    </span>
                  </div>
                </div>
                {isSelected && (
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                )}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
