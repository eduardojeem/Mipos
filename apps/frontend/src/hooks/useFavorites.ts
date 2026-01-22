'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

/**
 * Hook para gestionar favoritos del catálogo
 * Sincroniza automáticamente con localStorage y entre pestañas
 */
export function useFavorites() {
    const { toast } = useToast();
    const [favorites, setFavorites] = useState<string[]>([]);
    const [isHydrated, setIsHydrated] = useState(false);

    // Cargar favoritos desde localStorage al montar
    useEffect(() => {
        try {
            const savedFavorites = localStorage.getItem('catalog_favorites');
            if (savedFavorites) {
                const parsed = JSON.parse(savedFavorites);
                setFavorites(Array.isArray(parsed) ? parsed : []);
            }
        } catch (error) {
            console.error('Error loading favorites from localStorage:', error);
        } finally {
            setIsHydrated(true);
        }
    }, []);

    // Guardar favoritos en localStorage cuando cambien
    useEffect(() => {
        if (!isHydrated) return;

        try {
            localStorage.setItem('catalog_favorites', JSON.stringify(favorites));
        } catch (error) {
            console.error('Error saving favorites to localStorage:', error);
        }
    }, [favorites, isHydrated]);

    // Sincronizar entre pestañas
    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'catalog_favorites' && e.newValue) {
                try {
                    const parsed = JSON.parse(e.newValue);
                    setFavorites(Array.isArray(parsed) ? parsed : []);
                } catch (error) {
                    console.error('Error parsing favorites from storage event:', error);
                }
            }
        };

        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const toggleFavorite = useCallback((productId: string) => {
        const isFavorite = favorites.includes(productId);
        setFavorites(prev => (isFavorite ? prev.filter(id => id !== productId) : [...prev, productId]));
        if (isFavorite) {
            toast({ title: 'Eliminado de favoritos', description: 'El producto se eliminó de tus favoritos' });
        } else {
            toast({ title: 'Agregado a favoritos', description: 'El producto se agregó a tus favoritos' });
        }
    }, [favorites, toast]);

    const addFavorite = useCallback((productId: string) => {
        if (favorites.includes(productId)) return;
        setFavorites(prev => [...prev, productId]);
        toast({ title: 'Agregado a favoritos', description: 'El producto se agregó a tus favoritos' });
    }, [favorites, toast]);

    const removeFavorite = useCallback((productId: string) => {
        if (!favorites.includes(productId)) return;
        setFavorites(prev => prev.filter(id => id !== productId));
        toast({ title: 'Eliminado de favoritos', description: 'El producto se eliminó de tus favoritos' });
    }, [favorites, toast]);

    const clearFavorites = useCallback(() => {
        if (favorites.length === 0) return;
        setFavorites([]);
        toast({ title: 'Favoritos limpiados', description: 'Se eliminaron todos los favoritos' });
    }, [favorites, toast]);

    const isFavorite = useCallback((productId: string): boolean => {
        return favorites.includes(productId);
    }, [favorites]);

    return {
        favorites,
        isHydrated,
        toggleFavorite,
        addFavorite,
        removeFavorite,
        clearFavorites,
        isFavorite,
        favoritesCount: favorites.length,
    };
}
