'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Star, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  DollarSign, 
  Truck, 
  Shield, 
  Award,
  BarChart3,
  Filter,
  Search,
  Plus,
  Edit,
  Eye,
  Calendar,
  User,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import api from '@/lib/api';

// Types
interface SupplierEvaluation {
  id: string;
  supplierId: string;
  supplierName: string;
  evaluatorId: string;
  evaluatorName: string;
  evaluationDate: string;
  period: string;
  overallRating: number;
  criteria: {
    quality: number;
    delivery: number;
    pricing: number;
    service: number;
    reliability: number;
    communication: number;
  };
  comments: string;
  recommendations: string;
  status: 'draft' | 'completed' | 'approved';
  nextEvaluationDate?: string;
}

interface SupplierRating {
  supplierId: string;
  supplierName: string;
  category: string;
  overallRating: number;
  totalEvaluations: number;
  lastEvaluationDate: string;
  trend: 'up' | 'down' | 'stable';
  criteria: {
    quality: number;
    delivery: number;
    pricing: number;
    service: number;
    reliability: number;
    communication: number;
  };
  performance: {
    onTimeDelivery: number;
    qualityScore: number;
    priceCompetitiveness: number;
    responseTime: number;
  };
  status: 'excellent' | 'good' | 'average' | 'poor';
}

interface EvaluationCriteria {
  name: string;
  weight: number;
  description: string;
}

// Mock data
const mockEvaluations: SupplierEvaluation[] = [
  {
    id: '1',
    supplierId: 'sup1',
    supplierName: 'TechSupply Corp',
    evaluatorId: 'user1',
    evaluatorName: 'Juan Pérez',
    evaluationDate: '2024-01-15',
    period: 'Q4 2023',
    overallRating: 4.2,
    criteria: {
      quality: 4.5,
      delivery: 4.0,
      pricing: 3.8,
      service: 4.3,
      reliability: 4.2,
      communication: 4.1
    },
    comments: 'Excelente calidad de productos, entregas puntuales en su mayoría.',
    recommendations: 'Mejorar competitividad en precios para productos de alta rotación.',
    status: 'completed',
    nextEvaluationDate: '2024-04-15'
  },
  {
    id: '2',
    supplierId: 'sup2',
    supplierName: 'Local Materials',
    evaluatorId: 'user2',
    evaluatorName: 'María García',
    evaluationDate: '2024-01-10',
    period: 'Q4 2023',
    overallRating: 3.8,
    criteria: {
      quality: 4.0,
      delivery: 3.5,
      pricing: 4.2,
      service: 3.8,
      reliability: 3.6,
      communication: 3.9
    },
    comments: 'Buenos precios, pero necesita mejorar tiempos de entrega.',
    recommendations: 'Implementar sistema de tracking de pedidos.',
    status: 'approved'
  }
];

const mockRatings: SupplierRating[] = [
  {
    supplierId: 'sup1',
    supplierName: 'TechSupply Corp',
    category: 'Tecnología',
    overallRating: 4.2,
    totalEvaluations: 8,
    lastEvaluationDate: '2024-01-15',
    trend: 'up',
    criteria: {
      quality: 4.5,
      delivery: 4.0,
      pricing: 3.8,
      service: 4.3,
      reliability: 4.2,
      communication: 4.1
    },
    performance: {
      onTimeDelivery: 92,
      qualityScore: 96,
      priceCompetitiveness: 78,
      responseTime: 2.5
    },
    status: 'excellent'
  },
  {
    supplierId: 'sup2',
    supplierName: 'Local Materials',
    category: 'Materiales',
    overallRating: 3.8,
    totalEvaluations: 6,
    lastEvaluationDate: '2024-01-10',
    trend: 'stable',
    criteria: {
      quality: 4.0,
      delivery: 3.5,
      pricing: 4.2,
      service: 3.8,
      reliability: 3.6,
      communication: 3.9
    },
    performance: {
      onTimeDelivery: 85,
      qualityScore: 88,
      priceCompetitiveness: 92,
      responseTime: 4.2
    },
    status: 'good'
  }
];

const evaluationCriteria: EvaluationCriteria[] = [
  { name: 'quality', weight: 25, description: 'Calidad de productos/servicios' },
  { name: 'delivery', weight: 20, description: 'Puntualidad en entregas' },
  { name: 'pricing', weight: 15, description: 'Competitividad de precios' },
  { name: 'service', weight: 15, description: 'Calidad del servicio al cliente' },
  { name: 'reliability', weight: 15, description: 'Confiabilidad y consistencia' },
  { name: 'communication', weight: 10, description: 'Comunicación y respuesta' }
];

