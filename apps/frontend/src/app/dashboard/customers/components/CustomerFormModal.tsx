import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCustomerForm } from '../hooks';
import { useToast } from '@/components/ui/use-toast';
import type { UICustomer } from '@/types/customer-page';

interface CustomerFormModalProps {
    open: boolean;
    customer?: UICustomer;
    onClose: () => void;
    onSuccess: () => void;
}

/**
 * Modal for creating/editing customers.
 * Uses useCustomerForm hook for state management and validation.
 */
export function CustomerFormModal({
    open,
    customer,
    onClose,
    onSuccess
}: CustomerFormModalProps) {
    const { toast } = useToast();
    const form = useCustomerForm(customer);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await form.submit();

            toast({
                title: customer ? 'Cliente actualizado' : 'Cliente creado',
                description: customer
                    ? 'Los datos del cliente se han actualizado correctamente.'
                    : 'El nuevo cliente se ha creado correctamente.'
            });

            onSuccess();
            onClose();
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'No se pudo guardar el cliente',
                variant: 'destructive'
            });
        }
    };

    const handleClose = () => {
        if (form.isDirty) {
            if (confirm('¿Descartar cambios?')) {
                form.reset();
                onClose();
            }
        } else {
            onClose();
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {customer ? 'Editar Cliente' : 'Nuevo Cliente'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Info Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            Información Básica
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 space-y-2">
                                <Label htmlFor="name">
                                    Nombre <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    value={form.formData.name}
                                    onChange={(e) => form.updateField('name', e.target.value)}
                                    placeholder="Ej: María González"
                                    className={form.errors.name ? 'border-destructive' : ''}
                                />
                                {form.errors.name && (
                                    <p className="text-sm text-destructive">{form.errors.name}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="customerCode">Código</Label>
                                <Input
                                    id="customerCode"
                                    value={form.formData.customerCode}
                                    onChange={(e) => form.updateField('customerCode', e.target.value)}
                                    placeholder="Auto-generado"
                                    disabled
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="customerType">Tipo de Cliente</Label>
                                <Select
                                    value={form.formData.customerType}
                                    onValueChange={(value) => form.updateField('customerType', value)}
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
                    </div>

                    {/* Contact Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            Contacto
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={form.formData.email}
                                    onChange={(e) => form.updateField('email', e.target.value)}
                                    placeholder="cliente@ejemplo.com"
                                    className={form.errors.email ? 'border-destructive' : ''}
                                />
                                {form.errors.email && (
                                    <p className="text-sm text-destructive">{form.errors.email}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Teléfono</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={form.formData.phone}
                                    onChange={(e) => form.updateField('phone', e.target.value)}
                                    placeholder="+54 9 11 1234-5678"
                                    className={form.errors.phone ? 'border-destructive' : ''}
                                />
                                {form.errors.phone && (
                                    <p className="text-sm text-destructive">{form.errors.phone}</p>
                                )}
                            </div>

                            <div className="col-span-2 space-y-2">
                                <Label htmlFor="address">Dirección</Label>
                                <Input
                                    id="address"
                                    value={form.formData.address}
                                    onChange={(e) => form.updateField('address', e.target.value)}
                                    placeholder="Calle, número, ciudad"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Additional Info */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            Información Adicional
                        </h3>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="birthDate">Fecha de Nacimiento</Label>
                                <Input
                                    id="birthDate"
                                    type="date"
                                    value={form.formData.birthDate}
                                    onChange={(e) => form.updateField('birthDate', e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="notes">Notas</Label>
                                <Textarea
                                    id="notes"
                                    value={form.formData.notes}
                                    onChange={(e) => form.updateField('notes', e.target.value)}
                                    placeholder="Información adicional sobre el cliente..."
                                    rows={3}
                                />
                            </div>

                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label htmlFor="is_active">Estado Activo</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Cliente puede realizar compras
                                    </p>
                                </div>
                                <Switch
                                    id="is_active"
                                    checked={form.formData.is_active}
                                    onCheckedChange={(checked) => form.updateField('is_active', checked)}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={form.submitting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={form.submitting || Object.keys(form.errors).length > 0}
                        >
                            {form.submitting ? 'Guardando...' : (customer ? 'Actualizar' : 'Crear')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
