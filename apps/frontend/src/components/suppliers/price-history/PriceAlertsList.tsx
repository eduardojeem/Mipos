import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Bell, Trash2, Plus } from 'lucide-react';
import { PriceAlert } from '@/types/price-history';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { formatDate } from '@/lib/utils';

interface PriceAlertsListProps {
    alerts: PriceAlert[];
    loading: boolean;
    onToggle: (id: string, status: boolean) => void;
    onDelete: (id: string) => void;
    onCreate: () => void;
}

export function PriceAlertsList({ alerts, loading, onToggle, onDelete, onCreate }: PriceAlertsListProps) {
    const fmtCurrency = useCurrencyFormatter();

    if (loading) {
        return <div className="p-8 text-center">Cargando alertas...</div>;
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Alertas de Precio</CardTitle>
                    <CardDescription>Recibe notificaciones cuando cambien los precios importantes</CardDescription>
                </div>
                <Button onClick={onCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Alerta
                </Button>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {alerts.map((alert) => (
                        <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-full ${alert.isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                                    <Bell className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="font-medium">{alert.productName}</h4>
                                    <p className="text-sm text-muted-foreground">
                                        {alert.condition === 'above' && `Precio superior a ${fmtCurrency(alert.targetPrice)}`}
                                        {alert.condition === 'below' && `Precio inferior a ${fmtCurrency(alert.targetPrice)}`}
                                        {alert.condition === 'change_percent' && `Variación > ${alert.threshold}%`}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right text-sm text-muted-foreground">
                                    <div>Creada: {formatDate(alert.createdAt)}</div>
                                    {alert.lastTriggered && (
                                        <div className="text-yellow-600">
                                            Última: {formatDate(alert.lastTriggered)}
                                        </div>
                                    )}
                                </div>
                                <Switch 
                                    checked={alert.isActive}
                                    onCheckedChange={(checked) => onToggle(alert.id, checked)}
                                />
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => onDelete(alert.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {alerts.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            No hay alertas configuradas
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
