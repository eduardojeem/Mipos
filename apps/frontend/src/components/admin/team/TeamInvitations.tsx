'use client'

import { useState } from 'react'
import { Mail, Send, Copy, Trash2, RefreshCw, Users, Link2, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useTeamInvitations } from './useTeamInvitations'

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PY', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function TeamInvitations() {
  const { invitations, seats, roles, isLoading, invite, revoke, resend, isInviting } = useTeamInvitations()
  const { toast } = useToast()

  const [email, setEmail] = useState('')
  const [roleId, setRoleId] = useState('')
  const [lastLink, setLastLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const seatsFull = seats ? (!seats.unlimited && seats.available <= 0) : false

  const copy = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      toast({ title: 'Link copiado' })
    } catch {
      toast({ title: 'No se pudo copiar', variant: 'destructive' })
    }
  }

  const handleInvite = async () => {
    if (!email.trim() || !roleId) {
      toast({ title: 'Completá email y rol', variant: 'destructive' })
      return
    }
    try {
      const link = await invite({ email: email.trim(), role_id: roleId })
      setLastLink(link)
      setEmail('')
    } catch {
      // el toast de error lo emite el hook
    }
  }

  return (
    <div className="space-y-6">
      {/* Tarjeta de asientos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" /> Asientos del plan
          </CardTitle>
          <CardDescription>
            {seats
              ? seats.unlimited
                ? 'Tu plan incluye usuarios ilimitados.'
                : `${seats.used} de ${seats.limit} asientos usados (${seats.activeMembers} miembros, ${seats.pendingInvites} invitaciones pendientes).`
              : 'Calculando…'}
          </CardDescription>
        </CardHeader>
        {seats && !seats.unlimited && (
          <CardContent className="pt-0">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${seatsFull ? 'bg-destructive' : 'bg-primary'}`}
                style={{ width: `${Math.min(100, Math.round((seats.used / Math.max(1, seats.limit)) * 100))}%` }}
              />
            </div>
            {seatsFull && (
              <p className="mt-2 text-xs font-medium text-destructive">
                Llegaste al límite de asientos. Mejorá tu plan para sumar más personas.
              </p>
            )}
          </CardContent>
        )}
      </Card>

      {/* Form de invitación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" /> Invitar a alguien
          </CardTitle>
          <CardDescription>Mandá una invitación por email; la persona crea su propia contraseña al aceptar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_200px_auto]">
            <div className="space-y-1.5">
              <Label htmlFor="inv-email">Email</Label>
              <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="persona@email.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select value={roleId} onValueChange={setRoleId}>
                <SelectTrigger><SelectValue placeholder="Elegí un rol" /></SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleInvite} disabled={isInviting || seatsFull} className="w-full">
                <Send className="mr-2 h-4 w-4" /> {isInviting ? 'Invitando…' : 'Invitar'}
              </Button>
            </div>
          </div>

          {/* Link de invitación (no hay proveedor de email: se comparte el link) */}
          {lastLink && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <Link2 className="h-3.5 w-3.5" /> Compartí este link con la persona invitada
              </p>
              <div className="flex items-center gap-2">
                <Input readOnly value={lastLink} className="h-8 text-xs" onFocus={(e) => e.currentTarget.select()} />
                <Button size="sm" variant="outline" className="h-8 flex-shrink-0" onClick={() => copy(lastLink)}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
                <Button size="sm" variant="outline" className="h-8 flex-shrink-0" asChild>
                  <a href={`https://wa.me/?text=${encodeURIComponent('Te invito a unirte: ' + lastLink)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invitaciones pendientes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invitaciones pendientes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Cargando…</p>
          ) : invitations.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No hay invitaciones pendientes.</p>
          ) : (
            <div className="space-y-2">
              {invitations.map((inv) => (
                <div key={inv.id} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {inv.role_name ? <Badge variant="outline" className="mr-1.5">{inv.role_name}</Badge> : null}
                      Vence el {fmtDate(inv.expires_at)}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="h-8" onClick={async () => { const link = await resend(inv.id); setLastLink(link) }}>
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reenviar
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 text-destructive hover:text-destructive" onClick={() => revoke(inv.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
