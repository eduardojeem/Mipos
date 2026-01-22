'use client';

import { useRouter } from 'next/navigation';
import {
    Package,
    Tag,
    Users,
    LayoutDashboard,
    ShoppingCart,
    FileText,
    BarChart3,
    Truck,
    Settings,
    Loader2,
    SearchX
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SearchResult, SearchResultType } from '@/hooks/use-global-search';
import { Badge } from '@/components/ui/badge';

const icons = {
    product: Package,
    category: Tag,
    customer: Users,
    page: LayoutDashboard,
    sale: FileText,
    supplier: Truck
};

const typeLabels: Record<SearchResultType, string> = {
    product: 'Productos',
    category: 'Categorías',
    customer: 'Clientes',
    sale: 'Ventas',
    supplier: 'Proveedores',
    page: 'Páginas'
};

const typeColors: Record<SearchResultType, string> = {
    product: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
    category: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
    customer: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20',
    sale: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
    supplier: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20',
    page: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/20'
};

interface SearchResultsProps {
    results: SearchResult[];
    groupedResults: Record<SearchResultType, SearchResult[]>;
    isLoading: boolean;
    isEmpty: boolean;
    query: string;
    selectedIndex: number;
    onSelect: (result: SearchResult) => void;
    onClose: () => void;
}

export function SearchResults({
    results,
    groupedResults,
    isLoading,
    isEmpty,
    query,
    selectedIndex,
    onSelect,
    onClose
}: SearchResultsProps) {
    const router = useRouter();

    if (!query || query.length < 2) {
        return (
            <div className="p-8 text-center">
                <SearchX className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                    Escribe al menos 2 caracteres para buscar
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                    Busca productos, categorías, clientes y más
                </p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-blue-500 mb-3" />
                <p className="text-sm text-muted-foreground">Buscando...</p>
            </div>
        );
    }

    if (isEmpty) {
        return (
            <div className="p-8 text-center">
                <SearchX className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">
                    No se encontraron resultados
                </p>
                <p className="text-xs text-muted-foreground">
                    Intenta con otros términos de búsqueda
                </p>
            </div>
        );
    }

    let currentIndex = 0;

    return (
        <div className="max-h-[400px] overflow-y-auto">
            {Object.entries(groupedResults).map(([type, typeResults]) => {
                if (typeResults.length === 0) return null;

                const TypeIcon = icons[type as SearchResultType] || Package;
                const typeColor = typeColors[type as SearchResultType];

                return (
                    <div key={type} className="mb-2 last:mb-0">
                        {/* Category Header */}
                        <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 px-3 py-2 border-b">
                            <div className="flex items-center gap-2">
                                <TypeIcon className={cn("h-4 w-4", typeColor.split(' ')[0])} />
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    {typeLabels[type as SearchResultType]}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                    {typeResults.length}
                                </Badge>
                            </div>
                        </div>

                        {/* Results */}
                        <div className="py-1">
                            {typeResults.map((result) => {
                                const isSelected = currentIndex === selectedIndex;
                                const itemIndex = currentIndex++;

                                return (
                                    <button
                                        key={result.id}
                                        onClick={() => {
                                            onSelect(result);
                                            router.push(result.href);
                                            onClose();
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                                            "hover:bg-accent focus:bg-accent focus:outline-none",
                                            isSelected && "bg-accent"
                                        )}
                                    >
                                        {/* Icon */}
                                        <div className={cn(
                                            "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
                                            typeColor
                                        )}>
                                            <TypeIcon className="h-5 w-5" />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium truncate">
                                                    {result.title}
                                                </p>
                                                {result.badge && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {result.badge}
                                                    </Badge>
                                                )}
                                            </div>
                                            {result.subtitle && (
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {result.subtitle}
                                                </p>
                                            )}
                                            {result.description && (
                                                <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
                                                    {result.description}
                                                </p>
                                            )}
                                        </div>

                                        {/* Arrow hint */}
                                        {isSelected && (
                                            <div className="flex-shrink-0">
                                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-muted rounded">
                                                        ↵
                                                    </kbd>
                                                </div>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            {/* Footer hint */}
            <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t px-3 py-2">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1 py-0.5 bg-muted rounded">↑</kbd>
                            <kbd className="px-1 py-0.5 bg-muted rounded">↓</kbd>
                            navegar
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1 py-0.5 bg-muted rounded">↵</kbd>
                            abrir
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1 py-0.5 bg-muted rounded">esc</kbd>
                            cerrar
                        </span>
                    </div>
                    <span className="text-[9px]">
                        {results.length} resultado{results.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>
        </div>
    );
}
