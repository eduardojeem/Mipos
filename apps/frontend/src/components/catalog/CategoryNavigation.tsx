'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRight, Home, Search, Grid, List, Filter, ArrowUp, Package, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  productCount: number;
  parentId?: string;
  children?: Category[];
  isPopular?: boolean;
  isFeatured?: boolean;
}

interface CategoryNavigationProps {
  categories: Category[];
  currentCategory?: string;
  onCategoryChange: (categoryId: string | null) => void;
  onSearch?: (term: string) => void;
  searchTerm?: string;
  className?: string;
  showBreadcrumbs?: boolean;
  showSearch?: boolean;
  showStats?: boolean;
  compact?: boolean;
}

export const CategoryNavigation: React.FC<CategoryNavigationProps> = ({
  categories,
  currentCategory,
  onCategoryChange,
  onSearch,
  searchTerm = '',
  className,
  showBreadcrumbs = true,
  showSearch = true,
  showStats = true,
  compact = false
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchInput, setSearchInput] = useState(searchTerm);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Build category hierarchy
  const categoryHierarchy = React.useMemo(() => {
    const categoryMap = new Map<string, Category>();
    const rootCategories: Category[] = [];

    // First pass: create map
    categories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    // Second pass: build hierarchy
    categories.forEach(cat => {
      if (cat.parentId && categoryMap.has(cat.parentId)) {
        const parent = categoryMap.get(cat.parentId)!;
        const child = categoryMap.get(cat.id)!;
        parent.children!.push(child);
      } else {
        const rootCat = categoryMap.get(cat.id)!;
        rootCategories.push(rootCat);
      }
    });

    return rootCategories;
  }, [categories]);

  // Get breadcrumb path
  const getBreadcrumbPath = (categoryId: string): Category[] => {
    const path: Category[] = [];
    
    const findPath = (cats: Category[], targetId: string): boolean => {
      for (const cat of cats) {
        path.push(cat);
        
        if (cat.id === targetId) {
          return true;
        }
        
        if (cat.children && findPath(cat.children, targetId)) {
          return true;
        }
        
        path.pop();
      }
      return false;
    };

    if (categoryId) {
      findPath(categoryHierarchy, categoryId);
    }

    return path;
  };

  const breadcrumbPath = currentCategory ? getBreadcrumbPath(currentCategory) : [];

  // Auto-expand path to current category
  useEffect(() => {
    if (currentCategory) {
      const path = getBreadcrumbPath(currentCategory);
      const newExpanded = new Set(expandedCategories);
      path.forEach(cat => {
        if (cat.children && cat.children.length > 0) {
          newExpanded.add(cat.id);
        }
      });
      setExpandedCategories(newExpanded);
    }
  }, [currentCategory]);

  const toggleExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleSearch = (value: string) => {
    setSearchInput(value);
    onSearch?.(value);
  };

  // Get all visible categories for keyboard navigation
  const getVisibleCategories = (): Category[] => {
    const visible: Category[] = [];
    
    const addVisible = (cats: Category[], level: number = 0) => {
      cats.forEach(cat => {
        visible.push(cat);
        if (cat.children && expandedCategories.has(cat.id)) {
          addVisible(cat.children, level + 1);
        }
      });
    };
    
    addVisible(categoryHierarchy);
    return visible;
  };

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const visibleCategories = getVisibleCategories();
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < visibleCategories.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : visibleCategories.length - 1
        );
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && visibleCategories[focusedIndex]) {
          onCategoryChange(visibleCategories[focusedIndex].id);
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (focusedIndex >= 0) {
          const category = visibleCategories[focusedIndex];
          if (category.children && category.children.length > 0 && !expandedCategories.has(category.id)) {
            toggleExpanded(category.id);
          }
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (focusedIndex >= 0) {
          const category = visibleCategories[focusedIndex];
          if (category.children && category.children.length > 0 && expandedCategories.has(category.id)) {
            toggleExpanded(category.id);
          }
        }
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(visibleCategories.length - 1);
        break;
      case 'Escape':
        e.preventDefault();
        onCategoryChange(null);
        setFocusedIndex(-1);
        break;
    }
  };

  const CategoryItem: React.FC<{ 
    category: Category; 
    level: number; 
    index: number;
    siblingsCount: number;
    isLast?: boolean 
  }> = ({ category, level, index, siblingsCount, isLast = false }) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);
    const isActive = currentCategory === category.id;
    const isFocused = focusedIndex === index;
    const count = typeof category.productCount === 'number' ? category.productCount : 0;

    return (
      <div className="space-y-1">
        <div
          className={cn(
            'group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all duration-200',
            'hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
            isActive && 'bg-primary/10 border border-primary/20',
            isFocused && 'ring-2 ring-primary ring-offset-2',
            level > 0 && 'ml-4 border-l border-muted pl-4'
          )}
          style={{ marginLeft: level * 16 }}
          onClick={() => {
            onCategoryChange(category.id);
            setFocusedIndex(index);
          }}
          onMouseEnter={() => setHoveredCategory(category.id)}
          onMouseLeave={() => setHoveredCategory(null)}
          tabIndex={0}
          role="treeitem"
          aria-current={isActive ? 'page' : undefined}
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-level={level + 1}
          aria-setsize={siblingsCount}
          aria-posinset={index + 1}
          aria-label={`${category.name} - ${count} productos${hasChildren ? ` - ${isExpanded ? 'expandido' : 'contraído'}` : ''}`}
          aria-describedby={category.description ? `category-desc-${category.id}` : undefined}
        >
          {/* Expand/Collapse button */}
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(category.id);
              }}
              className="h-6 w-6 p-0 focus:ring-2 focus:ring-primary focus:ring-offset-1"
              aria-label={`${isExpanded ? 'Contraer' : 'Expandir'} subcategorías de ${category.name}`}
              aria-expanded={isExpanded}
              tabIndex={-1}
            >
              <ChevronRight 
                className={cn(
                  'h-3 w-3 transition-transform',
                  isExpanded && 'rotate-90'
                )}
                aria-hidden="true"
              />
            </Button>
          )}

          {/* Category icon/image */}
          <div className="flex-shrink-0" aria-hidden="true">
            {category.image ? (
              <img
                src={category.image}
                alt=""
                className="w-6 h-6 rounded object-cover"
                role="presentation"
              />
            ) : (
              <div className={cn(
                'w-6 h-6 rounded flex items-center justify-center',
                isActive ? 'bg-primary text-primary-foreground' : 'bg-muted'
              )}>
                <Package className="h-3 w-3" />
              </div>
            )}
          </div>

          {/* Category info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn(
                'font-medium truncate',
                isActive && 'text-primary'
              )}>
                {category.name}
              </span>
              
              {category.isFeatured && (
                <Sparkles className="h-3 w-3 text-yellow-500" aria-label="Categoría destacada" />
              )}
              
              {category.isPopular && (
                <Badge variant="secondary" className="text-xs px-1 py-0" aria-label="Categoría popular">
                  Popular
                </Badge>
              )}
            </div>
            
            {!compact && category.description && (
              <p 
                id={`category-desc-${category.id}`}
                className="text-xs text-muted-foreground truncate"
              >
                {category.description}
              </p>
            )}
          </div>

          {/* Product count */}
          {showStats && (
            <Badge 
              variant={isActive ? 'default' : 'outline'} 
              className="text-xs"
              aria-label={`${count} productos en esta categoría`}
            >
              {count}
            </Badge>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div role="group" aria-label={`Subcategorías de ${category.name}`}>
            {category.children!.map((child, childIndex) => (
              <CategoryItem
                key={child.id}
                category={child}
                level={level + 1}
                index={getVisibleCategories().findIndex(c => c.id === child.id)}
                siblingsCount={category.children!.length}
                isLast={childIndex === category.children!.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      <CardContent className="p-4 flex-1 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/90 backdrop-blur flex items-center justify-between mb-2 border-b px-1 py-2">
          <h2 className="text-lg font-semibold">Categorías</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onCategoryChange(null);
              setFocusedIndex(-1);
            }}
            className="text-xs"
            aria-label="Mostrar todas las categorías"
          >
            <Home className="h-3 w-3 mr-1" aria-hidden="true" />
            Todas
          </Button>
        </div>

        {/* Search */}
        {showSearch && (
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                type="text"
                placeholder="Buscar categorías..."
                value={searchInput}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
                aria-label="Buscar categorías"
                aria-describedby="search-help"
              />
            </div>
            <div id="search-help" className="sr-only">
              Escribe para filtrar las categorías por nombre
            </div>
          </div>
        )}

        {/* Breadcrumbs */}
        {showBreadcrumbs && breadcrumbPath.length > 0 && (
          <nav aria-label="Ruta de navegación" className="mb-4">
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCategoryChange(null)}
                className="h-auto p-1 text-xs hover:text-primary"
                aria-label="Ir a todas las categorías"
              >
                <Home className="h-3 w-3" aria-hidden="true" />
              </Button>
              {breadcrumbPath.map((cat, index) => (
                <React.Fragment key={cat.id}>
                  <ChevronRight className="h-3 w-3" aria-hidden="true" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCategoryChange(cat.id)}
                    className={cn(
                      'h-auto p-1 text-xs hover:text-primary',
                      index === breadcrumbPath.length - 1 && 'text-primary font-medium'
                    )}
                    aria-current={index === breadcrumbPath.length - 1 ? 'page' : undefined}
                  >
                    {cat.name}
                  </Button>
                </React.Fragment>
              ))}
            </div>
          </nav>
        )}

        {/* Categories Tree */}
        <ScrollArea className="flex-1 max-h-[360px] sm:max-h-[420px]">
          <div 
            className="space-y-1 pr-4"
            role="tree"
            aria-label="Árbol de categorías"
            aria-multiselectable="false"
            onKeyDown={handleKeyDown}
            tabIndex={0}
          >
            {/* Screen reader instructions */}
            <div className="sr-only">
              Usa las flechas arriba y abajo para navegar, Enter o Espacio para seleccionar, 
              flecha derecha para expandir, flecha izquierda para contraer, 
              Home para ir al inicio, End para ir al final, Escape para limpiar selección.
            </div>
            
            {categoryHierarchy.map((category, index) => (
              <CategoryItem
                key={category.id}
                category={category}
                level={0}
                index={index}
                siblingsCount={categoryHierarchy.length}
                isLast={index === categoryHierarchy.length - 1}
              />
            ))}
            
            {categoryHierarchy.length === 0 && (
              <div className="text-center py-8 text-muted-foreground" role="status">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
                <p>No hay categorías disponibles</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Stats */}
        {showStats && !compact && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-xs text-muted-foreground text-center" role="status" aria-live="polite">
              {categories.length} categorías • {categories.reduce((sum, cat) => sum + (typeof cat.productCount === 'number' ? cat.productCount : 0), 0)} productos
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CategoryNavigation;