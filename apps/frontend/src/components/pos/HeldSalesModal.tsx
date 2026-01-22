'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Clock, User, ShoppingCart, Trash2, RotateCcw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { HeldSale } from '@/store';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface HeldSalesModalProps {
    isOpen: boolean;
    onClose: () => void;
    heldSales: HeldSale[];
    onRestore: (sale: HeldSale) => void;
    onDiscard: (id: string) => void;
}

export function HeldSalesModal({ isOpen, onClose, heldSales, onRestore, onDiscard }: HeldSalesModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Ventas en Espera
                    </DialogTitle>
                    <DialogDescription>
                        Selecciona una venta para retomarla o elimínala si ya no es necesaria.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 pr-4 -mr-4 mt-4">
                    {heldSales.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No hay ventas en espera</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {heldSales.map((sale) => {
                                const total = sale.cart.reduce((sum, item) => sum + item.total, 0);
                                const itemCount = sale.cart.reduce((sum, item) => sum + item.quantity, 0);

                                return (
                                    <div key={sale.id} className="border border-border dark:border-border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge variant="outline" className="text-xs border-border dark:border-border">
                                                        {formatDistanceToNow(sale.timestamp, { addSuffix: true, locale: es })}
                                                    </Badge>
                                                    {sale.customer ? (
                                                        <Badge variant="secondary" className="text-xs flex items-center gap-1 bg-secondary dark:bg-secondary text-secondary-foreground dark:text-secondary-foreground">
                                                            <User className="w-3 h-3" />
                                                            {sale.customer.name}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                                            Cliente General
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-sm text-muted-foreground dark:text-muted-foreground">
                                                    {new Date(sale.timestamp).toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-lg text-primary dark:text-primary">
                                                    {formatCurrency(total)}
                                                </div>
                                                <div className="text-xs text-muted-foreground dark:text-muted-foreground flex items-center justify-end gap-1">
                                                    <ShoppingCart className="w-3 h-3" />
                                                    {itemCount} items
                                                </div>
                                            </div>
                                        </div>

                                        {/* Preview of items */}
                                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                                            {sale.cart.map(i => `${i.quantity}x ${i.product_name}`).join(', ')}
                                        </div>

                                        <div className="flex gap-2 justify-end">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-destructive dark:text-destructive hover:text-destructive dark:hover:text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20"
                                                onClick={() => onDiscard(sale.id)}
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                Descartar
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    onRestore(sale);
                                                    onClose();
                                                }}
                                            >
                                                <RotateCcw className="w-4 h-4 mr-2" />
                                                Retomar Venta
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
