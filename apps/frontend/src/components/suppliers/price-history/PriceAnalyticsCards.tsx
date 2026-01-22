import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, DollarSign, Activity, AlertTriangle, BarChart3 } from 'lucide-react';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';

interface PriceAnalyticsCardsProps {
    stats: {
        avgChange: number;
        totalEntries: number;
        activeAlerts: number;
        monitoredProducts: number;
    };
}

export function PriceAnalyticsCards({ stats }: PriceAnalyticsCardsProps) {
    const fmtCurrency = useCurrencyFormatter();

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Variación Promedio</CardTitle>
                    {stats.avgChange > 0 ? (
                        <TrendingUp className="h-4 w-4 text-red-500" />
                    ) : stats.avgChange < 0 ? (
                        <TrendingDown className="h-4 w-4 text-green-500" />
                    ) : (
                        <Minus className="h-4 w-4 text-muted-foreground" />
                    )}
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${stats.avgChange > 0 ? 'text-red-600' : stats.avgChange < 0 ? 'text-green-600' : ''}`}>
                        {stats.avgChange > 0 ? '+' : ''}{stats.avgChange.toFixed(2)}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Últimos 30 días
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Registros de Precio</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.totalEntries}</div>
                    <p className="text-xs text-muted-foreground">
                        Total histórico
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Alertas Activas</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.activeAlerts}</div>
                    <p className="text-xs text-muted-foreground">
                        Monitoreando cambios
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Productos Monitoreados</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.monitoredProducts}</div>
                    <p className="text-xs text-muted-foreground">
                        Con historial de precios
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
