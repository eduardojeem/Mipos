'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowRightLeft, Loader2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Branch } from '../hooks/useBranches'

type ProductOption = {
  id: string
  name: string
  sku?: string | null
  stock_quantity?: number | null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string | null
  branches: Branch[]
  defaultFromBranchId?: string | null
  onTransferred: () => Promise<void> | void
}

async function readError(res: Response, fallback: string): Promise<string> {
  const json = await res.json().catch(() => ({}))
  return json.error || json.message || fallback
}

export function StockTransferDialog({
  open,
  onOpenChange,
  organizationId,
  branches,
  defaultFromBranchId,
  onTransferred,
}: Props) {
  const activeBranches = useMemo(() => branches.filter((branch) => branch.is_active), [branches])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [productId, setProductId] = useState('')
  const [fromBranchId, setFromBranchId] = useState('')
  const [toBranchId, setToBranchId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')
  const [fromStock, setFromStock] = useState<number | null>(null)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [isLoadingStock, setIsLoadingStock] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    setError(null)
    setSuccess(null)
    setProductId('')
    setQuantity('')
    setNotes('')
    setFromStock(null)

    const defaultOrigin =
      defaultFromBranchId && activeBranches.some((branch) => branch.id === defaultFromBranchId)
        ? defaultFromBranchId
        : activeBranches[0]?.id || ''
    setFromBranchId(defaultOrigin)
    setToBranchId(activeBranches.find((branch) => branch.id !== defaultOrigin)?.id || '')
  }, [activeBranches, defaultFromBranchId, open])

  useEffect(() => {
    if (!open || !organizationId) return

    let cancelled = false
    setIsLoadingProducts(true)
    fetch('/api/products/list?limit=100&isActive=true&sortBy=name&sortOrder=asc', {
      headers: { 'x-organization-id': organizationId },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(await readError(res, 'No se pudieron cargar productos'))
        return res.json()
      })
      .then((json) => {
        if (cancelled) return
        setProducts(Array.isArray(json?.products) ? json.products : [])
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar productos')
      })
      .finally(() => {
        if (!cancelled) setIsLoadingProducts(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, organizationId])

  useEffect(() => {
    if (!open || !organizationId || !productId || !fromBranchId) {
      setFromStock(null)
      return
    }

    let cancelled = false
    setIsLoadingStock(true)
    fetch(
      `/api/inventory/transfers?productId=${encodeURIComponent(productId)}&branchId=${encodeURIComponent(fromBranchId)}`,
      { headers: { 'x-organization-id': organizationId } },
    )
      .then(async (res) => {
        if (!res.ok) throw new Error(await readError(res, 'No se pudo calcular stock de origen'))
        return res.json()
      })
      .then((json) => {
        if (!cancelled) setFromStock(Number(json?.data?.stock ?? 0))
      })
      .catch(() => {
        if (!cancelled) setFromStock(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoadingStock(false)
      })

    return () => {
      cancelled = true
    }
  }, [fromBranchId, open, organizationId, productId])

  const selectedProduct = products.find((product) => product.id === productId)
  const parsedQuantity = Number(quantity)
  const canSubmit =
    Boolean(organizationId) &&
    Boolean(productId) &&
    Boolean(fromBranchId) &&
    Boolean(toBranchId) &&
    fromBranchId !== toBranchId &&
    Number.isInteger(parsedQuantity) &&
    parsedQuantity > 0 &&
    !isSubmitting

  const handleSubmit = async () => {
    if (!organizationId || !canSubmit) return

    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/inventory/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': organizationId,
        },
        body: JSON.stringify({
          productId,
          fromBranchId,
          toBranchId,
          quantity: parsedQuantity,
          notes: notes.trim() || undefined,
        }),
      })

      if (!res.ok) throw new Error(await readError(res, 'No se pudo transferir mercaderia'))

      const json = await res.json()
      const fromAfter = json?.data?.fromBranch?.stockAfter
      const toAfter = json?.data?.toBranch?.stockAfter
      setSuccess(
        `Transferencia registrada. Stock origen: ${fromAfter ?? '-'} / destino: ${toAfter ?? '-'}.`,
      )
      setQuantity('')
      setNotes('')
      await onTransferred()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo transferir mercaderia')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Transferir mercaderia
          </DialogTitle>
          <DialogDescription>
            Mueve stock entre dos sucursales activas. El sistema registra una salida en el origen y una entrada en el destino.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {activeBranches.length < 2 ? (
            <Alert>
              <AlertTitle>Necesitas al menos dos sucursales activas</AlertTitle>
              <AlertDescription>
                Activa o crea otra sucursal antes de mover mercaderia entre sedes.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="transfer-product">Producto</Label>
            <Select value={productId} onValueChange={setProductId} disabled={isLoadingProducts}>
              <SelectTrigger id="transfer-product">
                <SelectValue placeholder={isLoadingProducts ? 'Cargando productos...' : 'Selecciona un producto'} />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}{product.sku ? ` - ${product.sku}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProduct ? (
              <p className="text-xs text-muted-foreground">
                Stock global actual: {Number(selectedProduct.stock_quantity ?? 0)}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="transfer-from">Origen</Label>
              <Select value={fromBranchId} onValueChange={setFromBranchId}>
                <SelectTrigger id="transfer-from">
                  <SelectValue placeholder="Sucursal origen" />
                </SelectTrigger>
                <SelectContent>
                  {activeBranches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id} disabled={branch.id === toBranchId}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {isLoadingStock ? 'Calculando stock...' : `Disponible en origen: ${fromStock ?? '-'}`}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="transfer-to">Destino</Label>
              <Select value={toBranchId} onValueChange={setToBranchId}>
                <SelectTrigger id="transfer-to">
                  <SelectValue placeholder="Sucursal destino" />
                </SelectTrigger>
                <SelectContent>
                  {activeBranches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id} disabled={branch.id === fromBranchId}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
            <div className="space-y-1.5">
              <Label htmlFor="transfer-quantity">Cantidad</Label>
              <Input
                id="transfer-quantity"
                type="number"
                min={1}
                step={1}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                placeholder="0"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="transfer-notes">Nota opcional</Label>
              <Textarea
                id="transfer-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Ej: reposicion para fin de semana"
                rows={3}
              />
            </div>
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>No se pudo transferir</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {success ? (
            <Alert>
              <AlertTitle>Movimiento registrado</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cerrar
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={!canSubmit || activeBranches.length < 2}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Transferir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
