import { memo } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { CustomerSortField } from '@/types/customer-page';

interface CustomersTableHeaderProps {
    selectedCount: number;
    totalCount: number;
    sortBy: CustomerSortField;
    sortOrder: 'asc' | 'desc';
    onSort: (field: CustomerSortField) => void;
    onSelectAll: () => void;
}

export const CustomersTableHeader = memo(function CustomersTableHeader({
    selectedCount,
    totalCount,
    sortBy,
    sortOrder,
    onSort,
    onSelectAll
}: CustomersTableHeaderProps) {
    const SortIcon = ({ field }: { field: CustomerSortField }) => {
        const isActive = sortBy === field;

        if (!isActive) {
            return <ArrowUpDown className="ml-2 h-4 w-4 opacity-40 transition-opacity group-hover:opacity-70" />;
        }

        const Icon = sortOrder === 'asc' ? ArrowUp : ArrowDown;
        return <Icon className="ml-2 h-4 w-4 animate-in fade-in text-primary duration-200" />;
    };

    const getSortButtonClass = (field: CustomerSortField) => {
        const isActive = sortBy === field;
        return `
            group hover:bg-transparent transition-colors
            ${isActive ? 'font-semibold text-primary' : 'text-muted-foreground'}
        `;
    };

    return (
        <thead className="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm">
            <tr className="border-b">
                <th className="w-12 p-4 text-left">
                    <Checkbox
                        checked={selectedCount === totalCount && totalCount > 0}
                        onCheckedChange={onSelectAll}
                        aria-label="Seleccionar todos"
                        className="transition-transform hover:scale-110"
                    />
                </th>

                <th
                    className="p-4 text-left"
                    aria-sort={sortBy === 'name' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSort('name')}
                        className={getSortButtonClass('name')}
                    >
                        Cliente
                        <SortIcon field="name" />
                    </Button>
                </th>

                <th className="p-4 text-left">
                    <span className="text-sm font-semibold text-muted-foreground">Contacto</span>
                </th>

                <th className="p-4 text-left">
                    <span className="text-sm font-semibold text-muted-foreground">RUC</span>
                </th>

                <th className="p-4 text-left">
                    <span className="text-sm font-semibold text-muted-foreground">Tipo</span>
                </th>

                <th
                    className="p-4 text-left"
                    aria-sort={sortBy === 'total_orders' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSort('total_orders')}
                        className={getSortButtonClass('total_orders')}
                    >
                        Pedidos
                        <SortIcon field="total_orders" />
                    </Button>
                </th>

                <th
                    className="p-4 text-left"
                    aria-sort={sortBy === 'total_purchases' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSort('total_purchases')}
                        className={getSortButtonClass('total_purchases')}
                    >
                        Gastado
                        <SortIcon field="total_purchases" />
                    </Button>
                </th>

                <th className="p-4 text-left">
                    <span className="text-sm font-semibold text-muted-foreground">Estado</span>
                </th>

                <th
                    className="p-4 text-left"
                    aria-sort={sortBy === 'created_at' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSort('created_at')}
                        className={getSortButtonClass('created_at')}
                    >
                        Creado
                        <SortIcon field="created_at" />
                    </Button>
                </th>

                <th className="p-4 text-left">
                    <span className="text-sm font-semibold text-muted-foreground">Última compra</span>
                </th>

                <th className="p-4 text-left">
                    <span className="text-sm font-semibold text-muted-foreground">Valor de vida</span>
                </th>

                <th className="p-4 text-left">
                    <span className="text-sm font-semibold text-muted-foreground">Acciones</span>
                </th>
            </tr>
        </thead>
    );
});
