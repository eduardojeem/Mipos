'use client';

import React from 'react';
import { Package, TrendingUp, AlertTriangle, Eye, Edit, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { sanitizeImageUrl } from '@/lib/validation/image-url';
import { formatCurrency } from '@/lib/utils';
import { useProducts } from '../contexts/ProductsContext';
import { ModernProductsMetrics } from '../components/ModernProductsMetrics';
import Image from 'next/image';

export default function ProductsOverviewTab() {
  const { products, categories, dashboardStats, loading, pagination, actions } = useProducts();

  // Sort products by creation date (most recent first)
  const recentProducts = [...products]
    .sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    })
    .slice(0, 8);

  // Get low stock products
  const lowStockProducts = products
    .filter(p => (p.stock_quantity || 0) <= (p.min_stock || 5) && (p.stock_quantity || 0) > 0)
    .slice(0, 5);

  // Get out of stock products
  const outOfStockProducts = products
    .filter(p => (p.stock_quantity || 0) === 0)
    .slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-96 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const ProductCard = ({ product, index, showActions = false }: { product: any; index: number; showActions?: boolean }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group"
    >
      <div className="flex items-center justify-between p-4 border border-border/40 dark:border-white/5 rounded-lg hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-all duration-200 hover:shadow-md">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden relative flex-shrink-0">
            {product.image_url ? (
              <Image 
                src={sanitizeImageUrl(product.image_url)}
                alt={product.name}
                width={48}
                height={48}
                className="object-cover rounded-lg"
                loading="lazy"
              />
            ) : (
              <Package className="h-6 w-6 text-zinc-400 dark:text-zinc-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
              {product.name}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
              {product.sku}
            </p>
            {product.category && (
              <Badge variant="outline" className="text-xs mt-1">
                {product.category.name}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="text-right flex-shrink-0">
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">
            {formatCurrency(product.sale_price)}
          </p>
          <p className={`text-sm ${
            (product.stock_quantity || 0) === 0 
              ? 'text-red-600 dark:text-red-400' 
              : (product.stock_quantity || 0) <= (product.min_stock || 5)
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-emerald-600 dark:text-emerald-400'
          }`}>
            Stock: {product.stock_quantity || 0}
          </p>
        </div>

        {showActions && (
          <div className="flex items-center gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => actions.viewProduct(product.id)}
              className="h-8 w-8 p-0"
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => actions.editProduct(product)}
              className="h-8 w-8 p-0"
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-8">
      {/* Modern Metrics */}
      <ModernProductsMetrics />

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Productos Recientes */}
        <Card className="border-border/40 dark:border-white/5 bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-900/50 dark:to-zinc-950/50 backdrop-blur-xl shadow-md">
          <CardHeader className="border-b border-border/40 dark:border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Productos Recientes
                </CardTitle>
                <CardDescription>
                  Últimos productos agregados
                </CardDescription>
              </div>
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                {recentProducts.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto mb-3 text-zinc-400 dark:text-zinc-600" />
                <p className="text-zinc-600 dark:text-zinc-400">No hay productos recientes</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40 dark:divide-white/5">
                <AnimatePresence>
                  {recentProducts.map((product: any, index) => (
                    <div key={product.id} className="p-4">
                      <ProductCard product={product} index={index} showActions />
                    </div>
                  ))}
                </AnimatePresence>
              </div>
            )}
            {recentProducts.length > 0 && (
              <div className="p-4 border-t border-border/40 dark:border-white/5">
                <Button
                  variant="outline"
                  onClick={() => actions.setActiveTab('products')}
                  className="w-full"
                >
                  Ver todos los productos
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock Bajo */}
        <Card className="border-border/40 dark:border-white/5 bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-900/50 dark:to-zinc-950/50 backdrop-blur-xl shadow-md">
          <CardHeader className="border-b border-border/40 dark:border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  Stock Bajo
                </CardTitle>
                <CardDescription>
                  Productos que necesitan reposición
                </CardDescription>
              </div>
              <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                {lowStockProducts.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {lowStockProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto mb-3 text-zinc-400 dark:text-zinc-600" />
                <p className="text-zinc-600 dark:text-zinc-400">No hay productos con stock bajo</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40 dark:divide-white/5">
                <AnimatePresence>
                  {lowStockProducts.map((product: any, index) => (
                    <div key={product.id} className="p-4">
                      <ProductCard product={product} index={index} showActions />
                    </div>
                  ))}
                </AnimatePresence>
              </div>
            )}
            {lowStockProducts.length > 0 && (
              <div className="p-4 border-t border-border/40 dark:border-white/5">
                <Button
                  variant="outline"
                  onClick={() => {
                    actions.updateFilters({ stockStatus: 'low_stock' });
                    actions.setActiveTab('products');
                  }}
                  className="w-full"
                >
                  Ver todos con stock bajo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sin Stock */}
        <Card className="border-border/40 dark:border-white/5 bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-900/50 dark:to-zinc-950/50 backdrop-blur-xl shadow-md">
          <CardHeader className="border-b border-border/40 dark:border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-red-600 dark:text-red-400" />
                  Sin Stock
                </CardTitle>
                <CardDescription>
                  Productos agotados
                </CardDescription>
              </div>
              <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                {outOfStockProducts.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {outOfStockProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto mb-3 text-zinc-400 dark:text-zinc-600" />
                <p className="text-zinc-600 dark:text-zinc-400">No hay productos sin stock</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40 dark:divide-white/5">
                <AnimatePresence>
                  {outOfStockProducts.map((product: any, index) => (
                    <div key={product.id} className="p-4">
                      <ProductCard product={product} index={index} showActions />
                    </div>
                  ))}
                </AnimatePresence>
              </div>
            )}
            {outOfStockProducts.length > 0 && (
              <div className="p-4 border-t border-border/40 dark:border-white/5">
                <Button
                  variant="outline"
                  onClick={() => {
                    actions.updateFilters({ stockStatus: 'out_of_stock' });
                    actions.setActiveTab('products');
                  }}
                  className="w-full"
                >
                  Ver todos sin stock
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
