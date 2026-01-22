'use client'

import React from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ShoppingCart, Trash2, Plus, Minus, CreditCard } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { CartItem } from '@/hooks/useCart'
import type { Product } from '@/types'

interface MobileCartDrawerProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    cart: (CartItem & { product?: Product })[]
    cartCalculations: any
    onUpdateQuantity: (productId: string, quantity: number) => void
    onRemoveItem: (productId: string) => void
    onClearCart: () => void
    onProcessSale: () => void
}

export function MobileCartDrawer({
    open,
    onOpenChange,
    cart,
    cartCalculations,
    onUpdateQuantity,
    onRemoveItem,
    onClearCart,
    onProcessSale
}: MobileCartDrawerProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="bottom"
                className="h-[85vh] flex flex-col p-0"
            >
                <SheetHeader className="px-4 pt-4 pb-2 border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <ShoppingCart className="w-6 h-6 text-primary" />
                                {cart.length > 0 && (
                                    <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                                        {cart.length > 99 ? '99+' : cart.length}
                                    </Badge>
                                )}
                            </div>
                            <div>
                                <SheetTitle>Carrito de Compras</SheetTitle>
                                <SheetDescription>
                                    {cart.length} {cart.length === 1 ? 'artículo' : 'artículos'}
                                </SheetDescription>
                            </div>
                        </div>

                        {cart.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onClearCart}
                                className="text-destructive hover:text-destructive"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </SheetHeader>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto px-4 py-4 pb-28">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-12">
                            <ShoppingCart className="w-16 h-16 text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Tu carrito está vacío
                            </h3>
                            <p className="text-sm text-gray-500">
                                Agrega productos para comenzar una venta
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {cart.map((item) => {
                                const isLowStock = (item.product?.stock_quantity || 0) - item.quantity <= (item.product?.min_stock || 5)

                                return (
                                    <div
                                        key={item.product_id}
                                        className="bg-white rounded-lg border p-3 space-y-2"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-medium text-sm text-gray-900 line-clamp-2">
                                                    {item.product_name}
                                                </h4>
                                                {item.product?.sku && (
                                                    <p className="text-xs text-muted-foreground font-mono">
                                                        {item.product.sku}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="font-semibold text-sm text-primary">
                                                        {formatCurrency(item.price)}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">c/u</span>
                                                    {isLowStock && (
                                                        <Badge variant="destructive" className="text-xs">
                                                            Stock bajo
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="p-1 h-6 w-6"
                                                onClick={() => onRemoveItem(item.product_id)}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    onClick={() => onUpdateQuantity(item.product_id, Math.max(1, item.quantity - 1))}
                                                >
                                                    <Minus className="w-3 h-3" />
                                                </Button>

                                                <span className="font-semibold min-w-[2.5rem] text-center">
                                                    {item.quantity}
                                                </span>

                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    onClick={() => onUpdateQuantity(item.product_id, item.quantity + 1)}
                                                    disabled={item.quantity >= (item.product?.stock_quantity || 999)}
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </Button>
                                            </div>

                                            <div className="text-right">
                                                <span className="font-bold text-sm">
                                                    {formatCurrency(item.total)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Cart Summary - Sticky Bottom */}
                {cart.length > 0 && (
                    <div
                        role="region"
                        aria-labelledby="mobile-cart-footer-title"
                        className="sticky bottom-0 z-10 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-4 py-4 space-y-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] dark:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]"
                    >
                        <h3 id="mobile-cart-footer-title" className="sr-only">Resumen y acciones del carrito</h3>
                        <div className="space-y-2 bg-gray-50 rounded-lg p-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span className="font-medium">
                                    {formatCurrency(cartCalculations.subtotalWithIva)}
                                </span>
                            </div>

                            {cartCalculations.discountAmount > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Descuento</span>
                                    <span className="font-medium text-green-600">
                                        -{formatCurrency(cartCalculations.discountAmount)}
                                    </span>
                                </div>
                            )}

                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">IVA</span>
                                <span className="font-medium">
                                    {formatCurrency(cartCalculations.taxAmount)}
                                </span>
                            </div>

                            <Separator />

                            <div className="flex justify-between">
                                <span className="font-semibold">Total</span>
                                <span className="font-bold text-xl text-primary">
                                    {formatCurrency(cartCalculations.total)}
                                </span>
                            </div>
                        </div>

                        <Button
                            className="w-full h-12 text-base shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                            size="lg"
                            onClick={onProcessSale}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <CreditCard className="w-5 h-5" />
                                <span>Procesar Venta</span>
                                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                                    {formatCurrency(cartCalculations.total)}
                                </Badge>
                            </div>
                        </Button>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    )
}
