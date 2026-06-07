import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { createSupplierFormSchema, CreateSupplierFormData } from '@/lib/validation-schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { ChevronDown, Truck } from 'lucide-react';
import { SupplierWithStats } from '@/types/suppliers';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateSupplierFormData | Record<string, unknown>) => void;
  initialData?: SupplierWithStats | null;
  isSubmitting?: boolean;
}

const EMPTY_VALUES: CreateSupplierFormData = {
  name: '', phone: '', email: '', address: '', contactPerson: '',
  website: '', taxId: '', notes: '', status: 'active', category: 'regular',
  paymentTerms: '30', creditLimit: 0, discount: 0, categoriesInput: '',
};

export function SupplierFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isSubmitting = false,
}: SupplierFormDialogProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const form = useForm<CreateSupplierFormData>({
    resolver: zodResolver(createSupplierFormSchema),
    defaultValues: EMPTY_VALUES,
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
        categoriesInput: Array.isArray((initialData.contactInfo as Record<string, unknown>)?.categories)
          ? ((initialData.contactInfo as Record<string, unknown>).categories as string[]).join(', ')
          : '',
      });
      setShowAdvanced(true); // al editar, mostramos todo
    } else {
      form.reset(EMPTY_VALUES);
      setShowAdvanced(false);
    }
  }, [initialData, open, form]);

  const handleSubmit = (data: CreateSupplierFormData) => {
    const categories = (data.categoriesInput || '')
      .split(',').map((c) => c.trim()).filter(Boolean);

    onSubmit({
      name: data.name,
      contactInfo: {
        phone: data.phone,
        email: data.email,
        address: data.address,
        contactPerson: data.contactPerson,
        website: data.website,
        ...(categories.length ? { categories } : {}),
      },
      taxId: data.taxId,
      notes: data.notes,
      status: data.status,
      category: data.category,
      commercialConditions: {
        paymentTerms: parseInt(data.paymentTerms) || 0,
        creditLimit: data.creditLimit,
        discount: data.discount,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col gap-0 overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="flex-shrink-0 border-b border-border/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
              <Truck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                {initialData ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {initialData ? 'Modifica los datos del proveedor.' : 'Solo el nombre es obligatorio.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-1 flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              <div className="space-y-4 p-6">
                {/* ── Esenciales ── */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Distribuidora Central S.A." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
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
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoría</FormLabel>
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue /></SelectTrigger>
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

                {/* ── Avanzado (colapsable) ── */}
                <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted/40">
                    <span>Más detalles (opcional)</span>
                    <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', showAdvanced && 'rotate-180')} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-4">
                    {/* Identificación */}
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="taxId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>RUC / NIT</FormLabel>
                            <FormControl>
                              <Input placeholder="80012345-6" {...field} value={field.value || ''} />
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
                              <Input placeholder="https://empresa.com" {...field} value={field.value || ''} />
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
                          <FormLabel>Dirección</FormLabel>
                          <FormControl>
                            <Input placeholder="Av. Principal 123, Asunción" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-3">
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
                        name="categoriesInput"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Otras Categorías</FormLabel>
                            <FormControl>
                              <Input placeholder="Hardware, Software" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Condiciones comerciales */}
                    <div className="grid grid-cols-3 gap-3">
                      <FormField
                        control={form.control}
                        name="paymentTerms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pago (días)</FormLabel>
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
                            <FormLabel>Crédito</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="0" {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
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
                            <FormLabel>Desc. (%)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="0" {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Notas */}
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notas internas</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Observaciones, historial..." rows={3}
                              className="resize-none" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </ScrollArea>

            {/* Footer */}
            <DialogFooter className="flex-shrink-0 border-t border-border/50 px-6 py-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="min-w-[130px]">
                {isSubmitting ? 'Guardando...' : (initialData ? 'Guardar Cambios' : 'Crear Proveedor')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
