'use client';

import React, { useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2, Crown, Loader2 } from 'lucide-react';
import { useAllOrganizations } from '@/hooks/use-all-organizations';
import { useUserOrganizations } from '@/hooks/use-user-organizations';
import { useAuth } from '@/hooks/use-auth';

interface OrganizationSelectorForConfigProps {
  onOrganizationChange?: (orgId: string, orgName: string) => void;
}

/**
 * Selector de organización especializado para Business Config
 * 
 * Comportamiento:
 * - Super Admin: Puede ver y seleccionar TODAS las organizaciones
 * - Admin Regular: Solo ve su propia organización (sin selector)
 */
export function OrganizationSelectorForConfig({ 
  onOrganizationChange 
}: OrganizationSelectorForConfigProps) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  
  // Para super admin: obtener todas las organizaciones
  const { 
    organizations: allOrganizations, 
    loading: loadingAll, 
    error: errorAll 
  } = useAllOrganizations();
  
  // Para usuario regular: obtener solo sus organizaciones
  const { 
    selectedOrganization, 
    selectOrganization,
    organizations: userOrganizations,
    loading: loadingUser
  } = useUserOrganizations(user?.id);

  // Determinar qué lista usar
  const organizations = isSuperAdmin ? allOrganizations : userOrganizations;
  const loading = isSuperAdmin ? loadingAll : loadingUser;
  const error = isSuperAdmin ? errorAll : null;

  // Notificar cambios de organización
  useEffect(() => {
    if (selectedOrganization && onOrganizationChange) {
      onOrganizationChange(selectedOrganization.id, selectedOrganization.name);
    }
  }, [selectedOrganization, onOrganizationChange]);

  // Si no es super admin, mostrar solo la organización actual (sin selector)
  if (!isSuperAdmin) {
    if (loadingUser) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/50">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Cargando organización...</span>
        </div>
      );
    }

    if (!selectedOrganization) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-orange-200 bg-orange-50">
          <Building2 className="h-4 w-4 text-orange-600" />
          <span className="text-sm text-orange-600">Sin organización asignada</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/50">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{selectedOrganization.name}</span>
        <Badge variant="outline" className="text-xs">
          {selectedOrganization.subscription_plan}
        </Badge>
      </div>
    );
  }

  // Super Admin: mostrar selector completo
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/50">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Cargando organizaciones...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-red-200 bg-red-50">
        <Building2 className="h-4 w-4 text-red-600" />
        <span className="text-sm text-red-600">{error}</span>
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-orange-200 bg-orange-50">
        <Building2 className="h-4 w-4 text-orange-600" />
        <span className="text-sm text-orange-600">No hay organizaciones disponibles</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Crown className="h-4 w-4 text-yellow-600" />
      <Select
        value={selectedOrganization?.id || ''}
        onValueChange={(value) => {
          const org = organizations.find(o => o.id === value);
          if (org) {
            selectOrganization(org);
          }
        }}
      >
        <SelectTrigger className="w-[280px] h-9">
          <SelectValue placeholder="Seleccionar organización..." />
        </SelectTrigger>
        <SelectContent>
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            {organizations.length} organizaciones disponibles
          </div>
          {organizations.map(org => (
            <SelectItem key={org.id} value={org.id}>
              <div className="flex items-center justify-between w-full gap-2">
                <span className="font-medium">{org.name}</span>
                <div className="flex items-center gap-1">
                  <Badge 
                    variant={org.subscription_status === 'ACTIVE' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {org.subscription_plan}
                  </Badge>
                  {org.subscription_status !== 'ACTIVE' && (
                    <Badge variant="outline" className="text-xs text-orange-600">
                      {org.subscription_status}
                    </Badge>
                  )}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300">
        Super Admin
      </Badge>
    </div>
  );
}
