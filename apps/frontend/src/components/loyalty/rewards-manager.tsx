'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  Edit, 
  Trash2, 
  MoreHorizontal, 
  Gift,
  Percent,
  Package,
  Truck,
  Star,
  TrendingUp,
  Users,
  Calendar,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAvailableRewards } from '@/hooks/use-loyalty';

interface Reward {
  id: string;
  name: string;
  description: string;
  type: 'discount' | 'freeProduct' | 'freeShipping' | 'cashback' | 'experience';
  pointsCost: number;
  value: number; // Valor del descuento, precio del producto, etc.
  conditions: {
    minimumSpend?: number;
    validUntil?: string;
    maxUses?: number;
    tierRequired?: string;
  };
  status: 'active' | 'inactive' | 'expired';
  totalRedemptions: number;
  availableQuantity?: number;
  createdAt: string;
  updatedAt: string;
}

interface RewardsManagerProps {
  className?: string;
}

export function RewardsManager({ className }: RewardsManagerProps) {
  // Using mock data since useAvailableRewards requires programId parameter
  // const { data: rewards, isLoading, error } = useAvailableRewards('program-id');
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Datos mock mientras se implementa la API
  const mockRewards: Reward[] = [
    {
      id: '1',
      name: '10% de Descuento',
      description: 'Descuento del 10% en tu próxima compra',
      type: 'discount',
      pointsCost: 100,
      value: 10,
      conditions: {
        minimumSpend: 50,
        validUntil: '2024-12-31',
        maxUses: 1000
      },
      status: 'active',
      totalRedemptions: 234,
      createdAt: '2024-01-15',
      updatedAt: '2024-03-10'
    },
    {
      id: '2',
      name: 'Envío Gratis',
      description: 'Envío gratuito en tu próximo pedido',
      type: 'freeShipping',
      pointsCost: 200,
      value: 15,
      conditions: {
        minimumSpend: 30,
        validUntil: '2024-12-31'
      },
      status: 'active',
      totalRedemptions: 123,
      createdAt: '2024-01-20',
      updatedAt: '2024-03-05'
    },
    {
      id: '3',
      name: 'Producto Premium Gratis',
      description: 'Llévate gratis nuestro producto estrella',
      type: 'freeProduct',
      pointsCost: 500,
      value: 25,
      conditions: {
        validUntil: '2024-06-30',
        maxUses: 50,
        tierRequired: 'gold'
      },
      status: 'active',
      totalRedemptions: 45,
      availableQuantity: 25,
      createdAt: '2024-02-01',
      updatedAt: '2024-03-01'
    },
    {
      id: '4',
      name: 'Cashback 5%',
      description: 'Recibe 5% de cashback en tu compra',
      type: 'cashback',
      pointsCost: 300,
      value: 5,
      conditions: {
        minimumSpend: 100,
        validUntil: '2024-05-31'
      },
      status: 'inactive',
      totalRedemptions: 67,
      createdAt: '2024-01-10',
      updatedAt: '2024-02-15'
    },
    {
      id: '5',
      name: 'Experiencia VIP',
      description: 'Acceso exclusivo a evento VIP',
      type: 'experience',
      pointsCost: 1000,
      value: 100,
      conditions: {
        validUntil: '2024-04-30',
        maxUses: 20,
        tierRequired: 'gold'
      },
      status: 'active',
      totalRedemptions: 8,
      availableQuantity: 12,
      createdAt: '2024-03-01',
      updatedAt: '2024-03-01'
    }
  ];

  const currentRewards = mockRewards;

  const filteredRewards = currentRewards.filter(reward => {
    const typeMatch = filterType === 'all' || reward.type === filterType;
    const statusMatch = filterStatus === 'all' || reward.status === filterStatus;
    return typeMatch && statusMatch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'discount': return <Percent className="h-4 w-4" />;
      case 'freeProduct': return <Package className="h-4 w-4" />;
      case 'freeShipping': return <Truck className="h-4 w-4" />;
      case 'cashback': return <TrendingUp className="h-4 w-4" />;
      case 'experience': return <Star className="h-4 w-4" />;
      default: return <Gift className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'discount': return 'Descuento';
      case 'freeProduct': return 'Producto Gratis';
      case 'freeShipping': return 'Envío Gratis';
      case 'cashback': return 'Cashback';
      case 'experience': return 'Experiencia';
      default: return 'Otro';
    }
  };

  const RewardForm = ({ reward, onSave, onCancel }: {
    reward?: Reward;
    onSave: (reward: Partial<Reward>) => void;
    onCancel: () => void;
  }) => {
    const [formData, setFormData] = useState({
      name: reward?.name || '',
      description: reward?.description || '',
      type: reward?.type || 'discount',
      pointsCost: reward?.pointsCost || 100,
      value: reward?.value || 10,
      minimumSpend: reward?.conditions.minimumSpend || 0,
      validUntil: reward?.conditions.validUntil || '',
      maxUses: reward?.conditions.maxUses || 0,
      tierRequired: reward?.conditions.tierRequired || '',
      availableQuantity: reward?.availableQuantity || 0,
      status: reward?.status || 'active'
    });

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la Recompensa</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: 10% de Descuento"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Tipo de Recompensa</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as any })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="discount">Descuento</SelectItem>
                <SelectItem value="freeProduct">Producto Gratis</SelectItem>
                <SelectItem value="freeShipping">Envío Gratis</SelectItem>
                <SelectItem value="cashback">Cashback</SelectItem>
                <SelectItem value="experience">Experiencia</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe la recompensa..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pointsCost">Costo en Puntos</Label>
            <Input
              id="pointsCost"
              type="number"
              value={formData.pointsCost}
              onChange={(e) => setFormData({ ...formData, pointsCost: parseInt(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="value">
              Valor {formData.type === 'discount' || formData.type === 'cashback' ? '(%)' : '($)'}
            </Label>
            <Input
              id="value"
              type="number"
              step={formData.type === 'discount' || formData.type === 'cashback' ? '0.1' : '1'}
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="minimumSpend">Gasto Mínimo ($)</Label>
            <Input
              id="minimumSpend"
              type="number"
              value={formData.minimumSpend}
              onChange={(e) => setFormData({ ...formData, minimumSpend: parseInt(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="validUntil">Válido Hasta</Label>
            <Input
              id="validUntil"
              type="date"
              value={formData.validUntil}
              onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="maxUses">Usos Máximos</Label>
            <Input
              id="maxUses"
              type="number"
              value={formData.maxUses}
              onChange={(e) => setFormData({ ...formData, maxUses: parseInt(e.target.value) })}
              placeholder="0 = ilimitado"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tierRequired">Tier Requerido</Label>
            <Select value={formData.tierRequired} onValueChange={(value) => setFormData({ ...formData, tierRequired: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Ninguno" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ninguno</SelectItem>
                <SelectItem value="bronze">Bronze</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {(formData.type === 'freeProduct' || formData.type === 'experience') && (
          <div className="space-y-2">
            <Label htmlFor="availableQuantity">Cantidad Disponible</Label>
            <Input
              id="availableQuantity"
              type="number"
              value={formData.availableQuantity}
              onChange={(e) => setFormData({ ...formData, availableQuantity: parseInt(e.target.value) })}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="status">Estado</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as any })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="inactive">Inactivo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={() => onSave(formData)}>
            {reward ? 'Actualizar' : 'Crear'} Recompensa
          </Button>
        </DialogFooter>
      </div>
    );
  };

  // Remove loading state since we're using mock data
  // if (isLoading) {
  //   return (
  //     <div className={`space-y-4 ${className}`}>
  //       {[...Array(3)].map((_, i) => (
  //         <Card key={i}>
  //           <CardHeader className="animate-pulse">
  //             <div className="h-4 bg-gray-200 rounded w-3/4"></div>
  //             <div className="h-3 bg-gray-200 rounded w-1/2"></div>
  //           </CardHeader>
  //         </Card>
  //       ))}
  //     </div>
  //   );
  // }

  // Remove error state since we're using mock data
  // if (error) {
  //   return (
  //     <Card className={className}>
  //       <CardContent className="p-6">
  //         <p className="text-red-600">Error al cargar las recompensas</p>
  //       </CardContent>
  //     </Card>
  //   );
  // }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Recompensas</h2>
          <p className="text-muted-foreground">Configura y administra las recompensas disponibles</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Recompensa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nueva Recompensa</DialogTitle>
              <DialogDescription>
                Configura una nueva recompensa para el programa de lealtad
              </DialogDescription>
            </DialogHeader>
            <RewardForm
              onSave={(data) => {
                console.log('Crear recompensa:', data);
                setIsCreateDialogOpen(false);
              }}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="discount">Descuentos</SelectItem>
            <SelectItem value="freeProduct">Productos Gratis</SelectItem>
            <SelectItem value="freeShipping">Envío Gratis</SelectItem>
            <SelectItem value="cashback">Cashback</SelectItem>
            <SelectItem value="experience">Experiencias</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
            <SelectItem value="expired">Expirados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Rewards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredRewards.map((reward) => (
          <Card key={reward.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    {getTypeIcon(reward.type)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{reward.name}</CardTitle>
                    <Badge className={getStatusColor(reward.status)}>
                      {reward.status === 'active' ? 'Activo' : 
                       reward.status === 'inactive' ? 'Inactivo' : 'Expirado'}
                    </Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      setSelectedReward(reward);
                      setIsEditDialogOpen(true);
                    }}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      {reward.status === 'active' ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-2" />
                          Desactivar
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Activar
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <CardDescription>{reward.description}</CardDescription>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Tipo:</span>
                  <Badge variant="outline">{getTypeLabel(reward.type)}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Costo:</span>
                  <span className="font-medium">{reward.pointsCost} puntos</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Valor:</span>
                  <span className="font-medium">
                    {reward.type === 'discount' || reward.type === 'cashback' 
                      ? `${reward.value}%` 
                      : `$${reward.value}`}
                  </span>
                </div>
                {reward.conditions.minimumSpend && (
                  <div className="flex justify-between text-sm">
                    <span>Gasto mínimo:</span>
                    <span className="font-medium">${reward.conditions.minimumSpend}</span>
                  </div>
                )}
                {reward.availableQuantity !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span>Disponibles:</span>
                    <span className="font-medium">{reward.availableQuantity}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{reward.totalRedemptions} canjes</span>
                  </div>
                  {reward.conditions.validUntil && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Hasta {new Date(reward.conditions.validUntil).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRewards.length === 0 && (
        <div className="text-center py-12">
          <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No hay recompensas</h3>
          <p className="text-muted-foreground mb-4">
            No se encontraron recompensas con los filtros seleccionados
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Crear Primera Recompensa
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Recompensa</DialogTitle>
            <DialogDescription>
              Modifica la configuración de la recompensa
            </DialogDescription>
          </DialogHeader>
          {selectedReward && (
            <RewardForm
              reward={selectedReward}
              onSave={(data) => {
                console.log('Actualizar recompensa:', data);
                setIsEditDialogOpen(false);
                setSelectedReward(null);
              }}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setSelectedReward(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}