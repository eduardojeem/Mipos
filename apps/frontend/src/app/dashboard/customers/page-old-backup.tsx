'use client';

import { useState, useEffect, useMemo, useCallback, useDeferredValue, memo } from 'react';
import { 
  Plus, Search, Edit, Trash2, Users, Mail, Phone, MapPin, 
  Filter, Download, Upload, MoreVertical, Star, Calendar,
  TrendingUp, Eye, UserCheck, UserX, ChevronDown, X,
  ArrowUpDown, ArrowUp, ArrowDown, User, Building, ShoppingCart,
  Grid3X3, List, ChevronLeft, ChevronRight, MoreHorizontal,
  SortAsc, SortDesc, RefreshCw, CheckCircle, XCircle, BarChart3,
  Target, Tag, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import type { Customer } from '@/types';
import { PermissionGuard, PermissionProvider, usePermissions } from '@/components/ui/permission-guard';
import { ErrorHandler, useErrorHandler } from '@/components/ui/error-handler';
import { useErrorRecovery } from '@/hooks/use-error-recovery';
import { customerService, type CustomerStats, type CustomerFilters } from '@/lib/customer-service';
import { useCustomerLoyalty } from '@/hooks/use-loyalty';
import { CustomerLoyaltyCard } from '@/components/loyalty/customer-loyalty-card';
import { PointsHistory } from '@/components/loyalty/points-history';
import { LoyaltyTabContent } from '@/components/loyalty/loyalty-tab-content';
import { validateCustomerData, validationMessages } from '@/lib/validation-schemas';
import { 
  LazyCustomerAnalytics,
  LazyCustomerTagManager,
  LazyAdvancedSegmentation,
  LazyCommunicationCenter,
  LazyAdvancedSearch,
  LazyLoyaltyProgram,
  LazyCustomerHistory
} from '@/components/customers/LazyCustomerComponents';
import { useCustomerOptimizations } from '@/hooks/useCustomerOptimizations';
import { CustomerFiltersPanel } from '@/components/customers/CustomerFiltersPanel';
import { CustomerStatsCards } from '@/components/customers/CustomerStatsCards';
import { useLoadPerformance, useMemoryMonitor } from '@/lib/bundle-analyzer';
import { logger } from '@/lib/logger';
import { PERFORMANCE_CONFIG } from '@/config/performance';
import { VirtualizedTable } from '@/components/virtualized/VirtualizedTable';
import { 
  MobileNav, 
  MobileCard, 
  MobileList, 
  MobileActions, 
  MobileFilters, 
  MobileSearch, 
  ResponsiveView, 
  ResponsiveGrid, 
  MobileSpacing, 
  MobileContainer,
  MobileTabs,
  useIsMobile 
} from '@/components/ui/mobile-responsive';

import type { CustomersPageState, UICustomer } from '@/types/customer-page';

export default function CustomersPage() {
  return (
    <PermissionProvider>
      <CustomersPageContent />
    </PermissionProvider>
  );
}

function CustomersPageContent() {
  const { toast } = useToast();
  const errorHandler = useErrorHandler();
  const errorRecovery = useErrorRecovery();
  const isMobile = useIsMobile();
  const fmtCurrency = useCurrencyFormatter();
  const permissions = usePermissions();
  const { getCachedData, setCachedData, createCacheKey, useDebounce } = useCustomerOptimizations();
  const perf = useLoadPerformance();
  const memory = useMemoryMonitor();
  const [state, setState] = useState<CustomersPageState>({
    customers: [],
    loading: true,
    searchQuery: '',
    showModal: false,
    showFilters: false,
    showDetailsModal: false,
    showAnalytics: false,
    showAdvancedSegmentation: false,
    showTagManager: false,
    showCommunicationCenter: false,
    showAdvancedSearch: false,
    showLoyaltyProgram: false,
    selectedCustomer: null,
    editingCustomer: null,
    selectedCustomers: [],
    viewMode: 'table',
    sortBy: 'created_at',
    sortOrder: 'desc',
    currentPage: 1,
    itemsPerPage: 10,
    filters: {
      status: 'all',
      type: 'all',
      search: ''
    },
    formData: {
      name: '',
      customerCode: '',
      email: '',
      phone: '',
      address: '',
      notes: '',
      birthDate: '',
      customerType: 'regular',
      is_active: true
    },
    formErrors: {},
    submitting: false,
    stats: {
      total: 0,
      active: 0,
      inactive: 0,
      vip: 0,
      wholesale: 0,
      regular: 0
    }
  });
  const debouncedSearch = useDebounce(state.searchQuery, PERFORMANCE_CONFIG.LAZY_LOADING.DEBOUNCE_MS);
  useEffect(() => {
    if (perf && (perf.fcp || perf.lcp || perf.cls)) {
      logger.info('Métricas de rendimiento cargadas', perf);
    }
  }, [perf]);

  useEffect(() => {
    if (!perf) return;
    const alerts: string[] = [];
    if (perf.lcp && perf.lcp > 2500) alerts.push(`LCP alto: ${perf.lcp.toFixed(0)}ms`);
    if (perf.cls && perf.cls > 0.1) alerts.push(`CLS elevado: ${perf.cls.toFixed(3)}`);
    if (perf.fid && perf.fid > 100) alerts.push(`FID alto: ${perf.fid.toFixed(0)}ms`);
    if (alerts.length > 0) {
      logger.warn('Alertas de rendimiento', alerts);
      toast({ title: 'Rendimiento', description: alerts.join(' • '), variant: 'destructive' });
    }
  }, [perf]);

  useEffect(() => {
    if (memory) {
      logger.warn('Uso de memoria', memory);
    }
  }, [memory]);

  useEffect(() => {
    setState(prev => ({
      ...prev,
      itemsPerPage: isMobile ? 10 : 30
    }));
  }, [isMobile]);

  // Función para validar un campo específico
  const validateField = (fieldName: string, value: string) => {
    const validation = validateCustomerData({ [fieldName]: value }, false);
    
    if (!validation.success) {
      const fieldError = validation.error.errors.find(err => err.path[0] === fieldName);
      return fieldError ? fieldError.message : '';
    }
    return '';
  };

  // Función para manejar cambios en el formulario con validación en tiempo real
  const handleFormChange = (field: string, value: string | boolean) => {
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        [field]: value
      }
    }));

    // Validar el campo si es string
    if (typeof value === 'string') {
      const error = validateField(field, value);
      setState(prev => ({
        ...prev,
        formErrors: {
          ...prev.formErrors,
          [field]: error
        }
      }));
    }
  };

  // Función para validar todo el formulario
  const validateForm = () => {
    const validation = validateCustomerData(state.formData, !!state.editingCustomer);
    
    if (!validation.success) {
      const errors: any = {};
      validation.error.errors.forEach(err => {
        const field = err.path[0];
        errors[field] = err.message;
      });
      
      setState(prev => ({
        ...prev,
        formErrors: errors
      }));
      
      return false;
    }
    
    setState(prev => ({
      ...prev,
      formErrors: {}
    }));
    
    return true;
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const operation = async () => {
      setState(prev => ({ ...prev, loading: true }));
      const page = state.currentPage;
      const limit = state.itemsPerPage || PERFORMANCE_CONFIG.PAGINATION.CUSTOMERS_PER_PAGE;
      const filtersKey = createCacheKey('customers', {
        search: debouncedSearch,
        status: state.filters.status,
        type: state.filters.type,
        page,
        limit
      });

      const cached = getCachedData(filtersKey);
      if (cached) {
        setState(prev => ({
          ...prev,
          customers: cached.customers || [],
          stats: cached.stats || prev.stats,
          loading: false
        }));
      }

      const filters: CustomerFilters = {
        search: debouncedSearch,
        status: state.filters.status,
        type: state.filters.type,
        page,
        limit,
        dateFrom: state.filters.dateFrom,
        dateTo: state.filters.dateTo,
        minOrders: state.filters.minOrders,
        maxOrders: state.filters.maxOrders,
        minSpent: state.filters.minSpent,
        maxSpent: state.filters.maxSpent,
        segment: state.filters.segment,
        tags: state.filters.tags,
        riskLevel: state.filters.riskLevel,
        lifetimeValueRange: state.filters.lifetimeValueRange
      };

      const start = performance.now();
      const result = await customerService.getAll(filters);
      const duration = performance.now() - start;
      if (duration > PERFORMANCE_CONFIG.PERFORMANCE_TARGETS.CUSTOMER_LOAD_MS) {
        logger.warn('Carga de clientes lenta', { duration });
      } else {
        logger.info('Carga de clientes', { duration });
      }
      
      if (result.error) {
        throw new Error(result.error);
      }

      setState(prev => ({
        ...prev,
        customers: result.customers,
        stats: result.stats,
        loading: false
      }));

      try {
        setCachedData(filtersKey, { customers: result.customers, stats: result.stats });
        localStorage.setItem('customers-cache', JSON.stringify({ customers: result.customers, stats: result.stats }));
      } catch {}
    };

    try {
      await errorRecovery.executeWithRetry(operation, {
        maxRetries: 3,
        retryCondition: (error) => {
          return error?.message?.includes('fetch') || error?.code === 'NETWORK_ERROR';
        }
      });
      
      errorHandler.clearErrors();
      
    } catch (error: any) {
      console.error('Error loading customers:', error);
      
      const errorId = errorHandler.addNetworkError(
        'No se pudieron cargar los clientes',
        error.message,
        () => loadCustomers()
      );

      setState(prev => ({ 
        ...prev, 
        loading: false,
        customers: [],
        stats: {
          total: 0,
          active: 0,
          inactive: 0,
          vip: 0,
          wholesale: 0,
          regular: 0
        }
      }));

      const recoveryStrategies = errorRecovery.createNetworkRecoveryStrategies(
        () => loadCustomers(),
        async () => {
          const cachedData = localStorage.getItem('customers-cache');
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            setState(prev => ({
              ...prev,
              customers: parsed.customers || [],
              stats: parsed.stats || { total: 0, active: 0, inactive: 0, vip: 0, wholesale: 0, regular: 0 },
              loading: false
            }));
          }
        }
      );

      setTimeout(() => {
        errorRecovery.executeRecoveryStrategy(recoveryStrategies);
      }, 2000);
    }
  };

  const deferredSearch = useDeferredValue(state.searchQuery);

  // Filtered and sorted customers with pagination
  const { paginatedCustomers, totalPages, totalCustomers } = useMemo(() => {
    let filtered = state.customers.filter(customer => {
      const term = (deferredSearch || '').toLowerCase();
      const matchesSearch = customer.name.toLowerCase().includes(term) ||
                          (customer.email || '').toLowerCase().includes(term) ||
                          (customer.customerCode || '').toLowerCase().includes(term);
      
      const matchesStatus = state.filters.status === 'all' || 
                          (state.filters.status === 'active' && customer.is_active) ||
                          (state.filters.status === 'inactive' && !customer.is_active);
      
      const matchesType = state.filters.type === 'all' || customer.customerType === state.filters.type;
      
      return matchesSearch && matchesStatus && matchesType;
    });

    // Sort customers
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (state.sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'totalSpent':
          aValue = a.totalSpent || 0;
          bValue = b.totalSpent || 0;
          break;
        case 'totalOrders':
          aValue = a.totalOrders || 0;
          bValue = b.totalOrders || 0;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }
      
      if (aValue < bValue) return state.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return state.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Determine if we need client-side pagination
    const isClientSidePagination = filtered.length > state.itemsPerPage;
    
    // Use stats.total from server if available and larger than local list (implies server-side pagination), 
    // otherwise use local list length
    const totalCustomers = state.stats.total > filtered.length ? state.stats.total : filtered.length;
    const totalPages = Math.ceil(totalCustomers / state.itemsPerPage);
    
    let paginatedCustomers = filtered;
    if (isClientSidePagination) {
      const startIndex = (state.currentPage - 1) * state.itemsPerPage;
      paginatedCustomers = filtered.slice(startIndex, startIndex + state.itemsPerPage);
    }

    return { paginatedCustomers, totalPages, totalCustomers };
  }, [state.customers, deferredSearch, state.filters, state.sortBy, state.sortOrder, state.currentPage, state.itemsPerPage]);

  const handleSort = useCallback((field: string) => {
    setState(prev => ({
      ...prev,
      sortBy: field as any,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setState(prev => ({ ...prev, currentPage: page }));
  }, []);

  const handleSelectCustomer = useCallback((customerId: string) => {
    setState(prev => ({
      ...prev,
      selectedCustomers: prev.selectedCustomers.includes(customerId)
        ? prev.selectedCustomers.filter(id => id !== customerId)
        : [...prev.selectedCustomers, customerId]
    }));
  }, []);

  const handleSelectAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedCustomers: prev.selectedCustomers.length === paginatedCustomers.length
        ? []
        : paginatedCustomers.map(c => c.id)
    }));
  }, [paginatedCustomers]);

  const getCustomerTypeVariant = useCallback((type: string) => {
    switch (type) {
      case 'vip': return 'secondary';
      case 'wholesale': return 'outline';
      default: return 'default';
    }
  }, []);

  const getCustomerTypeColor = useCallback((type: string) => {
    switch (type) {
      case 'vip': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'wholesale': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  }, []);

  const getCustomerTypeLabel = useCallback((type: string) => {
    switch (type) {
      case 'vip': return 'VIP';
      case 'wholesale': return 'Mayorista';
      default: return 'Regular';
    }
  }, []);

  const handleOpenModal = useCallback((customer?: UICustomer) => {
    setState(prev => ({
      ...prev,
      showModal: true,
      editingCustomer: customer || null,
      formData: customer ? {
        name: customer.name,
        customerCode: customer.customerCode || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        notes: customer.notes || '',
        birthDate: customer.birthDate || '',
        customerType: customer.customerType,
        is_active: customer.is_active
      } : {
        name: '',
        customerCode: `CL-${Date.now()}`,
        email: '',
        phone: '',
        address: '',
        notes: '',
        birthDate: '',
        customerType: 'regular',
        is_active: true
      }
    }));
  }, []);

  const handleCloseModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      showModal: false,
      editingCustomer: null,
      formData: {
        name: '',
        customerCode: '',
        email: '',
        phone: '',
        address: '',
        notes: '',
        birthDate: '',
        customerType: 'regular',
        is_active: true
      }
    }));
  }, []);

  const handleOpenDetailsModal = useCallback((customer: UICustomer) => {
    setState(prev => ({
      ...prev,
      showDetailsModal: true,
      selectedCustomer: customer
    }));
  }, []);

  const handleCloseDetailsModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      showDetailsModal: false,
      selectedCustomer: null
    }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar formulario antes de enviar
    if (!validateForm()) {
      toast({
        title: "Error de validación",
        description: "Por favor corrige los errores en el formulario.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setState(prev => ({ ...prev, submitting: true }));

      let result;
      if (state.editingCustomer) {
        // Actualizar cliente existente
        result = await customerService.update(state.editingCustomer.id, state.formData);
        toast({
          title: "Cliente actualizado",
          description: "Los datos del cliente se han actualizado correctamente.",
        });
      } else {
        // Crear nuevo cliente
        result = await customerService.create(state.formData);
        toast({
          title: "Cliente creado",
          description: "El nuevo cliente se ha creado correctamente.",
        });
      }

      // Recargar la lista de clientes
      await loadCustomers();
      
      // Cerrar modal y limpiar formulario
      handleCloseModal();
      
    } catch (error) {
      console.error('Error al guardar cliente:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el cliente. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setState(prev => ({ ...prev, submitting: false }));
    }
  }, [state.editingCustomer, state.formData, toast, handleCloseModal]);

  const handleDelete = useCallback(async (customerId: string) => {
    try {
      const customer = state.customers.find(c => c.id === customerId);
      if (!customer) return;

      if (!confirm(`¿Estás seguro de que deseas eliminar al cliente "${customer.name}"?`)) {
        return;
      }

      await customerService.delete(customerId);
      
      toast({
        title: "Cliente eliminado",
        description: "El cliente se ha eliminado correctamente.",
      });

      // Recargar la lista de clientes
      await loadCustomers();
      
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el cliente. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  }, [state.customers, toast]);

  const handleImportCSV = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        // Validate headers
        const requiredHeaders = ['name', 'email', 'phone'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
          toast({
            title: "Error en el archivo CSV",
            description: `Faltan las columnas requeridas: ${missingHeaders.join(', ')}`,
            variant: "destructive",
          });
          return;
        }

        const customers = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const values = line.split(',').map(v => v.trim());
          const customer: any = {};
          
          headers.forEach((header, index) => {
            customer[header] = values[index] || '';
          });
          
          // Validate required fields
          if (customer.name && customer.email) {
            customers.push(customer);
          }
        }

        if (customers.length === 0) {
          toast({
            title: "Archivo vacío",
            description: "No se encontraron clientes válidos en el archivo CSV",
            variant: "destructive",
          });
          return;
        }

        // Import customers
        let successCount = 0;
        let errorCount = 0;

        for (const customer of customers) {
          try {
            const result = await customerService.create({
              name: customer.name,
              email: customer.email,
              phone: customer.phone,
              address: customer.address,
            });
            if (!result.error) {
              successCount++;
            } else {
              errorCount++;
            }
          } catch {
            errorCount++;
          }
        }

        toast({
          title: "Importación completada",
          description: `${successCount} clientes importados exitosamente. ${errorCount} errores.`,
        });

        // Refresh the customer list
        loadCustomers();
      } catch (error) {
        toast({
          title: "Error al procesar archivo",
          description: "No se pudo procesar el archivo CSV",
          variant: "destructive",
        });
      }
    };
    input.click();
  };

  const handleExportSelected = () => {
    const selectedCustomers = state.customers.filter(customer => 
      state.selectedCustomers.includes(customer.id)
    );

    if (selectedCustomers.length === 0) {
      toast({
        title: "Sin selección",
        description: "Selecciona al menos un cliente para exportar",
        variant: "destructive",
      });
      return;
    }

    // Create CSV content
    const headers = ['name', 'email', 'phone', 'address', 'customer_code', 'customer_type', 'birth_date', 'is_active', 'notes'];
    const csvContent = [
      headers.join(','),
      ...selectedCustomers.map(customer => 
        headers.map(header => {
          const value = customer[header as keyof typeof customer] || '';
          // Escape commas and quotes in CSV
          return typeof value === 'string' && value.includes(',') 
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        }).join(',')
      )
    ].join('\n');

    // Download CSV file
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `clientes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Exportación exitosa",
      description: `${selectedCustomers.length} clientes exportados a CSV`,
    });
  };

  const handleBulkActivate = async () => {
    if (state.selectedCustomers.length === 0) return;

    try {
      const results = await Promise.all(
        state.selectedCustomers.map(customerId =>
          customerService.update(customerId, { is_active: true })
        )
      );
      const failures = results.filter(r => r.error);
      if (failures.length) {
        throw new Error('Algunas actualizaciones fallaron');
      }

      toast({
        title: "Clientes activados",
        description: `${state.selectedCustomers.length} clientes han sido activados exitosamente`,
      });

      // Clear selection and refresh
      setState(prev => ({ ...prev, selectedCustomers: [] }));
      loadCustomers();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron activar algunos clientes",
        variant: "destructive",
      });
    }
  };

  const handleBulkDeactivate = async () => {
    if (state.selectedCustomers.length === 0) return;

    try {
      const results = await Promise.all(
        state.selectedCustomers.map(customerId =>
          customerService.update(customerId, { is_active: false })
        )
      );
      const failures = results.filter(r => r.error);
      if (failures.length) {
        throw new Error('Algunas actualizaciones fallaron');
      }

      toast({
        title: "Clientes desactivados",
        description: `${state.selectedCustomers.length} clientes han sido desactivados exitosamente`,
      });

      // Clear selection and refresh
      setState(prev => ({ ...prev, selectedCustomers: [] }));
      loadCustomers();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron desactivar algunos clientes",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    if (state.selectedCustomers.length === 0) return;

    const confirmed = window.confirm(
      `¿Estás seguro de que deseas eliminar ${state.selectedCustomers.length} clientes? Esta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    try {
      const result = await customerService.deleteMultiple(state.selectedCustomers);
      if (!result.success) {
        throw new Error(result.error || 'Eliminación masiva falló');
      }

      toast({
        title: "Clientes eliminados",
        description: `${state.selectedCustomers.length} clientes han sido eliminados exitosamente`,
      });

      // Clear selection and refresh
      setState(prev => ({ ...prev, selectedCustomers: [] }));
      loadCustomers();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron eliminar algunos clientes",
        variant: "destructive",
      });
    }
  };

  return (
    <MobileContainer className="space-y-6">
      {/* Header Section - Enhanced Design */}
      <MobileSpacing>
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-xl p-6 border border-blue-100 dark:border-blue-800/50 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                 <ShoppingCart className="w-5 h-5 text-white" />
               </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                  BeautyPOS
                </h1>
                <p className="text-sm md:text-base text-muted-foreground mt-1">
                  Sistema de Cosméticos · Gestión de Clientes
                </p>
              </div>
            </div>
            
            {/* Action Buttons - Enhanced Design */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setState(prev => ({ ...prev, showAnalytics: !prev.showAnalytics }))}
                  className={`bg-background/80 backdrop-blur-sm border-border hover:bg-muted transition-all duration-200 ${
                    state.showAnalytics ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-600' : ''
                  }`}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analíticas
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setState(prev => ({ ...prev, showFilters: !prev.showFilters }))}
                  className={`bg-background/80 backdrop-blur-sm border-border hover:bg-muted transition-all duration-200 ${
                    state.showFilters ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-600' : ''
                  }`}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                  {(state.filters.status !== 'all' || state.filters.type !== 'all') && (
                    <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                      !
                    </Badge>
                  )}
                </Button>
              </div>
              
              <PermissionGuard permission="customers.create">
                <Button 
                  onClick={() => handleOpenModal()}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Cliente
                </Button>
              </PermissionGuard>
            </div>
          </div>

          {/* Mobile Search - Enhanced */}
          {isMobile && (
            <div className="mt-4">
              <MobileSearch
                value={state.searchQuery}
                onChange={(value) => setState(prev => ({ ...prev, searchQuery: value }))}
                placeholder="Buscar clientes..."
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-blue-200 dark:border-blue-700 focus:border-blue-400 dark:focus:border-blue-500"
              />
            </div>
          )}
        </div>
      </MobileSpacing>

      {/* Advanced Customer Management Dashboard - Removed for redundancy */}

      {/* Stats Cards - Enhanced Design */}
      <CustomerStatsCards stats={state.stats} customers={state.customers} />

      {/* Filters Section - Enhanced Design */}
      <CustomerFiltersPanel 
        state={state} 
        setState={setState} 
        loadCustomers={loadCustomers} 
        isMobile={isMobile} 
      />

      {/* Analytics Section */}
      {state.showAnalytics && (
        <LazyCustomerAnalytics customers={state.customers} />
      )}

      {/* Advanced Segmentation Section */}
      {state.showAdvancedSegmentation && (
        <LazyAdvancedSegmentation 
          customers={state.customers}
          onFiltersChange={(filters) => setState(prev => ({ ...prev, filters }))}
          currentFilters={state.filters}
        />
      )}

      {/* Tag Manager Section */}
      {state.showTagManager && (
        <LazyCustomerTagManager mode="manage" />
      )}

      {/* Communication Center Section */}
      {state.showCommunicationCenter && (
        <LazyCommunicationCenter customers={state.customers} />
      )}

      {/* Advanced Search Section */}
      {state.showAdvancedSearch && (
        <LazyAdvancedSearch 
          customers={state.customers}
          onSearchResults={(results) => setState(prev => ({ ...prev, customers: results }))}
          onFiltersChange={(filters) => setState(prev => ({ ...prev, filters }))}
          currentFilters={state.filters}
        />
      )}

      {/* Loyalty Program Section */}
      {state.showLoyaltyProgram && (
        <LazyLoyaltyProgram 
          customers={state.customers}
          selectedCustomerId={state.selectedCustomer?.id}
        />
      )}

      {/* Action Bar - Mobile Optimized */}
      <MobileSpacing>
        <div className="flex flex-col space-y-4">
          {/* Desktop Search and View Controls */}
          <div className="hidden md:flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant={state.viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setState(prev => ({ ...prev, viewMode: 'table' }))}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={state.viewMode === 'cards' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setState(prev => ({ ...prev, viewMode: 'cards' }))}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </div>
              
              {state.selectedCustomers.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {state.selectedCustomers.length} seleccionados
                  </span>
                  <PermissionGuard permission="customers.export">
                    <Button variant="outline" size="sm" onClick={handleExportSelected}>
                      <Download className="h-4 w-4 mr-2" />
                      Exportar
                    </Button>
                  </PermissionGuard>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleBulkActivate}
                    className="text-green-600 hover:text-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Activar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleBulkDeactivate}
                    className="text-orange-600 hover:text-orange-700"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Desactivar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleBulkDelete}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleImportCSV}>
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => loadCustomers()}
                disabled={state.loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${state.loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar clientes..."
                  value={state.searchQuery}
                  onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>

          {/* Mobile View Controls */}
          <div className="flex md:hidden items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant={state.viewMode === 'cards' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setState(prev => ({ ...prev, viewMode: 'cards' }))}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={state.viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setState(prev => ({ ...prev, viewMode: 'table' }))}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            {/* Mobile Filters */}
            <MobileFilters title="Filtros">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="mobile-status">Estado</Label>
                  <Select
                    value={state.filters.status}
                    onValueChange={(value) => setState(prev => ({
                      ...prev,
                      filters: { ...prev.filters, status: value as any }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Activos</SelectItem>
                      <SelectItem value="inactive">Inactivos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="mobile-type">Tipo</Label>
                  <Select
                    value={state.filters.type}
                    onValueChange={(value) => setState(prev => ({
                      ...prev,
                      filters: { ...prev.filters, type: value as any }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
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
            </MobileFilters>

            {state.selectedCustomers.length > 0 && (
              <MobileActions
                actions={[
                  {
                    label: `Exportar ${state.selectedCustomers.length} clientes`,
                    icon: <Download className="h-4 w-4" />,
                    onClick: handleExportSelected,
                    variant: 'outline'
                  },
                  {
                    label: `Activar ${state.selectedCustomers.length} clientes`,
                    icon: <CheckCircle className="h-4 w-4" />,
                    onClick: handleBulkActivate,
                    variant: 'outline'
                  },
                  {
                    label: `Desactivar ${state.selectedCustomers.length} clientes`,
                    icon: <XCircle className="h-4 w-4" />,
                    onClick: handleBulkDeactivate,
                    variant: 'outline'
                  },
                  {
                    label: `Eliminar ${state.selectedCustomers.length} clientes`,
                    icon: <Trash2 className="h-4 w-4" />,
                    onClick: handleBulkDelete,
                    variant: 'destructive'
                  }
                ]}
              />
            )}
          </div>
        </div>
      </MobileSpacing>

      {/* Main Content */}
      <Card>
        <CardContent className="p-0">
          {state.loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">Cargando clientes...</span>
            </div>
          ) : paginatedCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No se encontraron clientes</h3>
              <p className="text-muted-foreground mb-4">
                {state.searchQuery || state.filters.status !== 'all' || state.filters.type !== 'all'
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Comienza agregando tu primer cliente'
                }
              </p>
              {(!state.searchQuery && state.filters.status === 'all' && state.filters.type === 'all') && (
                <PermissionGuard permission="customers.create">
                  <Button onClick={() => handleOpenModal()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Cliente
                  </Button>
                </PermissionGuard>
              )}
            </div>
          ) : (
            <>
{isMobile ? (
                <MobileSpacing>
                  <MobileList>
                    {paginatedCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                              <span className="text-sm font-bold text-white">
                                {customer.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                                  {customer.name}
                                </h3>
                                {customer.customerType === 'vip' && (
                                  <Badge className="text-xs bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                                    <Star className="h-3 w-3 mr-1" />
                                    VIP
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                <Mail className="h-3 w-3 text-gray-400" />
                                <span className="truncate">{customer.email}</span>
                              </div>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={state.selectedCustomers.includes(customer.id)}
                            onChange={() => handleSelectCustomer(customer.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-3">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Gastado</div>
                            <div className="font-bold text-green-600 dark:text-green-400 text-lg">
                              {fmtCurrency(customer.totalSpent || 0)}
                            </div>
                          </div>
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-3">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Órdenes</div>
                            <div className="font-bold text-blue-600 dark:text-blue-400 text-lg">
                              {customer.totalOrders || 0}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Badge className={`text-xs font-medium ${getCustomerTypeColor(customer.customerType)}`}>
                              {getCustomerTypeLabel(customer.customerType)}
                            </Badge>
                            <Badge 
                              variant={customer.is_active ? "default" : "secondary"} 
                              className={`text-xs ${
                                customer.is_active 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}
                            >
                              {customer.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(customer.created_at)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <PermissionGuard permission="customers.edit">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenModal(customer)}
                              className="flex-1 h-9 text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/20"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </Button>
                          </PermissionGuard>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {}}
                            className="flex-1 h-9 text-gray-600 border-gray-200 hover:bg-gray-50 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-800"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver
                          </Button>
                          <PermissionGuard permission="customers.delete">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(customer.id)}
                              className="h-9 w-9 p-0 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </PermissionGuard>
                        </div>
                      </div>
                    ))}
                  </MobileList>
                </MobileSpacing>
              ) : (
                <>
                  {state.viewMode === 'table' ? (
                    <div className="overflow-x-auto">
                      <div id="customers-table" className="w-full [content-visibility:auto] [contain-intrinsic-size:640px]">
                        <VirtualizedTable
                          columns={[
                            {
                              key: 'select',
                              header: '',
                              width: 60,
                              cell: (_: any, row: any) => (
                                <input
                                  type="checkbox"
                                  checked={state.selectedCustomers.includes(row.id)}
                                  onChange={() => handleSelectCustomer(row.id)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                                />
                              )
                            },
                            {
                              key: 'name',
                              header: 'Cliente',
                              width: 320,
                              cell: (_: any, row: any) => (
                                <div className="flex items-center gap-3">
                                  <div className="flex-shrink-0">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                      <span className="text-xs font-bold text-white">{row.name?.charAt(0)?.toUpperCase()}</span>
                                    </div>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className="font-semibold truncate">{row.name}</p>
                                      {!row.is_active && (
                                        <Badge variant="secondary" className="text-xs">Inactivo</Badge>
                                      )}
                                      {row.customerType === 'vip' && (
                                        <Badge className="text-xs bg-gradient-to-r from-yellow-400 to-orange-500 text-white">VIP</Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                      <Mail className="h-3 w-3" />
                                      <span className="truncate">{row.email}</span>
                                    </div>
                                  </div>
                                </div>
                              )
                            },
                            {
                              key: 'customerType',
                              header: 'Tipo',
                              width: 140,
                              cell: (_: any, row: any) => (
                                <Badge className={`text-xs font-medium ${getCustomerTypeColor(row.customerType)}`}>
                                  {getCustomerTypeLabel(row.customerType)}
                                </Badge>
                              )
                            },
                            {
                              key: 'totalSpent',
                              header: 'Total Gastado',
                              width: 160,
                              cell: (value: number) => (
                                <div className="font-bold text-green-600">{fmtCurrency(value || 0)}</div>
                              )
                            },
                            {
                              key: 'totalOrders',
                              header: 'Compras',
                              width: 120,
                              cell: (value: number) => (
                                <div className="font-semibold text-blue-600">{value || 0}</div>
                              )
                            },
                            {
                              key: 'created_at',
                              header: 'Registro',
                              width: 160,
                              cell: (value: string) => (
                                <div className="text-sm">{formatDate(value)}</div>
                              )
                            },
                            {
                              key: 'actions',
                              header: 'Acciones',
                              width: 200,
                              cell: (_: any, row: any) => (
                                <div className="flex items-center gap-2">
                                  <PermissionGuard permission="customers.edit">
                                    <Button size="sm" variant="ghost" onClick={() => handleOpenModal(row)} title="Editar">
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </PermissionGuard>
                                  <Button size="sm" variant="ghost" onClick={() => handleOpenDetailsModal(row)} title="Ver">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <PermissionGuard permission="customers.delete">
                                    <Button size="sm" variant="ghost" onClick={() => handleDelete(row.id)} title="Eliminar" className="text-red-600">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </PermissionGuard>
                                </div>
                              )
                            }
                          ]}
                          rows={paginatedCustomers}
                          isLoading={state.loading}
                          isFetchingNextPage={false}
                          rowHeight={48}
                          className="min-w-[980px]"
                        />
                      </div>
                    </div>
                  ) : (
                    null
                  )}
                </>
              )}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className={`bg-card border-t border-border ${isMobile ? 'p-4' : 'px-6 py-4'}`}> 
                  {isMobile ? (
                    // Mobile Pagination Layout
                    <div className="space-y-4">
                      {/* Page Info - Mobile */}
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-3 py-2 rounded-lg">
                          <span className="font-medium">
                            Página {state.currentPage} de {totalPages}
                          </span>
                          <span className="text-xs ml-2 text-gray-500 dark:text-gray-400">
                            ({totalCustomers} clientes)
                          </span>
                        </div>
                      </div>
                      
                      {/* Items per page - Mobile */}
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <span className="text-gray-600 dark:text-gray-300">Mostrar:</span>
                        <Select 
                          value={state.itemsPerPage.toString()} 
                          onValueChange={(value) => setState(prev => ({ 
                            ...prev, 
                            itemsPerPage: parseInt(value), 
                            currentPage: 1 
                          }))}
                        >
                          <SelectTrigger className="w-20 h-9 border-gray-300 dark:border-gray-600">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Navigation Controls - Mobile */}
                      <div className="flex items-center justify-center gap-2 w-full">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(1)}
                          disabled={state.currentPage === 1}
                          className="h-10 w-10 p-0 border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50"
                        >
                          <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(state.currentPage - 1)}
                          disabled={state.currentPage === 1}
                          className="h-10 w-10 p-0 border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        
                        {/* Current page indicator */}
                        <div className="flex items-center justify-center min-w-[100px] px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg text-sm font-bold shadow-lg">
                          {state.currentPage} / {totalPages}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(state.currentPage + 1)}
                          disabled={state.currentPage === totalPages}
                          className="h-10 w-10 p-0 border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(totalPages)}
                          disabled={state.currentPage === totalPages}
                          className="h-10 w-10 p-0 border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50"
                        >
                          <ChevronsRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Desktop Pagination Layout
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                        <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700">
                          <span className="font-medium">
                            Mostrando {((state.currentPage - 1) * state.itemsPerPage) + 1} a{' '}
                            {Math.min(state.currentPage * state.itemsPerPage, totalCustomers)} de{' '}
                            {totalCustomers} clientes
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 dark:text-gray-400">Mostrar:</span>
                          <Select 
                            value={state.itemsPerPage.toString()} 
                            onValueChange={(value) => setState(prev => ({ 
                              ...prev, 
                              itemsPerPage: parseInt(value), 
                              currentPage: 1 
                            }))}
                          >
                            <SelectTrigger className="w-20 h-9 border-gray-300 dark:border-gray-600">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">5</SelectItem>
                              <SelectItem value="10">10</SelectItem>
                              <SelectItem value="20">20</SelectItem>
                              <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(state.currentPage - 1)}
                          disabled={state.currentPage === 1}
                          className="h-9 px-3 border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50"
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Anterior
                        </Button>
                        
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (state.currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (state.currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = state.currentPage - 2 + i;
                            }
                            
                            return (
                              <Button
                                key={pageNum}
                                variant={pageNum === state.currentPage ? "default" : "outline"}
                                size="sm"
                                onClick={() => handlePageChange(pageNum)}
                                className={`w-9 h-9 p-0 ${
                                  pageNum === state.currentPage 
                                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg hover:from-blue-600 hover:to-indigo-700' 
                                    : 'border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                }`}
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                          
                          {totalPages > 5 && state.currentPage < totalPages - 2 && (
                            <>
                              <MoreHorizontal className="h-4 w-4 text-gray-400 mx-1" />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(totalPages)}
                                className="w-9 h-9 p-0 border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              >
                                {totalPages}
                              </Button>
                            </>
                          )}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(state.currentPage + 1)}
                          disabled={state.currentPage === totalPages}
                          className="h-9 px-3 border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50"
                        >
                          Siguiente
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Customer Modal */}
      {state.showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className={`w-full ${isMobile ? 'max-w-full h-full' : 'max-w-2xl max-h-[90vh]'} overflow-y-auto`}>
            <CardHeader className={isMobile ? 'pb-4' : ''}>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className={isMobile ? 'text-lg' : ''}>
                    {state.editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
                  </CardTitle>
                  <CardDescription className={isMobile ? 'text-sm' : ''}>
                    {state.editingCustomer 
                      ? 'Modifica los datos del cliente'
                      : 'Agrega un nuevo cliente a tu base de datos'
                    }
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={handleCloseModal}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className={isMobile ? 'px-4' : ''}>
              <form onSubmit={handleSubmit} className="space-y-6">
                {isMobile ? (
                  // Mobile Layout - Single Column
                  <div className="space-y-4">
                    {/* Basic Information */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-muted-foreground">Información Básica</h3>
                      
                      <div className="space-y-2">
                        <Label htmlFor="customer-name">Nombre *</Label>
                        <Input
                          id="customer-name"
                          value={state.formData.name}
                          onChange={(e) => handleFormChange('name', e.target.value)}
                          placeholder="Nombre completo"
                          required
                          className={state.formErrors.name ? 'border-red-500' : ''}
                        />
                        {state.formErrors.name && (
                          <p className="text-sm text-red-500">{state.formErrors.name}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="customer-email">Email *</Label>
                        <Input
                          id="customer-email"
                          type="email"
                          value={state.formData.email}
                          onChange={(e) => handleFormChange('email', e.target.value)}
                          placeholder="correo@ejemplo.com"
                          required
                          className={state.formErrors.email ? 'border-red-500' : ''}
                        />
                        {state.formErrors.email && (
                          <p className="text-sm text-red-500">{state.formErrors.email}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="customer-phone">Teléfono</Label>
                        <Input
                          id="customer-phone"
                          value={state.formData.phone}
                          onChange={(e) => handleFormChange('phone', e.target.value)}
                          placeholder="+595 21 1234567"
                          className={state.formErrors.phone ? 'border-red-500' : ''}
                        />
                        {state.formErrors.phone && (
                          <p className="text-sm text-red-500">{state.formErrors.phone}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="customer-code">Código Cliente</Label>
                        <Input
                          id="customer-code"
                          value={state.formData.customerCode}
                          onChange={(e) => handleFormChange('customerCode', e.target.value)}
                          placeholder="CL-001"
                          className={state.formErrors.customerCode ? 'border-red-500' : ''}
                        />
                        {state.formErrors.customerCode && (
                          <p className="text-sm text-red-500">{state.formErrors.customerCode}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="customer-type">Tipo de Cliente</Label>
                        <Select 
                          value={state.formData.customerType} 
                          onValueChange={(value: 'regular' | 'vip' | 'wholesale') => 
                            setState(prev => ({
                              ...prev,
                              formData: { ...prev.formData, customerType: value }
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="regular">Regular</SelectItem>
                            <SelectItem value="vip">VIP</SelectItem>
                            <SelectItem value="wholesale">Mayorista</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* Additional Information */}
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="text-sm font-medium text-muted-foreground">Información Adicional</h3>
                      
                      <div className="space-y-2">
                        <Label htmlFor="customer-address">Dirección</Label>
                        <Textarea
                          id="customer-address"
                          value={state.formData.address}
                          onChange={(e) => handleFormChange('address', e.target.value)}
                          placeholder="Dirección completa"
                          rows={3}
                          className={state.formErrors.address ? 'border-red-500' : ''}
                        />
                        {state.formErrors.address && (
                          <p className="text-sm text-red-500">{state.formErrors.address}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="customer-birthdate">Fecha de Nacimiento</Label>
                        <Input
                          id="customer-birthdate"
                          type="date"
                          value={state.formData.birthDate}
                          onChange={(e) => handleFormChange('birthDate', e.target.value)}
                          className={state.formErrors.birthDate ? 'border-red-500' : ''}
                        />
                        {state.formErrors.birthDate && (
                          <p className="text-sm text-red-500">{state.formErrors.birthDate}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="customer-status">Estado</Label>
                        <Select 
                          value={state.formData.is_active ? 'active' : 'inactive'} 
                          onValueChange={(value: 'active' | 'inactive') => 
                            setState(prev => ({
                              ...prev,
                              formData: { ...prev.formData, is_active: value === 'active' }
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Activo</SelectItem>
                            <SelectItem value="inactive">Inactivo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="customer-notes">Notas</Label>
                        <Textarea
                          id="customer-notes"
                          value={state.formData.notes}
                          onChange={(e) => handleFormChange('notes', e.target.value)}
                          placeholder="Notas adicionales sobre el cliente"
                          rows={3}
                          className={state.formErrors.notes ? 'border-red-500' : ''}
                        />
                        {state.formErrors.notes && (
                          <p className="text-sm text-red-500">{state.formErrors.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Desktop Layout - Tabs
                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="basic">Información Básica</TabsTrigger>
                      <TabsTrigger value="additional">Información Adicional</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="basic" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="customer-name">Nombre *</Label>
                          <Input
                            id="customer-name"
                            value={state.formData.name}
                            onChange={(e) => handleFormChange('name', e.target.value)}
                            placeholder="Nombre completo"
                            required
                            className={state.formErrors.name ? 'border-red-500' : ''}
                          />
                          {state.formErrors.name && (
                            <p className="text-sm text-red-500">{state.formErrors.name}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="customer-email">Email *</Label>
                          <Input
                            id="customer-email"
                            type="email"
                            value={state.formData.email}
                            onChange={(e) => handleFormChange('email', e.target.value)}
                            placeholder="correo@ejemplo.com"
                            required
                            className={state.formErrors.email ? 'border-red-500' : ''}
                          />
                          {state.formErrors.email && (
                            <p className="text-sm text-red-500">{state.formErrors.email}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="customer-phone">Teléfono</Label>
                          <Input
                            id="customer-phone"
                            value={state.formData.phone}
                            onChange={(e) => handleFormChange('phone', e.target.value)}
                            placeholder="+595 21 1234567"
                            className={state.formErrors.phone ? 'border-red-500' : ''}
                          />
                          {state.formErrors.phone && (
                            <p className="text-sm text-red-500">{state.formErrors.phone}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="customer-code">Código Cliente</Label>
                          <Input
                            id="customer-code"
                            value={state.formData.customerCode}
                            onChange={(e) => handleFormChange('customerCode', e.target.value)}
                            placeholder="CL-001"
                            className={state.formErrors.customerCode ? 'border-red-500' : ''}
                          />
                          {state.formErrors.customerCode && (
                            <p className="text-sm text-red-500">{state.formErrors.customerCode}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="customer-type">Tipo de Cliente</Label>
                        <Select 
                          value={state.formData.customerType} 
                          onValueChange={(value: 'regular' | 'vip' | 'wholesale') => 
                            setState(prev => ({
                              ...prev,
                              formData: { ...prev.formData, customerType: value }
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="regular">Regular</SelectItem>
                            <SelectItem value="vip">VIP</SelectItem>
                            <SelectItem value="wholesale">Mayorista</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="additional" className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="customer-address">Dirección</Label>
                        <Textarea
                          id="customer-address"
                          value={state.formData.address}
                          onChange={(e) => handleFormChange('address', e.target.value)}
                          placeholder="Dirección completa"
                          rows={3}
                          className={state.formErrors.address ? 'border-red-500' : ''}
                        />
                        {state.formErrors.address && (
                          <p className="text-sm text-red-500">{state.formErrors.address}</p>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="customer-birthdate">Fecha de Nacimiento</Label>
                          <Input
                            id="customer-birthdate"
                            type="date"
                            value={state.formData.birthDate}
                            onChange={(e) => handleFormChange('birthDate', e.target.value)}
                            className={state.formErrors.birthDate ? 'border-red-500' : ''}
                          />
                          {state.formErrors.birthDate && (
                            <p className="text-sm text-red-500">{state.formErrors.birthDate}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="customer-status">Estado</Label>
                          <Select 
                            value={state.formData.is_active ? 'active' : 'inactive'} 
                            onValueChange={(value: 'active' | 'inactive') => 
                              setState(prev => ({
                                ...prev,
                                formData: { ...prev.formData, is_active: value === 'active' }
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Activo</SelectItem>
                              <SelectItem value="inactive">Inactivo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="customer-notes">Notas</Label>
                        <Textarea
                          id="customer-notes"
                          value={state.formData.notes}
                          onChange={(e) => handleFormChange('notes', e.target.value)}
                          placeholder="Notas adicionales sobre el cliente"
                          rows={3}
                          className={state.formErrors.notes ? 'border-red-500' : ''}
                        />
                        {state.formErrors.notes && (
                          <p className="text-sm text-red-500">{state.formErrors.notes}</p>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
                
                <div className={`flex ${isMobile ? 'flex-col gap-3' : 'justify-end'} space-x-${isMobile ? '0' : '2'} pt-4 border-t`}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseModal}
                    className={isMobile ? 'w-full' : ''}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={state.submitting}
                    className={isMobile ? 'w-full' : ''}
                  >
                    {state.submitting ? 'Guardando...' : state.editingCustomer ? 'Actualizar' : 'Crear'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Customer Details Modal */}
      {state.showDetailsModal && state.selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className={`w-full ${isMobile ? 'max-w-full h-full' : 'max-w-4xl max-h-[90vh]'} overflow-y-auto`}>
            <CardHeader className={isMobile ? 'pb-4' : ''}>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-lg' : ''}`}>
                    <User className="h-5 w-5" />
                    Detalles del Cliente
                  </CardTitle>
                  <CardDescription className={isMobile ? 'text-sm' : ''}>
                    Información completa de {state.selectedCustomer.name}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={handleCloseDetailsModal}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className={isMobile ? 'px-4' : ''}>
              {isMobile ? (
                // Mobile Layout - Scrollable sections
                <div className="space-y-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Información Personal</h3>
                    
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Nombre Completo</Label>
                        <p className="text-base font-semibold">{state.selectedCustomer.name}</p>
                      </div>
                      
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Código de Cliente</Label>
                        <p className="text-sm">{state.selectedCustomer.customerCode || 'No asignado'}</p>
                      </div>
                      
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Email</Label>
                        <p className="text-sm flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {state.selectedCustomer.email}
                        </p>
                      </div>
                      
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Teléfono</Label>
                        <p className="text-sm flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {state.selectedCustomer.phone || 'No registrado'}
                        </p>
                      </div>
                      
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Tipo de Cliente</Label>
                        <div className="mt-1">
                          <Badge 
                            variant={getCustomerTypeVariant(state.selectedCustomer.customerType)}
                            className={getCustomerTypeColor(state.selectedCustomer.customerType)}
                          >
                            {getCustomerTypeLabel(state.selectedCustomer.customerType)}
                          </Badge>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Estado</Label>
                        <div className="mt-1">
                          <Badge 
                            variant={state.selectedCustomer.is_active ? "default" : "secondary"}
                          >
                            {state.selectedCustomer.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Fecha de Registro</Label>
                        <p className="text-sm flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {formatDate(state.selectedCustomer.created_at)}
                        </p>
                      </div>
                      
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Fecha de Nacimiento</Label>
                        <p className="text-sm">
                          {state.selectedCustomer.birthDate ? formatDate(state.selectedCustomer.birthDate) : 'No registrada'}
                        </p>
                      </div>
                      
                      {state.selectedCustomer.address && (
                        <div>
                          <Label className="text-xs font-medium text-muted-foreground">Dirección</Label>
                          <p className="text-sm flex items-start gap-2">
                            <MapPin className="h-4 w-4 mt-0.5" />
                            {state.selectedCustomer.address}
                          </p>
                        </div>
                      )}
                      
                      {state.selectedCustomer.notes && (
                        <div>
                          <Label className="text-xs font-medium text-muted-foreground">Notas</Label>
                          <p className="text-sm bg-muted p-3 rounded-md">
                            {state.selectedCustomer.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Statistics */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">Estadísticas</h3>
                    
                    <div className="grid grid-cols-1 gap-3">
                      <Card className="p-3">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Total Gastado</p>
                          <p className="text-lg font-bold text-green-600">
                            {fmtCurrency(state.selectedCustomer.totalSpent || 0)}
                          </p>
                        </div>
                      </Card>
                      
                      <Card className="p-3">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Total de Compras</p>
                          <p className="text-lg font-bold text-blue-600">
                            {state.selectedCustomer.totalOrders || 0}
                          </p>
                        </div>
                      </Card>
                      
                      <Card className="p-3">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Promedio por Compra</p>
                          <p className="text-lg font-bold text-purple-600">
                            {state.selectedCustomer.totalOrders > 0 
                              ? fmtCurrency((state.selectedCustomer.totalSpent || 0) / state.selectedCustomer.totalOrders)
                              : fmtCurrency(0)
                            }
                          </p>
                        </div>
                      </Card>
                    </div>
                    
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Última Compra</Label>
                      <p className="text-sm mt-1">
                        {state.selectedCustomer.lastPurchase 
                          ? formatDate(state.selectedCustomer.lastPurchase)
                          : 'Sin compras registradas'
                        }
                      </p>
                    </div>
                  </div>
                  
                  {/* Purchase History */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-medium text-muted-foreground border-b pb-2 flex-1">Historial de Compras</h3>
                      <Badge variant="secondary" className="text-xs">
                        {state.selectedCustomer.totalOrders} compras
                      </Badge>
                    </div>
                    
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {state.selectedCustomer.purchaseHistory && state.selectedCustomer.purchaseHistory.length > 0 ? (
                        state.selectedCustomer.purchaseHistory.map((purchase, index) => (
                          <Card key={index} className="p-3">
                            <div className="space-y-2">
                              <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">#{purchase.orderNumber}</Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {formatDate(purchase.date)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {purchase.items} artículos
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-semibold">{fmtCurrency(purchase.total)}</p>
                                  <Badge 
                                    variant={purchase.status === 'completed' ? 'default' : 
                                            purchase.status === 'pending' ? 'secondary' : 'destructive'}
                                    className="text-xs"
                                  >
                                    {purchase.status === 'completed' ? 'Completada' :
                                     purchase.status === 'pending' ? 'Pendiente' : 'Cancelada'}
                                  </Badge>
                                </div>
                              </div>
                              {purchase.products && purchase.products.length > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  {purchase.products.slice(0, 2).map(product => product.name).join(', ')}
                                  {purchase.products.length > 2 && ` y ${purchase.products.length - 2} más...`}
                                </div>
                              )}
                            </div>
                          </Card>
                        ))
                      ) : (
                        <div className="text-center py-6">
                          <ShoppingCart className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                          <p className="text-sm text-muted-foreground mb-3">
                            Este cliente aún no ha realizado compras
                          </p>
                          <Button variant="outline" size="sm" className="text-xs">
                            <Plus className="h-3 w-3 mr-1" />
                            Crear Primera Venta
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                // Desktop Layout - Tabs
                <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="info">Información Personal</TabsTrigger>
                  <TabsTrigger value="stats">Estadísticas</TabsTrigger>
                  <TabsTrigger value="history">Historial</TabsTrigger>
                  <TabsTrigger value="loyalty">Lealtad</TabsTrigger>
                </TabsList>
                
                <TabsContent value="info" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Nombre Completo</Label>
                        <p className="text-lg font-semibold">{state.selectedCustomer.name}</p>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Código de Cliente</Label>
                        <p className="text-sm">{state.selectedCustomer.customerCode || 'No asignado'}</p>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                        <p className="text-sm flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {state.selectedCustomer.email}
                        </p>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Teléfono</Label>
                        <p className="text-sm flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {state.selectedCustomer.phone || 'No registrado'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Tipo de Cliente</Label>
                        <Badge 
                          variant={getCustomerTypeVariant(state.selectedCustomer.customerType)}
                          className={`mt-1 ${getCustomerTypeColor(state.selectedCustomer.customerType)}`}
                        >
                          {getCustomerTypeLabel(state.selectedCustomer.customerType)}
                        </Badge>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Estado</Label>
                        <Badge 
                          variant={state.selectedCustomer.is_active ? "default" : "secondary"}
                          className="mt-1"
                        >
                          {state.selectedCustomer.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Fecha de Registro</Label>
                        <p className="text-sm flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {formatDate(state.selectedCustomer.created_at)}
                        </p>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Fecha de Nacimiento</Label>
                        <p className="text-sm">
                          {state.selectedCustomer.birthDate ? formatDate(state.selectedCustomer.birthDate) : 'No registrada'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {state.selectedCustomer.address && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Dirección</Label>
                      <p className="text-sm flex items-start gap-2 mt-1">
                        <MapPin className="h-4 w-4 mt-0.5" />
                        {state.selectedCustomer.address}
                      </p>
                    </div>
                  )}
                  
                  {state.selectedCustomer.notes && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Notas</Label>
                      <p className="text-sm mt-1 p-3 bg-muted rounded-md">
                        {state.selectedCustomer.notes}
                      </p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="stats" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-6 text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {fmtCurrency(state.selectedCustomer.totalSpent || 0)}
                        </div>
                        <p className="text-sm text-muted-foreground">Total Gastado</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-6 text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {state.selectedCustomer.totalOrders || 0}
                        </div>
                        <p className="text-sm text-muted-foreground">Total de Compras</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-6 text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {state.selectedCustomer.totalOrders > 0 
                            ? fmtCurrency((state.selectedCustomer.totalSpent || 0) / state.selectedCustomer.totalOrders)
                            : fmtCurrency(0)
                          }
                        </div>
                        <p className="text-sm text-muted-foreground">Promedio por Compra</p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Última Compra</Label>
                    <p className="text-sm mt-1">
                      {state.selectedCustomer.lastPurchase 
                        ? formatDate(state.selectedCustomer.lastPurchase)
                        : 'Sin compras registradas'
                      }
                    </p>
                  </div>
                </TabsContent>
                
                <TabsContent value="loyalty" className="space-y-6">
                  <LoyaltyTabContent customerId={state.selectedCustomer.id} />
                </TabsContent>
                
                <TabsContent value="history" className="space-y-4">
                  <LazyCustomerHistory 
                    customerId={state.selectedCustomer.id} 
                    customerName={state.selectedCustomer.name}
                  />
                </TabsContent>
              </Tabs>
              )}
              
              <div className={`flex ${isMobile ? 'flex-col gap-3' : 'justify-end space-x-2'} mt-6 pt-6 border-t`}>
                <Button 
                  variant="outline" 
                  onClick={handleCloseDetailsModal}
                  className={isMobile ? 'w-full' : ''}
                >
                  Cerrar
                </Button>
                <PermissionGuard permission="customers.edit">
                  <Button 
                    onClick={() => {
                      handleCloseDetailsModal();
                      handleOpenModal(state.selectedCustomer || undefined);
                    }}
                    className={isMobile ? 'w-full' : ''}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar Cliente
                  </Button>
                </PermissionGuard>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </MobileContainer>
  );
}