'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2, Crown, Loader2 } from 'lucide-react';
import type { Organization } from '@/hooks/use-user-organizations';

interface OrganizationSelectorForConfigProps {
  organizations: Organization[];
  selectedOrganization: Organization | null;
  loading: boolean;
  error: string | null;
  onSelectOrganization: (organization: Organization) => void;
}

export function OrganizationSelectorForConfig({
  organizations,
  selectedOrganization,
  loading,
  error,
  onSelectOrganization,
}: OrganizationSelectorForConfigProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Cargando organizaciones...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2">
        <Building2 className="h-4 w-4 text-red-600" />
        <span className="text-sm text-red-600">{error}</span>
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2">
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
          const organization = organizations.find((item) => item.id === value);
          if (organization) {
            onSelectOrganization(organization);
          }
        }}
      >
        <SelectTrigger className="h-9 w-[300px]">
          <SelectValue placeholder="Seleccionar organizacion..." />
        </SelectTrigger>
        <SelectContent>
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            {organizations.length} organizaciones disponibles
          </div>
          {organizations.map((organization) => (
            <SelectItem key={organization.id} value={organization.id}>
              <div className="flex w-full items-center justify-between gap-2">
                <span className="font-medium">{organization.name}</span>
                <div className="flex items-center gap-1">
                  <Badge
                    variant={organization.subscription_status === 'ACTIVE' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {organization.subscription_plan}
                  </Badge>
                  {organization.subscription_status !== 'ACTIVE' && (
                    <Badge variant="outline" className="text-xs text-orange-600">
                      {organization.subscription_status}
                    </Badge>
                  )}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Badge variant="outline" className="border-yellow-300 bg-yellow-50 text-xs text-yellow-700">
        Super Admin
      </Badge>
    </div>
  );
}
