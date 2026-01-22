'use client'

import { useEffect, useState } from 'react'
import { useAuthContext } from '@/hooks/use-auth'
import { useHasPermission } from '@/hooks/use-unified-permissions'
import { usePermissionsContext } from '@/hooks/use-unified-permissions'

export default function CashPermissionDebugPage() {
  const { user } = useAuthContext()
  const { hasPermission, loading } = useHasPermission('cash', 'open')
  const { refreshPermissions } = usePermissionsContext()
  const [result, setResult] = useState<'SI' | 'NO' | 'CARGANDO'>('CARGANDO')
  const [granting, setGranting] = useState(false)
  const [grantMsg, setGrantMsg] = useState<string>('')

  useEffect(() => {
    if (loading) setResult('CARGANDO')
    else setResult(hasPermission ? 'SI' : 'NO')
  }, [loading, hasPermission])

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center p-6">
      <div className="max-w-lg w-full rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Verificación de permiso: Abrir Caja</h1>
        <div className="mt-4 text-sm text-muted-foreground">Usuario actual</div>
        <div className="text-base font-medium">{user?.email || user?.id || 'Sesión no iniciada'}</div>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <div className="text-sm text-muted-foreground">Permiso requerido</div>
            <div className="text-base font-medium">cash:open</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Estado</div>
            <div className={
              result === 'SI' ? 'text-green-600 font-semibold' : result === 'NO' ? 'text-red-600 font-semibold' : 'text-yellow-600 font-semibold'
            }>{result}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Detalle</div>
            <div className="text-sm">{loading ? 'Verificando permisos...' : hasPermission ? 'El usuario puede abrir caja' : 'El usuario no tiene permiso'}</div>
          </div>
        </div>
        <div className="mt-6">
          <button
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            disabled={granting || loading || result === 'SI'}
            onClick={async () => {
              try {
                setGranting(true)
                setGrantMsg('Concediendo permiso...')
                const resp = await fetch('/api/permissions/grant/cash-open', { method: 'POST' })
                const json = await resp.json()
                if (resp.ok && json?.success) {
                  setGrantMsg('Permiso concedido')
                  await refreshPermissions()
                } else {
                  setGrantMsg(json?.error || 'Error al conceder permiso')
                }
              } catch (e: any) {
                setGrantMsg(e?.message || 'Error')
              } finally {
                setGranting(false)
              }
            }}
          >Conceder cash:open (rol CASHIER)</button>
          {grantMsg ? <div className="mt-2 text-sm text-muted-foreground">{grantMsg}</div> : null}
        </div>
        <div className="mt-6 text-sm text-muted-foreground">Ruta</div>
        <div className="text-xs font-mono">/debug/cash</div>
      </div>
    </div>
  )
}
