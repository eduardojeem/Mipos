import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plan } from '@/hooks/use-subscription';
import { Check, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ChangePlanDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentPlan?: Plan;
    newPlan?: Plan;
    onConfirm: (planId: string, billingCycle: 'monthly' | 'yearly') => Promise<boolean>;
    isChanging?: boolean;
}

const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('es-PY', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
    }).format(amount);
};

export function ChangePlanDialog({
    open,
    onOpenChange,
    currentPlan,
    newPlan,
    onConfirm,
    isChanging = false,
}: ChangePlanDialogProps) {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [error, setError] = useState<string | null>(null);

    if (!newPlan) return null;

    const handleConfirm = async () => {
        setError(null);
        const success = await onConfirm(newPlan.id, billingCycle);
        if (success) {
            onOpenChange(false);
        } else {
            setError('No se pudo cambiar el plan. Por favor, inténtalo de nuevo.');
        }
    };

    const newPrice = billingCycle === 'yearly' ? newPlan.priceYearly : newPlan.priceMonthly;
    const currentPrice = currentPlan
        ? (billingCycle === 'yearly' ? currentPlan.priceYearly : currentPlan.priceMonthly)
        : 0;

    const priceDifference = newPrice - currentPrice;
    const isUpgrade = priceDifference > 0;
    const pricePerMonth = billingCycle === 'yearly' ? newPlan.priceYearly / 12 : newPlan.priceMonthly;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl">
                        {isUpgrade ? 'Actualizar' : 'Cambiar'} Plan de Suscripción
                    </DialogTitle>
                    <DialogDescription>
                        Revisa los detalles del cambio de plan antes de confirmar
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Comparación de planes */}
                    <div className="grid grid-cols-3 gap-4 items-center">
                        {/* Plan actual */}
                        <div className="text-center">
                            <div className="text-sm text-muted-foreground mb-1">Plan Actual</div>
                            <Badge variant="outline" className="text-base">
                                {currentPlan?.name || 'Sin plan'}
                            </Badge>
                            {currentPlan && (
                                <div className="text-sm mt-2 text-muted-foreground">
                                    {formatCurrency(currentPrice, currentPlan.currency)}
                                    <div className="text-xs">
                                        / {billingCycle === 'yearly' ? 'año' : 'mes'}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Flecha */}
                        <div className="flex justify-center">
                            <ArrowRight className={`h-8 w-8 ${isUpgrade ? 'text-green-500' : 'text-blue-500'}`} />
                        </div>

                        {/* Nuevo plan */}
                        <div className="text-center">
                            <div className="text-sm text-muted-foreground mb-1">Nuevo Plan</div>
                            <Badge className="text-base bg-primary">
                                {newPlan.name}
                            </Badge>
                            <div className="text-sm mt-2 font-semibold">
                                {formatCurrency(newPrice, newPlan.currency)}
                                <div className="text-xs text-muted-foreground font-normal">
                                    / {billingCycle === 'yearly' ? 'año' : 'mes'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Selector de ciclo de facturación */}
                    <div>
                        <label className="text-sm font-medium mb-2 block">
                            Ciclo de Facturación
                        </label>
                        <div className="inline-flex items-center bg-muted p-1 rounded-lg w-full">
                            <button
                                onClick={() => setBillingCycle('monthly')}
                                disabled={isChanging}
                                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${billingCycle === 'monthly'
                                        ? 'bg-background shadow-sm text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                Mensual
                                <div className="text-xs text-muted-foreground">
                                    {formatCurrency(newPlan.priceMonthly, newPlan.currency)}/mes
                                </div>
                            </button>
                            <button
                                onClick={() => setBillingCycle('yearly')}
                                disabled={isChanging}
                                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${billingCycle === 'yearly'
                                        ? 'bg-background shadow-sm text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                Anual
                                {newPlan.yearlyDiscount && newPlan.yearlyDiscount > 0 && (
                                    <Badge variant="secondary" className="ml-1 bg-green-500 text-white text-xs">
                                        -{newPlan.yearlyDiscount}%
                                    </Badge>
                                )}
                                <div className="text-xs text-muted-foreground">
                                    {formatCurrency(pricePerMonth, newPlan.currency)}/mes
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Diferencia de precio */}
                    {currentPlan && priceDifference !== 0 && (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                {isUpgrade ? (
                                    <span>
                                        Al actualizar, pagarás <strong>{formatCurrency(Math.abs(priceDifference), newPlan.currency)}</strong>{' '}
                                        {billingCycle === 'yearly' ? 'más al año' : 'más al mes'}.
                                    </span>
                                ) : (
                                    <span>
                                        Al cambiar a este plan, ahorrarás <strong>{formatCurrency(Math.abs(priceDifference), newPlan.currency)}</strong>{' '}
                                        {billingCycle === 'yearly' ? 'al año' : 'al mes'}.
                                    </span>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Nuevas características */}
                    <div>
                        <h4 className="font-semibold mb-3">Características del Plan {newPlan.name}:</h4>
                        <ul className="space-y-2 max-h-48 overflow-y-auto">
                            {newPlan.features.map((feature, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm">
                                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Error message */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isChanging}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isChanging}
                    >
                        {isChanging ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Cambiando Plan...
                            </>
                        ) : (
                            <>Confirmar Cambio</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
