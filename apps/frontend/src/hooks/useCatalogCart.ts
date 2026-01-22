'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import type { Product } from '@/types';

export interface CatalogCartItem {
    product: Product;
    quantity: number;
    selectedOptions?: Record<string, string>;
}

// Constantes de límites
const MAX_QTY_PER_PRODUCT = 10;
const MAX_TOTAL_ITEMS = 50;

/**
 * Hook para gestionar el carrito del catálogo público
 * Sincroniza automáticamente con localStorage y entre pestañas
 */
export function useCatalogCart() {
    const { toast } = useToast();
    const [cart, setCart] = useState<CatalogCartItem[]>([]);
    const [isHydrated, setIsHydrated] = useState(false);

    // Cargar carrito desde localStorage al montar
    useEffect(() => {
        try {
            const savedCart = localStorage.getItem('catalog_cart');
            if (savedCart) {
                const parsed = JSON.parse(savedCart);
                const rawCart = Array.isArray(parsed) ? parsed : [];
                const sanitized = rawCart
                    .map((it: any) => {
                        const p = it?.product || {};
                        const base = Number(p.sale_price ?? p.price ?? 0);
                        const off = Number(p.offer_price ?? NaN);
                        const effectiveOffer = off > 0 && off < base ? off : undefined;
                        const stock = Number(p.stock_quantity ?? 999);
                        const image = p.image_url || p.image || p.images?.[0]?.url;
                        const active = p.is_active ?? true;
                        const product = {
                            id: String(p.id || ''),
                            name: String(p.name || 'Producto'),
                            sale_price: base,
                            offer_price: effectiveOffer,
                            stock_quantity: stock,
                            image_url: image,
                            is_active: !!active,
                        } as any;
                        const qty = Math.max(1, Number(it?.quantity ?? 1));
                        if (!base && !effectiveOffer) return null;
                        return { product, quantity: qty } as CatalogCartItem;
                    })
                    .filter(Boolean);
                setCart(sanitized as CatalogCartItem[]);
            }
        } catch (error) {
            console.error('Error loading cart from localStorage:', error);
        } finally {
            setIsHydrated(true);
        }
    }, []);

    // Guardar carrito en localStorage cuando cambie
    useEffect(() => {
        if (!isHydrated) return;

        try {
            localStorage.setItem('catalog_cart', JSON.stringify(cart));
            try {
                const evt = new CustomEvent('catalog_cart_updated', { detail: cart });
                window.dispatchEvent(evt);
            } catch {}
        } catch (error) {
            console.error('Error saving cart to localStorage:', error);
            if (error instanceof Error && error.name === 'QuotaExceededError') {
                toast({
                    title: 'Error',
                    description: 'El carrito está lleno. Elimina algunos productos.',
                    variant: 'destructive',
                });
            }
        }
    }, [cart, isHydrated, toast]);

    // Sincronizar entre pestañas
    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'catalog_cart' && e.newValue) {
                try {
                    const parsed = JSON.parse(e.newValue);
                    setCart(Array.isArray(parsed) ? parsed : []);
                } catch (error) {
                    console.error('Error parsing cart from storage event:', error);
                }
            }
        };

        window.addEventListener('storage', handleStorage);
        const handleLocalUpdate = (e: Event) => {
            try {
                const detail = (e as CustomEvent).detail;
                if (Array.isArray(detail)) {
                    setCart(detail);
                }
            } catch {}
        };
        window.addEventListener('catalog_cart_updated', handleLocalUpdate as EventListener);
        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('catalog_cart_updated', handleLocalUpdate as EventListener);
        };
    }, []);

    const addToCart = useCallback((product: Product, quantity: number = 1) => {
        const maxQty = Math.max(0, Number(product.stock_quantity || 0));
        const active = product.is_active !== false;
        
        if (!active || maxQty <= 0) {
            toast({
                title: 'No disponible',
                description: 'El producto no está disponible actualmente',
                variant: 'destructive',
                duration: 2000,
            });
            return;
        }

        // Validar cantidad total de items en el carrito
        const currentTotalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        if (currentTotalItems + quantity > MAX_TOTAL_ITEMS) {
            toast({
                title: 'Límite de carrito alcanzado',
                description: `Máximo ${MAX_TOTAL_ITEMS} items por pedido`,
                variant: 'destructive',
            });
            return;
        }

        setCart(prev => {
            const existingItem = prev.find(item => item.product.id === product.id);
            if (existingItem) {
                // Aplicar límites: stock, máximo por producto
                const nextQty = Math.min(
                    existingItem.quantity + quantity, 
                    maxQty, 
                    MAX_QTY_PER_PRODUCT
                );
                
                if (nextQty === MAX_QTY_PER_PRODUCT && existingItem.quantity + quantity > MAX_QTY_PER_PRODUCT) {
                    toast({
                        title: 'Cantidad máxima alcanzada',
                        description: `Máximo ${MAX_QTY_PER_PRODUCT} unidades por producto`,
                        variant: 'destructive',
                    });
                } else if (nextQty !== existingItem.quantity + quantity) {
                    toast({
                        title: 'Stock insuficiente',
                        description: `Cantidad ajustada al stock disponible (${maxQty})`,
                        variant: 'destructive',
                    });
                }
                
                return prev.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: nextQty }
                        : item
                );
            } else {
                // Aplicar límites para nuevo producto
                const nextQty = Math.min(quantity, maxQty, MAX_QTY_PER_PRODUCT);
                
                if (nextQty === MAX_QTY_PER_PRODUCT && quantity > MAX_QTY_PER_PRODUCT) {
                    toast({
                        title: 'Cantidad máxima alcanzada',
                        description: `Máximo ${MAX_QTY_PER_PRODUCT} unidades por producto`,
                        variant: 'destructive',
                    });
                } else if (nextQty !== quantity) {
                    toast({
                        title: 'Stock insuficiente',
                        description: `Cantidad ajustada al stock disponible (${maxQty})`,
                        variant: 'destructive',
                    });
                }
                
                return [...prev, { product, quantity: nextQty }];
            }
        });

        {
            const price = Number((product as any).offer_price ?? (product as any).sale_price ?? (product as any).price ?? 0);
            toast({
                title: 'Agregado al carrito',
                description: `${product.name} ${quantity > 1 ? `x${quantity}` : ''} • $${price.toFixed(2)}`,
                duration: 2500,
            });
        }
    }, [toast, cart]);

    const removeFromCart = useCallback((productId: string) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
        toast({
            title: 'Producto eliminado',
            description: 'El producto se eliminó del carrito',
        });
    }, [toast]);

    const updateQuantity = useCallback((productId: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(productId);
            return;
        }
        
        setCart(prev =>
            prev.map(item => {
                if (item.product.id !== productId) return item;
                
                const maxQty = Math.max(0, Number(item.product.stock_quantity || 0));
                const nextQty = Math.min(quantity, maxQty, MAX_QTY_PER_PRODUCT);
                
                if (nextQty === MAX_QTY_PER_PRODUCT && quantity > MAX_QTY_PER_PRODUCT) {
                    toast({
                        title: 'Cantidad máxima alcanzada',
                        description: `Máximo ${MAX_QTY_PER_PRODUCT} unidades por producto`,
                        variant: 'destructive',
                    });
                } else if (nextQty !== quantity) {
                    toast({
                        title: 'Stock insuficiente',
                        description: `Cantidad ajustada al stock disponible (${maxQty})`,
                        variant: 'destructive',
                    });
                }
                
                return { ...item, quantity: nextQty };
            })
        );
    }, [removeFromCart, toast]);

    const clearCart = useCallback(() => {
        setCart([]);
        toast({
            title: 'Carrito vaciado',
            description: 'Se eliminaron todos los productos del carrito',
        });
    }, [toast]);

    const getItemQuantity = useCallback((productId: string): number => {
        const item = cart.find(item => item.product.id === productId);
        return item?.quantity || 0;
    }, [cart]);

    const cartTotal = cart.reduce((total, item) => {
        const unitPrice = Number(item.product.offer_price ?? item.product.sale_price ?? (item.product as any).price ?? 0);
        return total + unitPrice * item.quantity;
    }, 0);

    const cartItemsCount = cart.reduce((total, item) =>
        total + item.quantity, 0
    );

    return {
        cart,
        cartTotal,
        cartItemsCount,
        isHydrated,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getItemQuantity,
    };
}
