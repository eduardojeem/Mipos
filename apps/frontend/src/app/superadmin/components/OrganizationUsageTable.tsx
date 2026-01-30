'use client';

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { 
  Database, 
  HardDrive, 
  Activity, 
  Settings2,
  AlertTriangle,
  Search,
  ArrowUpDown
} from 'lucide-react';
import { Organization } from '../hooks/useAdminData';
import { Card, CardContent } from '@/components/ui/card';

// Eliminado: no usar datos mock

interface OrganizationUsageTableProps {
  organizations: Organization[];
  onUpdateLimits?: (id: string, limits: any) => Promise<void>;
  usageByOrg?: Record<string, {
    db_size_mb: number;
    storage_size_mb: number;
    bandwidth_mb: number;
  }>;
}

export function OrganizationUsageTable({
  organizations,
  onUpdateLimits,
  usageByOrg,
}: OrganizationUsageTableProps) {
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isLimitDialogOpen, setIsLimitDialogOpen] = useState(false);
  const [limits, setLimits] = useState({
    dbSizeLimit: 1000,
    storageSizeLimit: 5000,
    bandwidthLimit: 10000,
  });
  const [sortBy, setSortBy] = useState<string>('db_usage');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filter, setFilter] = useState('');

  const handleOpenLimits = (org: Organization) => {
    setSelectedOrg(org);
    // Extract limits from settings or use defaults
    const orgLimits = (org.settings as any)?.limits || {};
    setLimits({
      dbSizeLimit: orgLimits.db_size_mb || 1000,
      storageSizeLimit: orgLimits.storage_size_mb || 5000,
      bandwidthLimit: orgLimits.bandwidth_mb || 10000,
    });
    setIsLimitDialogOpen(true);
  };

  const handleSaveLimits = async () => {
    if (!selectedOrg || !onUpdateLimits) return;
    
    await onUpdateLimits(selectedOrg.id, {
      db_size_mb: limits.dbSizeLimit,
      storage_size_mb: limits.storageSizeLimit,
      bandwidth_mb: limits.bandwidthLimit,
    });
    
    setIsLimitDialogOpen(false);
    setSelectedOrg(null);
  };

  // Enhance organizations with usage data
  const enhancedOrgs = organizations.map(org => {
    const orgSettings = (org.settings as any) || {};
    const orgLimits = orgSettings.limits || {};
    const computed = usageByOrg?.[org.id];

    const dbSize = computed?.db_size_mb ?? orgSettings.usage?.db_size_mb ?? null;
    const storageSize = computed?.storage_size_mb ?? orgSettings.usage?.storage_size_mb ?? null;
    const bandwidth = computed?.bandwidth_mb ?? orgSettings.usage?.bandwidth_mb ?? null;

    const dbLimit = orgLimits.db_size_mb || 1000;
    const storageLimit = orgLimits.storage_size_mb || 5000;
    const bandwidthLimit = orgLimits.bandwidth_mb || 10000;

    return {
      ...org,
      usage: {
        dbSize,
        storageSize,
        bandwidth,
        dbPercentage: dbSize !== null ? (dbSize / dbLimit) * 100 : 0,
        storagePercentage: storageSize !== null ? (storageSize / storageLimit) * 100 : 0,
        bandwidthPercentage: bandwidth !== null ? (bandwidth / bandwidthLimit) * 100 : 0,
      },
      limits: {
        dbLimit,
        storageLimit,
        bandwidthLimit
      }
    };
  });

  const filteredOrgs = enhancedOrgs.filter(org => 
    org.name.toLowerCase().includes(filter.toLowerCase()) || 
    org.slug.toLowerCase().includes(filter.toLowerCase())
  );

  const sortedOrgs = [...filteredOrgs].sort((a, b) => {
    let aVal, bVal;
    
    switch (sortBy) {
      case 'name':
        aVal = a.name;
        bVal = b.name;
        break;
      case 'db_usage':
        aVal = a.usage.dbPercentage;
        bVal = b.usage.dbPercentage;
        break;
      case 'storage_usage':
        aVal = a.usage.storagePercentage;
        bVal = b.usage.storagePercentage;
        break;
      case 'bandwidth_usage':
        aVal = a.usage.bandwidthPercentage;
        bVal = b.usage.bandwidthPercentage;
        break;
      default:
        return 0;
    }

    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar organización..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="rounded-md border bg-white dark:bg-slate-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">
                <Button variant="ghost" size="sm" onClick={() => handleSort('name')}>
                  Organización <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort('db_usage')}>
                  Base de Datos <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort('storage_usage')}>
                  Almacenamiento <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size="sm" onClick={() => handleSort('bandwidth_usage')}>
                  Ancho de Banda <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedOrgs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No hay organizaciones que coincidan.
                </TableCell>
              </TableRow>
            ) : (
              sortedOrgs.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">
                    <div>{org.name}</div>
                    <div className="text-xs text-muted-foreground">{org.slug}</div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>{org.usage.dbSize !== null ? `${org.usage.dbSize.toFixed(1)} MB` : '—'}</span>
                        <span className="text-muted-foreground">/ {org.limits.dbLimit} MB</span>
                      </div>
                      <Progress 
                        value={Math.min(org.usage.dbPercentage, 100)} 
                        className={`h-2 [&>div]:${getUsageColor(org.usage.dbPercentage)}`}
                      />
                      {org.usage.dbSize !== null && org.usage.dbPercentage > 100 && (
                        <Badge variant="outline" className="mt-1 text-xs bg-red-50 text-red-700 border-red-200">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Exceso de límite
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>{org.usage.storageSize !== null ? `${org.usage.storageSize.toFixed(1)} MB` : '—'}</span>
                        <span className="text-muted-foreground">/ {org.limits.storageLimit} MB</span>
                      </div>
                      <Progress 
                        value={Math.min(org.usage.storagePercentage, 100)}
                        className={`h-2 [&>div]:${getUsageColor(org.usage.storagePercentage)}`} 
                      />
                      {org.usage.storageSize !== null && org.usage.storagePercentage > 100 && (
                        <Badge variant="outline" className="mt-1 text-xs bg-red-50 text-red-700 border-red-200">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Exceso de límite
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>{org.usage.bandwidth !== null ? `${org.usage.bandwidth.toFixed(1)} MB` : '—'}</span>
                        <span className="text-muted-foreground">/ {org.limits.bandwidthLimit} MB</span>
                      </div>
                      <Progress 
                        value={Math.min(org.usage.bandwidthPercentage, 100)}
                        className={`h-2 [&>div]:${getUsageColor(org.usage.bandwidthPercentage)}`} 
                      />
                      {org.usage.bandwidth !== null && org.usage.bandwidthPercentage > 100 && (
                        <Badge variant="outline" className="mt-1 text-xs bg-red-50 text-red-700 border-red-200">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Exceso de límite
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleOpenLimits(org)}
                    >
                      <Settings2 className="h-4 w-4 mr-2" />
                      Límites
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isLimitDialogOpen} onOpenChange={setIsLimitDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Configurar Límites de Datos</DialogTitle>
            <DialogDescription>
              Ajusta los límites de uso para {selectedOrg?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="db-limit" className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Base de Datos (MB)
                  </Label>
                  <span className="text-sm font-mono">{limits.dbSizeLimit} MB</span>
                </div>
                <Slider
                  id="db-limit"
                  min={100}
                  max={10000}
                  step={100}
                  value={[limits.dbSizeLimit]}
                  onValueChange={(vals) => setLimits({...limits, dbSizeLimit: vals[0]})}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="storage-limit" className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4" />
                    Almacenamiento (MB)
                  </Label>
                  <span className="text-sm font-mono">{limits.storageSizeLimit} MB</span>
                </div>
                <Slider
                  id="storage-limit"
                  min={100}
                  max={50000}
                  step={500}
                  value={[limits.storageSizeLimit]}
                  onValueChange={(vals) => setLimits({...limits, storageSizeLimit: vals[0]})}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bandwidth-limit" className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Ancho de Banda (MB)
                  </Label>
                  <span className="text-sm font-mono">{limits.bandwidthLimit} MB</span>
                </div>
                <Slider
                  id="bandwidth-limit"
                  min={500}
                  max={100000}
                  step={1000}
                  value={[limits.bandwidthLimit]}
                  onValueChange={(vals) => setLimits({...limits, bandwidthLimit: vals[0]})}
                />
              </div>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md border border-yellow-200 dark:border-yellow-800 flex items-start gap-3 mt-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                Los cambios en los límites se aplicarán inmediatamente. Si una organización excede los nuevos límites, algunas funciones podrían restringirse.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLimitDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveLimits}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
