'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserOrganizations } from '@/hooks/use-user-organizations';
import { useAuth } from '@/hooks/use-auth';

export function OrganizationSelector({ className }: { className?: string }) {
  const { user } = useAuth();
  const { organizations, selectedOrganization, selectOrganization } = useUserOrganizations(user?.id);

  return (
    <Select
      value={selectedOrganization?.id || ''}
      onValueChange={(value) => {
        const org = organizations.find(o => o.id === value);
        if (org) selectOrganization(org);
      }}
    >
      <SelectTrigger className={className || 'w-56 h-9'}>
        <SelectValue placeholder="Selecciona organización" />
      </SelectTrigger>
      <SelectContent>
        {organizations.map(org => (
          <SelectItem key={org.id} value={org.id}>
            {org.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

