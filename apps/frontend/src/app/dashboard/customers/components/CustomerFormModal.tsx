import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCustomerForm } from '../hooks';
import type { UICustomer } from '@/types/customer-page';

interface CustomerFormModalProps {
    open: boolean;
    customer?: UICustomer;
    onClose: () => void;
    onSuccess: () => void;
}

export function CustomerFormModal({
    open,
    customer,
    onClose,
    onSuccess
}: CustomerFormModalProps) {
    const form = useCustomerForm(customer);
    const hasErrors = Object.values(form.errors).some(Boolean);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await form.submit();
            onSuccess();
            onClose();
        } catch (error) {
            if (error instanceof Error && error.message === 'validation') {
                return;
            }
        }
    };

    const handleClose = () => {
        if (form.isDirty) {
            if (confirm('Descartar cambios?')) {
                form.reset();
                onClose();
            }
            return;
        }

        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{customer ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            Informacion Basica
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
                                    placeholder="Ej: Maria Gonzalez"
                                    className={form.errors.name ? 'border-destructive' : ''}
                                />
                                {form.errors.name && (
                                    <p className="text-sm text-destructive">{form.errors.name}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="customerCode">Codigo</Label>
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
                                <Label htmlFor="phone">Telefono</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={form.formData.phone}
                                    onChange={(e) => form.updateField('phone', e.target.value)}
                                    placeholder="+595 981 123456"
                                    className={form.errors.phone ? 'border-destructive' : ''}
                                />
                                {form.errors.phone && (
                                    <p className="text-sm text-destructive">{form.errors.phone}</p>
                                )}
                            </div>

                            <div className="col-span-2 space-y-2">
                                <Label htmlFor="address">Direccion</Label>
                                <Input
                                    id="address"
                                    value={form.formData.address}
                                    onChange={(e) => form.updateField('address', e.target.value)}
                                    placeholder="Calle, numero, ciudad"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            Informacion Adicional
                        </h3>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="ruc">RUC (opcional)</Label>
                                    <Input
                                        id="ruc"
                                        value={form.formData.ruc}
                                        onChange={(e) => form.updateField('ruc', e.target.value)}
                                        placeholder="Ej: 80012345-6"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="birthDate">Fecha de Nacimiento</Label>
                                    <Input
                                        id="birthDate"
                                        type="date"
                                        value={form.formData.birthDate}
                                        onChange={(e) => form.updateField('birthDate', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="notes">Notas</Label>
                                <Textarea
                                    id="notes"
                                    value={form.formData.notes}
                                    onChange={(e) => form.updateField('notes', e.target.value)}
                                    placeholder="Informacion adicional sobre el cliente..."
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
                            disabled={form.submitting || hasErrors}
                        >
                            {form.submitting ? 'Guardando...' : (customer ? 'Actualizar' : 'Crear')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
