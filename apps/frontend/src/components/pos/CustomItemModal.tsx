'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PackagePlus } from 'lucide-react';
import { toast } from '@/lib/toast';

interface CustomItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (item: { name: string; price: number; quantity: number }) => void;
}

export function CustomItemModal({ isOpen, onClose, onAdd }: CustomItemModalProps) {
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [quantity, setQuantity] = useState('1');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const priceNum = parseFloat(price);
        const quantityNum = parseInt(quantity);

        if (!name.trim()) {
            toast.show({ title: 'Error', description: 'El nombre es requerido', variant: 'destructive' });
            return;
        }
        if (isNaN(priceNum) || priceNum <= 0) {
            toast.show({ title: 'Error', description: 'El precio debe ser mayor a 0', variant: 'destructive' });
            return;
        }
        if (isNaN(quantityNum) || quantityNum <= 0) {
            toast.show({ title: 'Error', description: 'La cantidad debe ser mayor a 0', variant: 'destructive' });
            return;
        }

        onAdd({ name, price: priceNum, quantity: quantityNum });
        handleClose();
    };

    const handleClose = () => {
        setName('');
        setPrice('');
        setQuantity('1');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PackagePlus className="w-5 h-5" />
                        Agregar Item Personalizado
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Descripción / Nombre</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej. Servicio de Instalación"
                            autoFocus
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="price">Precio Unitario</Label>
                            <Input
                                id="price"
                                type="number"
                                min="0"
                                step="0.01"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="quantity">Cantidad</Label>
                            <Input
                                id="quantity"
                                type="number"
                                min="1"
                                step="1"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose}>
                            Cancelar
                        </Button>
                        <Button type="submit">
                            Agregar al Carrito
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
