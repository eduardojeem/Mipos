'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tag, Package, Edit, Trash2, Eye, EyeOff, Calendar } from 'lucide-react';
import type { Category } from '@/types';

interface CategoryWithCount extends Category {
    _count?: {
        products: number;
    };
}

interface CategoryCardProps {
    category: CategoryWithCount;
    isSelected: boolean;
    onSelect: (selected: boolean) => void;
    onEdit: () => void;
    onDelete: () => void;
    onToggleStatus: () => void;
}

export function CategoryCard({
    category,
    isSelected,
    onSelect,
    onEdit,
    onDelete,
    onToggleStatus,
}: CategoryCardProps) {
    const productCount = category._count?.products || 0;
    const canDelete = productCount === 0;

    return (
        <Card
            className={`group hover:shadow-xl transition-all duration-300 overflow-hidden ${isSelected ? 'ring-2 ring-primary shadow-lg' : ''
                } animate-in fade-in-50 slide-in-from-bottom-4`}
        >
            {/* Gradient Header */}
            <div className={`h-2 bg-gradient-to-r ${category.is_active
                    ? 'from-green-400 via-green-500 to-green-600'
                    : 'from-gray-300 via-gray-400 to-gray-500'
                }`} />

            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Checkbox
                            checked={isSelected}
                            onCheckedChange={onSelect}
                            className="mt-1 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0 space-y-2">
                            <CardTitle className="flex items-center gap-2 flex-wrap text-lg">
                                <div className={`p-2 rounded-lg ${category.is_active
                                        ? 'bg-green-50 dark:bg-green-950/20'
                                        : 'bg-gray-50 dark:bg-gray-950/20'
                                    }`}>
                                    <Tag className={`h-4 w-4 ${category.is_active
                                            ? 'text-green-600 dark:text-green-400'
                                            : 'text-gray-600 dark:text-gray-400'
                                        }`} />
                                </div>
                                <span className="break-words font-semibold">{category.name}</span>
                            </CardTitle>

                            <div className="flex items-center gap-2">
                                <Badge
                                    variant={category.is_active ? "default" : "secondary"}
                                    className={`${category.is_active
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800'
                                            : 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400'
                                        } font-medium`}
                                >
                                    {category.is_active ? '✓ Activa' : '○ Inactiva'}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions - Visible on hover */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 hover:bg-primary/10"
                            onClick={onToggleStatus}
                            title={category.is_active ? 'Desactivar' : 'Activar'}
                        >
                            {category.is_active ?
                                <EyeOff className="h-4 w-4" /> :
                                <Eye className="h-4 w-4" />
                            }
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                            onClick={onEdit}
                            title="Editar"
                        >
                            <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className={`h-8 w-8 p-0 ${canDelete
                                    ? 'hover:bg-red-50 dark:hover:bg-red-950/20'
                                    : 'cursor-not-allowed opacity-40'
                                }`}
                            onClick={canDelete ? onDelete : undefined}
                            disabled={!canDelete}
                            title={canDelete ? 'Eliminar categoría' : `No se puede eliminar: tiene ${productCount} producto${productCount !== 1 ? 's' : ''}`}
                        >
                            <Trash2 className={`h-4 w-4 ${canDelete ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`} />
                        </Button>
                    </div>
                </div>

                {category.description && (
                    <CardDescription className="mt-3 text-sm line-clamp-2">
                        {category.description}
                    </CardDescription>
                )}
            </CardHeader>

            <CardContent className="space-y-3">
                {/* Product Count */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-md bg-purple-50 dark:bg-purple-950/20">
                            <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">
                                {productCount} producto{productCount !== 1 ? 's' : ''}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {productCount === 0 ? 'Sin productos asignados' : 'Asignados a esta categoría'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(category.created_at).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                        })}</span>
                    </div>
                    <span className="font-mono">ID: {category.id.slice(-8)}</span>
                </div>
            </CardContent>
        </Card>
    );
}
