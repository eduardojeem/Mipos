import { useCallback, useMemo, useEffect, useState } from 'react';
import { toast } from '@/lib/toast';
import { type Product, type Customer } from '@/types';
import { useStockConfig, validateStockAvailability } from '@/lib/pos/stock-config';

export interface CartItem {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  discount?: number;
  total: number;
  product?: Product;
}

interface UseCartOptions {
  products: Product[];
  selectedCustomer?: Customer | null;
  isWholesaleMode: boolean;
  discount: number;
}

export function useCart({ products, selectedCustomer, isWholesaleMode, discount }: UseCartOptions) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const { config: stockConfig } = useStockConfig();

  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

  const computeFinalPricing = useCallback((product: Product, quantity: number) => {
    let basePrice = product.sale_price;
    const hasWholesalePrice = typeof product.wholesale_price === 'number' && product.wholesale_price > 0;
    const productMinWholesaleQty = typeof product.min_wholesale_quantity === 'number' ? (product.min_wholesale_quantity as number) : 0;
    const customerMinWholesaleQty = typeof selectedCustomer?.min_wholesale_quantity === 'number' ? (selectedCustomer?.min_wholesale_quantity as number) : 0;

    const qualifiesWholesaleQty = quantity >= Math.max(productMinWholesaleQty, customerMinWholesaleQty);

    if (isWholesaleMode && hasWholesalePrice && (qualifiesWholesaleQty || productMinWholesaleQty === 0)) {
      basePrice = product.wholesale_price as number;
    }

    let appliedDiscount = 0;
    const customerType = selectedCustomer?.customer_type;
    const customerWholesaleDiscount = typeof selectedCustomer?.wholesale_discount === 'number' ? (selectedCustomer?.wholesale_discount as number) : 0;

    if (customerType === 'WHOLESALE' && customerWholesaleDiscount > 0) {
      const discountedPrice = basePrice * (1 - customerWholesaleDiscount / 100);
      appliedDiscount = round2(basePrice - discountedPrice);
      basePrice = discountedPrice;
    }

    return { finalPrice: round2(basePrice), discount: appliedDiscount };
  }, [isWholesaleMode, selectedCustomer]);

  const addToCart = useCallback((product: Product, quantity: number = 1) => {
    const stockValidation = validateStockAvailability(product.stock_quantity, quantity, stockConfig);

    if (!stockValidation.valid) {
      toast.show({
        title: 'Stock insuficiente',
        description: stockValidation.message || `Solo hay ${product.stock_quantity} unidades disponibles`,
        variant: 'destructive',
      });
      return;
    }

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product_id === product.id);
      const newQuantity = existingItem ? existingItem.quantity + quantity : quantity;

      const updatedStockValidation = validateStockAvailability(product.stock_quantity, newQuantity, stockConfig);

      if (!updatedStockValidation.valid) {
        toast.show({
          title: 'Stock insuficiente',
          description: updatedStockValidation.message || `Solo hay ${product.stock_quantity} unidades disponibles`,
          variant: 'destructive',
        });
        return prevCart;
      }

      const { finalPrice, discount } = computeFinalPricing(product, newQuantity);

      if (existingItem) {
        return prevCart.map(item =>
          item.product_id === product.id
            ? {
              ...item,
              quantity: newQuantity,
              price: finalPrice,
              discount,
              total: finalPrice * newQuantity,
            }
            : item,
        );
      } else {
        const newItem: CartItem = {
          product_id: product.id,
          product_name: product.name,
          price: finalPrice,
          quantity,
          discount,
          total: finalPrice * quantity,
          product,
        };
        return [...prevCart, newItem];
      }
    });

    toast.show({
      title: 'Producto agregado',
      description: `${product.name} agregado al carrito`,
    });
  }, [stockConfig, computeFinalPricing]);

  const updateQuantity = useCallback((productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart(prevCart => prevCart.filter(item => item.product_id !== productId));
      return;
    }

    setCart(prevCart =>
      prevCart.map(item => {
        if (item.product_id === productId) {
          const product = products.find(p => p.id === productId);
          if (product && product.stock_quantity < newQuantity) {
            toast.show({
              title: 'Stock insuficiente',
              description: `Solo hay ${product.stock_quantity} unidades disponibles`,
              variant: 'destructive',
            });
            return item;
          }

          if (!product) return item;

          const { finalPrice, discount } = computeFinalPricing(product, newQuantity);

          return {
            ...item,
            quantity: newQuantity,
            price: finalPrice,
            discount,
            total: finalPrice * newQuantity,
          };
        }
        return item;
      }),
    );
  }, [products, computeFinalPricing]);

  const removeFromCart = useCallback((productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product_id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    toast.show({
      title: 'Carrito limpiado',
      description: 'Todos los productos han sido removidos del carrito',
    });
  }, []);

  // Recalcular precios del carrito cuando cambie el modo mayorista o el cliente
  useEffect(() => {
    setCart(prevCart => {
      let changed = false;
      const next = prevCart.map(item => {
        const product = products.find(p => p.id === item.product_id);
        if (!product) return item;
        const { finalPrice, discount } = computeFinalPricing(product, item.quantity);
        const newTotal = round2(finalPrice * item.quantity);
        if (item.price !== finalPrice || item.discount !== discount || item.total !== newTotal) {
          changed = true;
          return { ...item, price: finalPrice, discount, total: newTotal };
        }
        return item;
      });
      return changed ? next : prevCart;
    });
  }, [isWholesaleMode, selectedCustomer, products, computeFinalPricing]);


  const cartTotals = useMemo(() => {
    const IVA_RATE = Number(process.env.NEXT_PUBLIC_IVA_RATE ?? '0.16');
    const subtotal = round2(cart.reduce((sum, item) => sum + item.total, 0));
    const discountAmount = round2(discount);
    const base = Math.max(0, subtotal - discountAmount);
    const taxAmount = round2(base * IVA_RATE);
    const total = round2(base + taxAmount);

    return {
      subtotal,
      discountAmount,
      taxAmount,
      total,
      itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
    };
  }, [cart, discount]);

  return {
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    cartTotals,
    setCartItems: setCart,
  };
}
