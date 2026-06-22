'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, CheckCircle2, AlertCircle, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'

function InviteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const { user, loading } = useAuth()

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ name?: string } | null>(null)

  const returnUrl = `/invite?token=${encodeURIComponent(token)}`

  const accept = async () => {
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/team/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'No se pudo aceptar la invitación')
      setDone({ name: json.organization?.name })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo aceptar la invitación')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center px-4">
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mail className="h-6 w-6" />
          </div>
          <CardTitle>Invitación a un equipo</CardTitle>
          <CardDescription>Te invitaron a unirte a una empresa en el sistema.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!token ? (
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" /> Link de invitación inválido.
            </p>
          ) : done ? (
            <div className="space-y-3 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
              <p className="text-sm text-foreground">
                ¡Listo! Ya formás parte de <span className="font-medium">{done.name || 'la empresa'}</span>.
              </p>
              <Button className="w-full" onClick={() => router.push('/dashboard')}>Ir al panel</Button>
            </div>
          ) : loading ? (
            <p className="text-center text-sm text-muted-foreground">Cargando…</p>
          ) : !user ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-muted-foreground">
                Iniciá sesión (o registrate) con el email al que llegó la invitación para aceptarla.
              </p>
              <Button asChild className="w-full">
                <Link href={`/auth/signin?returnUrl=${encodeURIComponent(returnUrl)}`}>
                  <LogIn className="mr-2 h-4 w-4" /> Iniciar sesión
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/auth/signup?returnUrl=${encodeURIComponent(returnUrl)}`}>Crear cuenta</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Estás como <span className="font-medium text-foreground">{user.email}</span>.
              </p>
              {error && <p className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4" /> {error}</p>}
              <Button className="w-full" onClick={accept} disabled={submitting}>
                {submitting ? 'Aceptando…' : 'Aceptar invitación'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Cargando…</div>}>
      <InviteContent />
    </Suspense>
  )
}
