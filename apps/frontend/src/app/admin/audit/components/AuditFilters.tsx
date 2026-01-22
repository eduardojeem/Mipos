'use client'

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Filter, 
  Calendar, 
  X, 
  Search,
  Clock,
  User,
  Database,
  Activity,
  Tag
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface AuditFiltersProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
  theme: 'light' | 'dark';
}

export function AuditFilters({ filters, onFiltersChange, theme }: AuditFiltersProps) {
  const [actionOptions, setActionOptions] = useState<string[]>([]);
  const [resourceOptions, setResourceOptions] = useState<string[]>([]);
  const [userOptions, setUserOptions] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Cargar opciones de filtros
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [actionsRes, resourcesRes, usersRes] = await Promise.all([
          fetch('/api/admin/audit/meta?type=actions'),
          fetch('/api/admin/audit/meta?type=resources'),
          fetch('/api/admin/audit/meta?type=users')
        ]);

        const [actions, resources, users] = await Promise.all([
          actionsRes.json(),
          resourcesRes.json(),
          usersRes.json()
        ]);

        setActionOptions(actions.data || []);
        setResourceOptions(resources.data || []);
        setUserOptions(users.data || []);
      } catch (error) {
        console.error('Error fetching filter options:', error);
      }
    };

    fetchFilterOptions();
  }, []);

  const setQuickDateFilter = (days: number) => {
    const endDate = new Date();
    const startDate = subDays(endDate, days);
    onFiltersChange({
      ...filters,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      action: '',
      resource: '',
      userId: '',
      userEmail: '',
      startDate: '',
      endDate: '',
      status: '',
      search: '',
      ipAddress: '',
      tags: []
    });
  };

  const addTag = (tag: string) => {
    if (tag && !filters.tags?.includes(tag)) {
      onFiltersChange({
        ...filters,
        tags: [...(filters.tags || []), tag]
      });
    }
  };

  const removeTag = (tag: string) => {
    onFiltersChange({
      ...filters,
      tags: (filters.tags || []).filter((t: string) => t !== tag)
    });
  };

  const activeFiltersCount = Object.values(filters).filter(value => 
    value && (Array.isArray(value) ? value.length > 0 : true)
  ).length;

  return (
    <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros Avanzados</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary">{activeFiltersCount} activos</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Contraer' : 'Expandir'}
            </Button>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Filtros rápidos de fecha */}
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setQuickDateFilter(1)}>
            <Calendar className="h-4 w-4 mr-1" /> Hoy
          </Button>
          <Button variant="outline" size="sm" onClick={() => setQuickDateFilter(7)}>
            Últimos 7 días
          </Button>
          <Button variant="outline" size="sm" onClick={() => setQuickDateFilter(30)}>
            Últimos 30 días
          </Button>
          <Button variant="outline" size="sm" onClick={() => setQuickDateFilter(90)}>
            Últimos 90 días
          </Button>
        </div>

        {/* Filtros principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <Activity className="h-4 w-4" />
              Acción
            </label>
            <Select 
              value={filters.action} 
              onValueChange={(value) => onFiltersChange({ ...filters, action: value === 'all' ? '' : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas las acciones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las acciones</SelectItem>
                {actionOptions.map(action => (
                  <SelectItem key={action} value={action}>
                    {action.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <Database className="h-4 w-4" />
              Recurso
            </label>
            <Select 
              value={filters.resource} 
              onValueChange={(value) => onFiltersChange({ ...filters, resource: value === 'all' ? '' : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los recursos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los recursos</SelectItem>
                {resourceOptions.map(resource => (
                  <SelectItem key={resource} value={resource}>
                    {resource}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <User className="h-4 w-4" />
              Usuario
            </label>
            <Select 
              value={filters.userEmail} 
              onValueChange={(value) => onFiltersChange({ ...filters, userEmail: value === 'all' ? '' : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los usuarios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los usuarios</SelectItem>
                {userOptions.map(user => (
                  <SelectItem key={user} value={user}>
                    {user}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Estado</label>
            <Select 
              value={filters.status} 
              onValueChange={(value) => onFiltersChange({ ...filters, status: value === 'all' ? '' : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="SUCCESS">Exitoso</SelectItem>
                <SelectItem value="FAILURE">Fallido</SelectItem>
                <SelectItem value="PENDING">Pendiente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filtros expandidos */}
        {isExpanded && (
          <div className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Fecha inicio
                </label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Fecha fin
                </label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Dirección IP</label>
                <Input
                  type="text"
                  placeholder="192.168.1.1"
                  value={filters.ipAddress}
                  onChange={(e) => onFiltersChange({ ...filters, ipAddress: e.target.value })}
                />
              </div>
            </div>

            {/* Sistema de etiquetas */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Tag className="h-4 w-4" />
                Etiquetas personalizadas
              </label>
              <div className="flex gap-2 items-center">
                <Input
                  type="text"
                  placeholder="Agregar etiqueta..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addTag(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const input = document.querySelector('input[placeholder="Agregar etiqueta..."]') as HTMLInputElement;
                    if (input?.value) {
                      addTag(input.value);
                      input.value = '';
                    }
                  }}
                >
                  Agregar
                </Button>
              </div>
              
              {filters.tags && filters.tags.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {filters.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Búsqueda global */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1">
            <Search className="h-4 w-4" />
            Búsqueda global
          </label>
          <Input
            type="text"
            placeholder="Buscar en todos los campos..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
}