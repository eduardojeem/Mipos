'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Percent, DollarSign, Tag, Trash2, Plus } from 'lucide-react';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import type { DiscountType } from '@/lib/pos/calculations';

interface DiscountsStepProps {
  discount: number;
  discountType: DiscountType;
  onDiscountChange: (value: number) => void;
  onDiscountTypeChange: (type: DiscountType) => void;
  couponCode: string;
  onCouponCodeChange: (code: string) => void;
  onApplyCoupon: () => Promise<void>;
  onRemoveCoupon: () => void;
  couponApplied: { amount: number; type: DiscountType } | null;
  couponLoading: boolean;
  composedDiscountTotal: number;
  breakdown: number[];
}

/**
 * Step 2: Discounts and Coupons
 * Handles discount application and coupon validation
 */
export function DiscountsStep({
  discount,
  discountType,
  onDiscountChange,
  onDiscountTypeChange,
  couponCode,
  onCouponCodeChange,
  onApplyCoupon,
  onRemoveCoupon,
  couponApplied,
  couponLoading,
  composedDiscountTotal,
  breakdown,
}: DiscountsStepProps) {
  const fmtCurrency = useCurrencyFormatter();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="w-5 h-5" />
          Descuentos y Cupones
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main discount */}
        <div className="space-y-3">
          <Label>Descuento principal</Label>
          <div className="flex gap-2">
            <Select value={discountType} onValueChange={(v) => onDiscountTypeChange(v as DiscountType)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERCENTAGE">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4" />
                    Porcentaje
                  </div>
                </SelectItem>
                <SelectItem value="FIXED_AMOUNT">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Monto fijo
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              min="0"
              step={discountType === 'PERCENTAGE' ? '1' : '0.01'}
              max={discountType === 'PERCENTAGE' ? '100' : undefined}
              value={discount}
              onChange={(e) => onDiscountChange(Number(e.target.value))}
              placeholder={discountType === 'PERCENTAGE' ? '0-100' : '0.00'}
              className="flex-1"
            />
          </div>
        </div>

        {/* Coupon section */}
        <div className="space-y-3">
          <Label>Cupón de descuento</Label>
          {!couponApplied ? (
            <div className="flex gap-2">
              <Input
                type="text"
                value={couponCode}
                onChange={(e) => onCouponCodeChange(e.target.value.toUpperCase())}
                placeholder="Código del cupón"
                className="flex-1"
                disabled={couponLoading}
              />
              <Button
                onClick={onApplyCoupon}
                disabled={!couponCode || couponLoading}
                variant="outline"
              >
                {couponLoading ? 'Validando...' : 'Aplicar'}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    Cupón aplicado: {couponCode}
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Descuento: {couponApplied.type === 'PERCENTAGE' ? `${couponApplied.amount}%` : fmtCurrency(couponApplied.amount)}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onRemoveCoupon}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Discount summary */}
        {composedDiscountTotal > 0 && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Descuento total aplicado</span>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                -{fmtCurrency(composedDiscountTotal)}
              </span>
            </div>
            {breakdown.length > 0 && (
              <div className="space-y-1 text-xs text-muted-foreground">
                {breakdown.map((amount, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>Descuento {idx + 1}</span>
                    <span>-{fmtCurrency(amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
