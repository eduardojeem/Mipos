import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmDeleteDialogProps {
    open: boolean;
    promotionName: string;
    onConfirm: () => void;
    onCancel: () => void;
    loading?: boolean;
    details?: string[]; // ✅ Nueva prop para mostrar impacto
}

export function ConfirmDeleteDialog({
    open,
    promotionName,
    onConfirm,
    onCancel,
    loading = false,
    details = []
}: ConfirmDeleteDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-full bg-red-100 dark:bg-red-950/30">
                            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <AlertDialogTitle className="text-xl">Confirmar eliminación</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-base">
                        ¿Estás seguro de que deseas eliminar la promoción{' '}
                        <span className="font-semibold text-foreground">&quot;{promotionName}&quot;</span>?
                    </AlertDialogDescription>
                </AlertDialogHeader>

                {/* ✅ Mostrar detalles del impacto */}
                {details.length > 0 && (
                    <div className="my-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                            Esta acción afectará:
                        </p>
                        <ul className="space-y-1">
                            {details.map((detail, index) => (
                                <li 
                                    key={index} 
                                    className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2"
                                >
                                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-600" />
                                    {detail}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* ✅ Advertencia clara */}
                <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        ⚠️ Esta acción no se puede deshacer
                    </p>
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onCancel} disabled={loading}>
                        Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Eliminando...
                            </>
                        ) : (
                            'Eliminar promoción'
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
