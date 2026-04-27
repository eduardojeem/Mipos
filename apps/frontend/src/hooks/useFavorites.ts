'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useTenantPublicRouting } from '@/hooks/useTenantPublicRouting';

/**
 * Hook para gestionar favoritos del catalogo
 * Sincroniza automaticamente con localStorage y entre pestanas
 */
export function useFavorites() {
    const { toast } = useToast();
    const { tenantStorageScope } = useTenantPublicRouting();
    const [favorites, setFavorites] = useState<string[]>([]);
    const [isHydrated, setIsHydrated] = useState(false);
    const favoritesStorageKey = useMemo(
        () => tenantStorageScope === 'default' ? 'catalog_favorites' : `catalog_favorites_${tenantStorageScope}`,
        [tenantStorageScope]
    );
    const favoritesUpdateEventName = 'catalog_favorites_updated';

    // Cargar favoritos desde localStorage al montar
    useEffect(() => {
        setIsHydrated(false);
        try {
            const savedFavorites = localStorage.getItem(favoritesStorageKey);
            if (savedFavorites) {
                const parsed = JSON.parse(savedFavorites);
                setFavorites(Array.isArray(parsed) ? parsed : []);
            } else {
                setFavorites([]);
            }
        } catch (error) {
            console.error('Error loading favorites from localStorage:', error);
            setFavorites([]);
        } finally {
            setIsHydrated(true);
        }
    }, [favoritesStorageKey]);

    // Guardar favoritos en localStorage cuando cambien
    useEffect(() => {
        if (!isHydrated) return;

        try {
            localStorage.setItem(favoritesStorageKey, JSON.stringify(favorites));
            try {
                const evt = new CustomEvent(favoritesUpdateEventName, {
                    detail: {
                        key: favoritesStorageKey,
                        favorites,
                    },
                });
                window.dispatchEvent(evt);
            } catch {}
        } catch (error) {
            console.error('Error saving favorites to localStorage:', error);
        }
    }, [favorites, isHydrated, favoritesStorageKey]);

    // Sincronizar entre pestanas
    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key === favoritesStorageKey) {
                try {
                    const parsed = e.newValue ? JSON.parse(e.newValue) : [];
                    setFavorites(Array.isArray(parsed) ? parsed : []);
                } catch (error) {
                    console.error('Error parsing favorites from storage event:', error);
                }
            }
        };

        const handleLocalUpdate = (e: Event) => {
            try {
                const detail = (e as CustomEvent).detail;
                if (detail?.key === favoritesStorageKey && Array.isArray(detail.favorites)) {
                    setFavorites(detail.favorites);
                }
            } catch {}
        };

        window.addEventListener('storage', handleStorage);
        window.addEventListener(favoritesUpdateEventName, handleLocalUpdate as EventListener);
        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener(favoritesUpdateEventName, handleLocalUpdate as EventListener);
        };
    }, [favoritesStorageKey]);

    const toggleFavorite = useCallback((productId: string) => {
        const favoriteActive = favorites.includes(productId);
        setFavorites((prev) =>
            favoriteActive ? prev.filter((id) => id !== productId) : [...prev, productId]
        );
        if (favoriteActive) {
            toast({ title: 'Eliminado de favoritos', description: 'El producto se elimino de tus favoritos' });
        } else {
            toast({ title: 'Agregado a favoritos', description: 'El producto se agrego a tus favoritos' });
        }
    }, [favorites, toast]);

    const addFavorite = useCallback((productId: string) => {
        if (favorites.includes(productId)) return;
        setFavorites((prev) => [...prev, productId]);
        toast({ title: 'Agregado a favoritos', description: 'El producto se agrego a tus favoritos' });
    }, [favorites, toast]);

    const removeFavorite = useCallback((productId: string) => {
        if (!favorites.includes(productId)) return;
        setFavorites((prev) => prev.filter((id) => id !== productId));
        toast({ title: 'Eliminado de favoritos', description: 'El producto se elimino de tus favoritos' });
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
