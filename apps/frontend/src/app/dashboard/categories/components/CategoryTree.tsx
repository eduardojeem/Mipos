'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import type { CategoryWithCount, StatusFilter } from '../hooks/useCategoryManagement';
import { buildCategoryTree, flattenCategoryTree, getVisibleIdsForTreeSearch } from '../utils/categoryTree';

interface CategoryTreeProps {
  categories: CategoryWithCount[];
  search: string;
  statusFilter: StatusFilter;
  selectedCategories: Set<string>;
  onSelectCategory: (id: string, selected: boolean) => void;
  onEdit: (category: CategoryWithCount) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, currentStatus: boolean) => void;
}

export function CategoryTree({
  categories,
  search,
  statusFilter,
  selectedCategories,
  onSelectCategory,
  onEdit,
  onDelete,
  onToggleStatus,
}: CategoryTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { visibleIds, autoExpandedIds } = useMemo(() => {
    return getVisibleIdsForTreeSearch(categories, search, statusFilter);
  }, [categories, search, statusFilter]);

  useEffect(() => {
    if (!search.trim()) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      autoExpandedIds.forEach((id) => next.add(id));
      return next;
    });
  }, [autoExpandedIds, search]);

  const visibleCategories = useMemo(() => {
    return categories.filter((c) => visibleIds.has(c.id));
  }, [categories, visibleIds]);

  const rows = useMemo(() => {
    const tree = buildCategoryTree(visibleCategories);
    return flattenCategoryTree(tree, expanded);
  }, [expanded, visibleCategories]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Card className="border-border/50 shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <div className="max-h-[560px] overflow-auto">
          {rows.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              No se encontraron categorías.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {rows.map(({ node, level }) => {
                const hasChildren = node.children.length > 0;
                const isExpanded = expanded.has(node.id);
                const canDelete = (node._count?.products || 0) === 0 && !hasChildren;

                return (
                  <div
                    key={node.id}
                    className="flex items-center gap-2 py-2.5 pr-3 hover:bg-muted/20 transition-colors"
                    style={{ paddingLeft: 12 + level * 16 }}
                  >
                    <div className="w-7 flex items-center justify-center">
                      {hasChildren ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => toggleExpanded(node.id)}
                          aria-label={isExpanded ? 'Colapsar' : 'Expandir'}
                          aria-expanded={isExpanded}
                        >
                          <ChevronRight
                            className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          />
                        </Button>
                      ) : null}
                    </div>

                    <Checkbox
                      checked={selectedCategories.has(node.id)}
                      onCheckedChange={(checked) => onSelectCategory(node.id, checked as boolean)}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate">{node.name}</span>
                        <Badge
                          variant="secondary"
                          className="bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300"
                        >
                          {node._count?.products || 0}
                        </Badge>
                      </div>
                      {node.description ? (
                        <div className="text-xs text-muted-foreground truncate">{node.description}</div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={node.is_active}
                        onCheckedChange={() => onToggleStatus(node.id, node.is_active)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(node)}
                        aria-label="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => onDelete(node.id)}
                        aria-label="Eliminar"
                        disabled={!canDelete}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
