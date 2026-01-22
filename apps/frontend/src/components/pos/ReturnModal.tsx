'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/lib/toast';
import { Search, Plus, Minus, X, RotateCcw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';
import type { Sale, SaleItem, Product, Customer } from '@/types';
import { PaymentMethod } from '@/types';

interface ReturnItem {
  originalSaleItemId: string;
  productId: string;
  productName: string;
  originalQuantity: number;
  returnQuantity: number;
  unitPrice: number;
  reason?: string;
  maxReturnQuantity: number;
}

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReturnCreated?: (returnData: any) => void;
}

export default function ReturnModal({ isOpen, onClose, onReturnCreated }: ReturnModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [returnReason, setReturnReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Sale[]>([]);
  const [searching, setSearching] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedSale(null);
      setReturnItems([]);
      setReturnReason('');
      setRefundMethod(PaymentMethod.CASH);
      setSearchResults([]);
    }
  }, [isOpen]);

  // Search for sales
  const handleSearchSales = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await api.get(`/sales?search=${encodeURIComponent(query)}&limit=10`);
      setSearchResults(response.data.sales || []);
    } catch (error) {
      console.error('Error searching sales:', error);
      toast.error('Error al buscar ventas');
    } finally {
      setSearching(false);
    }
  };

  // Handle sale selection
  const handleSelectSale = async (sale: Sale) => {
    setSelectedSale(sale);
    setSearchResults([]);
    setSearchQuery(`#${sale.id.slice(-8).toUpperCase()}`);

    // Fetch detailed sale information with return history
    try {
      const response = await api.get(`/sales/${sale.id}`);
      const detailedSale = response.data;
      
      // Calculate available quantities for return
      const saleItems = Array.isArray(detailedSale?.saleItems) ? detailedSale.saleItems : [];
      const items: ReturnItem[] = saleItems.map((item: SaleItem & { 
        product: Product, 
        returnItems?: any[] 
      }) => {
        const alreadyReturned = item.returnItems?.reduce((sum: number, ri: any) => sum + ri.quantity, 0) || 0;
        const maxReturnQuantity = item.quantity - alreadyReturned;
        
        return {
          originalSaleItemId: item.id,
          productId: item.product_id,
          productName: item.product.name,
          originalQuantity: item.quantity,
          returnQuantity: 0,
          unitPrice: Number(item.unit_price),
          maxReturnQuantity,
          reason: ''
        };
      }).filter((item: ReturnItem) => item.maxReturnQuantity > 0);

      setReturnItems(items);
    } catch (error) {
      console.error('Error fetching sale details:', error);
      toast.error('Error al cargar detalles de la venta');
    }
  };

  // Update return quantity for an item
  const updateReturnQuantity = (index: number, quantity: number) => {
    setReturnItems(prev => prev.map((item, i) => 
      i === index 
        ? { ...item, returnQuantity: Math.max(0, Math.min(quantity, item.maxReturnQuantity)) }
        : item
    ));
  };

  // Update return reason for an item
  const updateReturnReason = (index: number, reason: string) => {
    setReturnItems(prev => prev.map((item, i) => 
      i === index ? { ...item, reason } : item
    ));
  };

  // Calculate totals
  const getReturnTotal = () => {
    return returnItems.reduce((sum, item) => sum + (item.returnQuantity * item.unitPrice), 0);
  };

  const getReturnItemCount = () => {
    return returnItems.filter(item => item.returnQuantity > 0).length;
  };

  const getTotalQuantity = () => {
    return returnItems.reduce((sum, item) => sum + item.returnQuantity, 0);
  };

  // Process return
  const handleProcessReturn = async () => {
    if (!selectedSale) {
      toast.error('Selecciona una venta');
      return;
    }

    const itemsToReturn = returnItems.filter(item => item.returnQuantity > 0);
    
    if (itemsToReturn.length === 0) {
      toast.error('Selecciona al menos un producto para devolver');
      return;
    }

    if (!returnReason.trim()) {
      toast.error('Ingresa el motivo de la devolución');
      return;
    }

    setLoading(true);

    try {
      const returnData = {
        originalSaleId: selectedSale.id,
        customerId: selectedSale.customer_id,
        items: itemsToReturn.map(item => ({
          originalSaleItemId: item.originalSaleItemId,
          productId: item.productId, // This is already correct as it comes from our ReturnItem interface
          quantity: item.returnQuantity,
          unitPrice: item.unitPrice,
          reason: item.reason || returnReason
        })),
        reason: returnReason,
        refundMethod
      };

      const response = await api.post('/returns', returnData);
      
      toast.success(`Devolución creada exitosamente - #${response.data.return.id.slice(-8).toUpperCase()}`);
      
      if (onReturnCreated) {
        onReturnCreated(response.data);
      }
      
      onClose();
    } catch (error: any) {
      console.error('Error processing return:', error);
      toast.error(error.response?.data?.error || 'Error al procesar la devolución');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-labelledby="return-modal-title">
        <DialogHeader>
          <DialogTitle id="return-modal-title" className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Procesar Devolución
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Buscar Venta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por ID de venta, cliente o producto..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      handleSearchSales(e.target.value);
                    }}
                    className="pl-10"
                  />
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="border border-border dark:border-border rounded-lg max-h-48 overflow-y-auto">
                    {searchResults.map((sale) => (
                      <div
                        key={sale.id}
                        className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer border-b border-border dark:border-border last:border-b-0"
                        onClick={() => handleSelectSale(sale)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-foreground dark:text-foreground">#{sale.id.slice(-8).toUpperCase()}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {sale.customer?.name || 'Cliente general'} - {new Date(sale.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-foreground dark:text-foreground">{formatCurrency(Number(sale.total_amount))}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{sale.payment_method}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Selected Sale Details */}
          {selectedSale && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detalles de la Venta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">ID de Venta</p>
                    <p className="font-medium text-foreground dark:text-foreground">#{selectedSale.id.slice(-8).toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Cliente</p>
                    <p className="font-medium text-foreground dark:text-foreground">{selectedSale.customer?.name || 'Cliente general'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Fecha</p>
                    <p className="font-medium text-foreground dark:text-foreground">{new Date(selectedSale.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                    <p className="font-medium text-foreground dark:text-foreground">{formatCurrency(Number(selectedSale.total_amount))}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Return Items */}
          {returnItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Productos a Devolver</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {returnItems.map((item, index) => (
                    <div key={item.originalSaleItemId} className="border border-border dark:border-border rounded-lg p-4 bg-card dark:bg-card">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                        <div className="md:col-span-2">
                          <p className="font-medium text-foreground dark:text-foreground">{item.productName}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Vendido: {item.originalQuantity} | Disponible: {item.maxReturnQuantity}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Precio</p>
                          <p className="font-medium text-foreground dark:text-foreground">{formatCurrency(item.unitPrice)}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Cantidad a devolver</p>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateReturnQuantity(index, item.returnQuantity - 1)}
                              disabled={item.returnQuantity <= 0}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                              type="number"
                              value={item.returnQuantity}
                              onChange={(e) => updateReturnQuantity(index, parseInt(e.target.value) || 0)}
                              className="w-20 text-center"
                              min="0"
                              max={item.maxReturnQuantity}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateReturnQuantity(index, item.returnQuantity + 1)}
                              disabled={item.returnQuantity >= item.maxReturnQuantity}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Subtotal</p>
                          <p className="font-medium text-foreground dark:text-foreground">{formatCurrency(item.returnQuantity * item.unitPrice)}</p>
                        </div>
                        
                        <div>
                          <Input
                            placeholder="Motivo específico (opcional)"
                            value={item.reason || ''}
                            onChange={(e) => updateReturnReason(index, e.target.value)}
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Return Details */}
          {returnItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detalles de la Devolución</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Motivo de la devolución *
                    </label>
                    <Input
                      placeholder="Ej: Producto defectuoso, cambio de opinión, etc."
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Método de reembolso
                    </label>
                    <Select value={refundMethod} onValueChange={(value: PaymentMethod) => setRefundMethod(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={PaymentMethod.CASH}>Efectivo</SelectItem>
                        <SelectItem value={PaymentMethod.CARD}>Tarjeta</SelectItem>
                        <SelectItem value={PaymentMethod.TRANSFER}>Transferencia</SelectItem>
                        <SelectItem value={PaymentMethod.OTHER}>Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Summary */}
                  <div className="border-t border-border dark:border-border pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-foreground dark:text-foreground">Productos a devolver:</span>
                      <span className="font-medium text-foreground dark:text-foreground">{getReturnItemCount()}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-foreground dark:text-foreground">Cantidad total:</span>
                      <span className="font-medium text-foreground dark:text-foreground">{getTotalQuantity()}</span>
                    </div>
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span className="text-foreground dark:text-foreground">Total a reembolsar:</span>
                      <span className="text-primary dark:text-primary">{formatCurrency(getReturnTotal())}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border dark:border-border">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleProcessReturn}
            disabled={loading || !selectedSale || getReturnItemCount() === 0 || !returnReason.trim()}
            className="flex items-center gap-2"
          >
            {loading ? 'Procesando...' : 'Procesar Devolución'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}