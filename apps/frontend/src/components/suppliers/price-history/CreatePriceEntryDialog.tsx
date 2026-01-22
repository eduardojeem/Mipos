import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { useProducts } from '@/hooks/use-products';
import { useSuppliers } from '@/hooks/useSuppliersData';

interface CreatePriceEntryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: any) => void;
    isSubmitting: boolean;
}

export function CreatePriceEntryDialog({ open, onOpenChange, onSubmit, isSubmitting }: CreatePriceEntryDialogProps) {
    const { data: productsData } = useProducts({ limit: 100 });
    const { data: suppliersData } = useSuppliers({ limit: 100 });
    
    const [formData, setFormData] = useState({
        productId: '',
        supplierId: '',
        price: '',
        currency: 'PYG',
        effectiveDate: new Date().toISOString().split('T')[0],
        source: 'invoice',
        notes: ''
    });

    const handleSubmit = () => {
        onSubmit({
            ...formData,
            price: Number(formData.price)
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Registrar Nuevo Precio</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Producto</Label>
                            <Select onValueChange={(v) => setFormData({...formData, productId: v})}>
                                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                <SelectContent>
                                    {productsData?.map((product) => (
                                        <SelectItem key={product.id} value={product.id}>
                                            {product.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Proveedor</Label>
                            <Select onValueChange={(v) => setFormData({...formData, supplierId: v})}>
                                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                <SelectContent>
                                    {suppliersData?.suppliers?.map((supplier: any) => (
                                        <SelectItem key={supplier.id} value={supplier.id}>
                                            {supplier.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Precio</Label>
                            <Input 
                                type="number" 
                                value={formData.price}
                                onChange={(e) => setFormData({...formData, price: e.target.value})}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Moneda</Label>
                            <Select value={formData.currency} onValueChange={(v) => setFormData({...formData, currency: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PYG">Guaraníes (PYG)</SelectItem>
                                    <SelectItem value="USD">Dólares (USD)</SelectItem>
                                    <SelectItem value="MXN">Pesos (MXN)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Fecha Efectiva</Label>
                            <Input 
                                type="date" 
                                value={formData.effectiveDate}
                                onChange={(e) => setFormData({...formData, effectiveDate: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Origen</Label>
                            <Select value={formData.source} onValueChange={(v) => setFormData({...formData, source: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="invoice">Factura</SelectItem>
                                    <SelectItem value="quotation">Presupuesto</SelectItem>
                                    <SelectItem value="contract">Contrato</SelectItem>
                                    <SelectItem value="manual">Manual</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Notas</Label>
                        <Textarea 
                            value={formData.notes}
                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                            placeholder="Detalles adicionales..."
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? 'Guardando...' : 'Guardar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
