'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Settings, 
  Trophy, 
  Gift, 
  Users, 
  BarChart3,
  Plus,
  Edit,
  Trash2,
  Star,
  Crown,
  Target,
  TrendingUp,
  Calendar,
  Award,
  Coins
} from 'lucide-react';
import { 
  useLoyaltyPrograms, 
  useLoyaltyAnalytics,
  LoyaltyProgram,
  LoyaltyTier,
  Reward,
  useCreateLoyaltyProgram,
  useUpdateLoyaltyProgram,
  useCreateLoyaltyTier,
  useCreateReward,
  useLoyaltyTiers,
  useAvailableRewards,
  useEnrollCustomer,
  useUpdateLoyaltyTier,
  useUpdateReward,
  useAdjustPoints,
  useRedeemReward,
  useUseCustomerReward,
  useCustomerRewards
} from '@/hooks/use-loyalty';
import { useConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils';
// import ProgramForm from './program-form';
// import TierForm from './tier-form';
// import RewardForm from './reward-form';

function ProgramForm({ program, onClose }: { program?: LoyaltyProgram | null; onClose: () => void }) {
  const isEdit = !!program
  const [form, setForm] = React.useState({
    name: program?.name || '',
    description: program?.description || '',
    pointsPerPurchase: program?.pointsPerPurchase ?? 1,
    minimumPurchase: program?.minimumPurchase ?? 0,
    welcomeBonus: program?.welcomeBonus ?? 0,
    birthdayBonus: program?.birthdayBonus ?? 0,
    referralBonus: program?.referralBonus ?? 0,
    pointsExpirationDays: (program as any)?.pointsExpirationDays ?? 0,
    isActive: program?.isActive ?? true,
  })
  const createProgram = useCreateLoyaltyProgram()
  const updateProgram = useUpdateLoyaltyProgram()

  const handleSubmit = async () => {
    try {
      if (isEdit && program) {
        await updateProgram.mutateAsync({ id: program.id, program: form as any })
      } else {
        await createProgram.mutateAsync({ ...(form as any) })
      }
      onClose()
    } catch {}
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Editar Programa' : 'Nuevo Programa'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Nombre</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Activo</Label>
            <div className="mt-2"><Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: !!v })} /></div>
          </div>
          <div className="md:col-span-2">
            <Label>Descripción</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <Label>Puntos por compra</Label>
            <Input type="number" value={form.pointsPerPurchase} onChange={(e) => setForm({ ...form, pointsPerPurchase: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Compra mínima</Label>
            <Input type="number" value={form.minimumPurchase} onChange={(e) => setForm({ ...form, minimumPurchase: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Bono bienvenida</Label>
            <Input type="number" value={form.welcomeBonus} onChange={(e) => setForm({ ...form, welcomeBonus: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Bono cumpleaños</Label>
            <Input type="number" value={form.birthdayBonus} onChange={(e) => setForm({ ...form, birthdayBonus: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Bono referidos</Label>
            <Input type="number" value={form.referralBonus} onChange={(e) => setForm({ ...form, referralBonus: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Días expiración puntos</Label>
            <Input type="number" value={form.pointsExpirationDays} onChange={(e) => setForm({ ...form, pointsExpirationDays: Number(e.target.value) })} />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={createProgram.isPending || updateProgram.isPending}>{isEdit ? 'Guardar' : 'Crear'}</Button>
        </div>
      </CardContent>
    </Card>
  )
}

function TierForm({ tier, programId, onClose }: { tier?: LoyaltyTier | null; programId: string; onClose: () => void }) {
  const [form, setForm] = React.useState({
    name: tier?.name || '',
    description: tier?.description || '',
    minPoints: tier?.minPoints ?? 0,
    multiplier: tier?.multiplier ?? 1,
    benefits: tier?.benefits || '',
    color: tier?.color || '',
    isActive: tier?.isActive ?? true,
  })
  const createTier = useCreateLoyaltyTier()

  const handleSubmit = async () => {
    try {
      await createTier.mutateAsync({ programId, tier: form as any })
      onClose()
    } catch {}
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tier ? 'Editar Nivel' : 'Nuevo Nivel'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Nombre</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Activo</Label>
            <div className="mt-2"><Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: !!v })} /></div>
          </div>
          <div className="md:col-span-2">
            <Label>Descripción</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <Label>Puntos mínimos</Label>
            <Input type="number" value={form.minPoints} onChange={(e) => setForm({ ...form, minPoints: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Multiplicador</Label>
            <Input type="number" value={form.multiplier} onChange={(e) => setForm({ ...form, multiplier: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Beneficios</Label>
            <Textarea value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} />
          </div>
          <div>
            <Label>Color</Label>
            <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={createTier.isPending}>Guardar</Button>
        </div>
      </CardContent>
    </Card>
  )
}

function RewardForm({ reward, programId, onClose }: { reward?: Reward | null; programId: string; onClose: () => void }) {
  const [form, setForm] = React.useState({
    name: reward?.name || '',
    description: reward?.description || '',
    type: reward?.type || 'DISCOUNT_PERCENTAGE',
    value: reward?.value ?? 0,
    pointsCost: reward?.pointsCost ?? 0,
    maxRedemptions: reward?.maxRedemptions ?? undefined,
    validFrom: (reward as any)?.validFrom || '',
    validUntil: (reward as any)?.validUntil || '',
    isActive: reward?.isActive ?? true,
    categoryId: (reward as any)?.categoryId || '',
    productId: (reward as any)?.productId || '',
  })
  const createReward = useCreateReward()

  const handleSubmit = async () => {
    try {
      await createReward.mutateAsync({ programId, reward: form as any })
      onClose()
    } catch {}
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{reward ? 'Editar Recompensa' : 'Nueva Recompensa'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Nombre</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Activo</Label>
            <div className="mt-2"><Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: !!v })} /></div>
          </div>
          <div className="md:col-span-2">
            <Label>Descripción</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DISCOUNT_PERCENTAGE">Descuento %</SelectItem>
                <SelectItem value="DISCOUNT_FIXED">Descuento fijo</SelectItem>
                <SelectItem value="FREE_PRODUCT">Producto gratis</SelectItem>
                <SelectItem value="FREE_SHIPPING">Envío gratis</SelectItem>
                <SelectItem value="CUSTOM">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Valor</Label>
            <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Costo en puntos</Label>
            <Input type="number" value={form.pointsCost} onChange={(e) => setForm({ ...form, pointsCost: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Máx. canjes</Label>
            <Input type="number" value={form.maxRedemptions as any} onChange={(e) => setForm({ ...form, maxRedemptions: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Válido desde</Label>
            <Input type="datetime-local" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
          </div>
          <div>
            <Label>Válido hasta</Label>
            <Input type="datetime-local" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
          </div>
          <div>
            <Label>Categoría (opcional)</Label>
            <Input value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} />
          </div>
          <div>
            <Label>Producto (opcional)</Label>
            <Input value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={createReward.isPending}>Guardar</Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function LoyaltyAdminPanel() {
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [showProgramForm, setShowProgramForm] = useState(false);
  const [showTierForm, setShowTierForm] = useState(false);
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [editingProgram, setEditingProgram] = useState<LoyaltyProgram | null>(null);
  const [editingTier, setEditingTier] = useState<LoyaltyTier | null>(null);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);

  const { data: programs, isLoading: programsLoading } = useLoyaltyPrograms();
  const { data: analytics, isLoading: analyticsLoading } = useLoyaltyAnalytics(selectedProgramId);

  // Set default program if not selected
  React.useEffect(() => {
    if (programs && programs.length > 0 && !selectedProgramId) {
      setSelectedProgramId(programs[0].id);
    }
  }, [programs, selectedProgramId]);

  const selectedProgram = programs?.find(p => p.id === selectedProgramId);

  const handleEditProgram = (program: LoyaltyProgram) => {
    setEditingProgram(program);
    setShowProgramForm(true);
  };

  const handleEditTier = (tier: LoyaltyTier) => {
    setEditingTier(tier);
    setShowTierForm(true);
  };

  const handleEditReward = (reward: Reward) => {
    setEditingReward(reward);
    setShowRewardForm(true);
  };

  const handleCloseForm = () => {
    setShowProgramForm(false);
    setShowTierForm(false);
    setShowRewardForm(false);
    setEditingProgram(null);
    setEditingTier(null);
    setEditingReward(null);
  };

  if (programsLoading) {
    return <LoyaltyAdminSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Panel de Administración - Lealtad
              </CardTitle>
              <CardDescription>
                Gestiona programas de lealtad, niveles y recompensas
              </CardDescription>
            </div>
            <Button onClick={() => setShowProgramForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Programa
            </Button>
          </div>
        </CardHeader>
        
        {programs && programs.length > 0 && (
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {programs.map((program) => (
                <Button
                  key={program.id}
                  variant={selectedProgramId === program.id ? 'default' : 'outline'}
                  onClick={() => setSelectedProgramId(program.id)}
                  className="flex items-center gap-2"
                >
                  <Trophy className="h-4 w-4" />
                  {program.name}
                  <Badge variant="secondary" className="ml-1">
                    {program.isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* No Programs State */}
      {!programs || programs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="p-3 bg-gray-100 rounded-full">
                <Trophy className="h-6 w-6 text-gray-400" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">No hay programas de lealtad</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Crea tu primer programa de lealtad para comenzar
                </p>
              </div>
              <Button onClick={() => setShowProgramForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primer Programa
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        selectedProgram && (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Resumen
              </TabsTrigger>
              <TabsTrigger value="program" className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Programa
              </TabsTrigger>
              <TabsTrigger value="tiers" className="flex items-center gap-2">
                <Crown className="h-4 w-4" />
                Niveles
              </TabsTrigger>
              <TabsTrigger value="rewards" className="flex items-center gap-2">
                <Gift className="h-4 w-4" />
                Recompensas
              </TabsTrigger>
              <TabsTrigger value="customers" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Clientes
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <ProgramOverview 
                program={selectedProgram} 
                analytics={analytics} 
                isLoading={analyticsLoading} 
              />
            </TabsContent>

            {/* Program Tab */}
            <TabsContent value="program" className="space-y-4">
              <ProgramManagement 
                program={selectedProgram}
                onEdit={handleEditProgram}
              />
            </TabsContent>

            {/* Tiers Tab */}
            <TabsContent value="tiers" className="space-y-4">
              <TiersManagement 
                program={selectedProgram}
                onEdit={handleEditTier}
                onNew={() => setShowTierForm(true)}
              />
            </TabsContent>

            {/* Rewards Tab */}
            <TabsContent value="rewards" className="space-y-4">
              <RewardsManagement 
                program={selectedProgram}
                onEdit={handleEditReward}
                onNew={() => setShowRewardForm(true)}
              />
            </TabsContent>

            {/* Customers Tab */}
            <TabsContent value="customers" className="space-y-4">
              <CustomersManagement program={selectedProgram} />
            </TabsContent>
          </Tabs>
        )
      )}

      {/* Forms */}
      {showProgramForm && (
        <ProgramForm
          program={editingProgram}
          onClose={handleCloseForm}
        />
      )}

      {showTierForm && (
        <TierForm
          tier={editingTier}
          programId={selectedProgramId}
          onClose={handleCloseForm}
        />
      )}

      {showRewardForm && (
        <RewardForm
          reward={editingReward}
          programId={selectedProgramId}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}

// Program Overview Component
function ProgramOverview({ 
  program, 
  analytics, 
  isLoading 
}: { 
  program: LoyaltyProgram; 
  analytics: any; 
  isLoading: boolean; 
}) {
  if (isLoading) {
    return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-20" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalCustomers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.activeCustomers || 0} activos este mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Puntos Emitidos</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.totalPointsIssued?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics?.totalPointsRedeemed?.toLocaleString() || 0} canjeados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recompensas</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.totalRewardsRedeemed || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              canjeadas este mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(analytics?.averagePointsPerCustomer || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              puntos por cliente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Program Status */}
      <Card>
        <CardHeader>
          <CardTitle>Estado del Programa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Estado:</span>
                <Badge variant={program.isActive ? 'default' : 'secondary'}>
                  {program.isActive ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Puntos por compra:</span>
                <span className="text-sm font-medium">{program.pointsPerPurchase}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Compra mínima:</span>
                <span className="text-sm font-medium">{formatCurrency(program.minimumPurchase)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Bono bienvenida:</span>
                <span className="text-sm font-medium">{program.welcomeBonus} puntos</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Bono cumpleaños:</span>
                <span className="text-sm font-medium">{program.birthdayBonus} puntos</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Niveles configurados:</span>
                <span className="text-sm font-medium">0</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Program Management Component
function ProgramManagement({ 
  program, 
  onEdit 
}: { 
  program: LoyaltyProgram; 
  onEdit: (program: LoyaltyProgram) => void; 
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{program.name}</CardTitle>
            <CardDescription>{program.description}</CardDescription>
          </div>
          <Button onClick={() => onEdit(program)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <h4 className="font-medium">Configuración de Puntos</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Puntos por compra:</span>
                <span>{program.pointsPerPurchase}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Compra mínima:</span>
                <span>{formatCurrency(program.minimumPurchase)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bono de bienvenida:</span>
                <span>{program.welcomeBonus} puntos</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bono de cumpleaños:</span>
                <span>{program.birthdayBonus} puntos</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium">Estado y Configuración</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estado:</span>
                <Badge variant={program.isActive ? 'default' : 'secondary'}>
                  {program.isActive ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Creado:</span>
                <span>{new Date(program.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Última actualización:</span>
                <span>{new Date(program.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Tiers Management Component
function TiersManagement({ 
  program, 
  onEdit, 
  onNew 
}: { 
  program: LoyaltyProgram; 
  onEdit: (tier: LoyaltyTier) => void; 
  onNew: () => void; 
}) {
  const { data: tiers = [], isPending } = useLoyaltyTiers(program.id)
  const updateTier = useUpdateLoyaltyTier()
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Niveles de Lealtad</h3>
        <Button onClick={onNew}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Nivel
        </Button>
      </div>
      {isPending ? (
        <Card className="border-dashed"><CardContent className="p-8 text-center">Cargando…</CardContent></Card>
      ) : tiers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <Crown className="h-8 w-8 text-muted-foreground" />
              <div>
                <h4 className="font-medium">No hay niveles configurados</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Crea niveles para recompensar la lealtad de tus clientes
                </p>
              </div>
              <Button onClick={onNew}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primer Nivel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tiers.map((tier) => (
            <Card key={tier.id}>
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-4 w-4" />
                  {tier.name}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => onEdit(tier)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mín. puntos:</span>
                  <span>{tier.minPoints}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Multiplicador:</span>
                  <span>{tier.multiplier}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estado:</span>
                  <Badge variant={tier.isActive ? 'default' : 'secondary'}>
                    {tier.isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => updateTier.mutate({ programId: program.id, tierId: tier.id, tier: { isActive: !tier.isActive } })}>
                    {tier.isActive ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Rewards Management Component
function RewardsManagement({ 
  program, 
  onEdit, 
  onNew 
}: { 
  program: LoyaltyProgram; 
  onEdit: (reward: Reward) => void; 
  onNew: () => void; 
}) {
  const { data: rewards = [], isPending } = useAvailableRewards(program.id)
  const updateReward = useUpdateReward()
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Recompensas</h3>
        <Button onClick={onNew}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Recompensa
        </Button>
      </div>
      {isPending ? (
        <Card className="border-dashed"><CardContent className="p-8 text-center">Cargando…</CardContent></Card>
      ) : rewards.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <Gift className="h-8 w-8 text-muted-foreground" />
              <div>
                <h4 className="font-medium">No hay recompensas configuradas</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Crea recompensas para que los clientes puedan canjear sus puntos
                </p>
              </div>
              <Button onClick={onNew}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Recompensa
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rewards.map((reward) => (
            <Card key={reward.id}>
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  {reward.name}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => onEdit(reward)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Costo (puntos):</span>
                  <span>{reward.pointsCost}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span>{reward.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estado:</span>
                  <Badge variant={reward.isActive ? 'default' : 'secondary'}>
                    {reward.isActive ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => updateReward.mutate({ programId: program.id, rewardId: reward.id, reward: { isActive: !reward.isActive } })}>
                    {reward.isActive ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Customers Management Component
function CustomerRow({ programId, item }: { programId: string; item: any }) {
  const [pts, setPts] = React.useState<string>('')
  const [desc, setDesc] = React.useState<string>('')
  const [selectedRewardId, setSelectedRewardId] = React.useState<string>('')
  const [selectedCustomerRewardId, setSelectedCustomerRewardId] = React.useState<string>('')
  const [saleId, setSaleId] = React.useState<string>('')
  const { data: availableRewards = [] } = useAvailableRewards(programId, item.customerId)
  const { data: customerRewards = [] } = useCustomerRewards(item.customerId, programId)
  const adjust = useAdjustPoints()
  const redeem = useRedeemReward()
  const useReward = useUseCustomerReward()
  const { showConfirmation, ConfirmationDialog } = useConfirmationDialog()

  return (
    <div className="space-y-3 border rounded p-3">
      <div className="flex items-center gap-3">
        <Users className="h-4 w-4" />
        <div className="text-sm">
          <div className="font-medium">{item.customer?.name || item.customerId}</div>
          <div className="text-muted-foreground">{item.customer?.email || ''}</div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <span className="text-muted-foreground">Puntos actuales:</span> {item.currentPoints}
        </div>
        <div className="flex gap-2 items-center">
          <Input placeholder="± puntos" className="w-28" value={pts} onChange={(e) => setPts(e.target.value)} />
          <Input placeholder="Descripción" className="w-64" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <Button size="sm" onClick={() => {
            const n = Number(pts || '0')
            if (!n) return
            showConfirmation({
              title: 'Ajustar puntos',
              description: `Aplicar ajuste de ${n} puntos al cliente`,
              confirmText: 'Confirmar',
              cancelText: 'Cancelar',
              onConfirm: async () => {
                await adjust.mutateAsync({ customerLoyaltyId: item.id, points: n, description: desc || 'Ajuste manual' })
              }
            })
          }}>Ajustar</Button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <span className="text-muted-foreground">Canjear recompensa</span>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={selectedRewardId} onValueChange={setSelectedRewardId}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              {availableRewards.map((r: any) => (
                <SelectItem key={r.id} value={r.id}>{r.name} ({r.pointsCost})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => {
            if (!selectedRewardId) return
            showConfirmation({
              title: 'Canjear recompensa',
              description: 'Confirmar canje para el cliente',
              confirmText: 'Canjear',
              cancelText: 'Cancelar',
              onConfirm: async () => {
                await redeem.mutateAsync({ customerId: item.customerId, programId, rewardId: selectedRewardId })
              }
            })
          }}>Canjear</Button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <span className="text-muted-foreground">Usar recompensa</span>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={selectedCustomerRewardId} onValueChange={setSelectedCustomerRewardId}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              {customerRewards.map((cr: any) => (
                <SelectItem key={cr.id} value={cr.id}>{cr.reward?.name || cr.rewardId} [{cr.status}]</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Venta ID" className="w-40" value={saleId} onChange={(e) => setSaleId(e.target.value)} />
          <Button size="sm" onClick={() => {
            if (!selectedCustomerRewardId) return
            showConfirmation({
              title: 'Usar recompensa',
              description: 'Confirmar uso de recompensa',
              confirmText: 'Usar',
              cancelText: 'Cancelar',
              onConfirm: async () => {
                await useReward.mutateAsync({ customerRewardId: selectedCustomerRewardId, saleId })
              }
            })
          }}>Usar</Button>
        </div>
      </div>
      <ConfirmationDialog />
    </div>
  )
}

function CustomersManagement({ program }: { program: LoyaltyProgram }) {
  const [items, setItems] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [customerId, setCustomerId] = React.useState('')
  const [customers, setCustomers] = React.useState<any[]>([])
  const enroll = useEnrollCustomer()

  const fetchItems = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/loyalty/programs/${program.id}/customers`)
      const json = await res.json()
      setItems(json?.data || [])
    } catch (e: any) {
      setError(e?.message || 'Error al cargar clientes')
    } finally {
      setLoading(false)
    }
  }, [program.id])

  React.useEffect(() => { fetchItems() }, [fetchItems])

  React.useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch('/api/customers')
        const json = await res.json()
        const list = json?.data || json?.customers || []
        setCustomers(list)
      } catch {}
    }
    fetchCustomers()
  }, [])

  const handleEnroll = async () => {
    if (!customerId.trim()) return
    try {
      await enroll.mutateAsync({ customerId: customerId.trim(), programId: program.id })
      setCustomerId('')
      fetchItems()
    } catch {}
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clientes inscritos</CardTitle>
        <CardDescription>
          Administra los clientes inscritos en el programa de lealtad
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="w-64">
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {customers.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input placeholder="ID manual (opcional)" value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
          <Button onClick={handleEnroll} disabled={enroll.isPending}>Inscribir</Button>
          <Button variant="outline" onClick={fetchItems}>Actualizar</Button>
        </div>
        {loading ? (
          <div>Cargando…</div>
        ) : error ? (
          <div className="text-red-600 text-sm">{error}</div>
        ) : (
          <div className="space-y-2">
            {items.map((it) => (
              <CustomerRow key={it.id} programId={program.id} item={it} />
            ))}
            {items.length === 0 && (
              <Alert>
                <Users className="h-4 w-4" />
                <AlertDescription>No hay clientes inscritos aún</AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Loading Skeleton
function LoyaltyAdminSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-64 mb-2" />
              <Skeleton className="h-4 w-80" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </CardHeader>
      </Card>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}