import React from 'react';
import { 
  Search, Filter, X, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MobileFilters } from '@/components/ui/mobile-responsive';
import type { CustomersPageState } from '@/types/customer-page';

interface CustomerFiltersPanelProps {
  state: CustomersPageState;
  setState: React.Dispatch<React.SetStateAction<CustomersPageState>>;
  loadCustomers: () => void;
  isMobile: boolean;
}

export const CustomerFiltersPanel: React.FC<CustomerFiltersPanelProps> = ({
  state,
  setState,
  loadCustomers,
  isMobile
}) => {
  if (!state.showFilters) return null;

  return (
    <Card className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 border-gray-200 dark:border-gray-700 shadow-lg mb-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg font-semibold">Filtros Avanzados</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setState(prev => ({ 
              ...prev, 
              filters: { 
                status: 'all', 
                type: 'all', 
                search: '',
                dateFrom: '',
                dateTo: '',
                minOrders: '',
                maxOrders: '',
                minSpent: '',
                maxSpent: '',
                segment: 'all',
                tags: [],
                riskLevel: 'all'
              },
              searchQuery: '',
              currentPage: 1 
            }))}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4 mr-1" />
            Limpiar
          </Button>
        </div>
      </CardHeader>
      <CardContent className={isMobile ? "p-4 pt-0" : "p-6 pt-0"}>
        {isMobile ? (
          // Mobile Filters Layout - Enhanced
          <div className="space-y-6">
            {/* Search Bar - Enhanced */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Búsqueda</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nombre, email o código..."
                  value={state.searchQuery}
                  onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value, currentPage: 1 }))}
                  className="pl-10 h-12 bg-background border-input focus-visible:ring-ring rounded-lg"
                />
              </div>
            </div>

            {/* Quick Filters - Enhanced Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Estado</Label>
                <Select 
                  value={state.filters.status} 
                  onValueChange={(value: any) => setState(prev => ({ 
                    ...prev, 
                    filters: { ...prev.filters, status: value },
                    currentPage: 1 
                  }))}
                >
                  <SelectTrigger className="h-12 bg-background border-input focus-visible:ring-ring rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Activos</SelectItem>
                    <SelectItem value="inactive">Inactivos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Tipo</Label>
                <Select 
                  value={state.filters.type} 
                  onValueChange={(value: any) => setState(prev => ({ 
                    ...prev, 
                    filters: { ...prev.filters, type: value },
                    currentPage: 1 
                  }))}
                >
                  <SelectTrigger className="h-12 bg-background border-input focus-visible:ring-ring rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                    <SelectItem value="wholesale">Mayorista</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sort Option - Enhanced */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Ordenar por</Label>
              <Select value={state.sortBy} onValueChange={(value: any) => setState(prev => ({ ...prev, sortBy: value }))}>
                <SelectTrigger className="h-12 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nombre</SelectItem>
                  <SelectItem value="created_at">Fecha de Registro</SelectItem>
                  <SelectItem value="totalSpent">Total Gastado</SelectItem>
                  <SelectItem value="totalOrders">Número de Compras</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Advanced Filters - Enhanced Collapsible */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="space-y-4">
                {/* Date Range - Enhanced */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Rango de Fechas
                  </Label>
                  <div className="space-y-3">
                    <Input
                      type="date"
                      placeholder="Desde"
                      value={state.filters.dateFrom || ''}
                      onChange={(e) => setState(prev => ({ 
                        ...prev, 
                        filters: { ...prev.filters, dateFrom: e.target.value },
                        currentPage: 1 
                      }))}
                      className="h-12 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 rounded-lg"
                    />
                    <Input
                      type="date"
                      placeholder="Hasta"
                      value={state.filters.dateTo || ''}
                      onChange={(e) => setState(prev => ({ 
                        ...prev, 
                        filters: { ...prev.filters, dateTo: e.target.value },
                        currentPage: 1 
                      }))}
                      className="h-11"
                    />
                  </div>
                </div>

                {/* Orders Range */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Rango de Compras</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={state.filters.minOrders || ''}
                      onChange={(e) => setState(prev => ({ 
                        ...prev, 
                        filters: { ...prev.filters, minOrders: e.target.value },
                        currentPage: 1 
                      }))}
                      className="h-11"
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={state.filters.maxOrders || ''}
                      onChange={(e) => setState(prev => ({ 
                        ...prev, 
                        filters: { ...prev.filters, maxOrders: e.target.value },
                        currentPage: 1 
                      }))}
                      className="h-11"
                    />
                  </div>
                </div>

                {/* Spending Range */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Rango de Gasto</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={state.filters.minSpent || ''}
                      onChange={(e) => setState(prev => ({ 
                        ...prev, 
                        filters: { ...prev.filters, minSpent: e.target.value },
                        currentPage: 1 
                      }))}
                      className="h-11"
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={state.filters.maxSpent || ''}
                      onChange={(e) => setState(prev => ({ 
                        ...prev, 
                        filters: { ...prev.filters, maxSpent: e.target.value },
                        currentPage: 1 
                      }))}
                      className="h-11"
                    />
                  </div>
                </div>

                {/* Segmentation */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Segmentación</Label>
                  <Select 
                    value={state.filters.segment || 'all'} 
                    onValueChange={(value: any) => setState(prev => ({ 
                      ...prev, 
                      filters: { ...prev.filters, segment: value },
                      currentPage: 1 
                    }))}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los Segmentos</SelectItem>
                      <SelectItem value="new">Nuevos (0-2 compras)</SelectItem>
                      <SelectItem value="regular">Regulares (3-10 compras)</SelectItem>
                      <SelectItem value="frequent">Frecuentes (11-25 compras)</SelectItem>
                      <SelectItem value="vip">VIP (25+ compras)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Action Buttons - Mobile */}
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                size="lg" 
                onClick={() => setState(prev => ({ 
                  ...prev, 
                  filters: { status: 'all', type: 'all', search: '' },
                  searchQuery: '',
                  currentPage: 1 
                }))}
                className="flex-1 h-11"
              >
                <X className="h-4 w-4 mr-2" />
                Limpiar
              </Button>
              <Button 
                size="lg" 
                onClick={() => loadCustomers()}
                className="flex-1 h-11"
              >
                <Search className="h-4 w-4 mr-2" />
                Aplicar
              </Button>
            </div>
          </div>
        ) : (
          // Desktop Filters Layout
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nombre, email o código..."
                  value={state.searchQuery}
                  onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value, currentPage: 1 }))}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select 
                value={state.filters.status} 
                onValueChange={(value: any) => setState(prev => ({ 
                  ...prev, 
                  filters: { ...prev.filters, status: value },
                  currentPage: 1 
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select 
                value={state.filters.type} 
                onValueChange={(value: any) => setState(prev => ({ 
                  ...prev, 
                  filters: { ...prev.filters, type: value },
                  currentPage: 1 
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="wholesale">Mayorista</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Ordenar por</Label>
              <Select value={state.sortBy} onValueChange={(value: any) => setState(prev => ({ ...prev, sortBy: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nombre</SelectItem>
                  <SelectItem value="created_at">Fecha de Registro</SelectItem>
                  <SelectItem value="totalSpent">Total Gastado</SelectItem>
                  <SelectItem value="totalOrders">Número de Compras</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtros Avanzados */}
            <div className="space-y-2">
              <Label>Rango de Fechas</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    type="date"
                    placeholder="Desde"
                    value={state.filters.dateFrom || ''}
                    onChange={(e) => setState(prev => ({ 
                      ...prev, 
                      filters: { ...prev.filters, dateFrom: e.target.value },
                      currentPage: 1 
                    }))}
                  />
                </div>
                <div>
                  <Input
                    type="date"
                    placeholder="Hasta"
                    value={state.filters.dateTo || ''}
                    onChange={(e) => setState(prev => ({ 
                      ...prev, 
                      filters: { ...prev.filters, dateTo: e.target.value },
                      currentPage: 1 
                    }))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Rango de Compras</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    type="number"
                    placeholder="Min compras"
                    value={state.filters.minOrders || ''}
                    onChange={(e) => setState(prev => ({ 
                      ...prev, 
                      filters: { ...prev.filters, minOrders: e.target.value },
                      currentPage: 1 
                    }))}
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    placeholder="Max compras"
                    value={state.filters.maxOrders || ''}
                    onChange={(e) => setState(prev => ({ 
                      ...prev, 
                      filters: { ...prev.filters, maxOrders: e.target.value },
                      currentPage: 1 
                    }))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Rango de Gasto Total</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    type="number"
                    placeholder="Min gasto"
                    value={state.filters.minSpent || ''}
                    onChange={(e) => setState(prev => ({ 
                      ...prev, 
                      filters: { ...prev.filters, minSpent: e.target.value },
                      currentPage: 1 
                    }))}
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    placeholder="Max gasto"
                    value={state.filters.maxSpent || ''}
                    onChange={(e) => setState(prev => ({ 
                      ...prev, 
                      filters: { ...prev.filters, maxSpent: e.target.value },
                      currentPage: 1 
                    }))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Segmentación</Label>
              <Select 
                value={state.filters.segment || 'all'} 
                onValueChange={(value: any) => setState(prev => ({ 
                  ...prev, 
                  filters: { ...prev.filters, segment: value },
                  currentPage: 1 
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Segmentos</SelectItem>
                  <SelectItem value="new">Nuevos (0-2 compras)</SelectItem>
                  <SelectItem value="regular">Regulares (3-10 compras)</SelectItem>
                  <SelectItem value="frequent">Frecuentes (11-25 compras)</SelectItem>
                  <SelectItem value="vip">VIP (25+ compras)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setState(prev => ({ 
                  ...prev, 
                  filters: { status: 'all', type: 'all', search: '' },
                  searchQuery: '',
                  currentPage: 1 
                }))}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Limpiar
              </Button>
              <Button 
                size="sm" 
                onClick={() => loadCustomers()}
                className="flex-1"
              >
                <Search className="h-4 w-4 mr-2" />
                Aplicar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
