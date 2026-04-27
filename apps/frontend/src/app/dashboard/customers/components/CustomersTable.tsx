import { memo } from 'react';
import { CustomersTableRow } from './CustomersTableRow';
import { CustomersTableHeader } from './CustomersTableHeader';
import type { CustomerSortField, UICustomer } from '@/types/customer-page';

interface CustomersTableProps {
    customers: UICustomer[];
    selectedIds: string[];
    sortBy: CustomerSortField;
    sortOrder: 'asc' | 'desc';
    onSort: (field: CustomerSortField) => void;
    onSelectCustomer: (id: string) => void;
    onSelectAll: (customers: UICustomer[]) => void;
    onEdit: (customer: UICustomer) => void;
    onDelete: (id: string) => void;
    onViewDetails: (customer: UICustomer) => void;
}

/**
 * Main customers table component with sorting and selection.
 * Memoized for performance optimization.
 */
export const CustomersTable = memo(function CustomersTable({
    customers,
    selectedIds,
    sortBy,
    sortOrder,
    onSort,
    onSelectCustomer,
    onSelectAll,
    onEdit,
    onDelete,
    onViewDetails
}: CustomersTableProps) {
    return (
        <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <CustomersTableHeader
                        selectedCount={selectedIds.length}
                        totalCount={customers.length}
                        sortBy={sortBy}
                        sortOrder={sortOrder}
                        onSort={onSort}
                        onSelectAll={() => onSelectAll(customers)}
                    />
                    <tbody>
                        {customers.map(customer => (
                            <CustomersTableRow
                                key={customer.id}
                                customer={customer}
                                isSelected={selectedIds.includes(customer.id)}
                                onSelect={onSelectCustomer}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onViewDetails={onViewDetails}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
});
