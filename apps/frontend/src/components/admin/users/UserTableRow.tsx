'use client'

import { memo } from 'react'
import { Crown, Loader2, Trash2, UserCog } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TableCell, TableRow } from '@/components/ui/table'
import type { User as CompanyUser } from '@/lib/services/admin-api'

type CompanyRole = 'OWNER' | 'ADMIN' | 'SELLER' | 'WAREHOUSE'
type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'

const ROLE_STYLES: Record<CompanyRole, string> = {
  OWNER: 'border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
  ADMIN: 'border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300',
  SELLER: 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300',
  WAREHOUSE: 'border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300',
}

const STATUS_STYLES: Record<UserStatus, string> = {
  ACTIVE: 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300',
  INACTIVE: 'border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
  SUSPENDED: 'border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300',
}

const STATUS_OPTIONS: Array<{ value: UserStatus; label: string }> = [
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'INACTIVE', label: 'Inactivo' },
  { value: 'SUSPENDED', label: 'Suspendido' },
]

function normalizeStatus(status?: string): UserStatus {
  const normalized = String(status || '').toUpperCase()
  if (normalized === 'INACTIVE') return 'INACTIVE'
  if (normalized === 'SUSPENDED') return 'SUSPENDED'
  return 'ACTIVE'
}

function normalizeRole(role?: string): CompanyRole {
  const normalized = String(role || '').toUpperCase()
  if (normalized === 'OWNER') return 'OWNER'
  if (normalized === 'ADMIN') return 'ADMIN'
  if (normalized === 'WAREHOUSE') return 'WAREHOUSE'
  return 'SELLER'
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Sin acceso'
  return new Intl.DateTimeFormat('es-PY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

interface UserTableRowProps {
  item: CompanyUser
  isBusy: boolean
  isDeleting: boolean
  onEdit: (user: CompanyUser) => void
  onUpdateStatus: (user: CompanyUser, status: string) => void
  onDelete: (userId: string) => void
}

export const UserTableRow = memo(function UserTableRow({
  item,
  isBusy,
  isDeleting,
  onEdit,
  onUpdateStatus,
  onDelete,
}: UserTableRowProps) {
  const itemRole = normalizeRole(item.role)
  const itemStatus = normalizeStatus(item.status)

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted font-medium text-foreground">
            {getInitials(item.name)}
          </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                {item.isOwner && <Crown className="h-3.5 w-3.5 text-slate-500" />}
                {item.isOwner && (
                  <Badge variant="outline" className="h-5 border-slate-300 px-1.5 text-[10px] uppercase tracking-[0.12em] text-slate-600">
                    Owner
                  </Badge>
                )}
              </div>
              <p className="truncate text-xs text-muted-foreground">{item.email}</p>
            </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={ROLE_STYLES[itemRole]}>{itemRole}</Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={STATUS_STYLES[itemStatus]}>{itemStatus}</Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatDateTime(item.lastLogin)}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(item)} disabled={isBusy}>
            <UserCog className="mr-2 h-4 w-4" />
            Editar
          </Button>

          <Select value={itemStatus} onValueChange={(value) => onUpdateStatus(item, value)} disabled={isBusy}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(item.id)}
            disabled={isBusy}
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
})
