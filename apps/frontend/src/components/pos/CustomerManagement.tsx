'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Phone, 
  Mail, 
  MapPin,
  Building,
  Calendar,
  Filter,
  UserPlus,
  X,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';
import { type Customer } from '@/types';


interface CustomerFormData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  customer_type: 'RETAIL' | 'WHOLESALE';
  tax_id?: string;
  wholesale_discount?: number;
  min_wholesale_quantity?: number;
}

interface CustomerManagementProps {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
  onCreateCustomer?: (customer: CustomerFormData) => Promise<void>;
  onUpdateCustomer?: (id: string, customer: Partial<CustomerFormData>) => Promise<void>;
  onDeleteCustomer?: (id: string) => Promise<void>;
  isModal?: boolean;
  onClose?: () => void;
}

export default function CustomerManagement({
  customers,
  selectedCustomer,
  onSelectCustomer,
  onCreateCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  isModal = false,
  onClose
}: CustomerManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<'ALL' | 'RETAIL' | 'WHOLESALE'>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    customer_type: 'RETAIL',
    tax_id: '',
    wholesale_discount: 0,
    min_wholesale_quantity: 1
  });
  const [loading, setLoading] = useState(false);

  // Filtrar clientes
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const filteredCustomers = safeCustomers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         customer.phone?.includes(searchQuery) ||
                         customer.tax_id?.includes(searchQuery);
    
    const matchesType = customerTypeFilter === 'ALL' || customer.customer_type === customerTypeFilter;
    
    return matchesSearch && matchesType;
  });

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      customer_type: 'RETAIL',
      tax_id: '',
      wholesale_discount: 0,
      min_wholesale_quantity: 1
    });
  };

  // Manejar creación de cliente
  const handleCreateCustomer = async () => {
    if (!formData.name.trim()) return;
    
    setLoading(true);
    try {
      if (onCreateCustomer) {
        await onCreateCustomer(formData);
      }
      resetForm();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating customer:', error);
    } finally {
      setLoading(false);
    }
  };

  // Manejar edición de cliente
  const handleEditCustomer = async () => {
    if (!editingCustomer || !formData.name.trim()) return;
    
    setLoading(true);
    try {
      if (onUpdateCustomer) {
        await onUpdateCustomer(editingCustomer.id, formData);
      }
      setShowEditModal(false);
      setEditingCustomer(null);
      resetForm();
    } catch (error) {
      console.error('Error updating customer:', error);
    } finally {
      setLoading(false);
    }
  };

  // Manejar eliminación de cliente
  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este cliente?')) return;
    
    setLoading(true);
    try {
      if (onDeleteCustomer) {
        await onDeleteCustomer(customerId);
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal de edición
  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      customer_type: customer.customer_type || 'RETAIL',
      tax_id: customer.tax_id || ''
    });
    setShowEditModal(true);
  };

  const CustomerCard = ({ customer }: { customer: Customer }) => (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        selectedCustomer?.id === customer.id ? 'ring-2 ring-primary' : ''
      }`}
      onClick={() => onSelectCustomer(customer)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium truncate">{customer.name}</h3>
              {selectedCustomer?.id === customer.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
            
            <div className="space-y-1 text-sm text-muted-foreground">
              {customer.email && (
                <div className="flex items-center space-x-2">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{customer.email}</span>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-3 w-3" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex items-center space-x-2">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{customer.address}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center space-x-2">
                <Badge variant={customer.customer_type === 'WHOLESALE' ? 'default' : 'secondary'}>
                  {customer.customer_type === 'WHOLESALE' ? (
                    <><Building className="h-3 w-3 mr-1" />Mayorista</>
                  ) : (
                    <><User className="h-3 w-3 mr-1" />Minorista</>
                  )}
                </Badge>
              </div>
              
              {(onUpdateCustomer || onDeleteCustomer) && (
                <div className="flex space-x-1">
                  {onUpdateCustomer && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(customer);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  )}
                  {onDeleteCustomer && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCustomer(customer.id);
                      }}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            {customer.total_purchases && (
              <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Total compras:</span>
                  <span className="font-medium">{formatCurrency(customer.total_purchases)}</span>
                </div>
                {customer.last_purchase && (
                  <div className="flex justify-between">
                    <span>Última compra:</span>
                    <span>{new Date(customer.last_purchase).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const CustomerForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nombre completo"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer_type">Tipo de cliente</Label>
          <Select
            value={formData.customer_type}
            onValueChange={(value: 'RETAIL' | 'WHOLESALE') => 
              setFormData({ ...formData, customer_type: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RETAIL">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Minorista</span>
                </div>
              </SelectItem>
              <SelectItem value="WHOLESALE">
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4" />
                  <span>Mayorista</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="correo@ejemplo.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+1234567890"
          />
        </div>
      </div>

      {formData.customer_type === 'WHOLESALE' && (
        <div className="space-y-2">
          <Label htmlFor="tax_id">RUC/NIT</Label>
          <Input
            id="tax_id"
            value={formData.tax_id}
            onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
            placeholder="Número de identificación fiscal"
          />
        </div>
      )}

      {formData.customer_type === 'WHOLESALE' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="wholesale_discount">Descuento Mayorista (%)</Label>
            <Input
              id="wholesale_discount"
              type="number"
              min="0"
              max="100"
              value={formData.wholesale_discount || 0}
              onChange={(e) => setFormData({ ...formData, wholesale_discount: parseFloat(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="min_wholesale_quantity">Cantidad Mínima Mayorista</Label>
            <Input
              id="min_wholesale_quantity"
              type="number"
              min="1"
              value={formData.min_wholesale_quantity || 1}
              onChange={(e) => setFormData({ ...formData, min_wholesale_quantity: parseInt(e.target.value) || 1 })}
              placeholder="1"
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="address">Dirección</Label>
        <Textarea
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="Dirección completa"
          className="h-20 resize-none"
        />
      </div>
    </div>
  );

  const content = (
    <div className="space-y-4">
      {/* Header y controles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <User className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">
            {isModal ? 'Seleccionar Cliente' : 'Gestión de Clientes'}
          </h2>
          <Badge variant="secondary">{filteredCustomers.length}</Badge>
        </div>
        <div className="flex space-x-2">
          {onCreateCustomer && (
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Nuevo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Cliente</DialogTitle>
                </DialogHeader>
                <CustomerForm />
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateCustomer} disabled={loading || !formData.name.trim()}>
                    {loading ? 'Creando...' : 'Crear Cliente'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {isModal && onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex space-x-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email, teléfono o RUC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={customerTypeFilter} onValueChange={(value: any) => setCustomerTypeFilter(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="RETAIL">Minoristas</SelectItem>
            <SelectItem value="WHOLESALE">Mayoristas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cliente seleccionado actual */}
      {isModal && selectedCustomer && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-primary" />
                <span className="font-medium">Cliente seleccionado:</span>
                <span>{selectedCustomer.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSelectCustomer(null)}
                className="text-muted-foreground"
              >
                Quitar selección
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de clientes */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No se encontraron clientes</p>
            {searchQuery && (
              <p className="text-sm">Intenta con otros términos de búsqueda</p>
            )}
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} />
          ))
        )}
      </div>

      {/* Modal de edición */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <CustomerForm />
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditModal(false);
                setEditingCustomer(null);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleEditCustomer} disabled={loading || !formData.name.trim()}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (isModal) {
    return content;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Clientes</CardTitle>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}