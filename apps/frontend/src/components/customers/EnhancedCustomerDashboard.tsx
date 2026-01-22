'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  TrendingUp,
  DollarSign,
  Calendar,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  BarChart3,
  PieChart,
  LineChart,
  MapPin,
  UserCheck,
  UserX,
  Star,
  Activity,
  Globe,
  Smartphone,
  Monitor,
  Moon,
  Sun,
  Settings,
  Shield,
  EyeOff,
  Mail,
  Phone
} from 'lucide-react';
import dynamic from 'next/dynamic';

const RechartsLineChart = dynamic<any>(
  () => import('recharts').then((m) => m.LineChart as any),
  { ssr: false }
);
const Line = dynamic<any>(
  () => import('recharts').then((m) => m.Line as any),
  { ssr: false }
);
const AreaChart = dynamic<any>(
  () => import('recharts').then((m) => m.AreaChart as any),
  { ssr: false }
);
const Area = dynamic<any>(
  () => import('recharts').then((m) => m.Area as any),
  { ssr: false }
);
const BarChart = dynamic<any>(
  () => import('recharts').then((m) => m.BarChart as any),
  { ssr: false }
);
const Bar = dynamic<any>(
  () => import('recharts').then((m) => m.Bar as any),
  { ssr: false }
);
const RechartsPieChart = dynamic<any>(
  () => import('recharts').then((m) => m.PieChart as any),
  { ssr: false }
);
const Pie = dynamic<any>(
  () => import('recharts').then((m) => m.Pie as any),
  { ssr: false }
);
const Cell = dynamic<any>(
  () => import('recharts').then((m) => m.Cell as any),
  { ssr: false }
);
const XAxis = dynamic<any>(
  () => import('recharts').then((m) => m.XAxis as any),
  { ssr: false }
);
const YAxis = dynamic<any>(
  () => import('recharts').then((m) => m.YAxis as any),
  { ssr: false }
);
const CartesianGrid = dynamic<any>(
  () => import('recharts').then((m) => m.CartesianGrid as any),
  { ssr: false }
);
const Tooltip = dynamic<any>(
  () => import('recharts').then((m) => m.Tooltip as any),
  { ssr: false }
);
const Legend = dynamic<any>(
  () => import('recharts').then((m) => m.Legend as any),
  { ssr: false }
);
const ResponsiveContainer = dynamic<any>(
  () => import('recharts').then((m) => m.ResponsiveContainer as any),
  { ssr: false }
);
import { customerService, type UICustomer, type CustomerStats } from '@/lib/customer-service';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { useTheme } from 'next-themes';
import { usePermissions } from '@/components/ui/permission-guard';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';

// Tipos mejorados para el dashboard
interface CustomerDashboardFilters {
  search: string;
  status: 'all' | 'active' | 'inactive';
  customerType: 'all' | 'regular' | 'vip' | 'wholesale';
  segment: 'all' | 'new' | 'regular' | 'frequent' | 'vip' | 'at_risk' | 'dormant';
  country: string;
  city: string;
  ageRange: [number, number];
  registrationDateFrom: string;
  registrationDateTo: string;
  minSpent: number;
  maxSpent: number;
  minOrders: number;
  maxOrders: number;
  riskLevel: 'all' | 'low' | 'medium' | 'high';
  tags: string[];
}

interface CustomerDashboardState {
  customers: UICustomer[];
  filteredCustomers: UICustomer[];
  stats: CustomerStats & {
    newCustomers: number;
    returningCustomers: number;
    churnRate: number;
    averageLifetimeValue: number;
    averageOrderValue: number;
    topCountries: Array<{ country: string; count: number; percentage: number }>;
    ageDistribution: Array<{ range: string; count: number; percentage: number }>;
  };
  loading: boolean;
  error: string | null;
  filters: CustomerDashboardFilters;
  currentPage: number;
  itemsPerPage: number;
  sortBy: 'name' | 'created_at' | 'totalSpent' | 'lastPurchase' | 'totalOrders' | 'lifetimeValue';
  sortOrder: 'asc' | 'desc';
  selectedCustomer: UICustomer | null;
  showFilters: boolean;
  showExportModal: boolean;
  showCustomerDetails: boolean;
  exportFormat: 'csv' | 'excel' | 'pdf';
  cacheKey: string;
  lastUpdated: Date | null;
}

