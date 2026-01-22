import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-states";
import { formatCurrency } from "@/lib/utils";
import type { CashSession } from "@/types/cash";

interface CashCount {
    denomination: number;
    quantity: number;
    total: number;
}

interface CashCountModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    session: CashSession | null;
    counts: CashCount[];
    onCountChange: (index: number, quantity: number) => void;
    onSave: () => void;
    isSaving?: boolean;
}

/**
 * Accessible modal for cash counting
 * Uses Dialog component with proper focus management and keyboard navigation
 */
export function CashCountModal({
    open,
    onOpenChange,
    session,
    counts,
    onCountChange,
    onSave,
    isSaving = false,
}: CashCountModalProps) {
    if (!session) return null;

    const calculateTotal = () => {
        return counts.reduce((sum, count) => sum + count.total, 0);
    };

    const handleSave = () => {
        onSave();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        Conteo de Efectivo - Sesión {session.id.slice(-8)}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        {counts.map((count, index) => (
                            <div key={count.denomination} className="flex items-center gap-2">
                                <Label className="w-20 text-sm" htmlFor={`count-${count.denomination}`}>
                                    {formatCurrency(count.denomination)}
                                </Label>
                                <Input
                                    id={`count-${count.denomination}`}
                                    type="number"
                                    min="0"
                                    value={count.quantity}
                                    onChange={(e) => onCountChange(index, parseInt(e.target.value) || 0)}
                                    className="w-20"
                                    aria-label={`Cantidad de billetes de ${formatCurrency(count.denomination)}`}
                                />
                                <span className="text-sm text-muted-foreground w-24" aria-live="polite">
                                    = {formatCurrency(count.total)}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="border-t pt-4">
                        <div className="flex justify-between items-center text-lg font-semibold">
                            <span>Total contado:</span>
                            <span aria-live="polite">{formatCurrency(calculateTotal())}</span>
                        </div>
                        {session.closingAmount != null && (
                            <div className="flex justify-between items-center text-sm text-muted-foreground mt-2">
                                <span>Monto de cierre:</span>
                                <span>{formatCurrency(session.closingAmount)}</span>
                            </div>
                        )}
                        {session.closingAmount != null && (
                            <div className="flex justify-between items-center text-sm mt-1">
                                <span className="font-medium">Diferencia:</span>
                                <span
                                    className={
                                        Math.abs(calculateTotal() - session.closingAmount) === 0
                                            ? "text-green-600 font-medium"
                                            : "text-red-600 font-medium"
                                    }
                                    aria-live="polite"
                                >
                                    {formatCurrency(calculateTotal() - session.closingAmount)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                    >
                        Cancelar
                    </Button>
                    <LoadingButton
                        onClick={handleSave}
                        loading={isSaving}
                        disabled={isSaving}
                    >
                        Guardar Conteo
                    </LoadingButton>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
