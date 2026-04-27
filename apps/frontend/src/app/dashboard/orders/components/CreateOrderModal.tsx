'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Search, Plus, Trash2, Package, ShoppingCart, CreditCard, FileText } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useOptimizedProducts } from '@/hooks/useOptimizedProducts';
import { useCustomers } from '@/hooks/useCustomers';
import { useCurrencyFormatter, useBusinessConfigData } from '@/contexts/BusinessConfigContext';
import { useCreateDashboardOrder } from '@/hooks/useOptimizedOrders';
import { Textarea } from '@/components/ui/textarea';
import type { Product } from '@/types';

interface CreateOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface OrderItem {
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
}

interface NewCustomerForm {
  name: string;
  email: string;
  phone: string;
  address: string;
}

const MAX_QUANTITY_PER_ITEM = 1000;

export function CreateOrderModal({ open, onOpenChange }: CreateOrderModalProps) {
  const { toast } = useToast();
  const formatCurrency = useCurrencyFormatter();
  const { config: businessConfig } = useBusinessConfigData();
  const createOrderMutation = useCreateDashboardOrder();

  const [productSearch, setProductSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'TRANSFER' | 'DIGITAL_WALLET'>('CASH');
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState<NewCustomerForm>({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  const debouncedProductSearch = useDebounce(productSearch, 250);
  const { products, loading: productsLoading } = useOptimizedProducts({
    search: debouncedProductSearch,
    limit: 10,
  });
  const { data: customers = [], isLoading: customersLoading } = useCustomers();

  const subtotal = orderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const taxEnabled = businessConfig?.storeSettings?.taxEnabled ?? true;
  const taxRate = businessConfig?.storeSettings?.taxRate ?? 0.1;
  const taxIncluded = businessConfig?.storeSettings?.taxIncludedInPrices ?? true;
  const tax = taxEnabled
    ? taxIncluded
      ? subtotal - subtotal / (1 + taxRate)
      : Math.max(0, subtotal) * taxRate
    : 0;
  const total = taxIncluded ? subtotal : subtotal + tax;
  const taxLabel = taxEnabled
    ? taxIncluded
      ? `IVA incluido (${Math.round(taxRate * 100)}%)`
      : `IVA (${Math.round(taxRate * 100)}%)`
    : 'Impuesto';

  const resetForm = () => {
    setSelectedCustomer('');
    setOrderItems([]);
    setNotes('');
    setPaymentMethod('CASH');
    setProductSearch('');
    setShowNewCustomer(false);
    setNewCustomer({ name: '', email: '', phone: '', address: '' });
  };

  const handleClose = () => {
    if (createOrderMutation.isPending) {
      return;
    }

    resetForm();
    onOpenChange(false);
  };

  const handleAddProduct = (product: Product) => {
    if (!product.is_active) {
      toast({
        title: 'Producto inactivo',
        description: `${product.name} no esta disponible para la venta.`,
        variant: 'destructive',
      });
      return;
    }

    const availableStock = Number(product.stock_quantity || 0);
    if (availableStock <= 0) {
      toast({
        title: 'Sin stock',
        description: `${product.name} no tiene stock disponible.`,
        variant: 'destructive',
      });
      return;
    }

    setOrderItems((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (!existing) {
        return [
          ...current,
          {
            productId: product.id,
            product,
            quantity: 1,
            unitPrice: Number(product.offer_price || product.sale_price || 0),
          },
        ];
      }

      const nextQuantity = Math.min(existing.quantity + 1, availableStock, MAX_QUANTITY_PER_ITEM);
      if (nextQuantity === existing.quantity) {
        toast({
          title: 'Stock maximo alcanzado',
          description: `Disponible para ${product.name}: ${availableStock}.`,
          variant: 'destructive',
        });
        return current;
      }

      return current.map((item) =>
        item.productId === product.id ? { ...item, quantity: nextQuantity } : item
      );
    });

    setProductSearch('');
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setOrderItems((current) => current.filter((item) => item.productId !== productId));
      return;
    }

    setOrderItems((current) =>
      current.map((item) => {
        if (item.productId !== productId) {
          return item;
        }

        const maxStock = Number(item.product?.stock_quantity || MAX_QUANTITY_PER_ITEM);
        const nextQuantity = Math.min(quantity, maxStock, MAX_QUANTITY_PER_ITEM);

        if (nextQuantity < quantity) {
          toast({
            title: 'Cantidad ajustada',
            description: `Disponible para ${item.product?.name || 'este producto'}: ${nextQuantity}.`,
            variant: 'default',
          });
        }

        return { ...item, quantity: nextQuantity };
      })
    );
  };

  const handleRemoveItem = (productId: string) => {
    setOrderItems((current) => current.filter((item) => item.productId !== productId));
  };

  const handleSubmit = () => {
    if (orderItems.length === 0) {
      toast({
        title: 'Pedido vacio',
        description: 'Agrega al menos un producto antes de continuar.',
        variant: 'destructive',
      });
      return;
    }

    if (showNewCustomer) {
      if (!newCustomer.name.trim() || (!newCustomer.email.trim() && !newCustomer.phone.trim())) {
        toast({
          title: 'Datos incompletos',
          description: 'Completa nombre y al menos un dato de contacto del cliente.',
          variant: 'destructive',
        });
        return;
      }
    } else if (!selectedCustomer) {
      toast({
        title: 'Cliente requerido',
        description: 'Selecciona un cliente existente o crea uno nuevo.',
        variant: 'destructive',
      });
      return;
    }

    createOrderMutation.mutate(
      {
        items: orderItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        selectedCustomerId: showNewCustomer ? null : selectedCustomer,
        newCustomer: showNewCustomer
          ? {
              name: newCustomer.name.trim(),
              email: newCustomer.email.trim() || null,
              phone: newCustomer.phone.trim() || null,
              address: newCustomer.address.trim() || null,
            }
          : null,
        paymentMethod,
        notes: notes.trim() || null,
        shippingCost: 0,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Pedido creado',
            description: 'La orden se registro correctamente.',
          });
          resetForm();
          onOpenChange(false);
        },
        onError: (error) => {
          toast({
            title: 'Error',
            description: error instanceof Error ? error.message : 'No se pudo crear la orden.',
            variant: 'destructive',
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) handleClose(); }}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl border-border/60 p-0">
        <DialogHeader className="border-b border-border/60 px-6 py-5">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <ShoppingCart className="h-5 w-5" />
            </span>
            Nueva orden manual
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="space-y-6">
            <Card className="border-border/60 shadow-sm">
              <div className="space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">Cliente</Label>
                    <p className="text-sm text-muted-foreground">
                      Asigna el pedido a un cliente existente o crea uno rapido.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewCustomer((current) => !current)}
                  >
                    {showNewCustomer ? 'Usar existente' : 'Nuevo cliente'}
                  </Button>
                </div>

                {showNewCustomer ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <Label>Nombre</Label>
                      <Input
                        value={newCustomer.name}
                        onChange={(event) =>
                          setNewCustomer((current) => ({ ...current, name: event.target.value }))
                        }
                        placeholder="Nombre del cliente"
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={newCustomer.email}
                        onChange={(event) =>
                          setNewCustomer((current) => ({ ...current, email: event.target.value }))
                        }
                        placeholder="cliente@empresa.com"
                      />
                    </div>
                    <div>
                      <Label>Telefono</Label>
                      <Input
                        value={newCustomer.phone}
                        onChange={(event) =>
                          setNewCustomer((current) => ({ ...current, phone: event.target.value }))
                        }
                        placeholder="+595 ..."
                      />
                    </div>
                    <div>
                      <Label>Direccion</Label>
                      <Input
                        value={newCustomer.address}
                        onChange={(event) =>
                          setNewCustomer((current) => ({ ...current, address: event.target.value }))
                        }
                        placeholder="Direccion de entrega o referencia"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label>Cliente existente</Label>
                    <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {customersLoading ? (
                          <SelectItem value="loading" disabled>
                            Cargando...
                          </SelectItem>
                        ) : customers.length === 0 ? (
                          <SelectItem value="empty" disabled>
                            No hay clientes
                          </SelectItem>
                        ) : (
                          customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name} {customer.email ? `- ${customer.email}` : ''}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <div className="space-y-4 p-5">
                <div>
                  <Label className="text-base font-semibold">Productos</Label>
                  <p className="text-sm text-muted-foreground">
                    Busca por nombre y agrega los items directamente al pedido.
                  </p>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-10"
                    placeholder="Buscar productos..."
                    value={productSearch}
                    onChange={(event) => setProductSearch(event.target.value)}
                  />
                  {productSearch.trim() ? (
                    <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border/80 bg-background shadow-lg dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-zinc-950/50">
                      {productsLoading ? (
                        <div className="px-4 py-3 text-sm text-muted-foreground">Cargando productos...</div>
                      ) : products.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-muted-foreground">No se encontraron productos.</div>
                      ) : (
                        <div className="max-h-72 overflow-y-auto">
                          {products.map((product) => {
                            const effectivePrice = Number(product.offer_price || product.sale_price || 0);
                            const stock = Number(product.stock_quantity || 0);

                            return (
                              <button
                                key={product.id}
                                type="button"
                                className="flex w-full items-center justify-between border-b border-border/60 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-accent/50 dark:border-zinc-800 dark:hover:bg-zinc-800/60"
                                onClick={() => handleAddProduct(product)}
                              >
                                <div>
                                  <p className="font-medium">{product.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Disponible: {stock} · {formatCurrency(effectivePrice)}
                                  </p>
                                </div>
                                <Plus className="h-4 w-4 text-muted-foreground" />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                {orderItems.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/80 px-6 py-10 text-center text-muted-foreground">
                    <Package className="mx-auto mb-3 h-10 w-10 opacity-50" />
                    Todavia no agregaste productos al pedido.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orderItems.map((item) => (
                      <div
                        key={item.productId}
                        className="grid gap-3 rounded-xl border border-border/70 bg-white px-4 py-4 dark:border-zinc-700/70 dark:bg-zinc-900/50 lg:grid-cols-[1fr_auto_auto_auto]"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">{item.product?.name || 'Producto'}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(item.unitPrice)} por unidad
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                          >
                            -
                          </Button>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(event) =>
                              handleUpdateQuantity(item.productId, Number(event.target.value || 0))
                            }
                            className="w-16 text-center"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                          >
                            +
                          </Button>
                        </div>
                        <div className="flex items-center justify-end font-semibold">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </div>
                        <div className="flex items-center justify-end">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemoveItem(item.productId)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-border/60 shadow-sm">
              <div className="space-y-4 p-5">
                <div>
                  <Label className="text-base font-semibold">Pago y notas</Label>
                  <p className="text-sm text-muted-foreground">
                    Define el metodo de cobro y agrega contexto operativo.
                  </p>
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Metodo de pago
                  </Label>
                  <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as typeof paymentMethod)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Efectivo</SelectItem>
                      <SelectItem value="CARD">Tarjeta</SelectItem>
                      <SelectItem value="TRANSFER">Transferencia</SelectItem>
                      <SelectItem value="DIGITAL_WALLET">Billetera digital</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Notas
                  </Label>
                  <Textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Observaciones internas, instrucciones de entrega, referencias..."
                    className="resize-none"
                    rows={3}
                  />
                </div>
              </div>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <div className="space-y-4 p-5">
                <div>
                  <Label className="text-base font-semibold">Resumen</Label>
                  <p className="text-sm text-muted-foreground">
                    Confirmacion final antes de registrar la orden.
                  </p>
                </div>

                <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-900/60 dark:ring-1 dark:ring-zinc-800">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Items</span>
                    <span>{orderItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-muted-foreground">{taxLabel}</span>
                    <span>{formatCurrency(tax)}</span>
                  </div>
                  <div className="mt-4 border-t border-border/70 pt-4">
                    <div className="flex items-center justify-between text-lg font-semibold">
                      <span>Total</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-100">
                  El servidor vuelve a validar stock, precio y cliente antes de guardar el pedido.
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-border/60 bg-background/95 px-6 py-4 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/95">
          <Button type="button" variant="outline" onClick={handleClose} disabled={createOrderMutation.isPending}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createOrderMutation.isPending || orderItems.length === 0}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {createOrderMutation.isPending ? 'Guardando...' : 'Crear pedido'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