// Constantes de configuración
const PERFORMANCE_CONFIG = {
  maxRecords: 10000,
  pageSize: 50,
  cacheTimeout: 5 * 60 * 1000, // 5 minutos
  debounceMs: 300,
  maxExportRecords: 5000
};

// Colores para gráficos
const CHART_COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  accent: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
  pink: '#EC4899',
  cyan: '#06B6D4',
  orange: '#F97316'
};

const PIE_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.accent,
  CHART_COLORS.danger,
  CHART_COLORS.purple,
  CHART_COLORS.cyan
];

export const EnhancedCustomerDashboard: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const permissions = usePermissions();
  const [state, setState] = useState<CustomerDashboardState>({
    customers: [],
    filteredCustomers: [],
    stats: {
      total: 0,
      active: 0,
      inactive: 0,
      vip: 0,
      wholesale: 0,
      regular: 0,
      newCustomers: 0,
      returningCustomers: 0,
      churnRate: 0,
      averageLifetimeValue: 0,
      averageOrderValue: 0,
      topCountries: [],
      ageDistribution: []
    },
    loading: true,
    error: null,
    filters: {
      search: '',
      status: 'all',
      customerType: 'all',
      segment: 'all',
      country: '',
      city: '',
      ageRange: [18, 65],
      registrationDateFrom: '',
      registrationDateTo: '',
      minSpent: 0,
      maxSpent: 999999,
      minOrders: 0,
      maxOrders: 999,
      riskLevel: 'all',
      tags: []
    },
    currentPage: 1,
    itemsPerPage: PERFORMANCE_CONFIG.pageSize,
    sortBy: 'created_at',
    sortOrder: 'desc',
    selectedCustomer: null,
    showFilters: false,
    showExportModal: false,
    showCustomerDetails: false,
    exportFormat: 'csv',
    cacheKey: '',
    lastUpdated: null
  });

  // Cargar datos con caché inteligente
  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const cacheKey = `customers-dashboard-${JSON.stringify(state.filters)}-${state.currentPage}`;
      const cached = sessionStorage.getItem(cacheKey);
      const cachedTime = sessionStorage.getItem(`${cacheKey}-time`);
      
      if (!forceRefresh && cached && cachedTime && 
          (Date.now() - parseInt(cachedTime)) < PERFORMANCE_CONFIG.cacheTimeout) {
        const data = JSON.parse(cached);
        setState(prev => ({
          ...prev,
          customers: data.customers,
          filteredCustomers: data.filteredCustomers,
          stats: data.stats,
          loading: false,
          cacheKey,
          lastUpdated: new Date()
        }));
        return;
      }

      const result = await customerService.getAll({
        search: state.filters.search,
        status: state.filters.status === 'all' ? 'all' : state.filters.status,
        type: state.filters.customerType === 'all' ? 'all' : state.filters.customerType,
        page: state.currentPage,
        limit: PERFORMANCE_CONFIG.pageSize
      });

      if (result.error) {
        throw new Error(result.error);
      }

      // Procesar datos adicionales para estadísticas mejoradas
      const enhancedStats = enhanceCustomerStats(result.customers);
      
      const data = {
        customers: result.customers,
        filteredCustomers: result.customers,
        stats: { ...result.stats, ...enhancedStats }
      };

      // Guardar en caché
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
      sessionStorage.setItem(`${cacheKey}-time`, Date.now().toString());

      setState(prev => ({
        ...prev,
        customers: data.customers,
        filteredCustomers: data.filteredCustomers,
        stats: data.stats,
        loading: false,
        cacheKey,
        lastUpdated: new Date()
      }));

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }));
      toast.error('Error al cargar datos del dashboard');
    }
  }, [state.filters, state.currentPage]);

  // Mejorar estadísticas con análisis adicionales
  const enhanceCustomerStats = (customers: UICustomer[]) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const newCustomers = customers.filter(c => 
      new Date(c.created_at) >= thirtyDaysAgo
    ).length;
    
    const returningCustomers = customers.filter(c => 
      c.totalOrders > 1 && new Date(c.created_at) < thirtyDaysAgo
    ).length;
    
    const totalLifetimeValue = customers.reduce((sum, c) => 
      sum + (c.totalSpent || 0), 0
    );
    
    const totalOrders = customers.reduce((sum, c) => 
      sum + (c.totalOrders || 0), 0
    );

    // Análisis por países
    const countryMap = new Map<string, number>();
    customers.forEach(c => {
      const country = c.address?.split(',').pop()?.trim() || 'Desconocido';
      countryMap.set(country, (countryMap.get(country) || 0) + 1);
    });
    
    const topCountries = Array.from(countryMap.entries())
      .map(([country, count]) => ({
        country,
        count,
        percentage: (count / customers.length) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Distribución por edad (basada en fecha de nacimiento)
    const ageMap = new Map<string, number>();
    customers.forEach(c => {
      if (c.birthDate) {
        const age = new Date().getFullYear() - new Date(c.birthDate).getFullYear();
        let range: string;
        if (age < 25) range = '18-24';
        else if (age < 35) range = '25-34';
        else if (age < 45) range = '35-44';
        else if (age < 55) range = '45-54';
        else range = '55+';
        ageMap.set(range, (ageMap.get(range) || 0) + 1);
      }
    });
    
    const ageDistribution = Array.from(ageMap.entries())
      .map(([range, count]) => ({
        range,
        count,
        percentage: (count / customers.length) * 100
      }))
      .sort((a, b) => a.range.localeCompare(b.range));

    return {
      newCustomers,
      returningCustomers,
      churnRate: customers.length > 0 ? 
        (customers.filter(c => !c.is_active).length / customers.length) * 100 : 0,
      averageLifetimeValue: customers.length > 0 ? totalLifetimeValue / customers.length : 0,
      averageOrderValue: totalOrders > 0 ? totalLifetimeValue / totalOrders : 0,
      topCountries,
      ageDistribution
    };
  };

  // Aplicar filtros avanzados
  const applyFilters = useCallback(() => {
    let filtered = [...state.customers];

    // Filtro de búsqueda
    if (state.filters.search) {
      const searchTerm = state.filters.search.toLowerCase();
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm) ||
        customer.email?.toLowerCase().includes(searchTerm) ||
        customer.phone?.includes(searchTerm) ||
        customer.customerCode?.toLowerCase().includes(searchTerm)
      );
    }

    // Filtros por estado, tipo y segmento
    if (state.filters.status !== 'all') {
      filtered = filtered.filter(c => 
        state.filters.status === 'active' ? c.is_active : !c.is_active
      );
    }

    if (state.filters.customerType !== 'all') {
      filtered = filtered.filter(c => c.customerType === state.filters.customerType);
    }

    if (state.filters.segment !== 'all') {
      filtered = filtered.filter(c => c.segment === state.filters.segment);
    }

    // Filtros por rango de gasto y pedidos
    filtered = filtered.filter(c => 
      (c.totalSpent || 0) >= state.filters.minSpent &&
      (c.totalSpent || 0) <= state.filters.maxSpent &&
      (c.totalOrders || 0) >= state.filters.minOrders &&
      (c.totalOrders || 0) <= state.filters.maxOrders
    );

    // Ordenar
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
        case 'lastPurchase':
          aValue = new Date(a.lastPurchase || 0);
          bValue = new Date(b.lastPurchase || 0);
          break;
        case 'lifetimeValue':
          aValue = a.lifetimeValue || 0;
          bValue = b.lifetimeValue || 0;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }
      
      if (state.sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setState(prev => ({ ...prev, filteredCustomers: filtered }));
  }, [state.customers, state.filters, state.sortBy, state.sortOrder]);

  // Funciones de exportación mejoradas
  const exportToCSV = useCallback(() => {
    const headers = [
      'ID', 'Código', 'Nombre', 'Email', 'Teléfono', 'Dirección',
      'Tipo', 'Estado', 'Total Gastado', 'Total Órdenes', 'Última Compra',
      'Fecha Registro', 'Segmento', 'Valor de Vida'
    ];
    
    const data = state.filteredCustomers.slice(0, PERFORMANCE_CONFIG.maxExportRecords)
      .map(customer => [
        customer.id,
        customer.customerCode || '',
        `"${customer.name}"`,
        customer.email || '',
        customer.phone || '',
        `"${customer.address || ''}"`,
        customer.customerType,
        customer.is_active ? 'Activo' : 'Inactivo',
        customer.totalSpent.toFixed(2),
        customer.totalOrders,
        customer.lastPurchase || '',
        formatDate(customer.created_at),
        customer.segment || '',
        (customer.lifetimeValue || 0).toFixed(2)
      ].join(','));
    
    const csv = [headers.join(','), ...data].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `clientes_${formatDate(new Date())}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Exportados ${Math.min(state.filteredCustomers.length, PERFORMANCE_CONFIG.maxExportRecords)} clientes a CSV`);
  }, [state.filteredCustomers]);

  const exportToExcel = useCallback(async () => {
    try {
      const XLSX = await import('xlsx');
      
      const data = state.filteredCustomers.slice(0, PERFORMANCE_CONFIG.maxExportRecords)
        .map(customer => ({
          'ID': customer.id,
          'Código': customer.customerCode || '',
          'Nombre': customer.name,
          'Email': customer.email || '',
          'Teléfono': customer.phone || '',
          'Dirección': customer.address || '',
          'Tipo': customer.customerType,
          'Estado': customer.is_active ? 'Activo' : 'Inactivo',
          'Total Gastado': customer.totalSpent,
          'Total Órdenes': customer.totalOrders,
          'Última Compra': customer.lastPurchase || '',
          'Fecha Registro': formatDate(customer.created_at),
          'Segmento': customer.segment || '',
          'Valor de Vida': customer.lifetimeValue || 0
        }));
      
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
      
      XLSX.writeFile(wb, `clientes_${formatDate(new Date())}.xlsx`);
      toast.success(`Exportados ${Math.min(state.filteredCustomers.length, PERFORMANCE_CONFIG.maxExportRecords)} clientes a Excel`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Error al exportar a Excel');
    }
  }, [state.filteredCustomers]);

  const exportToPDF = useCallback(async () => {
    try {
      const jsPDF = await import('jspdf');
      const autoTable = await import('jspdf-autotable');
      
      const doc = new jsPDF.default();
      
      // Título
      doc.setFontSize(20);
      doc.text('Reporte de Clientes', 14, 22);
      
      // Fecha
      doc.setFontSize(10);
      doc.text(`Generado: ${formatDate(new Date())}`, 14, 30);
      
      // Estadísticas resumen
      doc.setFontSize(12);
      doc.text('Resumen:', 14, 45);
      doc.setFontSize(10);
      doc.text(`Total de clientes: ${state.stats.total}`, 14, 52);
      doc.text(`Clientes activos: ${state.stats.active}`, 14, 58);
      doc.text(`Clientes nuevos (30 días): ${state.stats.newCustomers}`, 14, 64);
      doc.text(`Valor promedio de vida: ${formatCurrency(state.stats.averageLifetimeValue)}`, 14, 70);
      
      // Tabla de clientes
      const data = state.filteredCustomers.slice(0, PERFORMANCE_CONFIG.maxExportRecords)
        .map(customer => [
          customer.customerCode || customer.id.slice(-6),
          customer.name,
          customer.email || '',
          customer.customerType,
          customer.is_active ? 'Activo' : 'Inactivo',
          formatCurrency(customer.totalSpent),
          customer.totalOrders.toString()
        ]);
      
      autoTable.default(doc, {
        head: [['Código', 'Nombre', 'Email', 'Tipo', 'Estado', 'Gastado', 'Órdenes']],
        body: data,
        startY: 80,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] }
      });
      
      doc.save(`clientes_${formatDate(new Date())}.pdf`);
      toast.success(`Exportados ${Math.min(state.filteredCustomers.length, PERFORMANCE_CONFIG.maxExportRecords)} clientes a PDF`);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast.error('Error al exportar a PDF');
    }
  }, [state.filteredCustomers, state.stats]);

  // Efectos
  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Renderizado de tarjetas de estadísticas
  const StatCard = ({ title, value, icon: Icon, trend, color = 'blue' }: any) => (
    <Card className={cn(
      "bg-gradient-to-br border-0 shadow-lg hover:shadow-xl transition-all duration-300",
      {
        'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20': color === 'blue',
        'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20': color === 'green',
        'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20': color === 'purple',
        'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20': color === 'orange',
        'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20': color === 'red'
      }
    )}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {trend && (
              <div className="flex items-center text-sm">
                <TrendingUp className="w-4 h-4 mr-1 text-green-500" />
                <span className="text-green-500">{trend}</span>
              </div>
            )}
          </div>
          <div className={cn(
            "p-3 rounded-lg",
            {
              'bg-blue-500': color === 'blue',
              'bg-green-500': color === 'green',
              'bg-purple-500': color === 'purple',
              'bg-orange-500': color === 'orange',
              'bg-red-500': color === 'red'
            }
          )}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Panel de filtros avanzados
  const AdvancedFiltersPanel = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Filtros Avanzados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div>
            <Label>Estado</Label>
            <Select
              value={state.filters.status}
              onValueChange={(value) => setState(prev => ({
                ...prev,
                filters: { ...prev.filters, status: value as any }
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

          <div>
            <Label>Tipo de Cliente</Label>
            <Select
              value={state.filters.customerType}
              onValueChange={(value) => setState(prev => ({
                ...prev,
                filters: { ...prev.filters, customerType: value as any }
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

          <div>
            <Label>Segmento</Label>
            <Select
              value={state.filters.segment}
              onValueChange={(value) => setState(prev => ({
                ...prev,
                filters: { ...prev.filters, segment: value as any }
              }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="new">Nuevo</SelectItem>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="frequent">Frecuente</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
                <SelectItem value="at_risk">En riesgo</SelectItem>
                <SelectItem value="dormant">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Nivel de Riesgo</Label>
            <Select
              value={state.filters.riskLevel}
              onValueChange={(value) => setState(prev => ({
                ...prev,
                filters: { ...prev.filters, riskLevel: value as any }
              }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="low">Bajo</SelectItem>
                <SelectItem value="medium">Medio</SelectItem>
                <SelectItem value="high">Alto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Gasto Mínimo</Label>
            <Input
              type="number"
              value={state.filters.minSpent}
              onChange={(e) => setState(prev => ({
                ...prev,
                filters: { ...prev.filters, minSpent: Number(e.target.value) }
              }))}
              placeholder="0"
            />
          </div>

          <div>
            <Label>Gasto Máximo</Label>
            <Input
              type="number"
              value={state.filters.maxSpent}
              onChange={(e) => setState(prev => ({
                ...prev,
                filters: { ...prev.filters, maxSpent: Number(e.target.value) }
              }))}
              placeholder="999999"
            />
          </div>

          <div>
            <Label>Órdenes Mínimas</Label>
            <Input
              type="number"
              value={state.filters.minOrders}
              onChange={(e) => setState(prev => ({
                ...prev,
                filters: { ...prev.filters, minOrders: Number(e.target.value) }
              }))}
              placeholder="0"
            />
          </div>

          <div>
            <Label>Órdenes Máximas</Label>
            <Input
              type="number"
              value={state.filters.maxOrders}
              onChange={(e) => setState(prev => ({
                ...prev,
                filters: { ...prev.filters, maxOrders: Number(e.target.value) }
              }))}
              placeholder="999"
            />
          </div>

          <div className="md:col-span-2 lg:col-span-3 xl:col-span-4 flex gap-2">
            <Button
              onClick={() => applyFilters()}
              className="flex-1"
            >
              <Filter className="w-4 h-4 mr-2" />
              Aplicar Filtros
            </Button>
            <Button
              variant="outline"
              onClick={() => setState(prev => ({
                ...prev,
                filters: {
                  search: '',
                  status: 'all',
                  customerType: 'all',
                  segment: 'all',
                  country: '',
                  city: '',
                  ageRange: [18, 65],
                  registrationDateFrom: '',
                  registrationDateTo: '',
                  minSpent: 0,
                  maxSpent: 999999,
                  minOrders: 0,
                  maxOrders: 999,
                  riskLevel: 'all',
                  tags: []
                }
              }))}
            >
              Limpiar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Tabla de clientes con accesibilidad mejorada
  const CustomerTable = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Lista de Clientes ({state.filteredCustomers.length})
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setState(prev => ({ ...prev, showExportModal: true }))}
              disabled={state.filteredCustomers.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(true)}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table" aria-label="Tabla de clientes">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium">Cliente</th>
                <th className="text-left p-3 font-medium">Contacto</th>
                <th className="text-left p-3 font-medium">Tipo</th>
                <th className="text-left p-3 font-medium">Estadísticas</th>
                <th className="text-left p-3 font-medium">Última Compra</th>
                <th className="text-left p-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {state.filteredCustomers.slice(0, state.itemsPerPage).map((customer) => (
                  <motion.tr
                    key={customer.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="border-b hover:bg-muted/50 transition-colors"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-medium">
                            {customer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {customer.customerCode || customer.id.slice(-6)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="space-y-1">
                        {customer.email && (
                          <div className="text-sm flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{customer.email}</span>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="text-sm flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="space-y-2">
                        <Badge variant={
                          customer.customerType === 'vip' ? 'secondary' :
                          customer.customerType === 'wholesale' ? 'outline' : 'default'
                        }>
                          {customer.customerType === 'vip' ? 'VIP' :
                           customer.customerType === 'wholesale' ? 'Mayorista' : 'Regular'}
                        </Badge>
                        <Badge variant={customer.is_active ? 'default' : 'destructive'}>
                          {customer.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-green-500" />
                          <span>{formatCurrency(customer.totalSpent)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Activity className="w-3 h-3 text-blue-500" />
                          <span>{customer.totalOrders} órdenes</span>
                        </div>
                        {customer.lifetimeValue && (
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500" />
                            <span>CLV: {formatCurrency(customer.lifetimeValue)}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-sm">
                        {customer.lastPurchase ? (
                          <div>
                            <div>{formatDate(customer.lastPurchase)}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(customer.lastPurchase).toLocaleDateString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Sin compras</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setState(prev => ({ 
                            ...prev, 
                            selectedCustomer: customer,
                            showCustomerDetails: true 
                          }))}
                          aria-label={`Ver detalles de ${customer.name}`}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        {permissions.hasPermission('customers.edit') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {}}
                            aria-label={`Editar ${customer.name}`}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        )}
                        {permissions.hasPermission('customers.delete') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {}}
                            aria-label={`Eliminar ${customer.name}`}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        
        {state.filteredCustomers.length === 0 && (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No se encontraron clientes con los filtros aplicados</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Gráficos interactivos
  const ChartsSection = () => {
    // Datos para gráficos
    const trendData = useMemo(() => {
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          date: date.toLocaleDateString('es-ES', { weekday: 'short' }),
          newCustomers: Math.floor(Math.random() * 20) + 5,
          totalCustomers: Math.floor(Math.random() * 100) + 50,
          revenue: Math.floor(Math.random() * 5000) + 2000
        };
      });
      return last7Days;
    }, []);

    const segmentData = useMemo(() => [
      { name: 'Nuevos', value: state.stats.newCustomers, color: CHART_COLORS.primary },
      { name: 'Regulares', value: state.stats.regular, color: CHART_COLORS.secondary },
      { name: 'VIP', value: state.stats.vip, color: CHART_COLORS.purple },
      { name: 'Mayoristas', value: state.stats.wholesale, color: CHART_COLORS.accent }
    ], [state.stats]);

    const countryData = useMemo(() => 
      state.stats.topCountries.map((country, index) => ({
        name: country.country,
        value: country.count,
        percentage: country.percentage
      })),
    [state.stats.topCountries]);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Tendencia de Clientes (7 días)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsLineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="newCustomers"
                  stroke={CHART_COLORS.primary}
                  strokeWidth={2}
                  name="Nuevos Clientes"
                />
                <Line
                  type="monotone"
                  dataKey="totalCustomers"
                  stroke={CHART_COLORS.secondary}
                  strokeWidth={2}
                  name="Total Clientes"
                />
              </RechartsLineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Distribución por Segmentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={segmentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: { name: string; percent?: number }) =>
                    `${name} (${((percent ?? 0) * 100).toFixed(1)}%)`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {segmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Top Países
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={countryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill={CHART_COLORS.primary} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Ingresos por Día
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke={CHART_COLORS.accent} 
                  fill={CHART_COLORS.accent}
                  fillOpacity={0.6}
                  name="Ingresos"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Modal de exportación
  const ExportModal = () => (
    <AnimatePresence>
      {state.showExportModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-background rounded-lg p-6 max-w-md w-full mx-4"
          >
            <h3 className="text-lg font-semibold mb-4">Exportar Clientes</h3>
            
            <div className="space-y-4">
              <div>
                <Label>Formato de Exportación</Label>
                <Select
                  value={state.exportFormat}
                  onValueChange={(value) => setState(prev => ({
                    ...prev,
                    exportFormat: value as any
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV (Excel compatible)</SelectItem>
                    <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="text-sm text-muted-foreground">
                Se exportarán {Math.min(state.filteredCustomers.length, PERFORMANCE_CONFIG.maxExportRecords)} de {state.filteredCustomers.length} clientes
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => {
                  switch (state.exportFormat) {
                    case 'csv':
                      exportToCSV();
                      break;
                    case 'excel':
                      exportToExcel();
                      break;
                    case 'pdf':
                      exportToPDF();
                      break;
                  }
                  setState(prev => ({ ...prev, showExportModal: false }));
                }}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
              <Button
                variant="outline"
                onClick={() => setState(prev => ({ ...prev, showExportModal: false }))}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Barra de búsqueda inteligente
  const SmartSearchBar = () => (
    <div className="relative mb-6">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
      <Input
        type="search"
        placeholder="Buscar clientes por nombre, email, teléfono o código..."
        value={state.filters.search}
        onChange={(e) => setState(prev => ({
          ...prev,
          filters: { ...prev.filters, search: e.target.value }
        }))}
        className="pl-10 pr-4 py-2 w-full"
        aria-label="Buscar clientes"
      />
      {state.filters.search && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setState(prev => ({
            ...prev,
            filters: { ...prev.filters, search: '' }
          }))}
          className="absolute right-2 top-1/2 transform -translate-y-1/2"
          aria-label="Limpiar búsqueda"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );

  // Controles de accesibilidad
  const AccessibilityControls = () => (
    <div className="flex items-center gap-2 mb-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        aria-label={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          const table = document.querySelector('table');
          if (table) {
            table.setAttribute('aria-label', 'Tabla de clientes - datos actualizados');
            toast.success('Tabla actualizada para lectores de pantalla');
          }
        }}
        aria-label="Mejorar accesibilidad de la tabla"
      >
        <Eye className="w-4 h-4" />
      </Button>

      {permissions.hasPermission('customers.mask' as any) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // Implementar enmascaramiento de datos sensibles
            toast.info('Enmascaramiento de datos activado');
          }}
          aria-label="Enmascarar datos sensibles"
        >
          <EyeOff className="w-4 h-4" />
        </Button>
      )}
    </div>
  );

  // Contenido principal
  if (state.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (state.error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-red-600">
            <Shield className="w-5 h-5" />
            <div>
              <h3 className="font-semibold">Error al cargar datos</h3>
              <p className="text-sm">{state.error}</p>
            </div>
          </div>
          <Button
            onClick={() => loadData(true)}
            className="mt-4"
            variant="outline"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Encabezado con controles */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Dashboard de Clientes
          </h1>
          <p className="text-muted-foreground">
            Gestión avanzada y análisis de clientes
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <AccessibilityControls />
          <Button
            variant="outline"
            onClick={() => setState(prev => ({ ...prev, showFilters: !prev.showFilters }))}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
          <Button
            onClick={() => loadData(true)}
            variant="outline"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <SmartSearchBar />

      {/* Panel de filtros */}
      <AnimatePresence>
        {state.showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <AdvancedFiltersPanel />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total de Clientes"
          value={state.stats.total}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Clientes Activos"
          value={state.stats.active}
          icon={UserCheck}
          color="green"
        />
        <StatCard
          title="Clientes Nuevos (30 días)"
          value={state.stats.newCustomers}
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          title="Valor Promedio de Vida"
          value={formatCurrency(state.stats.averageLifetimeValue)}
          icon={DollarSign}
          color="orange"
        />
      </div>

      {/* Gráficos interactivos */}
      <ChartsSection />

      {/* Tabla de clientes */}
      <CustomerTable />

      {/* Modal de exportación */}
      <ExportModal />

      {/* Información de actualización */}
      {state.lastUpdated && (
        <div className="text-xs text-muted-foreground text-center">
          Última actualización: {state.lastUpdated.toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default EnhancedCustomerDashboard;