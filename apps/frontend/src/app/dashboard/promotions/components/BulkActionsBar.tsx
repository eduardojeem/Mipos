'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Power, Trash2, X, Loader2, Copy } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import api from '@/lib/api'

interface BulkActionsBarProps {
  selectedIds: Set<string>
  onClearSelection: () => void
  onRefresh: () => void
}

export function BulkActionsBar({
  selectedIds,
  onClearSelection,
  onRefresh,
}: BulkActionsBarProps) {
  const [loading, setLoading] = useState(false)
  const [action, setAction] = useState<'activate' | 'deactivate' | 'delete' | null>(null)
  const { toast } = useToast()

  const count = selectedIds.size

  if (count === 0) return null

  const handleBulkAction = async (actionType: 'activate' | 'deactivate' | 'delete') => {
    setAction(actionType)
  }

  const confirmAction = async () => {
    if (!action) return

    setLoading(true)
    try {
      const ids = Array.from(selectedIds)
      let successCount = 0
      let errorCount = 0

      for (const id of ids) {
        try {
          if (action === 'delete') {
            await api.delete(`/promotions/${id}`)
          } else {
            await api.patch(`/promotions/${id}`, {
              isActive: action === 'activate'
            })
          }
          successCount++
        } catch (error) {
          errorCount++
        }
      }

      if (successCount > 0) {
        toast({
          title: 'Acción completada',
          description: `${successCount} promoción(es) ${
            action === 'delete' ? 'eliminada(s)' : 
            action === 'activate' ? 'activada(s)' : 'desactivada(s)'
          } exitosamente${errorCount > 0 ? `. ${errorCount} fallaron.` : ''}`,
        })
      }

      if (errorCount > 0 && successCount === 0) {
        toast({
          title: 'Error',
          description: `No se pudieron procesar las promociones`,
          variant: 'destructive',
        })
      }

      onRefresh()
      onClearSelection()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Error al procesar la acción',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      setAction(null)
    }
  }

  return (
    <>
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-4">
            {/* Counter */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-base px-3 py-1">
                {count} seleccionada{count !== 1 ? 's' : ''}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('activate')}
                disabled={loading}
                className="gap-2"
              >
                <Power className="h-4 w-4" />
                Activar
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('deactivate')}
                disabled={loading}
                className="gap-2"
              >
                <Power className="h-4 w-4" />
                Desactivar
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('delete')}
                disabled={loading}
                className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!action} onOpenChange={() => setAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {action === 'delete' && '¿Eliminar promociones?'}
              {action === 'activate' && '¿Activar promociones?'}
              {action === 'deactivate' && '¿Desactivar promociones?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {action === 'delete' && (
                <>
                  Estás a punto de eliminar {count} promoción{count !== 1 ? 'es' : ''}. 
                  Esta acción no se puede deshacer.
                </>
              )}
              {action === 'activate' && (
                <>
                  Se activarán {count} promoción{count !== 1 ? 'es' : ''}. 
                  Los clientes podrán verlas en el sitio público.
                </>
              )}
              {action === 'deactivate' && (
                <>
                  Se desactivarán {count} promoción{count !== 1 ? 'es' : ''}. 
                  Los clientes no podrán verlas en el sitio público.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              disabled={loading}
              className={action === 'delete' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
