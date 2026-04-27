'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Mail,
  MapPin,
  Minus,
  Package,
  Phone,
  Plus,
  Shield,
  ShoppingBag,
  Trash2,
  Truck,
  User,
  X,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { useTenantPublicRouting } from '@/hooks/useTenantPublicRouting';
import { getFreeShippingThreshold } from '@/lib/pos/calculations';
import { formatPrice } from '@/utils/formatters';
import { useToast } from '@/components/ui/use-toast';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface OrderConfirmationData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  total: number;
  paymentMethod: string;
  orderDate: string;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  cartTotal?: number;
  onRemoveItem?: (productId: string) => void;
  onUpdateItemQuantity?: (productId: string, quantity: number) => void;
  onOrderSuccess: (orderData: OrderConfirmationData) => void;
}

const EMPTY_CUSTOMER_INFO: CustomerInfo = { name: '', email: '', phone: '', address: '' };

function formatPaymentMethod(method: 'CASH' | 'CARD' | 'TRANSFER') {
  return { CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia' }[method] || method;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  cartItems,
  cartTotal,
  onRemoveItem,
  onUpdateItemQuantity,
  onOrderSuccess,
}: CheckoutModalProps) {
  const { config } = useBusinessConfig();
  const { tenantApiPath, tenantStorageScope } = useTenantPublicRouting();
  const { toast } = useToast();
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>(EMPTY_CUSTOMER_INFO);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH');
  const [shippingRegion, setShippingRegion] = useState('General');
  const [shippingCost, setShippingCost] = useState(0);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Partial<CustomerInfo>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const storageKey =
    tenantStorageScope === 'default' ? 'customer_info' : `customer_info_${tenantStorageScope}`;

  const subtotal = typeof cartTotal === 'number'
    ? cartTotal
    : cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const threshold = getFreeShippingThreshold(config, shippingRegion);
  const isFreeShipping = threshold > 0 && subtotal >= threshold;
  const appliedShipping = isFreeShipping ? 0 : Math.max(0, Number(shippingCost) || 0);
  const total = subtotal + appliedShipping;

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setIsLoading(false);
      setCustomerInfo(EMPTY_CUSTOMER_INFO);
      setPaymentMethod('CASH');
      setShippingRegion('General');
      setShippingCost(0);
      setNotes('');
      setErrors({});
      setSubmitError(null);
      return;
    }

    const savedCustomer = localStorage.getItem(storageKey);
    if (savedCustomer) {
      try {
        setCustomerInfo(JSON.parse(savedCustomer));
      } catch {
        setCustomerInfo(EMPTY_CUSTOMER_INFO);
      }
    }

    setTimeout(() => firstInputRef.current?.focus(), 100);
  }, [isOpen, storageKey]);

  useEffect(() => {
    if (isOpen && cartItems.length === 0 && !isLoading) {
      onClose();
    }
  }, [cartItems.length, isLoading, isOpen, onClose]);

  const validateCustomerInfo = () => {
    const nextErrors: Partial<CustomerInfo> = {};
    if (!customerInfo.name.trim()) nextErrors.name = 'El nombre es requerido';
    if (!customerInfo.email.trim()) nextErrors.email = 'El email es requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) nextErrors.email = 'Email invalido';
    if (!customerInfo.phone.trim()) nextErrors.phone = 'El telefono es requerido';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleCustomerInfoChange = (field: keyof CustomerInfo, value: string) => {
    setCustomerInfo((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async () => {
    if (!validateCustomerInfo()) return;

    setIsLoading(true);
    setSubmitError(null);

    try {
      localStorage.setItem(storageKey, JSON.stringify(customerInfo));
    } catch {}

    try {
      const validationResponse = await fetch(tenantApiPath('/api/cart/validate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems.map((item) => ({ id: item.id, quantity: item.quantity, price: item.price })),
        }),
      });
      const validation = await validationResponse.json().catch(() => null);

      if (!validationResponse.ok || validation?.valid === false) {
        const message = validation?.errors?.length
          ? `Errores en el carrito:\n${validation.errors.join('\n')}`
          : validation?.error || 'Error al validar el carrito';
        setSubmitError(message);
        toast({ title: 'Validacion del carrito', description: message, variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      const validatedSubtotal =
        typeof validation?.total === 'number' && Number.isFinite(validation.total)
          ? validation.total
          : subtotal;
      const validatedFreeShipping = threshold > 0 && validatedSubtotal >= threshold;
      const validatedShipping = validatedFreeShipping ? 0 : appliedShipping;
      const validatedTotal = validatedSubtotal + validatedShipping;

      const orderResponse = await fetch(tenantApiPath('/api/orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
            unitPrice: item.price,
          })),
          customerInfo,
          paymentMethod,
          shippingCost: validatedShipping,
          shippingRegion,
          notes: notes.trim() || undefined,
        }),
      });
      const result = await orderResponse.json().catch(() => null);

      if (!orderResponse.ok) {
        throw new Error(result?.error || 'Error al procesar la orden');
      }

      const order = result?.data?.order;
      const orderNumber = String(order?.orderNumber || '').trim();
      if (!orderNumber) throw new Error('El pedido se creo sin numero de seguimiento.');

      const businessWhatsApp = (config?.contact?.whatsapp || config?.contact?.phone || '').replace(/\D/g, '');
      if (businessWhatsApp) {
        const message =
          `Hola, quiero continuar con el pedido ${orderNumber}.\n\n` +
          cartItems.map((item) => `- ${item.name} x${item.quantity}`).join('\n') +
          `\n\nTotal registrado: ${formatPrice(Number(order?.total ?? validatedTotal), config)}`;
        const whatsappWindow = window.open(
          `https://wa.me/${businessWhatsApp}?text=${encodeURIComponent(message)}`,
          '_blank',
          'noopener,noreferrer'
        );
        if (!whatsappWindow) {
          toast({
            title: 'Pedido registrado',
            description: `Guarda el numero ${orderNumber} para continuar por WhatsApp.`,
          });
        }
      }

      onOrderSuccess({
        orderId: orderNumber,
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        total: Number(order?.total ?? validatedTotal),
        paymentMethod,
        orderDate: String(order?.createdAt || new Date().toISOString()),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al procesar la orden';
      setSubmitError(message);
      toast({ title: 'No se pudo completar el pedido', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isLoading) onClose(); }}>
      <DialogContent className="max-w-5xl gap-0 overflow-hidden p-0 bg-white dark:bg-slate-950">
        <div className="border-b border-slate-200 bg-gradient-to-r from-sky-600 to-blue-700 px-6 py-5 text-white dark:border-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/15 p-3"><ShoppingBag className="h-5 w-5" /></div>
              <div>
                <h2 className="text-lg font-semibold">Finalizar compra</h2>
                <p className="text-sm text-blue-100">{cartItems.length} productos en el carrito</p>
              </div>
            </div>
            <p className="text-2xl font-semibold">{formatPrice(total, config)}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6 p-6 sm:p-8">
            <div className="flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-300">
              <div className={`flex h-9 w-9 items-center justify-center rounded-full ${step === 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-900'}`}>1</div>
              <span>Tus datos</span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <div className={`flex h-9 w-9 items-center justify-center rounded-full ${step === 2 ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-900'}`}>2</div>
              <span>Pago y envio</span>
            </div>

            {step === 1 ? (
              <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"><User className="h-4 w-4 text-blue-600" />Nombre</label>
                  <input ref={firstInputRef} value={customerInfo.name} onChange={(e) => handleCustomerInfoChange('name', e.target.value)} className={inputClass} />
                  {errors.name ? <p className="mt-1 text-xs text-red-500">{errors.name}</p> : null}
                </div>
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"><Mail className="h-4 w-4 text-blue-600" />Email</label>
                  <input type="email" value={customerInfo.email} onChange={(e) => handleCustomerInfoChange('email', e.target.value)} className={inputClass} />
                  {errors.email ? <p className="mt-1 text-xs text-red-500">{errors.email}</p> : null}
                </div>
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"><Phone className="h-4 w-4 text-blue-600" />Telefono</label>
                  <input value={customerInfo.phone} onChange={(e) => handleCustomerInfoChange('phone', e.target.value)} className={inputClass} />
                  {errors.phone ? <p className="mt-1 text-xs text-red-500">{errors.phone}</p> : null}
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"><MapPin className="h-4 w-4 text-blue-600" />Direccion</label>
                  <textarea value={customerInfo.address} onChange={(e) => handleCustomerInfoChange('address', e.target.value)} rows={4} className={inputClass} />
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  {(['CASH', 'CARD', 'TRANSFER'] as const).map((method) => (
                    <button key={method} type="button" onClick={() => setPaymentMethod(method)} className={`rounded-2xl border p-4 text-left ${paymentMethod === method ? 'border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-950/30 dark:text-blue-100' : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'}`}>
                      <p className="font-medium">{formatPaymentMethod(method)}</p>
                    </button>
                  ))}
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"><Truck className="h-4 w-4 text-blue-600" />Region</label>
                    <input value={shippingRegion} onChange={(e) => setShippingRegion(e.target.value || 'General')} className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"><Package className="h-4 w-4 text-blue-600" />Costo envio</label>
                    <input type="number" min="0" step="0.01" value={shippingCost} onChange={(e) => setShippingCost(Math.max(0, Number(e.target.value || 0)))} className={inputClass} />
                  </div>
                </div>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className={inputClass} placeholder="Notas del pedido" />
                <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-100">
                  {threshold > 0
                    ? isFreeShipping
                      ? 'Tu pedido ya tiene envio gratis.'
                      : `Faltan ${formatPrice(Math.max(0, threshold - subtotal), config)} para envio gratis.`
                    : 'Configura el costo de envio si aplica.'}
                </div>
              </div>
            )}
          </div>

          <aside className="border-t border-slate-200 bg-slate-50 p-6 sm:p-8 lg:border-l lg:border-t-0 dark:border-slate-800 dark:bg-slate-900/50">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Resumen del pedido</h3>
            <div className="mt-4 space-y-3">
              {cartItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{item.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{formatPrice(item.price, config)} c/u</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatPrice(item.price * item.quantity, config)}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    {onUpdateItemQuantity ? (
                      <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
                        <button type="button" onClick={() => onUpdateItemQuantity(item.id, item.quantity - 1)} className="rounded-full p-2"><Minus className="h-4 w-4" /></button>
                        <span className="min-w-[2rem] text-center text-sm font-medium">{item.quantity}</span>
                        <button type="button" onClick={() => onUpdateItemQuantity(item.id, item.quantity + 1)} className="rounded-full p-2"><Plus className="h-4 w-4" /></button>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-500 dark:text-slate-400">Cantidad: {item.quantity}</span>
                    )}
                    {onRemoveItem ? (
                      <button type="button" onClick={() => onRemoveItem(item.id)} className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20">
                        <Trash2 className="h-4 w-4" />Quitar
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal, config)}</span></div>
              <div className="mt-2 flex justify-between"><span>Envio</span><span>{isFreeShipping ? 'Gratis' : formatPrice(appliedShipping, config)}</span></div>
              <div className="mt-3 border-t border-slate-200 pt-3 text-base font-semibold dark:border-slate-800">
                <div className="flex justify-between"><span>Total</span><span className="text-blue-700 dark:text-blue-300">{formatPrice(total, config)}</span></div>
              </div>
            </div>

            {submitError ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200">{submitError}</div> : null}
          </aside>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"><Shield className="h-3.5 w-3.5" />Solo se confirma cuando el pedido queda guardado.</div>
          <div className="flex gap-3">
            <button type="button" onClick={step === 1 ? onClose : () => setStep(1)} disabled={isLoading} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-3 text-sm font-medium dark:border-slate-800">
              {step === 1 ? <><X className="h-4 w-4" />Cancelar</> : <><ArrowLeft className="h-4 w-4" />Volver</>}
            </button>
            {step === 1 ? (
              <button type="button" onClick={() => { if (validateCustomerInfo()) setStep(2); }} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-600 to-blue-600 px-6 py-3 text-sm font-medium text-white">
                Continuar <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={isLoading} className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-600 to-blue-600 px-6 py-3 text-sm font-medium text-white disabled:opacity-60">
                {isLoading ? 'Procesando...' : <><CheckCircle2 className="h-4 w-4" />Confirmar pedido</>}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
