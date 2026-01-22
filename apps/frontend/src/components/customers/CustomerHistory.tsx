'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  History, 
  Clock, 
  User, 
  ShoppingCart, 
  CreditCard, 
  MessageCircle, 
  FileText, 
  Star, 
  Phone, 
  Mail, 
  Calendar,
  Plus,
  Filter,
  Search,
  Download,
  Eye,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  TrendingUp,
  DollarSign,
  Package,
  RefreshCw
} from 'lucide-react';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { useCustomerHistory } from '@/hooks/use-customer-history';
import { Typography } from '@/components/ui/Typography';
import { Box, Stack, HStack } from '@/components/ui/Spacing';
import { ColorBadge, StatusIndicator } from '@/components/ui/ColorSystem';

interface CustomerHistoryProps {
  customerId: string;
  customerName?: string;
}

interface HistoryEvent {
  id: string;
  sourceType: 'event' | 'interaction' | 'note';
  type: string;
  title: string;
  description?: string;
  amount?: number;
  referenceId?: string;
  referenceType?: string;
  metadata?: Record<string, any>;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

interface TimelineFilters {
  eventType?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export function CustomerHistory({ customerId, customerName }: CustomerHistoryProps) {
  const [filters, setFilters] = useState<TimelineFilters>({});
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showAddInteractionModal, setShowAddInteractionModal] = useState(false);
  
  const {
    timeline,
    analytics,
    interactions,
    notes,
    preferences,
    loading,
    error,
    fetchTimeline,
    addEvent,
    addInteraction,
    addNote,
    updatePreferences
  } = useCustomerHistory(customerId);

  useEffect(() => {
    fetchTimeline(filters);
  }, [customerId, filters, fetchTimeline]);

  const getStatusFromMetadata = (event: HistoryEvent) => {
    if (event.metadata?.status) {
      return event.metadata.status;
    }
    if (event.metadata?.is_important) {
      return 'important';
    }
    return 'completed';
  };

  if (loading) {
    return <CustomerHistorySkeleton />;
  }

