'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/lib/toast';
import { 
  Search, 
  Filter, 
  Eye, 
  Check, 
  X, 
  Clock, 
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Calendar
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';

interface Return {
  id: string;
  originalSaleId: string;
  customerId?: string;
  customer?: {
    name: string;
    email?: string;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  reason: string;
  refundMethod: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  returnItems: ReturnItem[];
  originalSale?: {
    id: string;
    date: string;
    total: number;
  };
}

interface ReturnItem {
  id: string;
  productId: string;
  product: {
    name: string;
    sku?: string;
  };
  quantity: number;
  unitPrice: number;
  reason?: string;
}

interface ReturnsManagementProps {
  onReturnUpdated?: (returnData: Return) => void;
}

export default function ReturnsManagement({ onReturnUpdated }: ReturnsManagementProps) {
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReturns, setTotalReturns] = useState(0);
  const [updating, setUpdating] = useState<string | null>(null);

  const itemsPerPage = 10;

  // Fetch returns
  const fetchReturns = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
      });

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await api.get(`/returns?${params.toString()}`);
      const data = response.data;

      setReturns(data.returns || []);
      setTotalPages(data.totalPages || 1);
      setTotalReturns(data.total || 0);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching returns:', error);
      toast.error('Error al cargar las devoluciones');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchReturns(1);
  }, [searchQuery, statusFilter]);

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  // Handle status filter
  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    fetchReturns(page);
  };

  // Update return status
  const updateReturnStatus = async (returnId: string, status: 'APPROVED' | 'REJECTED' | 'COMPLETED') => {
    setUpdating(returnId);
    try {
      const response = await api.put(`/returns/${returnId}`, { status });
      
      // Update local state
      setReturns(prev => prev.map(ret => 
        ret.id === returnId 
          ? { ...ret, status, updatedAt: new Date().toISOString() }
          : ret
      ));

      if (selectedReturn?.id === returnId) {
        setSelectedReturn(prev => prev ? { ...prev, status, updatedAt: new Date().toISOString() } : null);
      }

      const statusMessages = {
        APPROVED: 'Devolución aprobada',
        REJECTED: 'Devolución rechazada',
        COMPLETED: 'Devolución completada'
      };

      toast.success(statusMessages[status]);

      if (onReturnUpdated) {
        onReturnUpdated(response.data.return);
      }
    } catch (error: any) {
      console.error('Error updating return status:', error);
      toast.error(error.response?.data?.error || 'Error al actualizar la devolución');
    } finally {
      setUpdating(null);
    }
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'secondary';
      case 'APPROVED':
        return 'default';
      case 'REJECTED':
        return 'destructive';
      case 'COMPLETED':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  // Get status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Pendiente';
      case 'APPROVED':
        return 'Aprobada';
      case 'REJECTED':
        return 'Rechazada';
      case 'COMPLETED':
        return 'Completada';
      default:
        return status;
    }
  };

  // Get payment method label
  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'CASH':
        return 'Efectivo';
      case 'CARD':
        return 'Tarjeta';
      case 'TRANSFER':
        return 'Transferencia';
      case 'OTHER':
        return 'Otro';
      default:
        return method;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Devoluciones</h2>
          <p className="text-gray-600">
            {totalReturns} devoluciones encontradas
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por ID, cliente o producto..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="PENDING">Pendiente</SelectItem>
                  <SelectItem value="APPROVED">Aprobada</SelectItem>
                  <SelectItem value="REJECTED">Rechazada</SelectItem>
                  <SelectItem value="COMPLETED">Completada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Returns List */}
      <Card>
        <CardHeader>
          <CardTitle>Devoluciones</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Cargando devoluciones...</p>
            </div>
          ) : returns.length === 0 ? (
            <div className="text-center py-8">
              <RotateCcw className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No se encontraron devoluciones</p>
            </div>
          ) : (
            <div className="space-y-4">
              {returns.map((returnItem) => (
                <div
                  key={returnItem.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium">
                          #{returnItem.id.slice(-8).toUpperCase()}
                        </h3>
                        <Badge variant={getStatusBadgeVariant(returnItem.status)}>
                          {getStatusLabel(returnItem.status)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <p className="font-medium">Cliente</p>
                          <p>{returnItem.customer?.name || 'Cliente general'}</p>
                        </div>
                        <div>
                          <p className="font-medium">Venta Original</p>
                          <p>#{returnItem.originalSaleId.slice(-8).toUpperCase()}</p>
                        </div>
                        <div>
                          <p className="font-medium">Fecha</p>
                          <p>{new Date(returnItem.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="font-medium">Método de Reembolso</p>
                          <p>{getPaymentMethodLabel(returnItem.refundMethod)}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-lg font-bold">
                        {formatCurrency(returnItem.totalAmount)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {(Array.isArray(returnItem.returnItems) ? returnItem.returnItems.length : 0)} productos
                      </p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700">Motivo:</p>
                    <p className="text-sm text-gray-600">{returnItem.reason}</p>
                  </div>

                  {/* Return Items */}
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Productos:</p>
                    <div className="space-y-1">
                      {(Array.isArray(returnItem.returnItems) ? returnItem.returnItems : []).map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-sm">
                          <span>{item.product.name}</span>
                          <span>
                            {item.quantity} × {formatCurrency(item.unitPrice)} = {formatCurrency(item.quantity * item.unitPrice)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedReturn(returnItem)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalles
                    </Button>

                    {returnItem.status === 'PENDING' && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateReturnStatus(returnItem.id, 'REJECTED')}
                          disabled={updating === returnItem.id}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Rechazar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => updateReturnStatus(returnItem.id, 'APPROVED')}
                          disabled={updating === returnItem.id}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Aprobar
                        </Button>
                      </div>
                    )}

                    {returnItem.status === 'APPROVED' && (
                      <Button
                        size="sm"
                        onClick={() => updateReturnStatus(returnItem.id, 'COMPLETED')}
                        disabled={updating === returnItem.id}
                        variant="outline"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Completar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6 pt-4 border-t">
              <p className="text-sm text-gray-600">
                Página {currentPage} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Return Details Modal */}
      {selectedReturn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">
                  Detalles de Devolución #{selectedReturn.id.slice(-8).toUpperCase()}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedReturn(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Status and Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Estado</p>
                    <Badge variant={getStatusBadgeVariant(selectedReturn.status)} className="mt-1">
                      {getStatusLabel(selectedReturn.status)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Total</p>
                    <p className="text-lg font-bold">{formatCurrency(selectedReturn.totalAmount)}</p>
                  </div>
                </div>

                {/* Customer and Sale Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Cliente</p>
                    <p>{selectedReturn.customer?.name || 'Cliente general'}</p>
                    {selectedReturn.customer?.email && (
                      <p className="text-sm text-gray-600">{selectedReturn.customer.email}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Venta Original</p>
                    <p>#{selectedReturn.originalSaleId.slice(-8).toUpperCase()}</p>
                    {selectedReturn.originalSale && (
                      <p className="text-sm text-gray-600">
                        {new Date(selectedReturn.originalSale.date).toLocaleDateString()} - {formatCurrency(selectedReturn.originalSale.total)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Fecha de Solicitud</p>
                    <p>{new Date(selectedReturn.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Última Actualización</p>
                    <p>{new Date(selectedReturn.updatedAt).toLocaleString()}</p>
                  </div>
                </div>

                {/* Reason and Refund Method */}
                <div>
                  <p className="text-sm font-medium text-gray-700">Motivo de la Devolución</p>
                  <p className="mt-1 p-3 bg-gray-50 rounded-lg">{selectedReturn.reason}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700">Método de Reembolso</p>
                  <p className="mt-1">{getPaymentMethodLabel(selectedReturn.refundMethod)}</p>
                </div>

                {/* Return Items */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Productos Devueltos</p>
                  <div className="border rounded-lg">
                    {(Array.isArray(selectedReturn?.returnItems) ? selectedReturn!.returnItems : []).map((item, index) => (
                      <div
                        key={item.id}
                        className={`p-4 ${index !== ((Array.isArray(selectedReturn?.returnItems) ? selectedReturn!.returnItems : []).length) - 1 ? 'border-b' : ''}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium">{item.product.name}</p>
                            {item.product.sku && (
                              <p className="text-sm text-gray-600">SKU: {item.product.sku}</p>
                            )}
                            {item.reason && (
                              <p className="text-sm text-gray-600 mt-1">Motivo: {item.reason}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {item.quantity} × {formatCurrency(item.unitPrice)}
                            </p>
                            <p className="text-sm text-gray-600">
                              = {formatCurrency(item.quantity * item.unitPrice)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                {selectedReturn.status === 'PENDING' && (
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => updateReturnStatus(selectedReturn.id, 'REJECTED')}
                      disabled={updating === selectedReturn.id}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Rechazar
                    </Button>
                    <Button
                      onClick={() => updateReturnStatus(selectedReturn.id, 'APPROVED')}
                      disabled={updating === selectedReturn.id}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Aprobar
                    </Button>
                  </div>
                )}

                {selectedReturn.status === 'APPROVED' && (
                  <div className="flex justify-end pt-4 border-t">
                    <Button
                      onClick={() => updateReturnStatus(selectedReturn.id, 'COMPLETED')}
                      disabled={updating === selectedReturn.id}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Marcar como Completada
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}