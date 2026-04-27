import { memo, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    Edit,
    Trash2,
    Eye,
    Mail,
    Phone,
    Copy,
    Check,
    Sparkles,
    Building2
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';
import { useToast } from '@/components/ui/use-toast';
import { PermissionGuard } from '@/components/ui/permission-guard';
import type { UICustomer } from '@/types/customer-page';

interface CustomersTableRowProps {
    customer: UICustomer;
    isSelected: boolean;
    onSelect: (id: string) => void;
    onEdit: (customer: UICustomer) => void;
    onDelete: (id: string) => void;
    onViewDetails: (customer: UICustomer) => void;
}

export const CustomersTableRow = memo(function CustomersTableRow({
    customer,
    isSelected,
    onSelect,
    onEdit,
    onDelete,
    onViewDetails
}: CustomersTableRowProps) {
    const fmtCurrency = useCurrencyFormatter();
    const { toast } = useToast();
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const copyToClipboard = async (text: string, fieldName: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(fieldName);
            toast({
                title: 'Copiado',
                description: `${fieldName} copiado al portapapeles`,
            });
            setTimeout(() => setCopiedField(null), 2000);
        } catch {
            toast({
                title: 'Error',
                description: 'No se pudo copiar al portapapeles',
                variant: 'destructive'
            });
        }
    };

    const getCustomerTypeConfig = (type: string) => {
        switch (type) {
            case 'vip':
                return {
                    color: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-300',
                    icon: <Sparkles className="h-3 w-3" />,
                    label: 'VIP',
                    ringColor: 'ring-purple-500'
                };
            case 'wholesale':
                return {
                    color: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-blue-300',
                    icon: <Building2 className="h-3 w-3" />,
                    label: 'Mayorista',
                    ringColor: 'ring-blue-500'
                };
            default:
                return {
                    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-300',
                    icon: null,
                    label: 'Regular',
                    ringColor: 'ring-gray-400'
                };
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const typeConfig = getCustomerTypeConfig(customer.customerType);

    return (
        <tr
            className={`
                border-b transition-colors group
                hover:bg-muted/50
                ${isSelected ? 'bg-primary/5' : ''}
            `}
        >
            {/* Checkbox */}
            <td className="p-4">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onSelect(customer.id)}
                    aria-label={`Seleccionar ${customer.name}`}
                />
            </td>

            {/* Avatar & Name */}
            <td className="p-4">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Avatar className={`h-10 w-10 ring-2 ${typeConfig.ringColor} ring-offset-2 ring-offset-background`}>
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-semibold">
                                {getInitials(customer.name)}
                            </AvatarFallback>
                        </Avatar>
                        {customer.customerType === 'vip' && (
                            <div className="absolute -top-1 -right-1">
                                <Sparkles className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-base">{customer.name}</span>
                        {customer.customerCode && (
                            <span className="text-xs text-muted-foreground opacity-70 font-mono">
                                {customer.customerCode}
                            </span>
                        )}
                    </div>
                </div>
            </td>

            {/* Contact */}
            <td className="p-4">
                <div className="flex flex-col gap-1.5">
                    {customer.email && (
                        <button
                            onClick={() => copyToClipboard(customer.email!, 'Email')}
                            className="flex items-center gap-2 text-sm hover:text-primary transition-colors group/email w-fit"
                        >
                            <Mail className="h-3.5 w-3.5 text-muted-foreground group-hover/email:text-primary" />
                            <span className="text-muted-foreground group-hover/email:text-foreground group-hover/email:underline">
                                {customer.email}
                            </span>
                            {copiedField === 'Email' ? (
                                <Check className="h-3 w-3 text-green-500" />
                            ) : (
                                <Copy className="h-3 w-3 opacity-0 group-hover/email:opacity-100 transition-opacity" />
                            )}
                        </button>
                    )}
                    {customer.phone && (
                        <button
                            onClick={() => copyToClipboard(customer.phone!, 'Teléfono')}
                            className="flex items-center gap-2 text-sm hover:text-primary transition-colors group/phone w-fit"
                        >
                            <Phone className="h-3.5 w-3.5 text-muted-foreground group-hover/phone:text-primary" />
                            <span className="text-muted-foreground group-hover/phone:text-foreground group-hover/phone:underline">
                                {customer.phone}
                            </span>
                            {copiedField === 'Teléfono' ? (
                                <Check className="h-3 w-3 text-green-500" />
                            ) : (
                                <Copy className="h-3 w-3 opacity-0 group-hover/phone:opacity-100 transition-opacity" />
                            )}
                        </button>
                    )}
                </div>
            </td>

            {/* RUC */}
            <td className="p-4">
                <span className="text-sm font-mono text-muted-foreground">
                    {customer.ruc || '—'}
                </span>
            </td>

            {/* Type */}
            <td className="p-4">
                <Badge
                    className={`
                        ${typeConfig.color} 
                        border shadow-sm
                        flex items-center gap-1.5 w-fit font-medium
                    `}
                >
                    {typeConfig.icon}
                    {typeConfig.label}
                </Badge>
            </td>

            {/* Orders */}
            <td className="p-4">
                <span className="text-sm font-semibold">
                    {customer.totalOrders || 0}
                </span>
            </td>

            {/* Spent */}
            <td className="p-4">
                <span className="text-sm font-mono text-muted-foreground">
                    {fmtCurrency(customer.totalSpent || 0)}
                </span>
            </td>

            {/* Status */}
            <td className="p-4">
                <Badge
                    variant={customer.is_active ? 'default' : 'secondary'}
                    className="font-medium"
                >
                    {customer.is_active ? 'Activo' : 'Inactivo'}
                </Badge>
            </td>

            {/* Created */}
            <td className="p-4 text-sm text-muted-foreground">
                {formatDate(customer.created_at)}
            </td>

            {/* Last Purchase */}
            <td className="p-4 text-sm text-muted-foreground">
                {customer.lastPurchase ? formatDate(customer.lastPurchase) : '—'}
            </td>

            {/* Lifetime Value */}
            <td className="p-4">
                <span className="text-sm font-mono text-muted-foreground">
                    {fmtCurrency(customer.lifetimeValue || 0)}
                </span>
            </td>

            {/* Inline Actions */}
            <td className="p-4">
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetails(customer)}
                        className="h-8 px-2 hover:bg-primary/10 hover:text-primary"
                        title="Ver detalles"
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                    <PermissionGuard permission="customers.edit" fallback={null} showError={false}>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(customer)}
                            className="h-8 px-2 hover:bg-blue-500/10 hover:text-blue-600"
                            title="Editar"
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                    </PermissionGuard>
                    <PermissionGuard permission="customers.delete" fallback={null} showError={false}>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(customer.id)}
                            className="h-8 px-2 hover:bg-destructive/10 hover:text-destructive"
                            title="Eliminar"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </PermissionGuard>
                </div>
            </td>
        </tr>
    );
});