export default function SupplierEvaluationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [evaluations, setEvaluations] = useState<SupplierEvaluation[]>(mockEvaluations);
  const [ratings, setRatings] = useState<SupplierRating[]>(mockRatings);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('rating');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Dialog states
  const [showEvaluationDialog, setShowEvaluationDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<SupplierEvaluation | null>(null);
  const [selectedRating, setSelectedRating] = useState<SupplierRating | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<SupplierEvaluation>>({
    criteria: {
      quality: 0,
      delivery: 0,
      pricing: 0,
      service: 0,
      reliability: 0,
      communication: 0
    }
  });

  // Load data
  useEffect(() => {
    loadEvaluations();
  }, []);

  const loadEvaluations = async () => {
    setLoading(true);
    try {
      // In a real app, load from API
      // const response = await api.get('/suppliers/evaluations');
      // setEvaluations(response.data.evaluations);
      // setRatings(response.data.ratings);
    } catch (error) {
      console.error('Error loading evaluations:', error);
      toast({
        title: 'Error',
        description: 'Error al cargar las evaluaciones',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtering and sorting
  const filteredRatings = ratings
    .filter(rating => {
      const matchesSearch = rating.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           rating.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || rating.status === filterStatus;
      const matchesCategory = filterCategory === 'all' || rating.category === filterCategory;
      return matchesSearch && matchesStatus && matchesCategory;
    })
    .sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case 'name':
          aValue = a.supplierName;
          bValue = b.supplierName;
          break;
        case 'rating':
          aValue = a.overallRating;
          bValue = b.overallRating;
          break;
        case 'evaluations':
          aValue = a.totalEvaluations;
          bValue = b.totalEvaluations;
          break;
        case 'lastEvaluation':
          aValue = new Date(a.lastEvaluationDate);
          bValue = new Date(b.lastEvaluationDate);
          break;
        default:
          aValue = a.overallRating;
          bValue = b.overallRating;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Rating helpers
  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 4.0) return 'text-blue-600';
    if (rating >= 3.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      excellent: 'bg-green-500',
      good: 'bg-blue-500',
      average: 'bg-yellow-500',
      poor: 'bg-red-500'
    };
    const labels = {
      excellent: 'Excelente',
      good: 'Bueno',
      average: 'Regular',
      poor: 'Deficiente'
    };
    return (
      <Badge className={variants[status as keyof typeof variants]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4" />;
    }
  };

  // Form handlers
  const handleCriteriaChange = (criteria: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      criteria: {
        ...prev.criteria!,
        [criteria]: value
      }
    }));
  };

  const calculateOverallRating = () => {
    if (!formData.criteria) return 0;
    
    let totalWeightedScore = 0;
    let totalWeight = 0;
    
    evaluationCriteria.forEach(criterion => {
      const score = formData.criteria![criterion.name as keyof typeof formData.criteria] || 0;
      totalWeightedScore += score * (criterion.weight / 100);
      totalWeight += criterion.weight / 100;
    });
    
    return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  };

  const handleSubmitEvaluation = async () => {
    try {
      const overallRating = calculateOverallRating();
      const evaluationData = {
        ...formData,
        overallRating,
        evaluatorId: user?.id,
        evaluatorName: user?.name,
        evaluationDate: new Date().toISOString().split('T')[0],
        status: 'completed'
      };

      // In a real app, save to API
      // await api.post('/suppliers/evaluations', evaluationData);
      
      toast({
        title: 'Evaluación guardada',
        description: 'La evaluación del proveedor se ha guardado exitosamente',
      });
      
      setShowEvaluationDialog(false);
      setFormData({
        criteria: {
          quality: 0,
          delivery: 0,
          pricing: 0,
          service: 0,
          reliability: 0,
          communication: 0
        }
      });
    } catch (error) {
      console.error('Error saving evaluation:', error);
      toast({
        title: 'Error',
        description: 'Error al guardar la evaluación',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Evaluación de Proveedores</h1>
          <p className="text-muted-foreground">
            Sistema de evaluación y rating de proveedores
          </p>
        </div>
        <Dialog open={showEvaluationDialog} onOpenChange={setShowEvaluationDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Evaluación
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-labelledby="evaluation-create-title">
            <DialogHeader>
              <DialogTitle id="evaluation-create-title">Nueva Evaluación de Proveedor</DialogTitle>
              <DialogDescription>
                Evalúa el desempeño del proveedor en diferentes criterios
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplier">Proveedor</Label>
                  <Select onValueChange={(value) => setFormData(prev => ({ ...prev, supplierId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sup1">TechSupply Corp</SelectItem>
                      <SelectItem value="sup2">Local Materials</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="period">Período de Evaluación</Label>
                  <Input
                    id="period"
                    placeholder="ej. Q1 2024"
                    value={formData.period || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, period: e.target.value }))}
                  />
                </div>
              </div>

              {/* Evaluation Criteria */}
              <div>
                <h3 className="text-lg font-medium mb-4">Criterios de Evaluación</h3>
                <div className="space-y-4">
                  {evaluationCriteria.map((criterion) => (
                    <div key={criterion.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">
                          {criterion.description} ({criterion.weight}%)
                        </Label>
                        <div className="flex items-center space-x-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => handleCriteriaChange(criterion.name, star)}
                              className={`h-6 w-6 ${
                                (formData.criteria?.[criterion.name as keyof typeof formData.criteria] || 0) >= star
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            >
                              <Star className="h-full w-full" />
                            </button>
                          ))}
                          <span className="text-sm text-muted-foreground ml-2">
                            {formData.criteria?.[criterion.name as keyof typeof formData.criteria] || 0}/5
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overall Rating Display */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Calificación General:</span>
                  <div className="flex items-center space-x-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-5 w-5 ${
                            calculateOverallRating() >= star
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-bold text-lg">
                      {calculateOverallRating().toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Comments */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="comments">Comentarios</Label>
                  <Textarea
                    id="comments"
                    placeholder="Comentarios sobre el desempeño del proveedor..."
                    value={formData.comments || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="recommendations">Recomendaciones</Label>
                  <Textarea
                    id="recommendations"
                    placeholder="Recomendaciones para mejorar..."
                    value={formData.recommendations || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, recommendations: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEvaluationDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmitEvaluation}>
                Guardar Evaluación
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="ratings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ratings">Rankings</TabsTrigger>
          <TabsTrigger value="evaluations">Evaluaciones</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="ratings" className="space-y-4">
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
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="excellent">Excelente</SelectItem>
                    <SelectItem value="good">Bueno</SelectItem>
                    <SelectItem value="average">Regular</SelectItem>
                    <SelectItem value="poor">Deficiente</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">Calificación</SelectItem>
                    <SelectItem value="name">Nombre</SelectItem>
                    <SelectItem value="evaluations">Evaluaciones</SelectItem>
                    <SelectItem value="lastEvaluation">Última evaluación</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Ratings Grid */}
          <div className="grid gap-6">
            {filteredRatings.map((rating) => (
              <Card key={rating.supplierId}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold">{rating.supplierName}</h3>
                        {getTrendIcon(rating.trend)}
                        {getStatusBadge(rating.status)}
                      </div>
                      <p className="text-muted-foreground">{rating.category}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-5 w-5 ${
                                rating.overallRating >= star
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className={`text-2xl font-bold ${getRatingColor(rating.overallRating)}`}>
                          {rating.overallRating.toFixed(1)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {rating.totalEvaluations} evaluaciones
                      </p>
                    </div>
                  </div>

                  {/* Criteria Breakdown */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    {Object.entries(rating.criteria).map(([key, value]) => {
                      const criterion = evaluationCriteria.find(c => c.name === key);
                      return (
                        <div key={key} className="text-center">
                          <div className="text-sm text-muted-foreground mb-1">
                            {criterion?.description.split(' ')[0]}
                          </div>
                          <div className={`text-lg font-semibold ${getRatingColor(value)}`}>
                            {value.toFixed(1)}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-muted rounded-lg">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <Truck className="h-4 w-4 text-blue-500 mr-1" />
                        <span className="text-sm text-muted-foreground">Entregas</span>
                      </div>
                      <div className="font-semibold">{rating.performance.onTimeDelivery}%</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <Shield className="h-4 w-4 text-green-500 mr-1" />
                        <span className="text-sm text-muted-foreground">Calidad</span>
                      </div>
                      <div className="font-semibold">{rating.performance.qualityScore}%</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <DollarSign className="h-4 w-4 text-yellow-500 mr-1" />
                        <span className="text-sm text-muted-foreground">Precio</span>
                      </div>
                      <div className="font-semibold">{rating.performance.priceCompetitiveness}%</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <Clock className="h-4 w-4 text-purple-500 mr-1" />
                        <span className="text-sm text-muted-foreground">Respuesta</span>
                      </div>
                      <div className="font-semibold">{rating.performance.responseTime}h</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Última evaluación: {new Date(rating.lastEvaluationDate).toLocaleDateString()}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRating(rating);
                          setShowDetailsDialog(true);
                        }}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalles
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setFormData({ supplierId: rating.supplierId });
                          setShowEvaluationDialog(true);
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Evaluar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="evaluations" className="space-y-4">
          <div className="grid gap-4">
            {evaluations.map((evaluation) => (
              <Card key={evaluation.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{evaluation.supplierName}</h3>
                      <p className="text-muted-foreground">
                        Período: {evaluation.period} • Evaluado por: {evaluation.evaluatorName}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={evaluation.status === 'approved' ? 'default' : 'secondary'}>
                        {evaluation.status === 'approved' ? 'Aprobada' : 'Completada'}
                      </Badge>
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="font-semibold">{evaluation.overallRating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    {Object.entries(evaluation.criteria).map(([key, value]) => {
                      const criterion = evaluationCriteria.find(c => c.name === key);
                      return (
                        <div key={key} className="text-center p-2 bg-muted rounded">
                          <div className="text-sm text-muted-foreground mb-1">
                            {criterion?.description}
                          </div>
                          <div className={`font-semibold ${getRatingColor(value)}`}>
                            {value.toFixed(1)}/5
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {evaluation.comments && (
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">Comentarios:</h4>
                      <p className="text-sm text-muted-foreground">{evaluation.comments}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Fecha: {new Date(evaluation.evaluationDate).toLocaleDateString()}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedEvaluation(evaluation);
                        setShowDetailsDialog(true);
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Ver Completa
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Award className="h-8 w-8 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold">4.1</p>
                    <p className="text-sm text-muted-foreground">Rating Promedio</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">14</p>
                    <p className="text-sm text-muted-foreground">Evaluaciones</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">75%</p>
                    <p className="text-sm text-muted-foreground">Mejorando</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">89%</p>
                    <p className="text-sm text-muted-foreground">Satisfacción</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Distribución de Ratings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = ratings.filter(r => Math.floor(r.overallRating) === rating).length;
                  const percentage = (count / ratings.length) * 100;
                  return (
                    <div key={rating} className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1 w-16">
                        <span className="text-sm">{rating}</span>
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      </div>
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-12">
                        {count} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl" aria-labelledby="evaluation-details-title">
          <DialogHeader>
            <DialogTitle id="evaluation-details-title">
              {selectedRating ? `Detalles de ${selectedRating.supplierName}` : 
               selectedEvaluation ? `Evaluación de ${selectedEvaluation.supplierName}` : ''}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRating && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Rating General</Label>
                  <div className="flex items-center space-x-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-5 w-5 ${
                            selectedRating.overallRating >= star
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xl font-bold">
                      {selectedRating.overallRating.toFixed(1)}
                    </span>
                  </div>
                </div>
                <div>
                  <Label>Estado</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedRating.status)}
                  </div>
                </div>
              </div>
              
              <div>
                <Label>Métricas de Rendimiento</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="p-3 bg-muted rounded">
                    <div className="text-sm text-muted-foreground">Entregas a Tiempo</div>
                    <div className="text-lg font-semibold">{selectedRating.performance.onTimeDelivery}%</div>
                  </div>
                  <div className="p-3 bg-muted rounded">
                    <div className="text-sm text-muted-foreground">Score de Calidad</div>
                    <div className="text-lg font-semibold">{selectedRating.performance.qualityScore}%</div>
                  </div>
                  <div className="p-3 bg-muted rounded">
                    <div className="text-sm text-muted-foreground">Competitividad Precio</div>
                    <div className="text-lg font-semibold">{selectedRating.performance.priceCompetitiveness}%</div>
                  </div>
                  <div className="p-3 bg-muted rounded">
                    <div className="text-sm text-muted-foreground">Tiempo Respuesta</div>
                    <div className="text-lg font-semibold">{selectedRating.performance.responseTime}h</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedEvaluation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Período</Label>
                  <p>{selectedEvaluation.period}</p>
                </div>
                <div>
                  <Label>Evaluador</Label>
                  <p>{selectedEvaluation.evaluatorName}</p>
                </div>
              </div>
              
              <div>
                <Label>Comentarios</Label>
                <p className="text-sm mt-1">{selectedEvaluation.comments}</p>
              </div>
              
              <div>
                <Label>Recomendaciones</Label>
                <p className="text-sm mt-1">{selectedEvaluation.recommendations}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}