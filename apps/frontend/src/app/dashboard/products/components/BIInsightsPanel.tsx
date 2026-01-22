'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Lightbulb,
  AlertTriangle, 
  TrendingUp,
  Zap,
  Eye,
  CheckCircle,
  Clock,
  ArrowRight,
  Brain,
  Target,
  Activity
} from 'lucide-react';
import type { BIInsight } from '../services/AdvancedBIEngine';

interface BIInsightsPanelProps {
  insights: BIInsight[];
  onInsightAction?: (insight: BIInsight, action: 'view' | 'implement' | 'dismiss') => void;
  className?: string;
}

export function BIInsightsPanel({ insights, onInsightAction, className }: BIInsightsPanelProps) {
  const [selectedInsight, setSelectedInsight] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | BIInsight['type']>('all');

  const getInsightIcon = (type: BIInsight['type']) => {
    switch (type) {
      case 'opportunity': return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'risk': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'trend': return <Activity className="h-5 w-5 text-blue-500" />;
      case 'anomaly': return <Zap className="h-5 w-5 text-yellow-500" />;
      default: return <Brain className="h-5 w-5 text-purple-500" />;
    }
  };

  const getPriorityColor = (priority: BIInsight['priority']) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getImpactColor = (impact: BIInsight['impact']) => {
    switch (impact) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
    }
  };

  const getTypeLabel = (type: BIInsight['type']) => {
    switch (type) {
      case 'opportunity': return 'Oportunidad';
      case 'risk': return 'Riesgo';
      case 'trend': return 'Tendencia';
      case 'anomaly': return 'Anomalía';
    }
  };

  const getPriorityLabel = (priority: BIInsight['priority']) => {
    switch (priority) {
      case 'critical': return 'Crítica';
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
    }
  };

  const filteredInsights = filter === 'all' 
    ? insights 
    : insights.filter(insight => insight.type === filter);

  const insightsByType = {
    opportunity: insights.filter(i => i.type === 'opportunity'),
    risk: insights.filter(i => i.type === 'risk'),
    trend: insights.filter(i => i.type === 'trend'),
    anomaly: insights.filter(i => i.type === 'anomaly')
  };

  if (insights.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            Insights de Negocio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Lightbulb className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold mb-2 text-green-700">Sistema Optimizado</h3>
            <p className="text-muted-foreground">
              No se han detectado insights críticos en este momento.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-500" />
          Insights de Negocio
          <Badge variant="outline">{insights.length} insights</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">
              Todos ({insights.length})
            </TabsTrigger>
            <TabsTrigger value="opportunity">
              Oportunidades ({insightsByType.opportunity.length})
            </TabsTrigger>
            <TabsTrigger value="risk">
              Riesgos ({insightsByType.risk.length})
            </TabsTrigger>
            <TabsTrigger value="trend">
              Tendencias ({insightsByType.trend.length})
            </TabsTrigger>
            <TabsTrigger value="anomaly">
              Anomalías ({insightsByType.anomaly.length})
            </TabsTrigger>
          </TabsList>

          {/* All Insights */}
          <TabsContent value="all" className="space-y-4">
            {insights.map(insight => (
              <InsightCard 
                key={insight.id} 
                insight={insight}
                isSelected={selectedInsight === insight.id}
                onSelect={() => setSelectedInsight(selectedInsight === insight.id ? null : insight.id)}
                onAction={onInsightAction}
              />
            ))}
          </TabsContent>

          {/* Opportunities */}
          <TabsContent value="opportunity" className="space-y-4">
            {insightsByType.opportunity.map(insight => (
              <InsightCard 
                key={insight.id} 
                insight={insight}
                isSelected={selectedInsight === insight.id}
                onSelect={() => setSelectedInsight(selectedInsight === insight.id ? null : insight.id)}
                onAction={onInsightAction}
              />
            ))}
          </TabsContent>

          {/* Risks */}
          <TabsContent value="risk" className="space-y-4">
            {insightsByType.risk.map(insight => (
              <InsightCard 
                key={insight.id} 
                insight={insight}
                isSelected={selectedInsight === insight.id}
                onSelect={() => setSelectedInsight(selectedInsight === insight.id ? null : insight.id)}
                onAction={onInsightAction}
              />
            ))}
          </TabsContent>

          {/* Trends */}
          <TabsContent value="trend" className="space-y-4">
            {insightsByType.trend.map(insight => (
              <InsightCard 
                key={insight.id} 
                insight={insight}
                isSelected={selectedInsight === insight.id}
                onSelect={() => setSelectedInsight(selectedInsight === insight.id ? null : insight.id)}
                onAction={onInsightAction}
              />
            ))}
          </TabsContent>

          {/* Anomalies */}
          <TabsContent value="anomaly" className="space-y-4">
            {insightsByType.anomaly.map(insight => (
              <InsightCard 
                key={insight.id} 
                insight={insight}
                isSelected={selectedInsight === insight.id}
                onSelect={() => setSelectedInsight(selectedInsight === insight.id ? null : insight.id)}
                onAction={onInsightAction}
              />
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface InsightCardProps {
  insight: BIInsight;
  isSelected: boolean;
  onSelect: () => void;
  onAction?: (insight: BIInsight, action: 'view' | 'implement' | 'dismiss') => void;
}

function InsightCard({ insight, isSelected, onSelect, onAction }: InsightCardProps) {
  const getInsightIcon = (type: BIInsight['type']) => {
    switch (type) {
      case 'opportunity': return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'risk': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'trend': return <Activity className="h-5 w-5 text-blue-500" />;
      case 'anomaly': return <Zap className="h-5 w-5 text-yellow-500" />;
      default: return <Brain className="h-5 w-5 text-purple-500" />;
    }
  };

  const getPriorityColor = (priority: BIInsight['priority']) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getImpactColor = (impact: BIInsight['impact']) => {
    switch (impact) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
    }
  };

  const getTypeLabel = (type: BIInsight['type']) => {
    switch (type) {
      case 'opportunity': return 'Oportunidad';
      case 'risk': return 'Riesgo';
      case 'trend': return 'Tendencia';
      case 'anomaly': return 'Anomalía';
    }
  };

  const getPriorityLabel = (priority: BIInsight['priority']) => {
    switch (priority) {
      case 'critical': return 'Crítica';
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
    }
  };

  return (
    <Card 
      className={`border-l-4 cursor-pointer transition-all ${getPriorityColor(insight.priority)} ${
        isSelected ? 'ring-2 ring-purple-500 bg-purple-50' : 'hover:bg-gray-50'
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              {getInsightIcon(insight.type)}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold">{insight.title}</h4>
                  <Badge variant={insight.priority === 'critical' ? 'destructive' : 'secondary'}>
                    {getPriorityLabel(insight.priority)}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {getTypeLabel(insight.type)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {insight.description}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Target className="h-3 w-3" />
                <span className={getImpactColor(insight.impact)}>
                  Impacto {insight.impact}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {Math.round(insight.confidence * 100)}% confianza
              </div>
              <div className="text-xs text-muted-foreground">
                {insight.createdAt.toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* Confidence Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Confianza del análisis</span>
              <span>{Math.round(insight.confidence * 100)}%</span>
            </div>
            <Progress value={insight.confidence * 100} className="h-2" />
          </div>

          {/* Expanded Details */}
          {isSelected && (
            <div className="space-y-4 pt-3 border-t">
              {/* Suggested Actions */}
              {insight.suggestedActions && insight.suggestedActions.length > 0 && (
                <div>
                  <h5 className="font-medium text-sm mb-2">Acciones Sugeridas:</h5>
                  <ul className="space-y-1">
                    {insight.suggestedActions.map((action, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <ArrowRight className="h-3 w-3 mt-0.5 text-muted-foreground" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Related Metrics */}
              {insight.relatedMetrics && insight.relatedMetrics.length > 0 && (
                <div>
                  <h5 className="font-medium text-sm mb-2">Métricas Relacionadas:</h5>
                  <div className="flex flex-wrap gap-1">
                    {insight.relatedMetrics.map(metric => (
                      <Badge key={metric} variant="outline" className="text-xs">
                        {metric}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction?.(insight, 'view');
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Detalles
                </Button>
                {insight.actionable && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction?.(insight, 'implement');
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Implementar
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction?.(insight, 'dismiss');
                  }}
                >
                  Descartar
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default BIInsightsPanel;