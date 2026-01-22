import { memo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface CustomersTableHeaderProps {
    selectedCount: number;
    totalCount: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    onSort: (field: string) => void;
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
    const SortIcon = ({ field }: { field: string }) => {
        const isActive = sortBy === field;

        if (!isActive) {
            return <ArrowUpDown className="h-4 w-4 ml-2 opacity-40 group-hover:opacity-70 transition-opacity" />;
        }

        const Icon = sortOrder === 'asc' ? ArrowUp : ArrowDown;
        return <Icon className="h-4 w-4 ml-2 text-primary animate-in fade-in duration-200" />;
    };

    const getSortButtonClass = (field: string) => {
        const isActive = sortBy === field;
        return `
            hover:bg-transparent transition-colors group
            ${isActive ? 'text-primary font-semibold' : 'text-muted-foreground'}
        `;
    };

    return (
        <thead className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
            <tr className="border-b">
                <th className="p-4 text-left w-12">
                    <Checkbox
                        checked={selectedCount === totalCount && totalCount > 0}
                        onCheckedChange={onSelectAll}
                        aria-label="Seleccionar todos"
                        className="transition-transform hover:scale-110"
                    />
                </th>

                <th className="p-4 text-left">
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
                    <span className="text-sm font-semibold text-muted-foreground">Tipo</span>
                </th>

                <th className="p-4 text-left">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSort('totalSpent')}
                        className={getSortButtonClass('totalSpent')}
                    >
                        Estadísticas
                        <SortIcon field="totalSpent" />
                    </Button>
                </th>

                <th className="p-4 text-left">
                    <span className="text-sm font-semibold text-muted-foreground">Estado</span>
                </th>

                <th className="p-4 text-left">
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
                    <span className="text-sm font-semibold text-muted-foreground">Acciones</span>
                </th>
            </tr>
        </thead>
    );
});
