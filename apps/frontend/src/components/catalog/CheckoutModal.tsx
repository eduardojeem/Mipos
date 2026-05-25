'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { useTenantPublicRouting } from '@/hooks/useTenantPublicRouting';
import { useUserOrganizations } from '@/hooks/use-user-organizations';
import { getConfiguredShippingCost, getFreeShippingThreshold } from '@/lib/pos/calculations';
import { formatPrice } from '@/utils/formatters';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import {
  formatPaymentMethod,
  getEnabledPaymentMethods,
  type PaymentMethodCode,
} from '@/lib/orders/payment-methods';
import { cn } from '@/lib/utils';

/* ─── Constants ──────────────────────────────────────────────── */
const NOTES_MAX_LENGTH = 500;
const CUSTOMER_INFO_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

/* ─── Types ──────────────────────────────────────────────────── */
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

type BuyerType = 'guest' | 'customer' | 'business';
type FulfillmentType = 'DELIVERY' | 'PICKUP';

interface BuyerOrganization {
  id: string;
  name: string;
  slug?: string | null;
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

/* ─── ProductImagePlaceholder (inline, sin dependencia externa) ─ */
function CartItemImage({ image, name }: { image?: string; name: string }) {
  const [imgError, setImgError] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase();

  if (image && !imgError) {
    return (
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover"
          sizes="48px"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
      <span className="text-sm font-bold text-slate-500 dark:text-slate-400">{initial}</span>
    </div>
  );
}

/* ─── PaymentMethodCard ──────────────────────────────────────── */
const PAYMENT_ICONS: Record<PaymentMethodCode, React.ReactNode> = {
  CASH: <span className="text-lg">💵</span>,
  CARD: <span className="text-lg">💳</span>,
  TRANSFER: <span className="text-lg">🏦</span>,
};

const PAYMENT_DESCRIPTIONS: Record<PaymentMethodCode, string> = {
  CASH: 'Abonás al recibir',
  CARD: 'Tarjeta de debito',
  TRANSFER: 'Transferencia bancaria',
};

/* ─── StepIndicator ──────────────────────────────────────────── */
function StepIndicator({
  step,
  currentStep,
  label,
  completed,
  brandPrimary,
  onClick,
}: {
  step: number;
  currentStep: number;
  label: string;
  completed: boolean;
  brandPrimary: string;
  onClick: () => void;
}) {
  const isActive = currentStep === step;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Ir al paso ${step}: ${label}`}
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all hover:scale-105',
        isActive
          ? 'text-white shadow-sm'
          : completed
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
      )}
      style={isActive ? { backgroundColor: brandPrimary } : undefined}
    >
      {completed && !isActive ? <Check className="h-4 w-4" /> : step}
    </button>
  );
}

/* ─── Main CheckoutModal ─────────────────────────────────────── */
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
  const { user } = useAuth();
  const { profile } = useProfile();
  const { organizations: buyerOrganizations, loading: buyerOrganizationsLoading } = useUserOrganizations(user?.id, {
    scope: 'buyer',
    autoSelect: false,
  });
  const { toast } = useToast();
  const firstInputRef = useRef<HTMLInputElement>(null);
  const enabledPaymentMethods = useMemo(() => getEnabledPaymentMethods(config), [config]);

  const [step, setStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [step1Completed, setStep1Completed] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>(EMPTY_CUSTOMER_INFO);
  const [buyerType, setBuyerType] = useState<BuyerType>('guest');
  const [buyerOrganization, setBuyerOrganization] = useState<BuyerOrganization | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodCode>(
    enabledPaymentMethods[0] || 'CASH'
  );
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>('DELIVERY');
  const [shippingRegion, setShippingRegion] = useState('General');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Partial<CustomerInfo>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [currentRetry, setCurrentRetry] = useState(0);
  const [retryPhase, setRetryPhase] = useState<'none' | 'validating' | 'creating'>('none');

  // FIX Bug #3: usar un ref en lugar de estado para evitar stale closure
  // en el re-llamado a handleSubmit desde el banner de confirmación.
  const skipTotalCheckRef = useRef(false);
  const [pendingTotalConfirmation, setPendingTotalConfirmation] = useState<{
    clientTotal: number;
    serverTotal: number;
  } | null>(null);

  const storageKey =
    tenantStorageScope === 'default' ? 'customer_info' : `customer_info_${tenantStorageScope}`;
  const canBuyAsBusiness = Boolean(user?.id && buyerOrganization?.id);
  const isDelivery = fulfillmentType === 'DELIVERY';
  const configuredShippingZones = useMemo(
    () =>
      (config.storeSettings.freeShippingRegions || [])
        .map((zone) => ({
          ...zone,
          name: String(zone.name || '').trim(),
        }))
        .filter((zone) => zone.name.length > 0),
    [config.storeSettings.freeShippingRegions]
  );
  const defaultShippingRegion = configuredShippingZones[0]?.name || 'General';
  const selectedShippingZone = configuredShippingZones.find(
    (zone) =>
      zone.name.toLowerCase() === shippingRegion.toLowerCase() ||
      String(zone.id || '').toLowerCase() === shippingRegion.toLowerCase()
  );

  /* ── Derivados ── */
  const subtotal =
    typeof cartTotal === 'number'
      ? cartTotal
      : cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const threshold = isDelivery ? getFreeShippingThreshold(config, shippingRegion) : 0;
  const isFreeShipping = threshold > 0 && subtotal >= threshold;
  const appliedShipping = isDelivery ? getConfiguredShippingCost(config, subtotal, shippingRegion) : 0;
  const total = subtotal + appliedShipping;

  /* ── Efectos ── */
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setStep1Completed(false);
      setIsLoading(false);
      setCustomerInfo(EMPTY_CUSTOMER_INFO);
      setBuyerType('guest');
      setBuyerOrganization(null);
      setPaymentMethod(enabledPaymentMethods[0] || 'CASH');
      setFulfillmentType('DELIVERY');
      setShippingRegion(defaultShippingRegion);
      setNotes('');
      setErrors({});
      setSubmitError(null);
      setPendingTotalConfirmation(null);
      setCurrentRetry(0);
      setRetryPhase('none');
      skipTotalCheckRef.current = false;
      return;
    }

    let selectedOrganization: BuyerOrganization | null = null;
    try {
      const rawOrg = localStorage.getItem('selected_organization');
      const parsed = rawOrg ? JSON.parse(rawOrg) : null;
      if (parsed?.id && parsed?.name) {
        selectedOrganization = {
          id: String(parsed.id),
          name: String(parsed.name),
          slug: typeof parsed.slug === 'string' ? parsed.slug : null,
        };
      }
    } catch {}

    if (!selectedOrganization && user?.organizationId) {
      selectedOrganization = {
        id: user.organizationId,
        name: 'Mi empresa',
      };
    }

    setBuyerOrganization(selectedOrganization);
    setBuyerType(user?.id ? (selectedOrganization ? 'business' : 'customer') : 'guest');
    setShippingRegion((current) =>
      configuredShippingZones.some(
        (zone) =>
          zone.name.toLowerCase() === current.toLowerCase() ||
          String(zone.id || '').toLowerCase() === current.toLowerCase()
      )
        ? current
        : defaultShippingRegion
    );

    const savedCustomer = localStorage.getItem(storageKey);
    let restoredCustomer: CustomerInfo | null = null;
    if (savedCustomer) {
      try {
        const parsed = JSON.parse(savedCustomer) as
          | { data?: CustomerInfo; savedAt?: number }
          | CustomerInfo;
        if (parsed && typeof parsed === 'object' && 'data' in parsed && 'savedAt' in parsed) {
          const age = Date.now() - Number(parsed.savedAt || 0);
          if (age <= CUSTOMER_INFO_TTL_MS && parsed.data) {
            restoredCustomer = parsed.data as CustomerInfo;
          } else {
            localStorage.removeItem(storageKey);
          }
        } else {
          restoredCustomer = parsed as CustomerInfo;
        }
      } catch {
        restoredCustomer = EMPTY_CUSTOMER_INFO;
      }
    }

    setCustomerInfo({
      name: restoredCustomer?.name || profile?.name || user?.name || user?.full_name || '',
      email: restoredCustomer?.email || user?.email || '',
      phone: restoredCustomer?.phone || profile?.phone || user?.phone || '',
      address: restoredCustomer?.address || (user?.id ? profile?.location || '' : ''),
    });

    setTimeout(() => firstInputRef.current?.focus(), 100);
  }, [configuredShippingZones, defaultShippingRegion, enabledPaymentMethods, isOpen, profile?.location, profile?.name, profile?.phone, storageKey, user?.email, user?.full_name, user?.id, user?.name, user?.organizationId, user?.phone]);

  useEffect(() => {
    if (!isOpen || !user?.id || buyerOrganizationsLoading || !buyerOrganization?.id) return;

    const matchedOrganization = buyerOrganizations.find((organization) => organization.id === buyerOrganization.id);
    if (matchedOrganization) {
      if (matchedOrganization.name !== buyerOrganization.name || matchedOrganization.slug !== buyerOrganization.slug) {
        setBuyerOrganization({
          id: matchedOrganization.id,
          name: matchedOrganization.name,
          slug: matchedOrganization.slug,
        });
      }
      return;
    }

    setBuyerOrganization(null);
    setBuyerType('customer');

    try {
      const rawOrg = localStorage.getItem('selected_organization');
      const parsed = rawOrg ? JSON.parse(rawOrg) : null;
      if (parsed?.id === buyerOrganization.id) {
        localStorage.removeItem('selected_organization');
        const expired = 'path=/; SameSite=Lax; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = `x-organization-id=; ${expired}`;
        document.cookie = `x-organization-name=; ${expired}`;
        document.cookie = `x-organization-slug=; ${expired}`;
        window.dispatchEvent(new CustomEvent('organization-changed', {
          detail: { organizationId: null, organization: null },
        }));
      }
    } catch {}
  }, [buyerOrganization, buyerOrganizations, buyerOrganizationsLoading, isOpen, user?.id]);

  useEffect(() => {
    if (isOpen && cartItems.length === 0 && !isLoading) {
      onClose();
    }
  }, [cartItems.length, isLoading, isOpen, onClose]);

  /* ── Validación ── */
  const validateCustomerInfo = () => {
    const nextErrors: Partial<CustomerInfo> = {};
    if (!customerInfo.name.trim()) nextErrors.name = 'El nombre es requerido';
    if (!customerInfo.email.trim()) nextErrors.email = 'El email es requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email))
      nextErrors.email = 'Email inválido';
    if (!customerInfo.phone.trim()) nextErrors.phone = 'El teléfono es requerido';
    // FIX Bug #5: validación mínima de longitud para teléfono
    else if (customerInfo.phone.replace(/\D/g, '').length < 6)
      nextErrors.phone = 'Ingresá al menos 6 dígitos';
    if (isDelivery && !customerInfo.address.trim()) nextErrors.address = 'La dirección de entrega es requerida';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleCustomerInfoChange = (field: keyof CustomerInfo, value: string) => {
    setCustomerInfo((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleGoToStep2 = () => {
    if (validateCustomerInfo()) {
      setStep1Completed(true);
      setStep(2);
    }
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!validateCustomerInfo()) return;

    setIsLoading(true);
    setSubmitError(null);

    if (cartItems.length === 0) {
      setSubmitError('El carrito está vacío. Agregá productos para continuar.');
      toast({ title: 'Carrito vacío', description: 'El carrito está vacío. Agregá productos para continuar.', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify({ data: customerInfo, savedAt: Date.now() }));
    } catch {}

    try {
      const validationResponse = await fetch(tenantApiPath('/api/cart/validate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            id: item.id,
            quantity: item.quantity,
            price: item.price,
          })),
        }),
      });
      const validation = await validationResponse.json().catch(() => null);
      const validationSuccess = validationResponse.ok && validation?.valid !== false;

      if (!validationSuccess || !validation) {
        const message = validation?.errors?.length
          ? `Errores en el carrito:\n${validation.errors.join('\n')}`
          : validation?.error || 'No se pudo validar el carrito. Por favor, inténtalo de nuevo.';
        setSubmitError(message);
        toast({ title: 'Validación del carrito', description: message, variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      const validatedSubtotal =
        typeof validation?.total === 'number' && Number.isFinite(validation.total)
          ? validation.total
          : subtotal;
      const validatedShipping = isDelivery ? getConfiguredShippingCost(config, validatedSubtotal, shippingRegion) : 0;
      const validatedTotal = validatedSubtotal + validatedShipping;

      if (!skipTotalCheckRef.current && Math.abs(validatedTotal - total) > 0.01) {
        setPendingTotalConfirmation({ clientTotal: total, serverTotal: validatedTotal });
        setIsLoading(false);
        return;
      }

      skipTotalCheckRef.current = false;

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
          shippingRegion: isDelivery ? shippingRegion : 'Retiro en local',
          fulfillmentType,
          notes: notes.trim() || undefined,
          buyerContext: {
            buyerType: user?.id ? buyerType : 'guest',
            buyerUserId: user?.id || null,
            buyerOrganizationId: buyerType === 'business' ? buyerOrganization?.id || null : null,
            buyerOrganizationName: buyerType === 'business' ? buyerOrganization?.name || null : null,
          },
        }),
      });
      const result = await orderResponse.json().catch(() => null);
      
      if (!orderResponse.ok) {
        if (orderResponse.status === 409 && result?.code === 'PRICE_MISMATCH') {
          const msg = result?.error || 'El precio de un producto cambió. Por favor refrescá el carrito.';
          setSubmitError(msg);
          toast({ title: 'Precio actualizado', description: msg, variant: 'destructive' });
          setIsLoading(false);
          return;
        }
        throw new Error(result?.error || 'Error al procesar la orden');
      }

      const order = result?.data?.order;
      const orderNumber = String(order?.orderNumber || '').trim();
      if (!orderNumber) throw new Error('El pedido se creó sin número de seguimiento.');

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

  /* ── Handlers del banner de confirmación de precio ── */
  const handleAcceptPriceChange = () => {
    // FIX Bug #3: marcar el ref ANTES de llamar a handleSubmit para que
    // el check de discrepancia sea saltado en la siguiente ejecución.
    skipTotalCheckRef.current = true;
    setPendingTotalConfirmation(null);
    handleSubmit();
  };

  const brandPrimary = config.branding?.primaryColor || '#0f766e';

  /* ── Render ── */
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isLoading) onClose();
      }}
    >
      <DialogContent
        aria-describedby={undefined}
        className="!flex max-h-[96dvh] max-w-4xl !flex-col gap-0 overflow-hidden p-0 [&>button:last-of-type]:hidden dark:bg-slate-950"
      >
        {/* Header */}
        <div
          className="shrink-0 border-b border-white/10 px-6 py-4 text-white"
          style={{ backgroundColor: brandPrimary }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/15 p-2.5">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold sm:text-lg">Finalizar compra</h2>
                <p className="text-xs text-white/75 sm:text-sm">
                  {cartItems.length} {cartItems.length === 1 ? 'producto' : 'productos'} en el carrito
                </p>
              </div>
            </div>
            <p className="text-xl font-bold sm:text-2xl">{formatPrice(total, config)}</p>
          </div>
        </div>

        {/* Body — crece y encoge, scroll interno por columna */}
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* ── Columna izquierda: formulario ── */}
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5 sm:p-7">
            {/* Stepper */}
            <div className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-300">
              <StepIndicator
                step={1}
                currentStep={step}
                label="Tus datos"
                completed={step1Completed}
                brandPrimary={brandPrimary}
                onClick={() => setStep(1)}
              />
              <span className={step === 1 ? 'font-semibold text-slate-900 dark:text-white' : ''}>
                Tus datos
              </span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              <StepIndicator
                step={2}
                currentStep={step}
                label="Pago y envío"
                completed={false}
                brandPrimary={brandPrimary}
                onClick={handleGoToStep2}
              />
              <span className={step === 2 ? 'font-semibold text-slate-900 dark:text-white' : ''}>
                Pago y envío
              </span>
            </div>

            {user?.id ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Comprar como</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      El vendedor recibira estos datos para identificar al comprador.
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                    Sesion iniciada
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setBuyerType('customer')}
                    className={cn(
                      'rounded-xl border p-3 text-left transition',
                      buyerType === 'customer'
                        ? 'border-transparent bg-white shadow-sm ring-2 dark:bg-slate-950'
                        : 'border-slate-200 bg-white/60 hover:bg-white dark:border-slate-700 dark:bg-slate-950/40'
                    )}
                    style={buyerType === 'customer' ? { boxShadow: `0 0 0 2px ${brandPrimary}` } : undefined}
                  >
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Persona</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{user.name || user.email}</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => canBuyAsBusiness && setBuyerType('business')}
                    disabled={!canBuyAsBusiness}
                    className={cn(
                      'rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50',
                      buyerType === 'business'
                        ? 'border-transparent bg-white shadow-sm ring-2 dark:bg-slate-950'
                        : 'border-slate-200 bg-white/60 hover:bg-white dark:border-slate-700 dark:bg-slate-950/40'
                    )}
                    style={buyerType === 'business' ? { boxShadow: `0 0 0 2px ${brandPrimary}` } : undefined}
                  >
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Empresa</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {buyerOrganization?.name || 'Sin empresa seleccionada'}
                    </p>
                  </button>
                </div>
                <div
                  className={cn(
                    'mt-3 rounded-xl border px-3 py-2 text-xs',
                    buyerType === 'business'
                      ? 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200'
                      : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                  )}
                >
                  <span className="font-semibold">Comprando como: </span>
                  {buyerType === 'business'
                    ? buyerOrganization?.name || 'empresa seleccionada'
                    : user.name || user.email || 'persona'}
                  {buyerType === 'business' ? (
                    <span className="ml-1 text-blue-700 dark:text-blue-300">
                      El pedido quedara vinculado a esta empresa.
                    </span>
                  ) : (
                    <span className="ml-1">
                      El pedido quedara asociado a tu perfil personal.
                    </span>
                  )}
                </div>
              </div>
            ) : null}

            {/* Banner de confirmación de precio */}
            {pendingTotalConfirmation && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-950/20">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  ⚠️ El total del pedido cambió
                </p>
                <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                  Mostrabas{' '}
                  <strong>{formatPrice(pendingTotalConfirmation.clientTotal, config)}</strong>, pero
                  el servidor confirmó{' '}
                  <strong>{formatPrice(pendingTotalConfirmation.serverTotal, config)}</strong>.
                  Esto puede deberse a un cambio de precio o de oferta.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleAcceptPriceChange}
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    style={{ backgroundColor: brandPrimary }}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Aceptar y continuar
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingTotalConfirmation(null)}
                    className="rounded-full border border-amber-300 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/30"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* ── Paso 1: Datos del cliente ── */}
            {step === 1 && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    Tipo de pedido
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setFulfillmentType('DELIVERY')}
                      className={cn(
                        'rounded-2xl border p-4 text-left transition-all',
                        fulfillmentType === 'DELIVERY'
                          ? 'shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800/50'
                      )}
                      style={
                        fulfillmentType === 'DELIVERY'
                          ? { borderColor: brandPrimary, backgroundColor: `${brandPrimary}14` }
                          : undefined
                      }
                    >
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4" style={fulfillmentType === 'DELIVERY' ? { color: brandPrimary } : undefined} />
                        <span className="text-sm font-semibold">Delivery</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Enviamos el pedido a tu direccion.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFulfillmentType('PICKUP');
                        setErrors((prev) => ({ ...prev, address: undefined }));
                      }}
                      className={cn(
                        'rounded-2xl border p-4 text-left transition-all',
                        fulfillmentType === 'PICKUP'
                          ? 'shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800/50'
                      )}
                      style={
                        fulfillmentType === 'PICKUP'
                          ? { borderColor: brandPrimary, backgroundColor: `${brandPrimary}14` }
                          : undefined
                      }
                    >
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" style={fulfillmentType === 'PICKUP' ? { color: brandPrimary } : undefined} />
                        <span className="text-sm font-semibold">Retiro en local</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Pasas a retirar cuando el negocio lo marque como listo.
                      </p>
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <Label
                    htmlFor="checkout-name"
                    className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    <User className="h-4 w-4 text-slate-400" />
                    Nombre completo *
                  </Label>
                  <Input
                    id="checkout-name"
                    ref={firstInputRef}
                    value={customerInfo.name}
                    onChange={(e) => handleCustomerInfoChange('name', e.target.value)}
                    placeholder="Ej: Juan García"
                    className={cn(
                      'rounded-xl',
                      errors.name && 'border-red-400 focus-visible:ring-red-300'
                    )}
                  />
                  {errors.name && (
                    <p className="mt-1.5 text-xs font-medium text-red-500">{errors.name}</p>
                  )}
                </div>

                <div>
                  <Label
                    htmlFor="checkout-email"
                    className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    <Mail className="h-4 w-4 text-slate-400" />
                    Email *
                  </Label>
                  <Input
                    id="checkout-email"
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => handleCustomerInfoChange('email', e.target.value)}
                    placeholder="tu@email.com"
                    className={cn(
                      'rounded-xl',
                      errors.email && 'border-red-400 focus-visible:ring-red-300'
                    )}
                  />
                  {errors.email && (
                    <p className="mt-1.5 text-xs font-medium text-red-500">{errors.email}</p>
                  )}
                </div>

                <div>
                  <Label
                    htmlFor="checkout-phone"
                    className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    <Phone className="h-4 w-4 text-slate-400" />
                    Teléfono *
                  </Label>
                  <Input
                    id="checkout-phone"
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(e) => handleCustomerInfoChange('phone', e.target.value)}
                    placeholder="Ej: +549 11 1234-5678"
                    className={cn(
                      'rounded-xl',
                      errors.phone && 'border-red-400 focus-visible:ring-red-300'
                    )}
                  />
                  {errors.phone && (
                    <p className="mt-1.5 text-xs font-medium text-red-500">{errors.phone}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <Label
                    htmlFor="checkout-address"
                    className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    <MapPin className="h-4 w-4 text-slate-400" />
                    Dirección de entrega {isDelivery ? '*' : '(opcional)'}
                  </Label>
                  <textarea
                    id="checkout-address"
                    value={customerInfo.address}
                    onChange={(e) => handleCustomerInfoChange('address', e.target.value)}
                    rows={3}
                    placeholder={isDelivery ? 'Calle, número, piso, ciudad...' : 'Dato opcional para referencia'}
                    className={cn(
                      'w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                      errors.address && 'border-red-400 focus-visible:ring-red-300'
                    )}
                  />
                  {errors.address && (
                    <p className="mt-1.5 text-xs font-medium text-red-500">{errors.address}</p>
                  )}
                </div>
              </div>
            )}

            {/* ── Paso 2: Pago y envío ── */}
            {step === 2 && (
              <div className="space-y-5">
                {/* Métodos de pago */}
                <div>
                  <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Método de pago
                  </p>
                  <div
                    className={cn(
                      'grid gap-3',
                      enabledPaymentMethods.length === 1
                        ? 'grid-cols-1'
                        : enabledPaymentMethods.length === 2
                          ? 'grid-cols-2'
                          : 'grid-cols-3'
                    )}
                  >
                    {enabledPaymentMethods.map((method) => {
                      const selected = paymentMethod === method;
                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={cn(
                            'flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-all',
                            selected
                              ? 'shadow-sm'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800/50'
                          )}
                          style={
                            selected
                              ? {
                                  borderColor: brandPrimary,
                                  backgroundColor: `${brandPrimary}14`,
                                }
                              : undefined
                          }
                        >
                          {PAYMENT_ICONS[method]}
                          <p
                            className="mt-1 text-sm font-semibold"
                            style={selected ? { color: brandPrimary } : undefined}
                          >
                            {formatPaymentMethod(method)}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {PAYMENT_DESCRIPTIONS[method]}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Región de envío — solo informativa, readonly */}
                {isDelivery ? (
                <div>
                  <Label
                    htmlFor="checkout-region"
                    className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    <Truck className="h-4 w-4 text-slate-400" />
                    Región de envío
                  </Label>
                  {configuredShippingZones.length > 0 ? (
                    <Select value={shippingRegion} onValueChange={setShippingRegion}>
                      <SelectTrigger id="checkout-region" className="rounded-xl">
                        <SelectValue placeholder="Selecciona tu ciudad o zona" />
                      </SelectTrigger>
                      <SelectContent>
                        {configuredShippingZones.map((zone) => (
                          <SelectItem key={zone.id || zone.name} value={zone.name}>
                            {zone.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="checkout-region"
                      value={shippingRegion}
                      onChange={(e) => setShippingRegion(e.target.value || 'General')}
                      placeholder="General"
                      className="rounded-xl"
                    />
                  )}
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    Envio:{' '}
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {appliedShipping > 0 ? formatPrice(appliedShipping, config) : 'Gratis'}
                    </span>
                    {selectedShippingZone?.threshold && Number(selectedShippingZone.threshold) > 0
                      ? ` - Gratis desde ${formatPrice(Number(selectedShippingZone.threshold), config)}`
                      : threshold > 0
                        ? ` - Gratis desde ${formatPrice(threshold, config)}`
                        : ''}
                  </p>
                </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-200">
                    <div className="flex items-center gap-2 font-medium">
                      <Package className="h-4 w-4" />
                      Retiro en local
                    </div>
                    <p className="mt-1 text-emerald-800 dark:text-emerald-300">
                      No se cobra envio. El negocio te avisara cuando el pedido este listo.
                    </p>
                  </div>
                )}

                {/* Notas */}
                <div>
                  <Label
                    htmlFor="checkout-notes"
                    className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    <Package className="h-4 w-4 text-slate-400" />
                    Notas del pedido{' '}
                    <span className="text-xs font-normal text-slate-400">(opcional)</span>
                  </Label>
                  <textarea
                    id="checkout-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value.slice(0, NOTES_MAX_LENGTH))}
                    rows={3}
                    maxLength={NOTES_MAX_LENGTH}
                    placeholder="Instrucciones especiales, horarios, etc."
                    className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <p className="mt-1 text-right text-xs tabular-nums text-slate-400">
                    {notes.length}/{NOTES_MAX_LENGTH}
                  </p>
                </div>

                {/* Banner envío gratis */}
                {threshold > 0 && (
                  <div
                    className={cn(
                      'rounded-2xl border px-4 py-3 text-sm',
                      isFreeShipping
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-200'
                        : 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200'
                    )}
                  >
                    {isFreeShipping ? (
                      <span className="font-medium">✅ Tu pedido ya tiene envío gratis.</span>
                    ) : (
                      <>
                        <span className="font-medium">🚚 Faltan </span>
                        {formatPrice(Math.max(0, threshold - subtotal), config)}
                        {' '}para envío gratis.
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Columna derecha: resumen del carrito ── */}
          <aside className="w-full overflow-y-auto border-t border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/40 sm:p-6 lg:w-72 lg:border-l lg:border-t-0 xl:w-80">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Resumen del pedido
            </h3>

            {/* Ítems */}
            <div className="mt-4 space-y-3">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"
                >
                  <div className="flex items-start gap-3 p-3">
                    {/* Imagen del producto — FIX Mejora A */}
                    <CartItemImage image={item.image} name={item.name} />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {item.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatPrice(item.price, config)} c/u
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {formatPrice(item.price * item.quantity, config)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 dark:border-slate-800">
                    {onUpdateItemQuantity ? (
                      <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-900">
                        <button
                          type="button"
                          onClick={() => onUpdateItemQuantity(item.id, item.quantity - 1)}
                          className="rounded-full p-1.5 text-slate-600 transition hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
                          aria-label="Reducir cantidad"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-[1.75rem] text-center text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateItemQuantity(item.id, item.quantity + 1)}
                          className="rounded-full p-1.5 text-slate-600 transition hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
                          aria-label="Aumentar cantidad"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">Cant: {item.quantity}</span>
                    )}
                    {onRemoveItem && (
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                        className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs text-red-500 transition hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/20"
                        aria-label={`Quitar ${item.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Quitar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Totales */}
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-700 dark:bg-slate-950">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal, config)}</span>
              </div>
              <div className="mt-2 flex justify-between text-slate-600 dark:text-slate-300">
                <span>Envío</span>
                <span>
                  {isFreeShipping ? (
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      Gratis
                    </span>
                  ) : appliedShipping > 0 ? (
                    <span>{formatPrice(appliedShipping, config)}</span>
                  ) : (
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">Gratis</span>
                  )}
                </span>
              </div>
              <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="flex justify-between text-base font-bold">
                  <span className="text-slate-900 dark:text-white">Total</span>
                  <span
                    className="tabular-nums"
                    style={{ color: brandPrimary }}
                  >
                    {formatPrice(total, config)}
                  </span>
                </div>
              </div>
            </div>

            {/* Error de submit */}
            {submitError && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                {submitError}
              </div>
            )}
          </aside>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <Shield className="h-3.5 w-3.5 shrink-0" />
            Solo se confirma cuando el pedido queda guardado.
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={step === 1 ? onClose : () => setStep(1)}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {step === 1 ? (
                <>
                  <X className="h-4 w-4" />
                  Cancelar
                </>
              ) : (
                <>
                  <ArrowLeft className="h-4 w-4" />
                  Volver
                </>
              )}
            </button>

            {step === 1 ? (
              <button
                type="button"
                onClick={handleGoToStep2}
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95"
                style={{ backgroundColor: brandPrimary }}
              >
                Continuar
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || Boolean(pendingTotalConfirmation)}
                className="inline-flex min-w-[200px] items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-60"
                style={{ backgroundColor: brandPrimary }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Procesando…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Confirmar pedido
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
