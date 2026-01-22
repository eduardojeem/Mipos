import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import dynamic from 'next/dynamic';
import { PriceTrend } from '@/types/price-history';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';

const lazyRecharts = (name: string) =>
  dynamic(() => import('recharts').then((m: any) => (props: any) => {
    const C = m[name];
    return <C {...props} />;
  }), { ssr: false });

const ResponsiveContainer = lazyRecharts('ResponsiveContainer');
const LineChart = lazyRecharts('LineChart');
const Line = lazyRecharts('Line');
const CartesianGrid = lazyRecharts('CartesianGrid');
const XAxis = lazyRecharts('XAxis');
const YAxis = lazyRecharts('YAxis');
const Tooltip = lazyRecharts('Tooltip');
const Legend = lazyRecharts('Legend');
const BarChart = lazyRecharts('BarChart');
const Bar = lazyRecharts('Bar');

interface PriceTrendsChartsProps {
    trends: PriceTrend[];
    loading: boolean;
}

export function PriceTrendsCharts({ trends, loading }: PriceTrendsChartsProps) {
    const fmtCurrency = useCurrencyFormatter();

    if (loading) {
        return <div className="p-8 text-center">Cargando tendencias...</div>;
    }

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Evolución de Precios</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trends}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="period" />
                                <YAxis />
                                <Tooltip formatter={(value: any) => fmtCurrency(Number(value))} />
                                <Legend />
                                <Line type="monotone" dataKey="avgPrice" name="Precio Promedio" stroke="#2563eb" strokeWidth={2} />
                                <Line type="monotone" dataKey="minPrice" name="Mínimo" stroke="#16a34a" strokeDasharray="5 5" />
                                <Line type="monotone" dataKey="maxPrice" name="Máximo" stroke="#dc2626" strokeDasharray="5 5" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Proveedores por Periodo</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trends}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="period" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="supplierCount" name="Proveedores Activos" fill="#8b5cf6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
