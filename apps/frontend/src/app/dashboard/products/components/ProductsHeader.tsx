'use client';

import { Upload, Download, RefreshCw, Plus, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { useRouter } from 'next/navigation';
import { sanitizeImageUrl } from '@/lib/validation/image-url';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { useHasPermission } from '@/hooks/use-permissions';
import { useProducts } from '../contexts/ProductsContext';
import { ConnectionStatus } from './ConnectionStatus';
import { PerformancePanel } from './PerformancePanel';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useState } from 'react';
import { Activity } from 'lucide-react';
import { ProductsThemeToggle } from './ProductsThemeToggle';

// Dynamic imports for heavy components
const NotificationCenter = dynamic(() => import('./NotificationCenter'), { ssr: false });
const BulkImportDialog = dynamic(() => import('./BulkImportDialog').then(m => ({ default: m.default })), { ssr: false });
const AdvancedExportDialog = dynamic(() => import('./AdvancedExportDialog').then(m => ({ default: m.AdvancedExportDialog })), { ssr: false });

export function ProductsHeader() {
  const router = useRouter();
  const { config } = useBusinessConfig();
  const { hasPermission: canExportProduct } = useHasPermission('products', 'export');
  const { hasPermission: canImportProduct } = useHasPermission('products', 'write');
  const { products, categories, actions, computed } = useProducts();
  
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showPerformancePanel, setShowPerformancePanel] = useState(false);

  const handleImportComplete = (result: any) => {
    // Refresh products after import
    actions.refetch();
    toast.success(`Importación completada: ${result.imported} productos procesados`);
    setShowImportDialog(false);
  };

  const handleExportComplete = (result: any) => {
    toast.success(`Exportación completada: ${result.exported} productos exportados`);
    setShowExportDialog(false);
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-400 dark:to-purple-500 rounded-lg flex items-center justify-center overflow-hidden relative logo-container shadow-lg dark:shadow-blue-500/30">
            {config.branding?.logo ? (
              <Image 
                src={sanitizeImageUrl(config.branding.logo)}
                alt="Logo" 
                width={32}
                height={32}
                className="object-contain bg-white" 
                priority
              />
            ) : (
              <ShoppingCart className="w-5 h-5 text-white" />
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight business-name text-gray-900 dark:text-white">
            {config.businessName || 'BeautyPOS'}
          </h1>
        </div>
        <div className="flex items-center space-x-3">
          <p className="text-muted-foreground tagline dark:text-gray-300">
            {config.tagline || 'Sistema de Cosméticos'} · Gestión de Productos
          </p>
          <ConnectionStatus />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPerformancePanel(true)}
            className="h-6 px-2 text-xs"
          >
            <Activity className="w-3 h-3 mr-1" />
            Performance
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* Theme Toggle */}
        <ProductsThemeToggle />
        
        {/* Notification Center - Fully integrated */}
        <NotificationCenter />
        
        {/* Import functionality */}
        {canImportProduct && (
          <Button 
            variant="outline" 
            onClick={() => setShowImportDialog(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>
        )}
        
        {/* Export functionality */}
        {canExportProduct && (
          <Button 
            variant="outline"
            onClick={() => setShowExportDialog(true)}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        )}
        
        <Button variant="outline" onClick={actions.refetch}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
        
        <Button onClick={() => router.push('/dashboard/products/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Producto
        </Button>
      </div>

      {/* Import Dialog */}
      <BulkImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImportComplete={handleImportComplete}
      />

      {/* Export Dialog */}
      <AdvancedExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
      />

      {/* Performance Panel */}
      <PerformancePanel
        isOpen={showPerformancePanel}
        onClose={() => setShowPerformancePanel(false)}
      />
    </div>
  );
}
