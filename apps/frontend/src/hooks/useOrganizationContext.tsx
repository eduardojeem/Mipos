'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  role?: string;
  organizationId?: string;
}

interface OrganizationContextType {
  organizationId: string | undefined;
  selectedOrganization: string | undefined;
  setSelectedOrganization: (orgId: string | undefined) => void;
  isSuperAdmin: boolean;
  isLoading: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

interface OrganizationProviderProps {
  children: ReactNode;
  user?: User | null;
}

export const OrganizationProvider: React.FC<OrganizationProviderProps> = ({ children, user }) => {
  const [selectedOrganization, setSelectedOrganization] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  
  // Para SUPER_ADMIN, usar la organización seleccionada
  // Para otros usuarios, usar su organización
  const organizationId = isSuperAdmin 
    ? selectedOrganization 
    : user?.organizationId;
  
  useEffect(() => {
    if (user) {
      // Si no es SUPER_ADMIN, establecer su organización por defecto
      if (!isSuperAdmin && user.organizationId) {
        setSelectedOrganization(user.organizationId);
      }
      setIsLoading(false);
    }
  }, [user, isSuperAdmin]);
  
  return (
    <OrganizationContext.Provider
      value={{
        organizationId,
        selectedOrganization,
        setSelectedOrganization,
        isSuperAdmin,
        isLoading
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganizationContext = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    // Retornar valores por defecto en lugar de lanzar error
    // para permitir uso fuera del provider
    return {
      organizationId: undefined,
      selectedOrganization: undefined,
      setSelectedOrganization: () => {},
      isSuperAdmin: false,
      isLoading: false
    };
  }
  return context;
};

