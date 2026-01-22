'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart3, 
  PieChart, 
  Target,
  Clock,
  DollarSign,
  Package,
  Truck,
  Star,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Download,
  Calendar,
  Users,
  Building,
  Award,
  Zap,
  ThumbsUp,
  ThumbsDown,
  Eye,
  RefreshCw,
  Settings,
  Info,
  ArrowUp,
  ArrowDown,
  Minus,
  FileText,
  Mail,
  Phone,
  ArrowLeft
} from 'lucide-react';
import dynamic from 'next/dynamic';
const LineChart = dynamic<any>(() => import('recharts').then(m => ({ default: m.LineChart })), { ssr: false });
const Line = dynamic<any>(() => import('recharts').then(m => ({ default: m.Line })), { ssr: false });
const BarChart = dynamic<any>(() => import('recharts').then(m => ({ default: m.BarChart })), { ssr: false });
const Bar = dynamic<any>(() => import('recharts').then((m) => m.Bar as any), { ssr: false });
const RechartsPieChart = dynamic<any>(() => import('recharts').then(m => ({ default: m.PieChart })), { ssr: false });
const Cell = dynamic<any>(() => import('recharts').then(m => ({ default: m.Cell })), { ssr: false });
const AreaChart = dynamic<any>(() => import('recharts').then(m => ({ default: m.AreaChart })), { ssr: false });
const Area = dynamic<any>(() => import('recharts').then((m) => m.Area as any), { ssr: false });
const XAxis = dynamic<any>(() => import('recharts').then(m => ({ default: m.XAxis })), { ssr: false });
const YAxis = dynamic<any>(() => import('recharts').then(m => ({ default: m.YAxis })), { ssr: false });
const CartesianGrid = dynamic<any>(() => import('recharts').then(m => ({ default: m.CartesianGrid })), { ssr: false });
const Tooltip = dynamic<any>(() => import('recharts').then(m => ({ default: m.Tooltip })), { ssr: false });
const Legend = dynamic<any>(() => import('recharts').then(m => ({ default: m.Legend })), { ssr: false });
const ResponsiveContainer = dynamic<any>(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })), { ssr: false });
import api from '@/lib/api';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';

// Types
interface SupplierPerformance {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierEmail: string;
  supplierPhone: string;
  category: string;
  period: string;
  kpis: SupplierKPIs;
  metrics: PerformanceMetrics;
  trends: PerformanceTrend[];
  ratings: SupplierRating[];
  contracts: ContractPerformance[];
  deliveries: DeliveryPerformance[];
  quality: QualityMetrics;
  financial: FinancialMetrics;
  compliance: ComplianceMetrics;
  lastUpdated: string;
}

interface SupplierKPIs {
  overallScore: number;
  deliveryScore: number;
  qualityScore: number;
  priceScore: number;
  serviceScore: number;
  complianceScore: number;
  reliabilityScore: number;
  innovationScore: number;
  sustainabilityScore: number;
  communicationScore: number;
}

interface PerformanceMetrics {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  onTimeDeliveries: number;
  lateDeliveries: number;
  averageDeliveryTime: number;
  defectRate: number;
  returnRate: number;
  totalSpent: number;
  averageOrderValue: number;
  costSavings: number;
  responseTime: number; // hours
  issueResolutionTime: number; // hours
  customerSatisfaction: number;
  contractCompliance: number;
}

interface PerformanceTrend {
  date: string;
  overallScore: number;
  deliveryScore: number;
  qualityScore: number;
  priceScore: number;
  serviceScore: number;
  orders: number;
  value: number;
}

interface SupplierRating {
  id: string;
  category: string;
  rating: number;
  maxRating: number;
  comment?: string;
  evaluatedBy: string;
  evaluatedByName: string;
  evaluatedAt: string;
}

interface ContractPerformance {
  contractId: string;
  contractNumber: string;
  title: string;
  status: string;
  startDate: string;
  endDate: string;
  value: number;
  completionPercentage: number;
  milestonesCompleted: number;
  totalMilestones: number;
  slaCompliance: number;
  penaltiesApplied: number;
  bonusesEarned: number;
}

