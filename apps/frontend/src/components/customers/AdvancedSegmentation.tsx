'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Star, 
  UserCheck, 
  UserX,
  Target,
  DollarSign,
  Activity,
  Filter,
  RefreshCw
} from 'lucide-react';
import { customerService, UICustomer, CustomerFilters } from '@/lib/customer-service';

interface AdvancedSegmentationProps {
  customers: UICustomer[];
  onFiltersChange: (filters: CustomerFilters) => void;
  currentFilters: CustomerFilters;
}

interface SegmentStats {
  new: number;
  regular: number;
  frequent: number;
  vip: number;
  at_risk: number;
  dormant: number;
}

interface RiskStats {
  low: number;
  medium: number;
  high: number;
}

export default function AdvancedSegmentation({ 
  customers, 
  onFiltersChange, 
  currentFilters 
}: AdvancedSegmentationProps) {
  const [segmentStats, setSegmentStats] = useState<SegmentStats>({
    new: 0,
    regular: 0,
    frequent: 0,
    vip: 0,
    at_risk: 0,
    dormant: 0
  });
  
  const [riskStats, setRiskStats] = useState<RiskStats>({
    low: 0,
    medium: 0,
    high: 0
  });

  const [clvStats, setClvStats] = useState({
    average: 0,
    total: 0,
    high: 0,
    medium: 0,
    low: 0
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  useEffect(() => {
    calculateStats();
  }, [customers]);

  const calculateStats = () => {
    // Estadísticas de segmentación
    const segments = {
      new: 0,
      regular: 0,
      frequent: 0,
      vip: 0,
      at_risk: 0,
      dormant: 0
    };

    // Estadísticas de riesgo
    const risks = {
      low: 0,
      medium: 0,
      high: 0
    };

    // Estadísticas de CLV
    let totalClv = 0;
    const clvValues: number[] = [];

    customers.forEach(customer => {
      // Segmentación avanzada
      const segment = customerService.determineAdvancedSegment(customer);
      segments[segment]++;

      // Análisis de riesgo
      const riskScore = customerService.calculateRiskScore(customer);
      if (riskScore > 70) risks.high++;
      else if (riskScore > 40) risks.medium++;
      else risks.low++;

      // CLV
      const clv = customerService.calculateLifetimeValue(customer);
      totalClv += clv;
      clvValues.push(clv);
    });

    setSegmentStats(segments);
    setRiskStats(risks);

    // Calcular estadísticas de CLV
    const avgClv = customers.length > 0 ? totalClv / customers.length : 0;
    const sortedClv = clvValues.sort((a, b) => b - a);
    const highClvThreshold = avgClv * 1.5;
    const lowClvThreshold = avgClv * 0.5;

    setClvStats({
      average: avgClv,
      total: totalClv,
      high: clvValues.filter(clv => clv > highClvThreshold).length,
      medium: clvValues.filter(clv => clv >= lowClvThreshold && clv <= highClvThreshold).length,
      low: clvValues.filter(clv => clv < lowClvThreshold).length
    });
  };

  const handleSegmentFilter = (segment: string) => {
    onFiltersChange({
      ...currentFilters,
      segment: segment === 'all' ? undefined : (segment as 'new' | 'regular' | 'frequent' | 'vip' | 'at_risk' | 'dormant')
    });
  };

  const handleRiskFilter = (riskLevel: string) => {
    onFiltersChange({
      ...currentFilters,
      riskLevel: riskLevel === 'all' ? undefined : (riskLevel as 'low' | 'medium' | 'high')
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      status: 'all',
      type: 'all',
      search: ''
    });
  };

  const getSegmentColor = (segment: string) => {
    const colors = {
      new: 'bg-blue-500',
      regular: 'bg-green-500',
      frequent: 'bg-purple-500',
      vip: 'bg-yellow-500',
      at_risk: 'bg-orange-500',
      dormant: 'bg-red-500'
    };
    return colors[segment as keyof typeof colors] || 'bg-gray-500';
  };

  const getSegmentIcon = (segment: string) => {
    const icons = {
      new: UserCheck,
      regular: Users,
      frequent: Star,
      vip: TrendingUp,
      at_risk: AlertTriangle,
      dormant: UserX
    };
    const Icon = icons[segment as keyof typeof icons] || Users;
    return <Icon className="h-4 w-4" />;
  };

  const getRiskColor = (risk: string) => {
    const colors = {
      low: 'bg-green-500',
      medium: 'bg-yellow-500',
      high: 'bg-red-500'
    };
    return colors[risk as keyof typeof colors] || 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* Resumen de Segmentación */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Segmentación de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(segmentStats).map(([segment, count]) => (
                <div key={segment} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getSegmentColor(segment)}`} />
                    <span className="text-sm capitalize">
                      {segment === 'at_risk' ? 'En Riesgo' : 
                       segment === 'dormant' ? 'Inactivos' :
                       segment === 'new' ? 'Nuevos' :
                       segment === 'frequent' ? 'Frecuentes' :
                       segment}
                    </span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSegmentFilter(segment)}
                  >
                    {count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Análisis de Riesgo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(riskStats).map(([risk, count]) => (
                <div key={risk} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getRiskColor(risk)}`} />
                    <span className="text-sm capitalize">
                      {risk === 'low' ? 'Bajo' : 
                       risk === 'medium' ? 'Medio' : 'Alto'}
                    </span>
                  </div>
                  <Badge 
                    variant="outline"
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleRiskFilter(risk)}
                  >
                    {count}
                  </Badge>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Riesgo Promedio</span>
                <span>{Math.round((riskStats.high * 80 + riskStats.medium * 50 + riskStats.low * 20) / customers.length)}%</span>
              </div>
              <Progress 
                value={(riskStats.high * 80 + riskStats.medium * 50 + riskStats.low * 20) / customers.length} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Valor de Vida (CLV)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  ${clvStats.average.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600">CLV Promedio</div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Alto
                  </span>
                  <span>{clvStats.high}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    Medio
                  </span>
                  <span>{clvStats.medium}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    Bajo
                  </span>
                  <span>{clvStats.low}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros Avanzados */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros Avanzados
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                {showAdvancedFilters ? 'Ocultar' : 'Mostrar'} Filtros
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            </div>
          </div>
        </CardHeader>
        {showAdvancedFilters && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="segment-filter">Segmento</Label>
                <Select
                  value={currentFilters.segment || 'all'}
                  onValueChange={handleSegmentFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los segmentos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="new">Nuevos</SelectItem>
                    <SelectItem value="regular">Regulares</SelectItem>
                    <SelectItem value="frequent">Frecuentes</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                    <SelectItem value="at_risk">En Riesgo</SelectItem>
                    <SelectItem value="dormant">Inactivos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="risk-filter">Nivel de Riesgo</Label>
                <Select
                  value={currentFilters.riskLevel || 'all'}
                  onValueChange={handleRiskFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los niveles" />
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
                <Label htmlFor="min-clv">CLV Mínimo</Label>
                <Input
                  id="min-clv"
                  type="number"
                  placeholder="0"
                  value={currentFilters.lifetimeValueRange?.min || ''}
                  onChange={(e) => onFiltersChange({
                    ...currentFilters,
                    lifetimeValueRange: {
                      ...currentFilters.lifetimeValueRange,
                      min: e.target.value ? parseFloat(e.target.value) : undefined
                    }
                  })}
                />
              </div>

              <div>
                <Label htmlFor="max-clv">CLV Máximo</Label>
                <Input
                  id="max-clv"
                  type="number"
                  placeholder="Sin límite"
                  value={currentFilters.lifetimeValueRange?.max || ''}
                  onChange={(e) => onFiltersChange({
                    ...currentFilters,
                    lifetimeValueRange: {
                      ...currentFilters.lifetimeValueRange,
                      max: e.target.value ? parseFloat(e.target.value) : undefined
                    }
                  })}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Acciones Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Acciones Rápidas de Segmentación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSegmentFilter('at_risk')}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Clientes en Riesgo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSegmentFilter('vip')}
            >
              <Star className="h-4 w-4 mr-1" />
              Clientes VIP
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSegmentFilter('new')}
            >
              <UserCheck className="h-4 w-4 mr-1" />
              Clientes Nuevos
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRiskFilter('high')}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Alto Riesgo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSegmentFilter('dormant')}
            >
              <UserX className="h-4 w-4 mr-1" />
              Clientes Inactivos
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}