  if (error) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error al cargar el historial del cliente: {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Analytics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historial de {customerName || 'Cliente'}
              </CardTitle>
              <CardDescription>
                Registro completo de actividades e interacciones
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowAddNoteModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nota
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowAddInteractionModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Interacción
              </Button>
              <Button 
                size="sm"
                onClick={() => setShowAddEventModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Evento
              </Button>
            </div>
          </div>
        </CardHeader>
        {analytics && (
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <Typography variant="h3" className="text-primary">
                  {analytics.analytics?.total_events || 0}
                </Typography>
                <Typography variant="body2" color="muted">
                  Total Eventos
                </Typography>
              </div>
              <div className="text-center">
                <Typography variant="h3" className="text-success">
                  {analytics.analytics?.total_purchases || 0}
                </Typography>
                <Typography variant="body2" color="muted">
                  Compras
                </Typography>
              </div>
              <div className="text-center">
                <Typography variant="h3" className="text-info">
                  {formatCurrency(analytics.analytics?.total_spent || 0)}
                </Typography>
                <Typography variant="body2" color="muted">
                  Total Gastado
                </Typography>
              </div>
              <div className="text-center">
                <Typography variant="h3" className="text-warning">
                  {analytics.interactionStats?.total_interactions || 0}
                </Typography>
                <Typography variant="body2" color="muted">
                  Interacciones
                </Typography>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar en historial..."
                  className="pl-8"
                  value={filters.search || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="eventType">Tipo de Evento</Label>
              <Select
                value={filters.eventType || ''}
                onValueChange={(value) => setFilters(prev => ({ ...prev, eventType: value || undefined }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="purchase">Compras</SelectItem>
                  <SelectItem value="return">Devoluciones</SelectItem>
                  <SelectItem value="payment">Pagos</SelectItem>
                  <SelectItem value="communication">Comunicaciones</SelectItem>
                  <SelectItem value="note">Notas</SelectItem>
                  <SelectItem value="loyalty">Lealtad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="startDate">Fecha Inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Fecha Fin</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="timeline">Línea de Tiempo</TabsTrigger>
          <TabsTrigger value="interactions">Interacciones</TabsTrigger>
          <TabsTrigger value="notes">Notas</TabsTrigger>
          <TabsTrigger value="preferences">Preferencias</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <TimelineView events={timeline?.timeline || []} />
        </TabsContent>

        <TabsContent value="interactions" className="space-y-4">
          <InteractionsView interactions={interactions || []} />
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <NotesView notes={notes || []} />
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <PreferencesView 
            preferences={preferences} 
            onUpdate={updatePreferences}
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AddEventModal
        open={showAddEventModal}
        onOpenChange={setShowAddEventModal}
        customerId={customerId}
        onEventAdded={() => {
          fetchTimeline(filters);
          setShowAddEventModal(false);
        }}
      />

      <AddInteractionModal
        open={showAddInteractionModal}
        onOpenChange={setShowAddInteractionModal}
        customerId={customerId}
        onInteractionAdded={() => {
          fetchTimeline(filters);
          setShowAddInteractionModal(false);
        }}
      />

      <AddNoteModal
        open={showAddNoteModal}
        onOpenChange={setShowAddNoteModal}
        customerId={customerId}
        onNoteAdded={() => {
          fetchTimeline(filters);
          setShowAddNoteModal(false);
        }}
      />
    </div>
  );
}

// Timeline View Component
function TimelineView({ events }: { events: HistoryEvent[] }) {
  const getEventIcon = (event: HistoryEvent) => {
    switch (event.type) {
      case 'purchase':
        return <ShoppingCart className="h-4 w-4" />;
      case 'return':
        return <Package className="h-4 w-4" />;
      case 'payment':
      case 'credit':
        return <CreditCard className="h-4 w-4" />;
      case 'communication':
      case 'call':
      case 'email':
      case 'sms':
        return <MessageCircle className="h-4 w-4" />;
      case 'note':
      case 'general':
      case 'important':
        return <FileText className="h-4 w-4" />;
      case 'loyalty':
        return <Star className="h-4 w-4" />;
      case 'profile_update':
        return <User className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getEventColor = (event: HistoryEvent) => {
     switch (event.type) {
       case 'purchase':
         return 'success';
       case 'return':
         return 'warning';
       case 'payment':
       case 'credit':
         return 'primary';
       case 'communication':
       case 'call':
       case 'email':
       case 'sms':
         return 'info';
       case 'note':
       case 'general':
         return 'gray';
       case 'important':
         return 'error';
       case 'loyalty':
         return 'primary';
       case 'profile_update':
         return 'secondary';
       default:
         return 'gray';
     }
   };

   const getStatusFromMetadata = (event: HistoryEvent) => {
     if (event.metadata?.status) {
       return event.metadata.status;
     }
     if (event.metadata?.is_important) {
       return 'important';
     }
     return 'completed';
   };

  if (!events || events.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <Typography variant="body1">No hay eventos en el historial</Typography>
            <Typography variant="body2">
              Los eventos aparecerán aquí cuando se registren actividades
            </Typography>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <Card key={event.id} className="relative">
          {index < events.length - 1 && (
            <div className="absolute left-6 top-16 bottom-0 w-px bg-border" />
          )}
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  `bg-${getEventColor(event)}/10 text-${getEventColor(event)}`
                )}>
                  {getEventIcon(event)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Typography variant="body1" className="font-medium">
                        {event.title}
                      </Typography>
                      <ColorBadge variant={getEventColor(event)}>
                        {event.type}
                      </ColorBadge>
                      {event.metadata?.is_important && (
                        <Badge variant="destructive">
                          Importante
                        </Badge>
                      )}
                    </div>
                    {event.description && (
                      <Typography variant="body2" color="muted" className="mb-2">
                        {event.description}
                      </Typography>
                    )}
                    {event.amount && (
                      <Typography variant="body2" className="font-medium text-success">
                        {formatCurrency(event.amount)}
                      </Typography>
                    )}
                  </div>
                  <div className="text-right">
                    <Typography variant="body2" color="muted">
                      {formatDate(event.createdAt)}
                    </Typography>
                    {event.metadata?.status && (
                      <StatusIndicator 
                        status={getStatusFromMetadata(event)} 
                        size="sm" 
                        className="mt-1"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Interactions View Component
function InteractionsView({ interactions }: { interactions: any[] }) {
  return (
    <div className="space-y-4">
      {interactions.map((interaction) => (
        <Card key={interaction.id}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <Typography variant="body1" className="font-medium mb-1">
                  {interaction.subject}
                </Typography>
                <div className="flex items-center gap-2 mb-2">
                  <ColorBadge variant="primary">
                    {interaction.interaction_type}
                  </ColorBadge>
                  <ColorBadge variant="gray">
                    {interaction.channel}
                  </ColorBadge>
                  <StatusIndicator status={interaction.status} size="sm" />
                </div>
              </div>
              <Typography variant="body2" color="muted">
                {formatDate(interaction.created_at)}
              </Typography>
            </div>
            {interaction.content && (
              <Typography variant="body2" color="muted">
                {interaction.content}
              </Typography>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Notes View Component
function NotesView({ notes }: { notes: any[] }) {
  return (
    <div className="space-y-4">
      {notes.map((note) => (
        <Card key={note.id}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                {note.title && (
                  <Typography variant="body1" className="font-medium mb-1">
                    {note.title}
                  </Typography>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <ColorBadge variant="gray">
                    {note.category}
                  </ColorBadge>
                  {note.is_important && (
                    <Badge variant="destructive">
                      Importante
                    </Badge>
                  )}
                  <Badge variant="secondary">
                    {note.visibility}
                  </Badge>
                </div>
              </div>
              <Typography variant="body2" color="muted">
                {formatDate(note.created_at)}
              </Typography>
            </div>
            <Typography variant="body2">
              {note.content}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Preferences View Component
function PreferencesView({ preferences, onUpdate }: { preferences: any; onUpdate: (prefs: any) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferencias del Cliente</CardTitle>
        <CardDescription>
          Configuración de comunicación y preferencias personales
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            La gestión de preferencias estará disponible próximamente.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

// Add Event Modal Component
function AddEventModal({ 
  open, 
  onOpenChange, 
  customerId, 
  onEventAdded 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  customerId: string; 
  onEventAdded: () => void; 
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar Evento</DialogTitle>
          <DialogDescription>
            Registra un nuevo evento en el historial del cliente
          </DialogDescription>
        </DialogHeader>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Formulario de eventos estará disponible próximamente.
          </AlertDescription>
        </Alert>
      </DialogContent>
    </Dialog>
  );
}

// Add Interaction Modal Component
function AddInteractionModal({ 
  open, 
  onOpenChange, 
  customerId, 
  onInteractionAdded 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  customerId: string; 
  onInteractionAdded: () => void; 
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar Interacción</DialogTitle>
          <DialogDescription>
            Registra una nueva interacción con el cliente
          </DialogDescription>
        </DialogHeader>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Formulario de interacciones estará disponible próximamente.
          </AlertDescription>
        </Alert>
      </DialogContent>
    </Dialog>
  );
}

// Add Note Modal Component
function AddNoteModal({ 
  open, 
  onOpenChange, 
  customerId, 
  onNoteAdded 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  customerId: string; 
  onNoteAdded: () => void; 
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar Nota</DialogTitle>
          <DialogDescription>
            Agrega una nota al historial del cliente
          </DialogDescription>
        </DialogHeader>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Formulario de notas estará disponible próximamente.
          </AlertDescription>
        </Alert>
      </DialogContent>
    </Dialog>
  );
}

// Loading Skeleton Component
function CustomerHistorySkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="text-center space-y-2">
                <Skeleton className="h-8 w-16 mx-auto" />
                <Skeleton className="h-4 w-20 mx-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-4 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default CustomerHistory;