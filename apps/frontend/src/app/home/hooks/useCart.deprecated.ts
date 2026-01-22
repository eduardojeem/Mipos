/**
 * Custom hook for managing shopping cart operations
 * Handles localStorage persistence and provides cart operations
 */

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

export interface CartItem {
  product: {
    id: string;
    name: string;
    sale_price: number;
    image?: string;
  };
  quantity: number;
}

interface UseCartReturn {
  cart: CartItem[];
  addToCart: (product: any) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  error: Error | null;
}

const CART_STORAGE_KEY = 'catalog_cart';

/**
 * Hook to manage shopping cart with localStorage persistence
 * 
 * @returns Cart state and operations
 */
export function useCart(): UseCartReturn {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed)) {
          setCart(parsed);
        }
      }
    } catch (err) {
      console.error('Error loading cart from localStorage:', err);
      setError(err instanceof Error ? err : new Error('Failed to load cart'));
    }
  }, []);

  // Save cart to localStorage whenever it changes
  const saveCart = useCallback((newCart: CartItem[]) => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newCart));
      setCart(newCart);
      setError(null);
    } catch (err) {
      console.error('Error saving cart to localStorage:', err);
      const error = err instanceof Error ? err : new Error('Failed to save cart');
      setError(error);
      
      toast({
        title: 'Error al guardar',
        description: 'No se pudo guardar el carrito. El almacenamiento puede estar lleno.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  /**
   * Adds a product to the cart
   * If product already exists, increments quantity by 1
   */
  const addToCart = useCallback((product: any) => {
    try {
      if (!product?.id) {
        throw new Error('Invalid product: missing id');
      }

      const productId = String(product.id);
      const existingIndex = cart.findIndex((item) => 
        String(item.product.id) === productId
      );

      let newCart: CartItem[];

      if (existingIndex >= 0) {
        // Product exists, increment quantity
        newCart = [...cart];
        newCart[existingIndex] = {
          ...newCart[existingIndex],
          quantity: newCart[existingIndex].quantity + 1,
        };
      } else {
        // New product, add to cart
        const cartItem: CartItem = {
          product: {
            id: productId,
            name: String(product.name || 'Producto'),
            sale_price: Number(product.sale_price || product.price || 0),
            image: product.image || product.image_url,
          },
          quantity: 1,
        };
        newCart = [...cart, cartItem];
      }

      saveCart(newCart);

      toast({
        title: 'Agregado al carrito',
        description: `${product.name || 'Producto'} se añadió correctamente.`,
      });
    } catch (err) {
      console.error('Error adding to cart:', err);
      const error = err instanceof Error ? err : new Error('Failed to add to cart');
      setError(error);
      
      toast({
        title: 'Error',
        description: 'No se pudo agregar el producto al carrito.',
        variant: 'destructive',
      });
    }
  }, [cart, saveCart, toast]);

  /**
   * Removes a product from the cart
   */
  const removeFromCart = useCallback((productId: string) => {
    try {
      const newCart = cart.filter((item) => 
        String(item.product.id) !== String(productId)
      );
      
      saveCart(newCart);

      toast({
        title: 'Producto eliminado',
        description: 'El producto se eliminó del carrito.',
      });
    } catch (err) {
      console.error('Error removing from cart:', err);
      const error = err instanceof Error ? err : new Error('Failed to remove from cart');
      setError(error);
      
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el producto del carrito.',
        variant: 'destructive',
      });
    }
  }, [cart, saveCart, toast]);

  /**
   * Updates the quantity of a product in the cart
   * If quantity is 0 or less, removes the product
   */
  const updateQuantity = useCallback((productId: string, quantity: number) => {
    try {
      if (quantity <= 0) {
        removeFromCart(productId);
        return;
      }

      const newCart = cart.map((item) => {
        if (String(item.product.id) === String(productId)) {
          return {
            ...item,
            quantity: Math.max(1, Math.floor(quantity)),
          };
        }
        return item;
      });

      saveCart(newCart);
    } catch (err) {
      console.error('Error updating quantity:', err);
      const error = err instanceof Error ? err : new Error('Failed to update quantity');
      setError(error);
      
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la cantidad.',
        variant: 'destructive',
      });
    }
  }, [cart, saveCart, removeFromCart, toast]);

  /**
   * Clears all items from the cart
   */
  const clearCart = useCallback(() => {
    try {
      saveCart([]);

      toast({
        title: 'Carrito vaciado',
        description: 'Se eliminaron todos los productos del carrito.',
      });
    } catch (err) {
      console.error('Error clearing cart:', err);
      const error = err instanceof Error ? err : new Error('Failed to clear cart');
      setError(error);
      
      toast({
        title: 'Error',
        description: 'No se pudo vaciar el carrito.',
        variant: 'destructive',
      });
    }
  }, [saveCart, toast]);

  return {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    error,
  };
}
