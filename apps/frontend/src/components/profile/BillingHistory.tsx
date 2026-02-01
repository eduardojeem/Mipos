import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Subscription } from '@/hooks/use-subscription';
import { Calendar, CheckCircle2, Clock } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface BillingHistoryProps {
    subscription: Subscription | null;
}

interface HistoryEvent {
    date: string;
    type: 'created' | 'plan_changed' | 'billing_cycle_changed';
    description: string;
    details?: string;
}

export function BillingHistory({ subscription }: BillingHistoryProps) {
    if (!subscription) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Historial de Facturación</CardTitle>
                    <CardDescription>No hay historial de facturación disponible</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-8">
                        No tienes una suscripción activa
                    </p>
                </CardContent>
            </Card>
        );
    }

    // Generar eventos de historial basados en la suscripción actual
    const historyEvents: HistoryEvent[] = [
        {
            date: subscription.createdAt,
            type: 'created',
            description: `Suscripción al plan ${subscription.plan.name} creada`,
            details: `Ciclo de facturación: ${subscription.billingCycle === 'yearly' ? 'Anual' : 'Mensual'}`,
        },
    ];

    // Si hay un período actual, agregar evento de facturación
    if (subscription.currentPeriodStart) {
        historyEvents.push({
            date: subscription.currentPeriodStart,
            type: 'billing_cycle_changed',
            description: 'Inicio del período de facturación actual',
            details: `Finaliza el ${formatDate(subscription.currentPeriodEnd)}`,
        });
    }

    // Ordenar por fecha descendente
    historyEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const getEventIcon = (type: string) => {
        switch (type) {
            case 'created':
                return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'plan_changed':
                return <Calendar className="h-4 w-4 text-blue-500" />;
            case 'billing_cycle_changed':
                return <Clock className="h-4 w-4 text-orange-500" />;
            default:
                return <Calendar className="h-4 w-4 text-gray-500" />;
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Historial de Suscripción
                </CardTitle>
                <CardDescription>
                    Registro de actividad de tu suscripción
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Información actual */}
                    <div className="bg-muted/50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-sm">Estado Actual</span>
                            <Badge variant="default" className="bg-green-500">
                                {subscription.status === 'active' ? 'Activo' : subscription.status}
                            </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                            <div>Plan: <strong>{subscription.plan.name}</strong></div>
                            <div>
                                Ciclo: <strong>{subscription.billingCycle === 'yearly' ? 'Anual' : 'Mensual'}</strong>
                            </div>
                            <div>
                                Próxima renovación: <strong>{formatDate(subscription.currentPeriodEnd)}</strong>
                            </div>
                        </div>
                    </div>

                    {/* Timeline de eventos */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-sm">Línea de Tiempo</h4>
                        <div className="space-y-4">
                            {historyEvents.map((event, index) => (
                                <div key={index} className="flex gap-3 relative">
                                    {/* Línea conectora */}
                                    {index < historyEvents.length - 1 && (
                                        <div className="absolute left-2 top-8 bottom-0 w-0.5 bg-border" />
                                    )}

                                    {/* Icono */}
                                    <div className="relative z-10 flex-shrink-0 bg-background p-1 rounded-full border">
                                        {getEventIcon(event.type)}
                                    </div>

                                    {/* Contenido */}
                                    <div className="flex-1 pb-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">{event.description}</p>
                                                {event.details && (
                                                    <p className="text-xs text-muted-foreground mt-1">{event.details}</p>
                                                )}
                                            </div>
                                            <time className="text-xs text-muted-foreground flex-shrink-0">
                                                {formatDate(event.date)}
                                            </time>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Nota informativa */}
                    <div className="border-t pt-4">
                        <p className="text-xs text-muted-foreground">
                            <strong>Nota:</strong> El historial completo de facturación y pagos estará disponible
                            cuando se integre un sistema de pagos.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
