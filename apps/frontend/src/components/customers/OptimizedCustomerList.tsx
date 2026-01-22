import React, { memo, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Edit, Eye, Trash2, Phone, Mail, MapPin } from 'lucide-react';
import { UICustomer } from '@/lib/customer-service';
import { PERFORMANCE_CONFIG } from '@/config/performance';

interface OptimizedCustomerListProps {
  customers: UICustomer[];
  onEdit: (customer: UICustomer) => void;
  onView: (customer: UICustomer) => void;
  onDelete: (customerId: string) => void;
  loading?: boolean;
}

// Componente memoizado para cada tarjeta de cliente
const CustomerCard = memo(({ 
  customer, 
  onEdit, 
  onView, 
  onDelete 
}: {
  customer: UICustomer;
  onEdit: (customer: UICustomer) => void;
  onView: (customer: UICustomer) => void;
  onDelete: (customerId: string) => void;
}) => {
  // Memoizar las funciones de callback para evitar re-renders
  const handleEdit = useCallback(() => onEdit(customer), [onEdit, customer]);
  const handleView = useCallback(() => onView(customer), [onView, customer]);
  const handleDelete = useCallback(() => onDelete(customer.id), [onDelete, customer.id]);

  // Memoizar el cálculo de las iniciales
  const initials = useMemo(() => {
    return customer.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [customer.name]);

  // Memoizar el formato de moneda
  const formattedSpent = useMemo(() => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(customer.totalSpent || 0);
  }, [customer.totalSpent]);

  // Memoizar el formato de fecha
  const formattedDate = useMemo(() => {
    return new Date(customer.created_at).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, [customer.created_at]);

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <CardContent className="p-6">
        {/* Header con Avatar y Información Principal */}
        <div className="flex items-start gap-4 mb-4">
          <Avatar className="h-12 w-12 ring-2 ring-blue-100 dark:ring-blue-900">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {customer.name}
              </h3>
              {customer.customerType === 'vip' && (
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs">
                  VIP
                </Badge>
              )}
              <Badge 
                variant={customer.is_active ? "default" : "secondary"}
                className={customer.is_active 
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                  : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                }
              >
                {customer.is_active ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Código: {customer.customer_code || customer.customerCode || 'N/A'}
            </p>
            
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Cliente desde: {formattedDate}
            </p>
          </div>
        </div>

        {/* Información de Contacto */}
        <div className="space-y-2 mb-4">
          {customer.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Mail className="h-4 w-4 text-blue-500" />
              <span className="truncate">{customer.email}</span>
            </div>
          )}
          
          {customer.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Phone className="h-4 w-4 text-green-500" />
              <span>{customer.phone}</span>
            </div>
          )}
          
          {customer.address && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <MapPin className="h-4 w-4 text-red-500" />
              <span className="truncate">{customer.address}</span>
            </div>
          )}
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="text-center">
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {formattedSpent}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Gastado</p>
          </div>
          
          <div className="text-center">
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              {customer.totalOrders || 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Pedidos</p>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleView}
            className="flex-1 hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-900/20"
            title="Ver detalles"
          >
            <Eye className="h-4 w-4 mr-1" />
            Ver
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleEdit}
            className="flex-1 hover:bg-green-50 hover:border-green-300 dark:hover:bg-green-900/20"
            title="Editar cliente"
          >
            <Edit className="h-4 w-4 mr-1" />
            Editar
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            className="hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
            title="Eliminar cliente"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

CustomerCard.displayName = 'CustomerCard';

// Componente principal optimizado
export const OptimizedCustomerList = memo(({
  customers,
  onEdit,
  onView,
  onDelete,
  loading = false
}: OptimizedCustomerListProps) => {
  // Memoizar la lista de clientes para evitar re-renders innecesarios
  const memoizedCustomers = useMemo(() => customers, [customers]);

  // Skeleton loader para estado de carga
  const SkeletonCard = memo(() => (
    <Card className="animate-pulse">
      <CardContent className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
        <div className="space-y-2 mb-4">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
        </div>
      </CardContent>
    </Card>
  ));

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: PERFORMANCE_CONFIG.PAGINATION.CUSTOMERS_PER_PAGE }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    );
  }

  if (memoizedCustomers.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No hay clientes
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          No se encontraron clientes que coincidan con los filtros aplicados.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {memoizedCustomers.map((customer) => (
        <CustomerCard
          key={customer.id}
          customer={customer}
          onEdit={onEdit}
          onView={onView}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
});

OptimizedCustomerList.displayName = 'OptimizedCustomerList';