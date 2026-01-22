import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { useProducts } from '@/hooks/use-products';

interface CreatePriceAlertDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: any) => void;
    isSubmitting: boolean;
}

export function CreatePriceAlertDialog({ open, onOpenChange, onSubmit, isSubmitting }: CreatePriceAlertDialogProps) {
    const { data: productsData } = useProducts({ limit: 100 });
    
    const [formData, setFormData] = useState({
        productId: '',
        targetPrice: '',
        condition: 'below',
        threshold: '0',
        notificationEmail: '',
        isActive: true
    });

    const handleSubmit = () => {
        onSubmit({
            ...formData,
            targetPrice: Number(formData.targetPrice),
            threshold: Number(formData.threshold)
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Configurar Alerta de Precio</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
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
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Condición</Label>
                            <Select value={formData.condition} onValueChange={(v) => setFormData({...formData, condition: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="above">Precio mayor que</SelectItem>
                                    <SelectItem value="below">Precio menor que</SelectItem>
                                    <SelectItem value="increase_by">Aumenta en %</SelectItem>
                                    <SelectItem value="decrease_by">Disminuye en %</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Valor Objetivo</Label>
                            <Input 
                                type="number" 
                                value={formData.targetPrice}
                                onChange={(e) => setFormData({...formData, targetPrice: e.target.value})}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Email de Notificación</Label>
                        <Input 
                            type="email" 
                            value={formData.notificationEmail}
                            onChange={(e) => setFormData({...formData, notificationEmail: e.target.value})}
                            placeholder="ejemplo@empresa.com"
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
