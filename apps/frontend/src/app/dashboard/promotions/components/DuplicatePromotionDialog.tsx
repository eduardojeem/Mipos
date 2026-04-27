
'use client'

import { useEffect, useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'
import api from '@/lib/api'

interface Promotion {
  id: string
  name: string
  description: string
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: number
  startDate: string
  endDate: string
  isActive: boolean
  minPurchaseAmount?: number
  maxDiscountAmount?: number
  usageLimit?: number
}

interface DuplicatePromotionDialogProps {
  promotion: Promotion | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function DuplicatePromotionDialog({
  promotion,
  open,
  onOpenChange,
  onSuccess,
}: DuplicatePromotionDialogProps) {
  const [loading, setLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [copyProducts, setCopyProducts] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (!open || !promotion) return
    setNewName((prev) => (prev.trim() ? prev : `${promotion.name} (Copia)`))
  }, [open, promotion])

  const handleDuplicate = async () => {
    if (!promotion) return

    if (!newName.trim()) {
      toast({
        title: 'Error',
        description: 'Debes proporcionar un nombre para la nueva promoción',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const duplicateResponse = await api.post(`/promotions/${promotion.id}/duplicate`, {
        name: newName,
        copyProducts,
      })

      if (!duplicateResponse.data?.success) {
        throw new Error(duplicateResponse.data?.message || 'No se pudo duplicar la promoción')
      }

      toast({
        title: 'Promoción duplicada',
        description: `Se creó "${newName}" ${copyProducts ? 'con todos sus productos' : 'sin productos'}`,
      })

      onSuccess()
      onOpenChange(false)
      setNewName('')
      setCopyProducts(true)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || error?.message || 'No se pudo duplicar la promoción',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!promotion) return null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Duplicar Promoción</AlertDialogTitle>
          <AlertDialogDescription>
            Se creará una copia de "{promotion.name}" con los mismos valores.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="newName">Nombre de la nueva promoción</Label>
            <Input
              id="newName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={`${promotion.name} (Copia)`}
              disabled={loading}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="copyProducts"
              checked={copyProducts}
              onCheckedChange={(checked) => setCopyProducts(checked as boolean)}
              disabled={loading}
            />
            <label
              htmlFor="copyProducts"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Copiar productos asociados
            </label>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDuplicate} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Duplicar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
