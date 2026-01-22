import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, DollarSign, Package } from 'lucide-react';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';

interface SuppliersStatsProps {
  totalSuppliers: number;
  newThisMonth: number;
  activeSuppliers: number;
  totalPurchases: number;
  totalOrders: number;
}

export function SuppliersStats({
  totalSuppliers,
  newThisMonth,
  activeSuppliers,
  totalPurchases,
  totalOrders,
}: SuppliersStatsProps) {
  const fmtCurrency = useCurrencyFormatter();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Proveedores</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalSuppliers}</div>
          <p className="text-xs text-muted-foreground">
            +{newThisMonth} este mes
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Proveedores Activos</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {activeSuppliers}
          </div>
          <p className="text-xs text-muted-foreground">
            Con órdenes de compra
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Compras</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {fmtCurrency(totalPurchases)}
          </div>
          <p className="text-xs text-muted-foreground">
            Valor total histórico
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Órdenes Totales</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {totalOrders}
          </div>
          <p className="text-xs text-muted-foreground">
            Número de órdenes
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
