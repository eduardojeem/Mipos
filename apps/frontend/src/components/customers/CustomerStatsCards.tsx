import React from 'react';
import { 
  Users, TrendingUp, ShoppingCart, Star
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ResponsiveGrid } from '@/components/ui/mobile-responsive';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import type { CustomerStats } from '@/lib/customer-service';
import type { UICustomer } from '@/types/customer-page';

interface CustomerStatsCardsProps {
  stats: CustomerStats;
  customers: UICustomer[];
}

export const CustomerStatsCards: React.FC<CustomerStatsCardsProps> = ({
  stats,
  customers
}) => {
  const fmtCurrency = useCurrencyFormatter();

  return (
    <ResponsiveGrid 
      cols={{ default: 2, md: 4 }} 
      gap={4}
      className="px-4 md:px-0"
    >
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700 hover:shadow-lg transition-all duration-200">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Users className="h-6 w-6 md:h-8 md:w-8 text-white" />
            </div>
            <div className="ml-3 md:ml-4 min-w-0 flex-1">
              <p className="text-xs md:text-sm font-medium text-blue-700 dark:text-blue-300 truncate">
                Total Clientes
              </p>
              <p className="text-lg md:text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.total}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700 hover:shadow-lg transition-all duration-200">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-600 rounded-lg">
              <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-white" />
            </div>
            <div className="ml-3 md:ml-4 min-w-0 flex-1">
              <p className="text-xs md:text-sm font-medium text-green-700 dark:text-green-300 truncate">
                Clientes Activos
              </p>
              <p className="text-lg md:text-2xl font-bold text-green-900 dark:text-green-100">{stats.active}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700 hover:shadow-lg transition-all duration-200">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-600 rounded-lg">
              <ShoppingCart className="h-6 w-6 md:h-8 md:w-8 text-white" />
            </div>
            <div className="ml-3 md:ml-4 min-w-0 flex-1">
              <p className="text-xs md:text-sm font-medium text-purple-700 dark:text-purple-300 truncate">
                Total Ventas
              </p>
              <p className="text-lg md:text-2xl font-bold text-purple-900 dark:text-purple-100">{fmtCurrency(customers.reduce((sum, customer) => sum + (customer.totalSpent || 0), 0))}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700 hover:shadow-lg transition-all duration-200">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-600 rounded-lg">
              <Star className="h-6 w-6 md:h-8 md:w-8 text-white" />
            </div>
            <div className="ml-3 md:ml-4 min-w-0 flex-1">
              <p className="text-xs md:text-sm font-medium text-orange-700 dark:text-orange-300 truncate">
                Clientes VIP
              </p>
              <p className="text-lg md:text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.vip}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </ResponsiveGrid>
  );
};
