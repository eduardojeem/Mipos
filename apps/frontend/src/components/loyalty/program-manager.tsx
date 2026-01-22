'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Settings, 
  Trophy,
  Star,
  Target,
  Gift,
  Users,
  Calendar,
  Percent,
  DollarSign
} from 'lucide-react';
import { useLoyaltyPrograms, LoyaltyProgram } from '@/hooks/use-loyalty';

interface ProgramManagerProps {
  className?: string;
}

export function ProgramManager({ className }: ProgramManagerProps) {
  const { data: programs, isLoading, error } = useLoyaltyPrograms();
  const [selectedProgram, setSelectedProgram] = useState<LoyaltyProgram | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Datos mock mientras se implementa la API
  const mockPrograms: LoyaltyProgram[] = [
    {
      id: '1',
      name: 'Programa VIP',
      description: 'Programa principal de lealtad con sistema de puntos y tiers',
      pointsPerPurchase: 1,
      minimumPurchase: 0,
      welcomeBonus: 100,
      birthdayBonus: 50,
      referralBonus: 25,
      pointsExpirationDays: 365,
      isActive: true,
      createdAt: '2024-01-15',
      updatedAt: '2024-03-10'
    },
    {
      id: '2',
      name: 'Cashback Plus',
      description: 'Programa de devolución de dinero para compras frecuentes',
      pointsPerPurchase: 2,
      minimumPurchase: 50,
      welcomeBonus: 200,
      birthdayBonus: 100,
      referralBonus: 50,
      pointsExpirationDays: 90,
      isActive: true,
      createdAt: '2024-02-01',
      updatedAt: '2024-03-05'
    },
    {
      id: '3',
      name: 'Visitas Frecuentes',
      description: 'Programa basado en número de visitas a la tienda',
      pointsPerPurchase: 1,
      minimumPurchase: 0,
      welcomeBonus: 50,
      birthdayBonus: 25,
      referralBonus: 10,
      pointsExpirationDays: 180,
      isActive: false,
      createdAt: '2024-03-01',
      updatedAt: '2024-03-01'
    }
  ];

  const currentPrograms = programs || mockPrograms;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'points': return <Star className="h-4 w-4" />;
      case 'tiers': return <Trophy className="h-4 w-4" />;
      case 'cashback': return <DollarSign className="h-4 w-4" />;
      case 'visits': return <Target className="h-4 w-4" />;
      default: return <Gift className="h-4 w-4" />;
    }
  };

  const ProgramForm = ({ program, onSave, onCancel }: {
    program?: LoyaltyProgram;
    onSave: (program: Partial<LoyaltyProgram>) => void;
    onCancel: () => void;
  }) => {
    const [formData, setFormData] = useState({
      name: program?.name || '',
      description: program?.description || '',
      pointsPerPurchase: program?.pointsPerPurchase || 1,
      minimumPurchase: program?.minimumPurchase || 0,
      welcomeBonus: program?.welcomeBonus || 0,
      birthdayBonus: program?.birthdayBonus || 0,
      referralBonus: program?.referralBonus || 0,
      pointsExpirationDays: program?.pointsExpirationDays || 365,
      isActive: program?.isActive || false
    });

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Programa</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Programa VIP"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="isActive">Estado Activo</Label>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">{formData.isActive ? 'Activo' : 'Inactivo'}</Label>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe el programa de lealtad..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pointsPerPurchase">Puntos por Compra</Label>
            <Input
              id="pointsPerPurchase"
              type="number"
              step="1"
              value={formData.pointsPerPurchase}
              onChange={(e) => setFormData({ ...formData, pointsPerPurchase: parseInt(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minimumPurchase">Compra Mínima</Label>
            <Input
              id="minimumPurchase"
              type="number"
              value={formData.minimumPurchase}
              onChange={(e) => setFormData({ ...formData, minimumPurchase: parseInt(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="welcomeBonus">Bono de Bienvenida</Label>
            <Input
              id="welcomeBonus"
              type="number"
              value={formData.welcomeBonus}
              onChange={(e) => setFormData({ ...formData, welcomeBonus: parseInt(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pointsExpirationDays">Días de Expiración</Label>
            <Input
              id="pointsExpirationDays"
              type="number"
              value={formData.pointsExpirationDays}
              onChange={(e) => setFormData({ ...formData, pointsExpirationDays: parseInt(e.target.value) })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="birthdayBonus">Bono de Cumpleaños</Label>
            <Input
              id="birthdayBonus"
              type="number"
              value={formData.birthdayBonus}
              onChange={(e) => setFormData({ ...formData, birthdayBonus: parseInt(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="referralBonus">Bono de Referido</Label>
            <Input
              id="referralBonus"
              type="number"
              value={formData.referralBonus}
              onChange={(e) => setFormData({ ...formData, referralBonus: parseInt(e.target.value) })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={() => onSave(formData)}>
            {program ? 'Actualizar' : 'Crear'} Programa
          </Button>
        </DialogFooter>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <p className="text-red-600">Error al cargar los programas de lealtad</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Programas de Lealtad</h2>
          <p className="text-muted-foreground">Gestiona y configura tus programas de lealtad</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Programa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Programa</DialogTitle>
              <DialogDescription>
                Configura un nuevo programa de lealtad para tus clientes
              </DialogDescription>
            </DialogHeader>
            <ProgramForm
              onSave={(data) => {
                console.log('Crear programa:', data);
                setIsCreateDialogOpen(false);
              }}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Programs List */}
      <div className="grid gap-6">
        {currentPrograms.map((program) => (
          <Card key={program.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    {getTypeIcon('points')}
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {program.name}
                      <Badge className={getStatusColor(program.isActive ? 'active' : 'inactive')}>
                        {program.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{program.description}</CardDescription>
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
                      setSelectedProgram(program);
                      setIsEditDialogOpen(true);
                    }}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="h-4 w-4 mr-2" />
                      Configurar
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Resumen</TabsTrigger>
                  <TabsTrigger value="tiers">Niveles</TabsTrigger>
                  <TabsTrigger value="rewards">Recompensas</TabsTrigger>
                  <TabsTrigger value="settings">Configuración</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <Users className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                      <div className="text-2xl font-bold">0</div>
                      <div className="text-sm text-muted-foreground">Miembros</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <Star className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
                      <div className="text-2xl font-bold">{program.pointsPerPurchase}</div>
                      <div className="text-sm text-muted-foreground">Puntos/Compra</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <DollarSign className="h-6 w-6 mx-auto mb-2 text-green-600" />
                      <div className="text-2xl font-bold">${program.minimumPurchase}</div>
                      <div className="text-sm text-muted-foreground">Compra Mín.</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <Calendar className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                      <div className="text-2xl font-bold">{program.pointsExpirationDays || 'N/A'}</div>
                      <div className="text-sm text-muted-foreground">Días</div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="tiers" className="space-y-4">
                  {false ? ( // program.tiers.length > 0
                    <div className="space-y-3">
                      {/* {program.tiers.map((tier, index) => ( */}
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Trophy className="h-5 w-5 text-yellow-600" />
                            <div>
                              <div className="font-medium">Placeholder Tier</div>
                              <div className="text-sm text-muted-foreground">
                                Desde 0 puntos • Multiplicador 1x
                              </div>
                            </div>
                          </div>
                        </div>
                      {/* ))} */}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No hay niveles configurados para este programa
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="rewards" className="space-y-4">
                  {/* Rewards section commented out as LoyaltyProgram from hook doesn't have rewards property */}
                  <div className="text-center py-8 text-muted-foreground">
                    No hay recompensas configuradas para este programa
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Programa Activo</div>
                        <div className="text-sm text-muted-foreground">
                          Los clientes pueden unirse y ganar puntos
                        </div>
                      </div>
                      <Switch checked={program.isActive} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Notificaciones Automáticas</div>
                        <div className="text-sm text-muted-foreground">
                          Enviar emails sobre puntos y recompensas
                        </div>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Puntos por Referidos</div>
                        <div className="text-sm text-muted-foreground">
                          Otorgar puntos por referir nuevos clientes
                        </div>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Programa</DialogTitle>
            <DialogDescription>
              Modifica la configuración del programa de lealtad
            </DialogDescription>
          </DialogHeader>
          {selectedProgram && (
            <ProgramForm
              program={selectedProgram}
              onSave={(data) => {
                console.log('Actualizar programa:', data);
                setIsEditDialogOpen(false);
                setSelectedProgram(null);
              }}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setSelectedProgram(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}