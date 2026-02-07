'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    ChevronUp,
    ChevronDown,
    Trash2,
    PauseCircle,
    Maximize2,
    CheckCircle,
    Users,
    CreditCard,
    Settings2,
    Search,
    ChevronsUpDown
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { POSCartSummary } from './optimized/POSCartSummary';
import { OfflineSyncPanel } from './OfflineSyncPanel';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command";
import { cn } from '@/lib/utils';
import type { Customer } from '@/types';

interface POSCartFooterProps {
    cartLength: number;
    cartCalculations: {
        subtotal: number;
        subtotalWithIva: number;
        discountAmount: number;
        taxAmount: number;
        total: number;
    };
    onProcessSale: () => void;
    onClearCart: () => void;
    onHoldSale: () => void;
    onToggleFullscreen: () => void;

    // Customer Props
    customers: Customer[];
    selectedCustomer: Customer | null;
    onSelectCustomer: (customer: Customer | null) => void;
    customerSearchOpen: boolean;
    setCustomerSearchOpen: (open: boolean) => void;
    customerQuery: string;
    setCustomerQuery: (query: string) => void;

    // Payment Props
    paymentMethod: string;
    onPaymentMethodChange: (method: string) => void;
    processDisabled?: boolean;
    onRequestOpenCashSession?: () => void;
}

