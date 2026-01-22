import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';

interface CashSummary {
    in: number;
    out: number;
    adjustment: number;
    sale: number;
    return: number;
    balance: number;
}

interface CashCurrentSummaryProps {
    summary: CashSummary;
    onRecalculate: () => void;
}

export function CashCurrentSummary({ summary, onRecalculate }: CashCurrentSummaryProps) {
    const fmtCurrency = useCurrencyFormatter();

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Resumen actual</CardTitle>
                    <Button variant="outline" size="sm" onClick={onRecalculate}>
                        Recalcular
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
                    <div>
                        <div className="text-muted-foreground">Ingresos</div>
                        <div className="font-medium">{fmtCurrency(summary.in)}</div>
                    </div>
                    <div>
                        <div className="text-muted-foreground">Egresos</div>
                        <div className="font-medium">{fmtCurrency(summary.out)}</div>
                    </div>
                    <div>
                        <div className="text-muted-foreground">Ajustes</div>
                        <div className="font-medium">{fmtCurrency(summary.adjustment)}</div>
                    </div>
                    <div>
                        <div className="text-muted-foreground">Ventas</div>
                        <div className="font-medium">{fmtCurrency(summary.sale)}</div>
                    </div>
                    <div>
                        <div className="text-muted-foreground">Saldo actual</div>
                        <div className="font-semibold">{fmtCurrency(summary.balance)}</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
