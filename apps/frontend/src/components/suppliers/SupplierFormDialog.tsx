import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createSupplierFormSchema, CreateSupplierFormData } from '@/lib/validation-schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { SupplierWithStats } from '@/types/suppliers';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  initialData?: SupplierWithStats | null;
  isSubmitting?: boolean;
}

export function SupplierFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isSubmitting = false,
}: SupplierFormDialogProps) {
  const form = useForm<CreateSupplierFormData>({
    resolver: zodResolver(createSupplierFormSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      address: '',
      contactPerson: '',
      website: '',
      taxId: '',
      notes: '',
      status: 'active',
      category: 'regular',
      paymentTerms: '30',
      creditLimit: 0,
      discount: 0,
      categoriesInput: ''
    }
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        phone: initialData.contactInfo.phone || '',
        email: initialData.contactInfo.email || '',
        address: initialData.contactInfo.address || '',
        contactPerson: initialData.contactInfo.contactPerson || '',
        website: initialData.contactInfo.website || '',
        taxId: initialData.taxId || '',
        notes: initialData.notes || '',
        status: initialData.status || 'active',
        category: initialData.category || 'regular',
        paymentTerms: initialData.commercialConditions?.paymentTerms?.toString() || '30',
        creditLimit: initialData.commercialConditions?.creditLimit || 0,
        discount: initialData.commercialConditions?.discount || 0,
        categoriesInput: Array.isArray((initialData.contactInfo as any)?.categories)
          ? ((initialData.contactInfo as any).categories as string[]).join(', ')
          : ''
      });
    } else {
      form.reset({
        name: '',
        phone: '',
        email: '',
        address: '',
        contactPerson: '',
        website: '',
        taxId: '',
        notes: '',
        status: 'active',
        category: 'regular',
        paymentTerms: '30',
        creditLimit: 0,
        discount: 0,
        categoriesInput: ''
      });
    }
  }, [initialData, open, form]);

  const handleSubmit = (data: CreateSupplierFormData) => {
    const categories = (data.categoriesInput || '')
      .split(',')
      .map(c => c.trim())
      .filter(Boolean);

    const supplierData = {
      name: data.name,
      contactInfo: {
        phone: data.phone,
        email: data.email,
        address: data.address,
        contactPerson: data.contactPerson,
        website: data.website,
        ...(categories.length ? { categories } : {})
      },
      taxId: data.taxId,
      notes: data.notes,
      status: data.status,
      category: data.category,
      commercialConditions: {
        paymentTerms: parseInt(data.paymentTerms),
        creditLimit: data.creditLimit,
        discount: data.discount,
      },
    };

    onSubmit(supplierData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{initialData ? 'Editar Proveedor' : 'Nuevo Proveedor'}</DialogTitle>
          <DialogDescription>
            {initialData 
              ? 'Modifica la información del proveedor existente.' 
              : 'Completa los datos para registrar un nuevo proveedor en el sistema.'}
          </DialogDescription>
        </DialogHeader>
        
        <Separator />
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <ScrollArea className="flex-1 p-6 pt-2">
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-6">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="contact">Contacto</TabsTrigger>
                  <TabsTrigger value="commercial">Comercial</TabsTrigger>
                  <TabsTrigger value="notes">Notas</TabsTrigger>
                </TabsList>

                {/* Tab: General Info */}
                <TabsContent value="general" className="space-y-4 mt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre Comercial *</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Distribuidora Central S.A." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="taxId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>RUC / NIT</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: 80012345-6" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoría Principal</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Tecnología" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar estado" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">Activo</SelectItem>
                              <SelectItem value="inactive">Inactivo</SelectItem>
                              <SelectItem value="pending">Pendiente</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="categoriesInput"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Otras Categorías (opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Separadas por comas (Ej: Hardware, Software, Servicios)" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Tab: Contact Info */}
                <TabsContent value="contact" className="space-y-4 mt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="contacto@empresa.com" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teléfono</FormLabel>
                          <FormControl>
                            <Input placeholder="+595 21 123456" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dirección Física</FormLabel>
                        <FormControl>
                          <Input placeholder="Av. Principal 123, Asunción" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contactPerson"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Persona de Contacto</FormLabel>
                          <FormControl>
                            <Input placeholder="Juan Pérez" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sitio Web</FormLabel>
                          <FormControl>
                            <Input placeholder="https://www.empresa.com" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Tab: Commercial Info */}
                <TabsContent value="commercial" className="space-y-4 mt-0">
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="paymentTerms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Términos (Días)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="30" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="creditLimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Límite de Crédito</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0" 
                              {...field} 
                              onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="discount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descuento (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0" 
                              {...field} 
                              onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                    <p>Configura las condiciones comerciales predeterminadas para este proveedor. Estos valores se utilizarán al crear nuevas órdenes de compra.</p>
                  </div>
                </TabsContent>

                {/* Tab: Notes */}
                <TabsContent value="notes" className="space-y-4 mt-0">
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notas Internas</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Información adicional relevante, historial, observaciones..." 
                            className="min-h-[150px]"
                            {...field} 
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>
            </ScrollArea>
            
            <Separator />
            
            <DialogFooter className="p-6 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : (initialData ? 'Guardar Cambios' : 'Crear Proveedor')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
