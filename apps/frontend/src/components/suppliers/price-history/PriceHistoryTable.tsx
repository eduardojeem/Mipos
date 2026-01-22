import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, Minus, FileText } from 'lucide-react';
import { PriceHistoryItem } from '@/types/price-history';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { formatDate } from '@/lib/utils';

interface PriceHistoryTableProps {
    data: PriceHistoryItem[];
    loading: boolean;
}

export function PriceHistoryTable({ data, loading }: PriceHistoryTableProps) {
    const fmtCurrency = useCurrencyFormatter();

    const getChangeIcon = (type: PriceHistoryItem['changeType']) => {
        switch (type) {
            case 'increase': return <ArrowUp className="h-4 w-4 text-red-500" />;
            case 'decrease': return <ArrowDown className="h-4 w-4 text-green-500" />;
            case 'stable': return <Minus className="h-4 w-4 text-gray-500" />;
            default: return <div className="w-4 h-4" />;
        }
    };

    if (loading) {
        return <div className="p-8 text-center">Cargando historial...</div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Historial Detallado</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Producto</TableHead>
                            <TableHead>Proveedor</TableHead>
                            <TableHead>Precio Unitario</TableHead>
                            <TableHead>Variación</TableHead>
                            <TableHead>Origen</TableHead>
                            <TableHead>Estado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>{formatDate(item.effectiveDate)}</TableCell>
                                <TableCell className="font-medium">{item.productName}</TableCell>
                                <TableCell>{item.supplierName}</TableCell>
                                <TableCell>{fmtCurrency(item.price)}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1">
                                        {getChangeIcon(item.changeType)}
                                        <span className={
                                            item.changeType === 'increase' ? 'text-red-600' :
                                            item.changeType === 'decrease' ? 'text-green-600' : ''
                                        }>
                                            {item.changePercentage > 0 ? `${item.changePercentage}%` : '-'}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="flex w-fit items-center gap-1">
                                        <FileText className="h-3 w-3" />
                                        {item.source}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                                        {item.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
