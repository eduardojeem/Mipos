'use client';

import React, { useState, useCallback, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Calculator, 
  Percent, 
  DollarSign,
  TrendingUp,
  Users,
  CreditCard,
  Receipt,
  Zap,
  Star,
  Clock,
  Package
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { usePOSStore } from '@/store';
import type { Customer } from '@/types';

interface QuickActionsPanelProps {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
  onProcessSale: () => void;
  cartTotal: number;
  cartItemCount: number;
  disabled?: boolean;
}

const CustomerSelector = memo(({
  customers,
  selectedCustomer,
  onSelectCustomer
}: {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm)
  );

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-4 h-4 text-primary" />
        <Label className="text-sm font-medium">Cliente</Label>
      </div>
      
      <div className="relative">
        <Input
          type="text"
          placeholder="Buscar cliente..."
          value={isOpen ? searchTerm : (selectedCustomer?.name || 'Cliente general')}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full"
        />
        
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm hover:bg-muted/40 dark:hover:bg-muted/20"
                onClick={() => {
                  onSelectCustomer(null);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
              >
                <Users className="w-3 h-3 mr-2" />
                Cliente general
              </Button>
            </div>
            
            <Separator />
            
            <div className="p-2 space-y-1">
              {filteredCustomers.map(customer => (
                <Button
                  key={customer.id}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-sm hover:bg-muted/40 dark:hover:bg-muted/20"
                  onClick={() => {
                    onSelectCustomer(customer);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="font-medium text-sm text-foreground dark:text-foreground">{customer.name}</p>
                      {customer.email && (
                        <p className="text-xs text-muted-foreground dark:text-muted-foreground">{customer.email}</p>
                      )}
                    </div>
                    {customer.customer_type === 'WHOLESALE' && (
                      <Badge variant="secondary" className="text-xs bg-orange-100 dark:bg-orange-950/30 text-orange-800 dark:text-orange-400">
                        Mayorista
                      </Badge>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

CustomerSelector.displayName = 'CustomerSelector';

const DiscountSelector = memo(({
  discount,
  discountType,
  onSetDiscount,
  onSetDiscountType
}: {
  discount: number;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  onSetDiscount: (discount: number) => void;
  onSetDiscountType: (type: 'PERCENTAGE' | 'FIXED_AMOUNT') => void;
}) => {
  const [quickDiscounts] = useState([
    { label: '5%', value: 5, type: 'PERCENTAGE' as const },
    { label: '10%', value: 10, type: 'PERCENTAGE' as const },
    { label: '15%', value: 15, type: 'PERCENTAGE' as const },
    { label: '$10', value: 10, type: 'FIXED_AMOUNT' as const },
    { label: '$25', value: 25, type: 'FIXED_AMOUNT' as const },
    { label: '$50', value: 50, type: 'FIXED_AMOUNT' as const },
  ]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Percent className="w-4 h-4 text-primary" />
        <Label className="text-sm font-medium">Descuento</Label>
      </div>
      
      {/* Quick discount buttons */}
      <div className="grid grid-cols-3 gap-2">
        {quickDiscounts.map(({ label, value, type }) => (
          <Button
            key={label}
            variant={discount === value && discountType === type ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              onSetDiscount(value);
              onSetDiscountType(type);
            }}
            className="text-xs hover:bg-muted/40 dark:hover:bg-muted/20"
          >
            {label}
          </Button>
        ))}
      </div>
      
      {/* Custom discount input */}
      <div className="flex gap-2">
        <Input
          type="number"
          placeholder="Descuento"
          value={discount || ''}
          onChange={(e) => onSetDiscount(Number(e.target.value) || 0)}
          className="flex-1"
        />
        <select
          value={discountType}
          onChange={(e) => onSetDiscountType(e.target.value as 'PERCENTAGE' | 'FIXED_AMOUNT')}
          className="px-2 py-1 border border-gray-200 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-800 text-foreground dark:text-foreground"
        >
          <option value="PERCENTAGE">%</option>
          <option value="FIXED_AMOUNT">$</option>
        </select>
      </div>
    </div>
  );
});

DiscountSelector.displayName = 'DiscountSelector';

const PaymentMethodSelector = memo(({
  paymentMethod,
  onSetPaymentMethod
}: {
  paymentMethod: string;
  onSetPaymentMethod: (method: 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER') => void;
}) => {
  const paymentMethods = [
    { value: 'CASH', label: '💵 Efectivo', icon: DollarSign },
    { value: 'CARD', label: '💳 Tarjeta', icon: CreditCard },
    { value: 'TRANSFER', label: '🏦 Transferencia', icon: TrendingUp },
    { value: 'OTHER', label: '❓ Otro', icon: Receipt },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-primary" />
        <Label className="text-sm font-medium">Método de pago</Label>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {paymentMethods.map(({ value, label, icon: Icon }) => (
          <Button
            key={value}
            variant={paymentMethod === value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSetPaymentMethod(value as any)}
            className="items-center gap-2 text-xs hover:bg-muted/40 dark:hover:bg-muted/20"
          >
            <Icon className="w-3 h-3" />
            {label.split(' ')[1]}
          </Button>
        ))}
      </div>
    </div>
  );
});

PaymentMethodSelector.displayName = 'PaymentMethodSelector';

export default function QuickActionsPanel({
  customers,
  selectedCustomer,
  onSelectCustomer,
  onProcessSale,
  cartTotal,
  cartItemCount,
  disabled = false
}: QuickActionsPanelProps) {
  const paymentMethod = usePOSStore((s) => s.paymentMethod);
  const setPaymentMethod = usePOSStore((s) => s.setPaymentMethod);
  const discount = usePOSStore((s) => s.discount);
  const setDiscount = usePOSStore((s) => s.setDiscount);
  const discountType = usePOSStore((s) => s.discountType);
  const setDiscountType = usePOSStore((s) => s.setDiscountType);

  const finalTotal = cartTotal - (discountType === 'PERCENTAGE' ? cartTotal * (discount / 100) : discount);

  return (
    <Card className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 border-2 border-border dark:border-border shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-foreground dark:text-foreground">
          <Zap className="w-5 h-5 text-primary dark:text-primary" />
          Acciones Rápidas
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Customer Selection */}
        <CustomerSelector
          customers={customers}
          selectedCustomer={selectedCustomer}
          onSelectCustomer={onSelectCustomer}
        />

        <Separator />

        {/* Discount Selection */}
        <DiscountSelector
          discount={discount}
          discountType={discountType}
          onSetDiscount={setDiscount}
          onSetDiscountType={setDiscountType}
        />

        <Separator />

        {/* Payment Method */}
        <PaymentMethodSelector
          paymentMethod={paymentMethod}
          onSetPaymentMethod={setPaymentMethod}
        />

        <Separator />

        {/* Summary and Checkout */}
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground dark:text-muted-foreground">Subtotal</span>
              <span className="font-medium text-foreground dark:text-foreground">{formatCurrency(cartTotal)}</span>
            </div>
            
            {discount > 0 && (
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground dark:text-muted-foreground">Descuento</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  -{formatCurrency(discountType === 'PERCENTAGE' ? cartTotal * (discount / 100) : discount)}
                </span>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-foreground dark:text-foreground">Total</span>
              <span className="text-2xl font-bold text-primary dark:text-primary">{formatCurrency(finalTotal)}</span>
            </div>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-green-600 to-green-700 dark:from-green-700 dark:to-green-800 hover:from-green-700 hover:to-green-800 dark:hover:from-green-800 dark:hover:to-green-900 text-white dark:text-white font-semibold py-4 text-lg shadow-lg hover:shadow-xl transition-all"
            onClick={onProcessSale}
            disabled={disabled || cartItemCount === 0}
          >
            <div className="flex items-center justify-center gap-2">
              <CreditCard className="w-5 h-5" />
              <span>Procesar Venta</span>
              {cartItemCount > 0 && (
                <Badge variant="secondary" className="bg-white/20 dark:bg-white/10 text-white dark:text-white border-white/30 dark:border-white/20">
                  {cartItemCount}
                </Badge>
              )}
            </div>
          </Button>

          {/* Quick Stats */}
          {cartItemCount > 0 && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-2">
                <Package className="w-4 h-4 text-primary dark:text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground dark:text-muted-foreground">Productos</p>
                <p className="font-semibold text-sm text-foreground dark:text-foreground">{cartItemCount}</p>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-2">
                <Star className="w-4 h-4 text-primary dark:text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground dark:text-muted-foreground">Descuento</p>
                <p className="font-semibold text-sm text-foreground dark:text-foreground">{discount > 0 ? `${discount}${discountType === 'PERCENTAGE' ? '%' : '$'}` : 'N/A'}</p>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-2">
                <Clock className="w-4 h-4 text-primary dark:text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground dark:text-muted-foreground">Método</p>
                <p className="font-semibold text-sm text-foreground dark:text-foreground">{paymentMethod}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}