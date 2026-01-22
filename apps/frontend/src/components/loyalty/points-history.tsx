'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  History, 
  Plus, 
  Minus, 
  Gift, 
  ShoppingBag,
  Calendar,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Award,
  Star,
  RefreshCw
} from 'lucide-react';
import { usePointsTransactions, PointsTransaction } from '@/hooks/use-loyalty';
import { formatCurrency } from '@/lib/utils';

interface PointsHistoryProps {
  customerId: string;
  programId?: string;
  compact?: boolean;
  showFilters?: boolean;
}

function PointsHistory({ 
  customerId, 
  programId = '',
  compact = false,
  showFilters = true
}: PointsHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'EARNED' | 'REDEEMED' | 'EXPIRED' | 'BONUS' | 'ADJUSTMENT'>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  const { data: transactions, isLoading, error, refetch } = usePointsTransactions(
    customerId
  );

  // Filter transactions based on search and filters
  const filteredTransactions = React.useMemo(() => {
    if (!transactions) return [];

    return transactions.filter(transaction => {
      // Search filter
      if (searchTerm && !transaction.description.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Type filter
      if (typeFilter !== 'all' && transaction.type !== typeFilter) {
        return false;
      }

      // Date filter
      if (dateFilter !== 'all') {
        const transactionDate = new Date(transaction.createdAt);
        const now = new Date();
        
        switch (dateFilter) {
          case 'today':
            return transactionDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return transactionDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return transactionDate >= monthAgo;
          default:
            return true;
        }
      }

      return true;
    });
  }, [transactions, searchTerm, typeFilter, dateFilter]);

  if (isLoading) {
    return <PointsHistorySkeleton compact={compact} />;
  }

  if (error) {
    return (
      <Alert>
        <History className="h-4 w-4" />
        <AlertDescription>
          Error al cargar el historial de puntos. 
          <Button variant="link" className="p-0 h-auto ml-1" onClick={() => refetch()}>
            Intentar nuevamente
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historial de Puntos
            </CardTitle>
            <CardDescription>
              Registro de todas las transacciones de puntos
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        {showFilters && !compact && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar transacciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as typeof typeFilter)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="EARNED">Puntos ganados</SelectItem>
                <SelectItem value="REDEEMED">Puntos canjeados</SelectItem>
                <SelectItem value="BONUS">Bonificaciones</SelectItem>
                <SelectItem value="EXPIRED">Puntos expirados</SelectItem>
                <SelectItem value="ADJUSTMENT">Ajustes</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo el tiempo</SelectItem>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="week">Última semana</SelectItem>
                <SelectItem value="month">Último mes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Summary Stats */}
        {!compact && filteredTransactions.length > 0 && (
          <div className="grid gap-3 md:grid-cols-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">
                {(transactions || [])
                  .filter(t => ['EARNED', 'BONUS'].includes(t.type))
                  .reduce((sum, t) => sum + t.points, 0)
                  .toLocaleString()}
              </div>
              <p className="text-xs text-green-700">Puntos Ganados</p>
            </div>
            
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-lg font-bold text-red-600">
                {(transactions || [])
                  .filter(t => t.type === 'REDEEMED')
                  .reduce((sum, t) => sum + Math.abs(t.points), 0)
                  .toLocaleString()}
              </div>
              <p className="text-xs text-red-700">Puntos Canjeados</p>
            </div>
            
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">
                {(transactions || [])
                  .filter(t => t.type === 'BONUS')
                  .reduce((sum, t) => sum + t.points, 0)
                  .toLocaleString()}
              </div>
              <p className="text-xs text-blue-700">Bonificaciones</p>
            </div>
            
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-lg font-bold text-purple-600">
                {filteredTransactions.length}
              </div>
              <p className="text-xs text-purple-700">Transacciones</p>
            </div>
          </div>
        )}

        {/* Transactions List */}
        <div className="space-y-2">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <History className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">
                {searchTerm || typeFilter !== 'all' || dateFilter !== 'all' 
                  ? 'No se encontraron transacciones con los filtros aplicados'
                  : 'No hay transacciones de puntos registradas'
                }
              </p>
            </div>
          ) : (
            filteredTransactions.map((transaction) => (
              <TransactionCard 
                key={transaction.id} 
                transaction={transaction} 
                compact={compact}
              />
            ))
          )}
        </div>

        {/* Load More Button (if needed) */}
        {filteredTransactions.length > 0 && !compact && (
          <div className="text-center pt-4">
            <Button variant="outline">
              Ver más transacciones
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Individual Transaction Card
function TransactionCard({ 
  transaction, 
  compact 
}: { 
  transaction: PointsTransaction; 
  compact: boolean; 
}) {
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'EARNED': return ShoppingBag;
      case 'REDEEMED': return Gift;
      case 'BONUS': return Award;
      case 'EXPIRED': return Calendar;
      case 'ADJUSTMENT': return RefreshCw;
      default: return Star;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'EARNED': return 'text-green-600 bg-green-50';
      case 'REDEEMED': return 'text-red-600 bg-red-50';
      case 'BONUS': return 'text-blue-600 bg-blue-50';
      case 'EXPIRED': return 'text-gray-600 bg-gray-50';
      case 'ADJUSTMENT': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'EARNED': return 'Ganados';
      case 'REDEEMED': return 'Canjeados';
      case 'BONUS': return 'Bonificación';
      case 'EXPIRED': return 'Expirados';
      case 'ADJUSTMENT': return 'Ajuste';
      default: return type;
    }
  };

  const TransactionIcon = getTransactionIcon(transaction.type);
  const colorClasses = getTransactionColor(transaction.type);
  const isPositive = transaction.points > 0;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${
      compact ? 'bg-white' : 'bg-gray-50/50'
    }`}>
      {/* Icon */}
      <div className={`p-2 rounded-full ${colorClasses}`}>
        <TransactionIcon className="h-4 w-4" />
      </div>

      {/* Transaction Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className={`font-medium ${compact ? 'text-sm' : ''}`}>
            {transaction.description}
          </h4>
          <div className="flex items-center gap-2">
            <span className={`font-bold ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {isPositive ? '+' : ''}{transaction.points.toLocaleString()}
            </span>
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {getTransactionLabel(transaction.type)}
            </Badge>
            {transaction.saleId && (
              <span className="text-xs text-muted-foreground">
                Venta #{transaction.saleId.slice(-8)}
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date(transaction.createdAt).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: '2-digit',
              year: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>

        {/* Additional Info */}
        {!compact && transaction.metadata && (
          <div className="mt-2 text-xs text-muted-foreground">
            {transaction.metadata.purchaseAmount && (
              <span>Compra: {formatCurrency(transaction.metadata.purchaseAmount)}</span>
            )}
            {transaction.metadata.rewardName && (
              <span>Recompensa: {transaction.metadata.rewardName}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Loading Skeleton
function PointsHistorySkeleton({ compact }: { compact: boolean }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-20" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Filters Skeleton */}
        {!compact && (
          <div className="flex gap-3">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-48" />
          </div>
        )}

        {/* Summary Stats Skeleton */}
        {!compact && (
          <div className="grid gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="text-center p-3 bg-gray-50 rounded-lg">
                <Skeleton className="h-6 w-16 mx-auto mb-1" />
                <Skeleton className="h-3 w-20 mx-auto" />
              </div>
            ))}
          </div>
        )}

        {/* Transactions Skeleton */}
        <div className="space-y-2">
          {Array.from({ length: compact ? 3 : 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50/50">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <Skeleton className="h-4 w-48" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// También exportar como named export para compatibilidad
export { PointsHistory };
export default PointsHistory;