interface DeliveryPerformance {
  id: string;
  orderId: string;
  orderDate: string;
  promisedDate: string;
  actualDate: string;
  status: 'on_time' | 'late' | 'early';
  delayDays: number;
  items: number;
  value: number;
  qualityIssues: number;
}

interface QualityMetrics {
  defectRate: number;
  returnRate: number;
  qualityScore: number;
  inspectionsPassed: number;
  totalInspections: number;
  certifications: string[];
  qualityIssues: QualityIssue[];
}

interface QualityIssue {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  reportedDate: string;
  resolvedDate?: string;
  status: 'open' | 'in_progress' | 'resolved';
}

interface FinancialMetrics {
  totalSpent: number;
  averageOrderValue: number;
  paymentTermsCompliance: number;
  earlyPaymentDiscounts: number;
  latePaymentPenalties: number;
  costPerUnit: number;
  priceVariance: number;
  budgetCompliance: number;
}

interface ComplianceMetrics {
  overallCompliance: number;
  contractCompliance: number;
  regulatoryCompliance: number;
  safetyCompliance: number;
  environmentalCompliance: number;
  certificationStatus: string;
  auditScore: number;
  lastAuditDate: string;
}

// Mock data
const mockPerformanceData: SupplierPerformance[] = [
  {
    id: '1',
    supplierId: 'sup1',
    supplierName: 'TechSupply Corp',
    supplierEmail: 'contact@techsupply.com',
    supplierPhone: '+52 55 1234 5678',
    category: 'Tecnología',
    period: '2024',
    kpis: {
      overallScore: 87,
      deliveryScore: 92,
      qualityScore: 85,
      priceScore: 78,
      serviceScore: 90,
      complianceScore: 95,
      reliabilityScore: 88,
      innovationScore: 82,
      sustainabilityScore: 75,
      communicationScore: 93
    },
    metrics: {
      totalOrders: 156,
      completedOrders: 148,
      cancelledOrders: 8,
      onTimeDeliveries: 136,
      lateDeliveries: 12,
      averageDeliveryTime: 12.5,
      defectRate: 2.1,
      returnRate: 1.8,
      totalSpent: 2450000,
      averageOrderValue: 15705,
      costSavings: 125000,
      responseTime: 4.2,
      issueResolutionTime: 18.5,
      customerSatisfaction: 4.3,
      contractCompliance: 94
    },
    trends: [
      { date: '2024-01', overallScore: 82, deliveryScore: 88, qualityScore: 80, priceScore: 75, serviceScore: 85, orders: 12, value: 180000 },
      { date: '2024-02', overallScore: 84, deliveryScore: 90, qualityScore: 82, priceScore: 76, serviceScore: 87, orders: 15, value: 220000 },
      { date: '2024-03', overallScore: 86, deliveryScore: 91, qualityScore: 84, priceScore: 77, serviceScore: 88, orders: 18, value: 280000 },
      { date: '2024-04', overallScore: 87, deliveryScore: 92, qualityScore: 85, priceScore: 78, serviceScore: 90, orders: 20, value: 315000 }
    ],
    ratings: [
      { id: 'r1', category: 'Calidad', rating: 4.2, maxRating: 5, evaluatedBy: 'user1', evaluatedByName: 'Juan Pérez', evaluatedAt: '2024-04-15T10:00:00Z' },
      { id: 'r2', category: 'Entrega', rating: 4.6, maxRating: 5, evaluatedBy: 'user2', evaluatedByName: 'María García', evaluatedAt: '2024-04-10T14:30:00Z' },
      { id: 'r3', category: 'Servicio', rating: 4.5, maxRating: 5, evaluatedBy: 'user3', evaluatedByName: 'Carlos López', evaluatedAt: '2024-04-08T09:15:00Z' }
    ],
    contracts: [
      {
        contractId: 'cont1',
        contractNumber: 'CONT-2024-001',
        title: 'Suministro Tecnológico',
        status: 'active',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        value: 500000,
        completionPercentage: 65,
        milestonesCompleted: 3,
        totalMilestones: 5,
        slaCompliance: 92,
        penaltiesApplied: 0,
        bonusesEarned: 15000
      }
    ],
    deliveries: [
      { id: 'd1', orderId: 'ord1', orderDate: '2024-04-01T00:00:00Z', promisedDate: '2024-04-15T00:00:00Z', actualDate: '2024-04-14T00:00:00Z', status: 'early', delayDays: -1, items: 50, value: 75000, qualityIssues: 0 },
      { id: 'd2', orderId: 'ord2', orderDate: '2024-04-05T00:00:00Z', promisedDate: '2024-04-20T00:00:00Z', actualDate: '2024-04-22T00:00:00Z', status: 'late', delayDays: 2, items: 30, value: 45000, qualityIssues: 1 }
    ],
    quality: {
      defectRate: 2.1,
      returnRate: 1.8,
      qualityScore: 85,
      inspectionsPassed: 142,
      totalInspections: 148,
      certifications: ['ISO 9001', 'ISO 14001'],
      qualityIssues: [
        { id: 'qi1', type: 'Defecto menor', severity: 'low', description: 'Rayón en superficie', reportedDate: '2024-04-10T00:00:00Z', resolvedDate: '2024-04-12T00:00:00Z', status: 'resolved' }
      ]
    },
    financial: {
      totalSpent: 2450000,
      averageOrderValue: 15705,
      paymentTermsCompliance: 96,
      earlyPaymentDiscounts: 12000,
      latePaymentPenalties: 0,
      costPerUnit: 125.50,
      priceVariance: -2.5,
      budgetCompliance: 98
    },
    compliance: {
      overallCompliance: 95,
      contractCompliance: 94,
      regulatoryCompliance: 96,
      safetyCompliance: 98,
      environmentalCompliance: 92,
      certificationStatus: 'Vigente',
      auditScore: 94,
      lastAuditDate: '2024-03-15T00:00:00Z'
    },
    lastUpdated: '2024-04-20T10:00:00Z'
  },
  {
    id: '2',
    supplierId: 'sup2',
    supplierName: 'CleanPro Services',
    supplierEmail: 'info@cleanpro.com',
    supplierPhone: '+52 55 2345 6789',
    category: 'Servicios',
    period: '2024',
    kpis: {
      overallScore: 76,
      deliveryScore: 88,
      qualityScore: 72,
      priceScore: 85,
      serviceScore: 80,
      complianceScore: 90,
      reliabilityScore: 75,
      innovationScore: 65,
      sustainabilityScore: 82,
      communicationScore: 78
    },
    metrics: {
      totalOrders: 48,
      completedOrders: 45,
      cancelledOrders: 3,
      onTimeDeliveries: 42,
      lateDeliveries: 3,
      averageDeliveryTime: 2.1,
      defectRate: 4.2,
      returnRate: 3.1,
      totalSpent: 240000,
      averageOrderValue: 5000,
      costSavings: 18000,
      responseTime: 6.8,
      issueResolutionTime: 24.2,
      customerSatisfaction: 3.8,
      contractCompliance: 88
    },
    trends: [
      { date: '2024-01', overallScore: 72, deliveryScore: 85, qualityScore: 68, priceScore: 82, serviceScore: 75, orders: 12, value: 60000 },
      { date: '2024-02', overallScore: 74, deliveryScore: 86, qualityScore: 70, priceScore: 83, serviceScore: 77, orders: 12, value: 60000 },
      { date: '2024-03', overallScore: 75, deliveryScore: 87, qualityScore: 71, priceScore: 84, serviceScore: 78, orders: 12, value: 60000 },
      { date: '2024-04', overallScore: 76, deliveryScore: 88, qualityScore: 72, priceScore: 85, serviceScore: 80, orders: 12, value: 60000 }
    ],
    ratings: [
      { id: 'r4', category: 'Calidad', rating: 3.6, maxRating: 5, evaluatedBy: 'user1', evaluatedByName: 'Juan Pérez', evaluatedAt: '2024-04-15T10:00:00Z' },
      { id: 'r5', category: 'Entrega', rating: 4.4, maxRating: 5, evaluatedBy: 'user2', evaluatedByName: 'María García', evaluatedAt: '2024-04-10T14:30:00Z' }
    ],
    contracts: [],
    deliveries: [],
    quality: {
      defectRate: 4.2,
      returnRate: 3.1,
      qualityScore: 72,
      inspectionsPassed: 43,
      totalInspections: 45,
      certifications: ['ISO 9001'],
      qualityIssues: []
    },
    financial: {
      totalSpent: 240000,
      averageOrderValue: 5000,
      paymentTermsCompliance: 92,
      earlyPaymentDiscounts: 3600,
      latePaymentPenalties: 0,
      costPerUnit: 50.00,
      priceVariance: 1.2,
      budgetCompliance: 95
    },
    compliance: {
      overallCompliance: 90,
      contractCompliance: 88,
      regulatoryCompliance: 92,
      safetyCompliance: 95,
      environmentalCompliance: 85,
      certificationStatus: 'Vigente',
      auditScore: 88,
      lastAuditDate: '2024-02-20T00:00:00Z'
    },
    lastUpdated: '2024-04-20T10:00:00Z'
  }
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function PerformancePage() {
  const router = useRouter();
  const fmtCurrency = useCurrencyFormatter();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [performanceData, setPerformanceData] = useState<SupplierPerformance[]>(mockPerformanceData);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('2024');
  const [sortBy, setSortBy] = useState<string>('overallScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierPerformance | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Load data
  useEffect(() => {
    loadPerformanceData();
  }, []);

  const loadPerformanceData = async () => {
    setLoading(true);
    try {
      // In a real app, load from API
      // const response = await api.get('/suppliers/performance');
      // setPerformanceData(response.data.performance);
    } catch (error) {
      console.error('Error loading performance data:', error);
      toast({
        title: 'Error',
        description: 'Error al cargar los datos de rendimiento',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtering and sorting
  const filteredData = performanceData
    .filter(supplier => {
      const matchesSearch = supplier.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           supplier.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'all' || supplier.category === filterCategory;
      const matchesPeriod = filterPeriod === 'all' || supplier.period === filterPeriod;
      
      return matchesSearch && matchesCategory && matchesPeriod;
    })
    .sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case 'overallScore':
          aValue = a.kpis.overallScore;
          bValue = b.kpis.overallScore;
          break;
        case 'deliveryScore':
          aValue = a.kpis.deliveryScore;
          bValue = b.kpis.deliveryScore;
          break;
        case 'qualityScore':
          aValue = a.kpis.qualityScore;
          bValue = b.kpis.qualityScore;
          break;
        case 'totalSpent':
          aValue = a.metrics.totalSpent;
          bValue = b.metrics.totalSpent;
          break;
        case 'supplierName':
          aValue = a.supplierName;
          bValue = b.supplierName;
          break;
        default:
          aValue = a.kpis.overallScore;
          bValue = b.kpis.overallScore;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Helper functions
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 80) return 'bg-blue-500';
    if (score >= 70) return 'bg-yellow-500';
    if (score >= 60) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getPerformanceLevel = (score: number) => {
    if (score >= 90) return 'Excelente';
    if (score >= 80) return 'Bueno';
    if (score >= 70) return 'Regular';
    if (score >= 60) return 'Bajo';
    return 'Crítico';
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (current < previous) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Statistics calculations
  const overallStats = {
    totalSuppliers: performanceData.length,
    averageScore: performanceData.reduce((sum, s) => sum + s.kpis.overallScore, 0) / performanceData.length,
    topPerformers: performanceData.filter(s => s.kpis.overallScore >= 90).length,
    underPerformers: performanceData.filter(s => s.kpis.overallScore < 70).length,
    totalSpent: performanceData.reduce((sum, s) => sum + s.metrics.totalSpent, 0),
    totalOrders: performanceData.reduce((sum, s) => sum + s.metrics.totalOrders, 0),
    averageDeliveryTime: performanceData.reduce((sum, s) => sum + s.metrics.averageDeliveryTime, 0) / performanceData.length,
    overallCompliance: performanceData.reduce((sum, s) => sum + s.compliance.overallCompliance, 0) / performanceData.length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.back()}
            className="flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Análisis de Rendimiento</h1>
            <p className="text-muted-foreground">
              KPIs y métricas avanzadas de rendimiento de proveedores
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar Reporte
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen General</TabsTrigger>
          <TabsTrigger value="kpis">KPIs Detallados</TabsTrigger>
          <TabsTrigger value="trends">Tendencias</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Overall Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{overallStats.totalSuppliers}</p>
                    <p className="text-sm text-muted-foreground">Proveedores Evaluados</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Target className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{overallStats.averageScore.toFixed(1)}</p>
                    <p className="text-sm text-muted-foreground">Puntuación Promedio</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Award className="h-8 w-8 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold">{overallStats.topPerformers}</p>
                    <p className="text-sm text-muted-foreground">Top Performers (≥90)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                  <div>
                    <p className="text-2xl font-bold">{overallStats.underPerformers}</p>
                    <p className="text-sm text-muted-foreground">Bajo Rendimiento (&lt;70)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Buscar proveedores..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="Tecnología">Tecnología</SelectItem>
                    <SelectItem value="Servicios">Servicios</SelectItem>
                    <SelectItem value="Materiales">Materiales</SelectItem>
                    <SelectItem value="Logística">Logística</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overallScore">Puntuación General</SelectItem>
                    <SelectItem value="deliveryScore">Entrega</SelectItem>
                    <SelectItem value="qualityScore">Calidad</SelectItem>
                    <SelectItem value="totalSpent">Gasto Total</SelectItem>
                    <SelectItem value="supplierName">Nombre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Performance Cards */}
          <div className="space-y-4">
            {filteredData.map((supplier) => (
              <Card key={supplier.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-lg ${
                        supplier.kpis.overallScore >= 90 ? 'bg-green-100' :
                        supplier.kpis.overallScore >= 80 ? 'bg-blue-100' :
                        supplier.kpis.overallScore >= 70 ? 'bg-yellow-100' :
                        'bg-red-100'
                      }`}>
                        <Building className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-lg">{supplier.supplierName}</h3>
                          <Badge className={getScoreBadge(supplier.kpis.overallScore)}>
                            {supplier.kpis.overallScore}/100
                          </Badge>
                          <span className={`text-sm font-medium ${getScoreColor(supplier.kpis.overallScore)}`}>
                            {getPerformanceLevel(supplier.kpis.overallScore)}
                          </span>
                        </div>
                        <p className="text-muted-foreground mb-3">{supplier.category}</p>
                        
                        {/* KPI Scores */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                          <div className="text-center">
                            <div className={`text-2xl font-bold ${getScoreColor(supplier.kpis.deliveryScore)}`}>
                              {supplier.kpis.deliveryScore}
                            </div>
                            <div className="text-xs text-muted-foreground">Entrega</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-2xl font-bold ${getScoreColor(supplier.kpis.qualityScore)}`}>
                              {supplier.kpis.qualityScore}
                            </div>
                            <div className="text-xs text-muted-foreground">Calidad</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-2xl font-bold ${getScoreColor(supplier.kpis.priceScore)}`}>
                              {supplier.kpis.priceScore}
                            </div>
                            <div className="text-xs text-muted-foreground">Precio</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-2xl font-bold ${getScoreColor(supplier.kpis.serviceScore)}`}>
                              {supplier.kpis.serviceScore}
                            </div>
                            <div className="text-xs text-muted-foreground">Servicio</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-2xl font-bold ${getScoreColor(supplier.kpis.complianceScore)}`}>
                              {supplier.kpis.complianceScore}
                            </div>
                            <div className="text-xs text-muted-foreground">Cumplimiento</div>
                          </div>
                        </div>
                        
                        {/* Key Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Órdenes Totales:</span>
                            <p className="font-medium">{supplier.metrics.totalOrders}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Entrega Puntual:</span>
                            <p className="font-medium">
                              {formatPercentage((supplier.metrics.onTimeDeliveries / supplier.metrics.totalOrders) * 100)}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Gasto Total:</span>
                            <p className="font-medium">{fmtCurrency(supplier.metrics.totalSpent)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Tasa de Defectos:</span>
                            <p className="font-medium">{formatPercentage(supplier.metrics.defectRate)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedSupplier(supplier);
                          setShowDetailsDialog(true);
                        }}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalles
                      </Button>
                    </div>
                  </div>
                  
                  {/* Performance Progress Bars */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Rendimiento General</span>
                      <span className="font-medium">{supplier.kpis.overallScore}%</span>
                    </div>
                    <Progress value={supplier.kpis.overallScore} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="kpis" className="space-y-4">
          {/* KPI Comparison Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Comparación de KPIs por Proveedor</CardTitle>
              <CardDescription>
                Análisis comparativo de los principales indicadores de rendimiento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="supplierName" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="kpis.overallScore" fill="#8884d8" name="General" />
                    <Bar dataKey="kpis.deliveryScore" fill="#82ca9d" name="Entrega" />
                    <Bar dataKey="kpis.qualityScore" fill="#ffc658" name="Calidad" />
                    <Bar dataKey="kpis.serviceScore" fill="#ff7300" name="Servicio" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Detailed KPI Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredData.map((supplier) => (
              <Card key={supplier.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {supplier.supplierName}
                    <Badge className={getScoreBadge(supplier.kpis.overallScore)}>
                      {supplier.kpis.overallScore}/100
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(supplier.kpis).map(([key, value]) => {
                      if (key === 'overallScore') return null;
                      const label = {
                        deliveryScore: 'Entrega',
                        qualityScore: 'Calidad',
                        priceScore: 'Precio',
                        serviceScore: 'Servicio',
                        complianceScore: 'Cumplimiento',
                        reliabilityScore: 'Confiabilidad',
                        innovationScore: 'Innovación',
                        sustainabilityScore: 'Sostenibilidad',
                        communicationScore: 'Comunicación'
                      }[key] || key;
                      
                      return (
                        <div key={key} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>{label}</span>
                            <span className={`font-medium ${getScoreColor(value)}`}>
                              {value}%
                            </span>
                          </div>
                          <Progress value={value} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          {/* Trend Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Tendencias de Rendimiento</CardTitle>
              <CardDescription>
                Evolución de los KPIs a lo largo del tiempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredData[0]?.trends || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="overallScore" stroke="#8884d8" name="General" />
                    <Line type="monotone" dataKey="deliveryScore" stroke="#82ca9d" name="Entrega" />
                    <Line type="monotone" dataKey="qualityScore" stroke="#ffc658" name="Calidad" />
                    <Line type="monotone" dataKey="serviceScore" stroke="#ff7300" name="Servicio" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Volume and Value Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tendencia de Órdenes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredData[0]?.trends || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="orders" stroke="#8884d8" fill="#8884d8" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tendencia de Valor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredData[0]?.trends || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => fmtCurrency(value)} />
                      <Area type="monotone" dataKey="value" stroke="#82ca9d" fill="#82ca9d" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="benchmarks" className="space-y-4">
          {/* Industry Benchmarks */}
          <Card>
            <CardHeader>
              <CardTitle>Benchmarks de la Industria</CardTitle>
              <CardDescription>
                Comparación con estándares de la industria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {filteredData.map((supplier) => (
                  <div key={supplier.id} className="space-y-4">
                    <h4 className="font-semibold">{supplier.supplierName}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Entrega Puntual</span>
                          <div className="flex items-center space-x-1">
                            <span className="text-lg font-bold">
                              {formatPercentage((supplier.metrics.onTimeDeliveries / supplier.metrics.totalOrders) * 100)}
                            </span>
                            {getTrendIcon(92, 88)}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Benchmark industria: 85%
                        </div>
                        <Progress value={(supplier.metrics.onTimeDeliveries / supplier.metrics.totalOrders) * 100} className="h-2 mt-2" />
                      </div>

                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Tasa de Defectos</span>
                          <div className="flex items-center space-x-1">
                            <span className="text-lg font-bold">
                              {formatPercentage(supplier.metrics.defectRate)}
                            </span>
                            {getTrendIcon(2.1, 2.8)}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Benchmark industria: 3.5%
                        </div>
                        <Progress value={100 - supplier.metrics.defectRate * 10} className="h-2 mt-2" />
                      </div>

                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Tiempo Respuesta</span>
                          <div className="flex items-center space-x-1">
                            <span className="text-lg font-bold">
                              {supplier.metrics.responseTime.toFixed(1)}h
                            </span>
                            {getTrendIcon(4.2, 5.1)}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Benchmark industria: 8h
                        </div>
                        <Progress value={Math.max(0, 100 - (supplier.metrics.responseTime / 8) * 100)} className="h-2 mt-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Supplier Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" aria-labelledby="performance-details-title">
          <DialogHeader>
            <DialogTitle id="performance-details-title">Análisis Detallado de Rendimiento</DialogTitle>
            <DialogDescription>
              Métricas completas y análisis de rendimiento del proveedor
            </DialogDescription>
          </DialogHeader>
          
          {selectedSupplier && (
            <div className="space-y-6">
              {/* Supplier Header */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <h3 className="text-xl font-semibold">{selectedSupplier.supplierName}</h3>
                  <p className="text-muted-foreground">{selectedSupplier.category}</p>
                </div>
                <Badge className={getScoreBadge(selectedSupplier.kpis.overallScore)}>
                  {selectedSupplier.kpis.overallScore}/100
                </Badge>
              </div>

              {/* Detailed Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Métricas de Entrega</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Órdenes Totales:</span>
                      <span className="font-medium">{selectedSupplier.metrics.totalOrders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Entregas Puntuales:</span>
                      <span className="font-medium">{selectedSupplier.metrics.onTimeDeliveries}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Entregas Tardías:</span>
                      <span className="font-medium">{selectedSupplier.metrics.lateDeliveries}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Tiempo Promedio:</span>
                      <span className="font-medium">{selectedSupplier.metrics.averageDeliveryTime} días</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Métricas de Calidad</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Tasa de Defectos:</span>
                      <span className="font-medium">{formatPercentage(selectedSupplier.metrics.defectRate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Tasa de Devoluciones:</span>
                      <span className="font-medium">{formatPercentage(selectedSupplier.metrics.returnRate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Inspecciones Pasadas:</span>
                      <span className="font-medium">{selectedSupplier.quality.inspectionsPassed}/{selectedSupplier.quality.totalInspections}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Puntuación Calidad:</span>
                      <span className="font-medium">{selectedSupplier.quality.qualityScore}/100</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Métricas Financieras</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Gasto Total:</span>
                      <span className="font-medium">{fmtCurrency(selectedSupplier.financial.totalSpent)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Valor Promedio Orden:</span>
                      <span className="font-medium">{fmtCurrency(selectedSupplier.financial.averageOrderValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Ahorros Generados:</span>
                      <span className="font-medium">{fmtCurrency(selectedSupplier.metrics.costSavings)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Cumplimiento Pago:</span>
                      <span className="font-medium">{formatPercentage(selectedSupplier.financial.paymentTermsCompliance)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* KPI Radar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Perfil de KPIs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {Object.entries(selectedSupplier.kpis).map(([key, value]) => {
                      if (key === 'overallScore') return null;
                      const label = {
                        deliveryScore: 'Entrega',
                        qualityScore: 'Calidad',
                        priceScore: 'Precio',
                        serviceScore: 'Servicio',
                        complianceScore: 'Cumplimiento',
                        reliabilityScore: 'Confiabilidad',
                        innovationScore: 'Innovación',
                        sustainabilityScore: 'Sostenibilidad',
                        communicationScore: 'Comunicación'
                      }[key] || key;
                      
                      return (
                        <div key={key} className="text-center">
                          <div className={`text-3xl font-bold ${getScoreColor(value)}`}>
                            {value}
                          </div>
                          <div className="text-sm text-muted-foreground">{label}</div>
                          <Progress value={value} className="h-2 mt-2" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Ratings */}
              {selectedSupplier.ratings.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Evaluaciones Recientes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedSupplier.ratings.map((rating) => (
                        <div key={rating.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{rating.category}</div>
                            <div className="text-sm text-muted-foreground">
                              Por {rating.evaluatedByName} • {new Date(rating.evaluatedAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="flex">
                              {[...Array(rating.maxRating)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < rating.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="font-medium">{rating.rating}/{rating.maxRating}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Cerrar
            </Button>
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Exportar Reporte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}