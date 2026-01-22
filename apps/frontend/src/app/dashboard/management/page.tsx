'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Users, 
  Truck, 
  Plus, 
  Search, 
  Filter,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  Building
} from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  customerType: 'regular' | 'vip' | 'wholesale';
  status: 'active' | 'inactive';
  createdAt: string;
  notes?: string;
  birthDate?: string;
}

interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  contactPerson: string;
  taxId: string;
  status: 'active' | 'inactive';
  createdAt: string;
  notes?: string;
  website?: string;
}

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  birthDate: string;
  customerType: 'regular' | 'vip' | 'wholesale';
  status: 'active' | 'inactive';
}

interface SupplierFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  contactPerson: string;
  taxId: string;
  notes: string;
  website: string;
  status: 'active' | 'inactive';
}

export default function ManagementPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers');
  
  // Customer form state
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerFormData, setCustomerFormData] = useState<CustomerFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    birthDate: '',
    customerType: 'regular',
    status: 'active',
  });

  // Supplier form state
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierFormData, setSupplierFormData] = useState<SupplierFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    contactPerson: '',
    taxId: '',
    notes: '',
    website: '',
    status: 'active',
  });

  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Simular carga de datos - aquí conectarías con tu API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Datos de ejemplo
      setCustomers([
        {
          id: '1',
          name: 'Juan Pérez',
          email: 'juan@email.com',
          phone: '+1234567890',
          address: 'Calle 123, Ciudad',
          customerType: 'regular',
          status: 'active',
          createdAt: '2024-01-15T10:00:00Z',
          notes: 'Cliente frecuente'
        }
      ]);

      setSuppliers([
        {
          id: '1',
          name: 'Distribuidora ABC',
          email: 'contacto@abc.com',
          phone: '+0987654321',
          address: 'Av. Principal 456, Ciudad',
          contactPerson: 'María García',
          taxId: '12345678901',
          status: 'active',
          createdAt: '2024-01-10T09:00:00Z',
          notes: 'Proveedor principal',
          website: 'https://abc.com'
        }
      ]);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Customer functions
  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingCustomer) {
        // Actualizar cliente existente
        const updatedCustomers = customers.map(customer =>
          customer.id === editingCustomer.id
            ? { ...customer, ...customerFormData }
            : customer
        );
        setCustomers(updatedCustomers);
        toast({
          title: 'Cliente actualizado',
          description: 'Los datos del cliente se han actualizado correctamente',
        });
      } else {
        // Crear nuevo cliente
        const newCustomer: Customer = {
          id: Date.now().toString(),
          ...customerFormData,
          createdAt: new Date().toISOString(),
        };
        setCustomers([...customers, newCustomer]);
        toast({
          title: 'Cliente creado',
          description: 'El cliente se ha creado correctamente',
        });
      }

      resetCustomerForm();
      setShowCustomerModal(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar el cliente',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetCustomerForm = () => {
    setCustomerFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      notes: '',
      birthDate: '',
      customerType: 'regular',
      status: 'active',
    });
    setEditingCustomer(null);
  };

  const openCustomerEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setCustomerFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      notes: customer.notes || '',
      birthDate: customer.birthDate || '',
      customerType: customer.customerType,
      status: customer.status,
    });
    setShowCustomerModal(true);
  };

  // Supplier functions
  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingSupplier) {
        // Actualizar proveedor existente
        const updatedSuppliers = suppliers.map(supplier =>
          supplier.id === editingSupplier.id
            ? { ...supplier, ...supplierFormData }
            : supplier
        );
        setSuppliers(updatedSuppliers);
        toast({
          title: 'Proveedor actualizado',
          description: 'Los datos del proveedor se han actualizado correctamente',
        });
      } else {
        // Crear nuevo proveedor
        const newSupplier: Supplier = {
          id: Date.now().toString(),
          ...supplierFormData,
          createdAt: new Date().toISOString(),
        };
        setSuppliers([...suppliers, newSupplier]);
        toast({
          title: 'Proveedor creado',
          description: 'El proveedor se ha creado correctamente',
        });
      }

      resetSupplierForm();
      setShowSupplierModal(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar el proveedor',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetSupplierForm = () => {
    setSupplierFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      contactPerson: '',
      taxId: '',
      notes: '',
      website: '',
      status: 'active',
    });
    setEditingSupplier(null);
  };

  const openSupplierEditDialog = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupplierFormData({
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      contactPerson: supplier.contactPerson,
      taxId: supplier.taxId,
      notes: supplier.notes || '',
      website: supplier.website || '',
      status: supplier.status,
    });
    setShowSupplierModal(true);
  };

  // Filter functions
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    customer.email.toLowerCase().includes(customerSearchQuery.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(supplierSearchQuery.toLowerCase()) ||
    supplier.email.toLowerCase().includes(supplierSearchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Clientes y Proveedores</h1>
          <p className="text-muted-foreground">Administra la información de clientes y proveedores</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Clientes</p>
                <p className="text-2xl font-bold">{customers.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Clientes Activos</p>
                <p className="text-2xl font-bold">{customers.filter(c => c.status === 'active').length}</p>
              </div>
              <User className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Proveedores</p>
                <p className="text-2xl font-bold">{suppliers.length}</p>
              </div>
              <Truck className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Proveedores Activos</p>
                <p className="text-2xl font-bold">{suppliers.filter(s => s.status === 'active').length}</p>
              </div>
              <Building className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Sección de Clientes */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Clientes
                  </CardTitle>
                  <CardDescription>
                    Gestiona la información de tus clientes
                  </CardDescription>
                </div>
                <Button onClick={() => setShowCustomerModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Cliente
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="flex items-center space-x-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar clientes..."
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Customer List */}
              <div className="space-y-2">
                {filteredCustomers.map((customer) => (
                  <div key={customer.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">{customer.name}</h3>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>
                        {customer.status === 'active' ? 'Activo' : 'Inactivo'}
                      </Badge>
                      <Badge variant="outline">
                        {customer.customerType === 'regular' ? 'Regular' : 
                         customer.customerType === 'vip' ? 'VIP' : 'Mayorista'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openCustomerEditDialog(customer)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {filteredCustomers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No se encontraron clientes
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sección de Proveedores */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Proveedores
                  </CardTitle>
                  <CardDescription>
                    Gestiona la información de tus proveedores
                  </CardDescription>
                </div>
                <Button onClick={() => setShowSupplierModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Proveedor
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="flex items-center space-x-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar proveedores..."
                    value={supplierSearchQuery}
                    onChange={(e) => setSupplierSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Supplier List */}
              <div className="space-y-2">
                {filteredSuppliers.map((supplier) => (
                  <div key={supplier.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <Building className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">{supplier.name}</h3>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {supplier.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {supplier.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {supplier.contactPerson}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={supplier.status === 'active' ? 'default' : 'secondary'}>
                        {supplier.status === 'active' ? 'Activo' : 'Inactivo'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openSupplierEditDialog(supplier)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {filteredSuppliers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No se encontraron proveedores
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>
                {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
              </CardTitle>
              <CardDescription>
                {editingCustomer 
                  ? 'Modifica los datos del cliente'
                  : 'Agrega un nuevo cliente a tu base de datos'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCustomerSubmit} className="space-y-6">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="basic">Información Básica</TabsTrigger>
                    <TabsTrigger value="additional">Información Adicional</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basic" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="customer-name">Nombre *</Label>
                        <Input
                          id="customer-name"
                          value={customerFormData.name}
                          onChange={(e) => setCustomerFormData(prev => ({
                            ...prev,
                            name: e.target.value
                          }))}
                          placeholder="Nombre completo"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="customer-email">Email *</Label>
                        <Input
                          id="customer-email"
                          type="email"
                          value={customerFormData.email}
                          onChange={(e) => setCustomerFormData(prev => ({
                            ...prev,
                            email: e.target.value
                          }))}
                          placeholder="correo@ejemplo.com"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="customer-phone">Teléfono</Label>
                        <Input
                          id="customer-phone"
                          value={customerFormData.phone}
                          onChange={(e) => setCustomerFormData(prev => ({
                            ...prev,
                            phone: e.target.value
                          }))}
                          placeholder="+595 21 1234567"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="customer-type">Tipo de Cliente</Label>
                        <Select 
                          value={customerFormData.customerType} 
                          onValueChange={(value: 'regular' | 'vip' | 'wholesale') => 
                            setCustomerFormData(prev => ({ ...prev, customerType: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="regular">Regular</SelectItem>
                            <SelectItem value="vip">VIP</SelectItem>
                            <SelectItem value="wholesale">Mayorista</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="additional" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="customer-address">Dirección</Label>
                      <Textarea
                        id="customer-address"
                        value={customerFormData.address}
                        onChange={(e) => setCustomerFormData(prev => ({
                          ...prev,
                          address: e.target.value
                        }))}
                        placeholder="Dirección completa"
                        rows={3}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="customer-birthdate">Fecha de Nacimiento</Label>
                        <Input
                          id="customer-birthdate"
                          type="date"
                          value={customerFormData.birthDate}
                          onChange={(e) => setCustomerFormData(prev => ({
                            ...prev,
                            birthDate: e.target.value
                          }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="customer-status">Estado</Label>
                        <Select 
                          value={customerFormData.status} 
                          onValueChange={(value: 'active' | 'inactive') => 
                            setCustomerFormData(prev => ({ ...prev, status: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Activo</SelectItem>
                            <SelectItem value="inactive">Inactivo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="customer-notes">Notas</Label>
                      <Textarea
                        id="customer-notes"
                        value={customerFormData.notes}
                        onChange={(e) => setCustomerFormData(prev => ({
                          ...prev,
                          notes: e.target.value
                        }))}
                        placeholder="Notas adicionales sobre el cliente"
                        rows={3}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
                
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCustomerModal(false);
                      resetCustomerForm();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Guardando...' : editingCustomer ? 'Actualizar' : 'Crear'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>
                {editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </CardTitle>
              <CardDescription>
                {editingSupplier 
                  ? 'Modifica los datos del proveedor'
                  : 'Agrega un nuevo proveedor a tu base de datos'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSupplierSubmit} className="space-y-6">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="basic">Información Básica</TabsTrigger>
                    <TabsTrigger value="additional">Información Adicional</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basic" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="supplier-name">Nombre de la Empresa *</Label>
                        <Input
                          id="supplier-name"
                          value={supplierFormData.name}
                          onChange={(e) => setSupplierFormData(prev => ({
                            ...prev,
                            name: e.target.value
                          }))}
                          placeholder="Nombre de la empresa"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="supplier-contact">Persona de Contacto *</Label>
                        <Input
                          id="supplier-contact"
                          value={supplierFormData.contactPerson}
                          onChange={(e) => setSupplierFormData(prev => ({
                            ...prev,
                            contactPerson: e.target.value
                          }))}
                          placeholder="Nombre del contacto"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="supplier-email">Email *</Label>
                        <Input
                          id="supplier-email"
                          type="email"
                          value={supplierFormData.email}
                          onChange={(e) => setSupplierFormData(prev => ({
                            ...prev,
                            email: e.target.value
                          }))}
                          placeholder="contacto@empresa.com"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="supplier-phone">Teléfono *</Label>
                        <Input
                          id="supplier-phone"
                          value={supplierFormData.phone}
                          onChange={(e) => setSupplierFormData(prev => ({
                            ...prev,
                            phone: e.target.value
                          }))}
                          placeholder="+595 21 1234567"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="supplier-taxid">RUC/NIT</Label>
                        <Input
                          id="supplier-taxid"
                          value={supplierFormData.taxId}
                          onChange={(e) => setSupplierFormData(prev => ({
                            ...prev,
                            taxId: e.target.value
                          }))}
                          placeholder="Número de identificación fiscal"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="supplier-website">Sitio Web</Label>
                        <Input
                          id="supplier-website"
                          value={supplierFormData.website}
                          onChange={(e) => setSupplierFormData(prev => ({
                            ...prev,
                            website: e.target.value
                          }))}
                          placeholder="https://empresa.com"
                        />
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="additional" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="supplier-address">Dirección</Label>
                      <Textarea
                        id="supplier-address"
                        value={supplierFormData.address}
                        onChange={(e) => setSupplierFormData(prev => ({
                          ...prev,
                          address: e.target.value
                        }))}
                        placeholder="Dirección completa de la empresa"
                        rows={3}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="supplier-status">Estado</Label>
                      <Select 
                        value={supplierFormData.status} 
                        onValueChange={(value: 'active' | 'inactive') => 
                          setSupplierFormData(prev => ({ ...prev, status: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Activo</SelectItem>
                          <SelectItem value="inactive">Inactivo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="supplier-notes">Notas</Label>
                      <Textarea
                        id="supplier-notes"
                        value={supplierFormData.notes}
                        onChange={(e) => setSupplierFormData(prev => ({
                          ...prev,
                          notes: e.target.value
                        }))}
                        placeholder="Notas adicionales sobre el proveedor"
                        rows={3}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
                
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowSupplierModal(false);
                      resetSupplierForm();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Guardando...' : editingSupplier ? 'Actualizar' : 'Crear'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}