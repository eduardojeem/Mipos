import React from 'react';
import { AlertTriangle, Package, PackageX, TrendingDown } from 'lucide-react';

interface StockIndicatorProps {
  stock: number;
  minimumStock?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'bar' | 'icon';
  className?: string;
}

export const StockIndicator: React.FC<StockIndicatorProps> = ({
  stock,
  minimumStock = 0,
  showLabel = true,
  size = 'md',
  variant = 'badge',
  className = ''
}) => {
  // Determinar el estado del stock
  const getStockStatus = () => {
    if (stock === 0) return 'out-of-stock';
    if (stock <= minimumStock) return 'low-stock';
    if (stock <= minimumStock * 2) return 'warning';
    return 'in-stock';
  };

  const status = getStockStatus();

  // Configuraciones de estilo según el tamaño
  const sizeClasses = {
    sm: {
      badge: 'px-1.5 py-0.5 text-xs',
      bar: 'h-1',
      icon: 'w-3 h-3',
      text: 'text-xs'
    },
    md: {
      badge: 'px-2 py-1 text-sm',
      bar: 'h-2',
      icon: 'w-4 h-4',
      text: 'text-sm'
    },
    lg: {
      badge: 'px-3 py-1.5 text-base',
      bar: 'h-3',
      icon: 'w-5 h-5',
      text: 'text-base'
    }
  };

  // Configuraciones de color según el estado
  const statusConfig = {
    'out-of-stock': {
      badge: 'bg-red-100 text-red-800 border-red-200',
      bar: 'bg-red-500',
      icon: PackageX,
      iconColor: 'text-red-500',
      label: 'Sin stock'
    },
    'low-stock': {
      badge: 'bg-orange-100 text-orange-800 border-orange-200',
      bar: 'bg-orange-500',
      icon: AlertTriangle,
      iconColor: 'text-orange-500',
      label: 'Stock bajo'
    },
    'warning': {
      badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      bar: 'bg-yellow-500',
      icon: TrendingDown,
      iconColor: 'text-yellow-500',
      label: 'Advertencia'
    },
    'in-stock': {
      badge: 'bg-green-100 text-green-800 border-green-200',
      bar: 'bg-green-500',
      icon: Package,
      iconColor: 'text-green-500',
      label: 'En stock'
    }
  };

  const config = statusConfig[status];
  const sizes = sizeClasses[size];

  // Calcular porcentaje para la barra
  const getStockPercentage = () => {
    if (minimumStock === 0) return stock > 0 ? 100 : 0;
    const maxStock = minimumStock * 3; // Asumimos que el stock máximo es 3x el mínimo
    return Math.min((stock / maxStock) * 100, 100);
  };

  const IconComponent = config.icon;

  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center gap-1 rounded-full border ${config.badge} ${sizes.badge} ${className}`}>
        <IconComponent className={sizes.icon} />
        {showLabel && (
          <span className="font-medium">
            {stock} {stock === 1 ? 'unidad' : 'unidades'}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'bar') {
    return (
      <div className={`w-full ${className}`}>
        {showLabel && (
          <div className={`flex justify-between items-center mb-1 ${sizes.text}`}>
            <span className="font-medium">Stock: {stock}</span>
            <span className={`${config.iconColor} font-medium`}>
              {config.label}
            </span>
          </div>
        )}
        <div className={`w-full bg-gray-200 rounded-full ${sizes.bar}`}>
          <div
            className={`${config.bar} ${sizes.bar} rounded-full transition-all duration-300`}
            style={{ width: `${getStockPercentage()}%` }}
          />
        </div>
        {minimumStock > 0 && (
          <div className={`text-xs text-gray-500 mt-1`}>
            Mínimo: {minimumStock}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center gap-1 ${className}`}>
        <IconComponent className={`${sizes.icon} ${config.iconColor}`} />
        {showLabel && (
          <span className={`${sizes.text} font-medium`}>
            {stock}
          </span>
        )}
      </div>
    );
  }

  return null;
};

// Componente para mostrar múltiples indicadores de stock
interface StockSummaryProps {
  totalProducts: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  className?: string;
}

export const StockSummary: React.FC<StockSummaryProps> = ({
  totalProducts,
  inStock,
  lowStock,
  outOfStock,
  className = ''
}) => {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-2 ${className}`}>
      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-blue-600" />
          <div>
            <div className="text-lg font-bold text-blue-900">{totalProducts}</div>
            <div className="text-xs text-blue-600">Total</div>
          </div>
        </div>
      </div>

      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-green-600" />
          <div>
            <div className="text-lg font-bold text-green-900">{inStock}</div>
            <div className="text-xs text-green-600">En Stock</div>
          </div>
        </div>
      </div>

      <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          <div>
            <div className="text-lg font-bold text-orange-900">{lowStock}</div>
            <div className="text-xs text-orange-600">Stock Bajo</div>
          </div>
        </div>
      </div>

      <div className="bg-red-50 p-3 rounded-lg border border-red-200">
        <div className="flex items-center gap-2">
          <PackageX className="w-4 h-4 text-red-600" />
          <div>
            <div className="text-lg font-bold text-red-900">{outOfStock}</div>
            <div className="text-xs text-red-600">Sin Stock</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockIndicator;