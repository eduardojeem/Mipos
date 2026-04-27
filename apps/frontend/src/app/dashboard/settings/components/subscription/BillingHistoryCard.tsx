'use client'

import React, { useMemo, useState } from 'react'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Receipt,
  RefreshCw,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export type BillingInvoice = {
  id: string
  invoice_number: string
  amount: number
  currency: string
  status: string
  due_date: string
  paid_at: string | null
  receipt_url?: string
  pdf_url?: string
}

const PAGE_SIZE = 5

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: currency || 'PYG',
      maximumFractionDigits: 0,
    }).format(Number(amount || 0))
  } catch {
    return `${currency} ${Number(amount || 0).toLocaleString('es-PY')}`
  }
}

function formatDate(value: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-PY', { day: '2-digit', month: 'short', year: 'numeric' })
}

type StatusMeta = {
  label: string
  icon: LucideIcon
  badgeClass: string
  rowClass: string
}

function getStatusMeta(status: string): StatusMeta {
  const s = String(status || '').toLowerCase()
  if (s === 'paid' || s === 'succeeded')
    return {
      label: 'Pagada',
      icon: CheckCircle2,
      badgeClass:
        'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
      rowClass: '',
    }
  if (s === 'open')
    return {
      label: 'Pendiente',
      icon: Clock,
      badgeClass:
        'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
      rowClass: 'bg-amber-50/30 dark:bg-amber-500/5',
    }
  if (s === 'void' || s === 'failed')
    return {
      label: 'Cancelada',
      icon: XCircle,
      badgeClass:
        'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300',
      rowClass: 'bg-rose-50/30 dark:bg-rose-500/5',
    }
  return {
    label: status || 'Desconocido',
    icon: FileText,
    badgeClass: 'border-border bg-muted text-muted-foreground',
    rowClass: '',
  }
}

function SummaryPill({ label, value, className }: { label: string; value: string | number; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center rounded-lg border px-4 py-2.5 text-center', className)}>
      <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className="mt-0.5 text-lg font-bold tabular-nums">{value}</span>
    </div>
  )
}

export function BillingHistoryCard({
  invoices,
  isLoading,
  error,
  onRetry,
}: {
  invoices: BillingInvoice[]
  isLoading: boolean
  error?: string | null
  onRetry: () => void
}) {
  const [page, setPage] = useState(0)

  const totalPages = Math.max(1, Math.ceil(invoices.length / PAGE_SIZE))
  const paged = invoices.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  const summary = useMemo(() => {
    const paid = invoices.filter((i) => ['paid', 'succeeded'].includes(i.status.toLowerCase()))
    const pending = invoices.filter((i) => i.status.toLowerCase() === 'open')
    const totalPaid = paid.reduce((acc, i) => acc + Number(i.amount || 0), 0)
    const currency = invoices[0]?.currency || 'PYG'
    return { count: invoices.length, paid: paid.length, pending: pending.length, totalPaid, currency }
  }, [invoices])

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border/60 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Receipt className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-base font-semibold">Historial de facturación</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Últimas facturas y recibos de tu suscripción.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={isLoading}
          className="shrink-0"
        >
          <RefreshCw className={cn('mr-2 h-3.5 w-3.5', isLoading && 'animate-spin')} />
          Actualizar
        </Button>
      </div>

      {/* Body */}
      <div className="px-5 pb-5">
        {error ? (
          <Alert className="border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-50">
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        ) : isLoading ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-[180px] rounded-lg" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Sin facturas aún</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Cuando se generen cargos, aparecerán aquí.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary pills */}
            <div className="grid grid-cols-3 gap-3">
              <SummaryPill label="Total" value={summary.count} className="bg-muted/30" />
              <SummaryPill
                label="Pagadas"
                value={summary.paid}
                className="border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-500/10"
              />
              <SummaryPill
                label="Pendientes"
                value={summary.pending}
                className={
                  summary.pending > 0
                    ? 'border-amber-200 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/10'
                    : 'bg-muted/30'
                }
              />
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-lg border border-border/60 md:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Fecha
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Factura
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Importe
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Estado
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {paged.map((inv) => {
                    const meta = getStatusMeta(inv.status)
                    const StatusIcon = meta.icon
                    const href = inv.pdf_url || inv.receipt_url
                    return (
                      <tr
                        key={inv.id}
                        className={cn(
                          'transition-colors hover:bg-muted/30',
                          meta.rowClass
                        )}
                      >
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">
                          {formatDate(inv.paid_at || inv.due_date)}
                        </td>
                        <td className="px-4 py-3 font-medium">{inv.invoice_number}</td>
                        <td className="px-4 py-3 tabular-nums font-semibold">
                          {formatMoney(inv.amount, inv.currency)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={cn('inline-flex items-center gap-1.5 border text-xs font-medium', meta.badgeClass)}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {meta.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {href ? (
                            <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                              <a href={href} target="_blank" rel="noreferrer">
                                <Download className="h-3.5 w-3.5" />
                                PDF
                              </a>
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" disabled>
                              <ExternalLink className="h-3.5 w-3.5" />
                              Sin archivo
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="grid gap-3 md:hidden">
              {paged.map((inv) => {
                const meta = getStatusMeta(inv.status)
                const StatusIcon = meta.icon
                const href = inv.pdf_url || inv.receipt_url
                return (
                  <div
                    key={inv.id}
                    className={cn('rounded-lg border p-4 transition-colors', meta.rowClass)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{inv.invoice_number}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDate(inv.paid_at || inv.due_date)}
                        </p>
                      </div>
                      <Badge
                        className={cn('inline-flex items-center gap-1.5 border text-xs font-medium', meta.badgeClass)}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {meta.label}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatMoney(inv.amount, inv.currency)}
                      </p>
                      {href ? (
                        <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                          <a href={href} target="_blank" rel="noreferrer">
                            <Download className="h-3.5 w-3.5" />
                            PDF
                          </a>
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-8 text-xs" disabled>
                          Sin archivo
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-muted-foreground">
                  Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, invoices.length)} de{' '}
                  {invoices.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="min-w-[3rem] text-center text-xs text-muted-foreground">
                    {page + 1} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
