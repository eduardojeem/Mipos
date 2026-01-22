'use client';

import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import type { Product } from '@/types';

interface SearchSuggestionsProps {
    searchQuery: string;
    products: Product[];
    onSelectSuggestion: (productName: string) => void;
    maxSuggestions?: number;
}

export default function SearchSuggestions({
    searchQuery,
    products,
    onSelectSuggestion,
    maxSuggestions = 5,
}: SearchSuggestionsProps) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Filtrar sugerencias
    const suggestions = searchQuery.trim().length > 1
        ? products
            .filter((p) =>
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
            )
            .slice(0, maxSuggestions)
        : [];

    // Reset selected index cuando cambia la búsqueda
    useEffect(() => {
        setSelectedIndex(0);
    }, [searchQuery]);

    // Navegación por teclado
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (suggestions.length === 0) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex((i) => Math.max(i - 1, 0));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (suggestions[selectedIndex]) {
                        onSelectSuggestion(suggestions[selectedIndex].name);
                    }
                    break;
                case 'Escape':
                    // El componente padre debería manejar esto
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [suggestions, selectedIndex, onSelectSuggestion]);

    // Scroll automático al item seleccionado
    useEffect(() => {
        if (containerRef.current) {
            const selectedElement = containerRef.current.children[selectedIndex] as HTMLElement;
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [selectedIndex]);

    if (suggestions.length === 0) {
        return searchQuery.trim().length > 1 ? (
            <div className="absolute z-20 mt-2 w-full rounded-xl border border-border bg-popover shadow-md overflow-hidden">
                <div className="px-3 py-2 text-sm text-muted-foreground">
                    Sin sugerencias
                </div>
            </div>
        ) : null;
    }

    return (
        <div
            ref={containerRef}
            className="absolute z-20 mt-2 w-full rounded-xl border border-border bg-popover shadow-md overflow-hidden max-h-80 overflow-y-auto"
            role="listbox"
            aria-label="Sugerencias de búsqueda"
        >
            {suggestions.map((product, index) => (
                <button
                    key={product.id}
                    className={`w-full text-left px-3 py-2 hover:bg-muted transition-colors ${index === selectedIndex ? 'bg-accent' : ''
                        }`}
                    onClick={() => onSelectSuggestion(product.name)}
                    role="option"
                    aria-selected={index === selectedIndex}
                    onMouseEnter={() => setSelectedIndex(index)}
                >
                    <div className="flex items-center gap-3">
                        {product.image_url && (
                            <img
                                src={product.image_url}
                                alt=""
                                className="w-10 h-10 object-cover rounded"
                            />
                        )}
                        <div className="flex-1 min-w-0">
                            <span className="block text-base md:text-lg text-foreground font-medium truncate">
                                {highlightMatch(product.name, searchQuery)}
                            </span>
                            {product.description && (
                                <span className="block text-sm text-muted-foreground truncate">
                                    {product.description}
                                </span>
                            )}
                        </div>
                        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </div>
                </button>
            ))}

            {/* Hint de navegación por teclado */}
            <div className="px-3 py-2 text-xs text-muted-foreground border-t bg-muted/30">
                <kbd className="px-1.5 py-0.5 text-xs font-semibold text-foreground bg-background border rounded">↑</kbd>
                {' '}
                <kbd className="px-1.5 py-0.5 text-xs font-semibold text-foreground bg-background border rounded">↓</kbd>
                {' '}para navegar •{' '}
                <kbd className="px-1.5 py-0.5 text-xs font-semibold text-foreground bg-background border rounded">Enter</kbd>
                {' '}para seleccionar
            </div>
        </div>
    );
}

// Helper para resaltar coincidencias
function highlightMatch(text: string, query: string): React.ReactNode {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === query.toLowerCase() ? (
                    <mark key={i} className="bg-yellow-200 dark:bg-yellow-900 font-semibold">
                        {part}
                    </mark>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </>
    );
}