export function POSCartFooter({
    cartLength,
    cartCalculations,
    onProcessSale,
    onClearCart,
    onHoldSale,
    onToggleFullscreen,
    customers,
    selectedCustomer,
    onSelectCustomer,
    customerSearchOpen,
    setCustomerSearchOpen,
    customerQuery,
    setCustomerQuery,
    paymentMethod,
    onPaymentMethodChange
    , processDisabled, onRequestOpenCashSession
}: POSCartFooterProps) {
    const [isOpen, setIsOpen] = useState(false);

    if (cartLength === 0) return null;

    return (
        <div className="sticky bottom-0 z-20 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] dark:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>

                {/* 1. BARRA PRINCIPAL (Siempre visible) */}
                <div className="p-4 flex flex-col gap-3">
                    {/* Info Bar (Compact Customer/Method info) */}
                    {!isOpen && (
                        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                            <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {selectedCustomer ? (
                                        <span className="font-medium text-primary">
                                            {selectedCustomer.name}
                                        </span>
                                    ) : 'Cliente General'}
                                </span>
                                <Separator orientation="vertical" className="h-3" />
                                <span className="flex items-center gap-1">
                                    <CreditCard className="w-3 h-3" />
                                    {paymentMethod === 'CASH' && 'Efectivo'}
                                    {paymentMethod === 'CARD' && 'Tarjeta'}
                                    {paymentMethod === 'TRANSFER' && 'Transferencia'}
                                    {paymentMethod === 'OTHER' && 'Otro'}
                                </span>
                            </div>
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-800">
                                    <Settings2 className="w-3 h-3 mr-1" />
                                    Configurar
                                </Button>
                            </CollapsibleTrigger>
                        </div>
                    )}

                    <div className="flex gap-3">
                        {/* Total Display */}
                        <div className="flex-1 flex flex-col justify-center">
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total a Pagar</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                                    {formatCurrency(cartCalculations.total)}
                                </span>
                            </div>
                        </div>

                        {/* Process Button */}
                        {processDisabled ? (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="flex-1">
                                            <Button
                                                className="w-full h-14 bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-600/20 transition-all duration-200"
                                                onClick={onProcessSale}
                                                disabled
                                            >
                                                <div className="flex flex-col items-center">
                                                    <div className="flex items-center gap-2 font-bold text-lg">
                                                        <CheckCircle className="w-5 h-5" />
                                                        <span>COBRAR</span>
                                                    </div>
                                                    <span className="text-[10px] opacity-90 font-medium tracking-wide">
                                                        PROCESAR VENTA
                                                    </span>
                                                </div>
                                            </Button>
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <div className="flex items-center gap-2">
                                            <span>Caja cerrada: abre una sesión para cobrar en efectivo.</span>
                                            {onRequestOpenCashSession && (
                                                <Button variant="outline" size="sm" onClick={onRequestOpenCashSession}>
                                                    Abrir caja
                                                </Button>
                                            )}
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ) : (
                            <Button
                                className="flex-1 h-14 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg shadow-green-600/20 hover:shadow-xl hover:shadow-green-600/30 transition-all duration-200"
                                onClick={onProcessSale}
                            >
                                <div className="flex flex-col items-center">
                                    <div className="flex items-center gap-2 font-bold text-lg">
                                        <CheckCircle className="w-5 h-5" />
                                        <span>COBRAR</span>
                                    </div>
                                    <span className="text-[10px] opacity-90 font-medium tracking-wide">
                                        PROCESAR VENTA
                                    </span>
                                </div>
                            </Button>
                        )}

                        {/* Expand Toggle (Desktop) */}
                        <CollapsibleTrigger asChild>
                            <Button variant="outline" size="icon" className="h-14 w-10 shrink-0 border-l-0 rounded-l-none hidden sm:flex">
                                {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                            </Button>
                        </CollapsibleTrigger>
                    </div>
                </div>

                {/* 2. PANEL DE CONFIGURACIÓN (Colapsable) */}
                <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                    <div className="px-4 pb-4 pt-0 space-y-4 bg-gray-50/50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800">

                        {/* Offline Panel */}
                        <div className="pt-4">
                            <OfflineSyncPanel />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Columna Izquierda: Configuración */}
                            <div className="space-y-4">
                                {/* Customer Selection */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cliente</label>
                                    <div className="flex gap-2">
                                        <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className={cn(
                                                        "flex-1 justify-between h-11 px-3 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 transition-all duration-200 group",
                                                        !selectedCustomer && "text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5",
                                                        selectedCustomer && "border-primary/20 bg-primary/5"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2.5 overflow-hidden">
                                                        {selectedCustomer ? (
                                                            <>
                                                                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-sm">
                                                                    {selectedCustomer.name.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div className="flex flex-col items-start gap-0.5">
                                                                    <span className="truncate font-semibold text-sm text-foreground leading-none">
                                                                        {selectedCustomer.name}
                                                                    </span>
                                                                    {selectedCustomer.customer_type === 'WHOLESALE' && (
                                                                        <span className="text-[10px] text-orange-600 font-medium leading-none">
                                                                            Mayorista
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Search className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                                                                <span className="text-sm">Buscar o agregar cliente...</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="p-0 w-[300px]" align="start">
                                                <Command>
                                                    <CommandInput placeholder="Buscar cliente..." value={customerQuery} onValueChange={setCustomerQuery} />
                                                    <CommandEmpty>No encontrado.</CommandEmpty>
                                                    <CommandGroup>
                                                        {customers.map((c) => (
                                                            <CommandItem
                                                                key={c.id}
                                                                onSelect={() => {
                                                                    onSelectCustomer(c);
                                                                    setCustomerSearchOpen(false);
                                                                }}
                                                            >
                                                                <Users className="mr-2 h-4 w-4" />
                                                                <span>{c.name}</span>
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        {selectedCustomer && (
                                            <Button variant="ghost" size="icon" onClick={() => onSelectCustomer(null)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Payment Method */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Método de Pago</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            variant={paymentMethod === 'CASH' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => onPaymentMethodChange('CASH')}
                                            className="justify-start"
                                        >
                                            💵 Efectivo
                                        </Button>
                                        <Button
                                            variant={paymentMethod === 'CARD' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => onPaymentMethodChange('CARD')}
                                            className="justify-start"
                                        >
                                            💳 Tarjeta
                                        </Button>
                                        <Button
                                            variant={paymentMethod === 'TRANSFER' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => onPaymentMethodChange('TRANSFER')}
                                            className="justify-start"
                                        >
                                            🏦 Transf.
                                        </Button>
                                        <Button
                                            variant={paymentMethod === 'OTHER' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => onPaymentMethodChange('OTHER')}
                                            className="justify-start"
                                        >
                                            ❓ Otro
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Columna Derecha: Resumen y Acciones */}
                            <div className="space-y-4">
                                <POSCartSummary calculations={cartCalculations} />

                                <div className="grid grid-cols-3 gap-2">
                                    <Button variant="outline" size="sm" onClick={onClearCart} className="text-xs">
                                        <Trash2 className="w-3 h-3 mr-1" /> Limpiar
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={onHoldSale} className="text-xs text-orange-600">
                                        <PauseCircle className="w-3 h-3 mr-1" /> Espera
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={onToggleFullscreen} className="text-xs lg:hidden">
                                        <Maximize2 className="w-3 h-3 mr-1" /> Full
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}
