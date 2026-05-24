"use client";

import { useMemo, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCatalogCart } from '@/hooks/useCatalogCart';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { formatPrice } from '@/utils/formatters';
import { getTenantPublicSections } from '@/lib/public-site/tenant-public-config';
import CheckoutModal from '@/components/catalog/CheckoutModal';
import OrderConfirmationModal from '@/components/catalog/OrderConfirmationModal';

type OrderConfirmationData = {
  orderId: string;
  customerName: string;
  customerEmail: string;
  total: number;
  paymentMethod: string;
  orderDate: string;
};

export function CartButton() {
  const {
    cart,
    cartTotal,
    cartItemsCount,
    removeFromCart,
    updateQuantity,
    clearCart,
  } = useCatalogCart();
  const { config } = useBusinessConfig();
  const sections = getTenantPublicSections(config);
  const [showCheckout, setShowCheckout] = useState(false);
  const [confirmationData, setConfirmationData] = useState<OrderConfirmationData | null>(null);

  const primary = config.branding?.primaryColor || '#0f766e';

  const totalsLabel = useMemo(
    () =>
      `${cartItemsCount} ${cartItemsCount === 1 ? 'producto' : 'productos'} en el carrito. Total ${formatPrice(
        cartTotal || 0,
        config
      )}`,
    [cartItemsCount, cartTotal, config]
  );

  if (!sections.showCart) {
    return null;
  }

  return (
    <>
      <Button
        size="icon"
        className="relative h-10 w-10 rounded-xl text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
        aria-label={totalsLabel}
        disabled={cartItemsCount === 0}
        onClick={() => setShowCheckout(true)}
        style={{ backgroundColor: primary }}
      >
        <ShoppingBag className="h-5 w-5" />
        {cartItemsCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-900 dark:bg-white px-1 text-[10px] font-bold text-white dark:text-slate-900 border-2 border-white dark:border-slate-900">
            {cartItemsCount > 9 ? '9+' : cartItemsCount}
          </span>
        ) : null}
      </Button>

      <div className="sr-only" aria-live="polite" aria-atomic="true" role="status">
        {totalsLabel}
      </div>

      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        cartItems={cart.map((item) => ({
          id: item.product.id,
          name: item.product.name,
          price: Number(item.product.offer_price ?? item.product.sale_price ?? 0),
          quantity: item.quantity,
          image: item.product.image_url,
        }))}
        cartTotal={cartTotal}
        onRemoveItem={removeFromCart}
        onUpdateItemQuantity={updateQuantity}
        onOrderSuccess={(orderData) => {
          setShowCheckout(false);
          setConfirmationData(orderData);
          clearCart();
        }}
      />

      <OrderConfirmationModal
        isOpen={Boolean(confirmationData)}
        onClose={() => setConfirmationData(null)}
        orderId={confirmationData?.orderId || ''}
        customerName={confirmationData?.customerName || ''}
        customerEmail={confirmationData?.customerEmail || ''}
        total={confirmationData?.total || 0}
        paymentMethod={confirmationData?.paymentMethod || 'CASH'}
        orderDate={confirmationData?.orderDate || new Date().toISOString()}
      />
    </>
  );
}
