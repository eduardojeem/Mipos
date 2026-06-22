'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  Copy,
  Eye,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EmailLog = {
  id: string
  to: string
  subject: string
  template: string
  status: 'sent' | 'failed'
  sentAt: string
  error?: string
}

type EmailStats = {
  totalSent: number
  totalFailed: number
  lastSentAt: string | null
  configured: boolean
}

type TestEmailPayload = {
  to: string
  template: 'invitation' | 'welcome'
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function fetchEmailStats(): Promise<EmailStats> {
  const res = await fetch('/api/superadmin/emails/stats')
  if (!res.ok) throw new Error('No se pudieron cargar las estadísticas')
  return res.json()
}

async function fetchEmailLogs(): Promise<EmailLog[]> {
  const res = await fetch('/api/superadmin/emails/logs')
  if (!res.ok) throw new Error('No se pudieron cargar los logs')
  const json = await res.json()
  return json.logs || []
}

async function sendTestEmail(payload: TestEmailPayload): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/superadmin/emails/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return res.json()
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  if (status === 'sent') {
    return (
      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400">
        Enviado
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-400">
      Fallido
    </Badge>
  )
}

function StatCard({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'ok' | 'bad' }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <div
          className={cn(
            'mt-1 text-2xl font-bold',
            tone === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'bad' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white',
          )}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  )
}

function TemplateCard({
  name,
  description,
  disabledTest,
  onPreview,
  onTest,
}: {
  name: string
  description: string
  disabledTest: boolean
  onPreview: () => void
  onTest: () => void
}) {
  return (
    <div className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center">
      <div className="flex items-start gap-3">
        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">{name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="outline" className="gap-1.5" onClick={onPreview}>
          <Eye className="h-3.5 w-3.5" /> Ver
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={onTest}
          disabled={disabledTest}
          title={disabledTest ? 'Configurá Resend para enviar' : 'Enviar prueba'}
        >
          <Send className="h-3.5 w-3.5" /> Prueba
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SuperAdminEmailsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [testEmail, setTestEmail] = useState('')
  const [testTemplate, setTestTemplate] = useState<'invitation' | 'welcome' | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<'invitation' | 'welcome' | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string>('')
  const [copied, setCopied] = useState(false)

  const statsQuery = useQuery({
    queryKey: ['email-stats'],
    queryFn: fetchEmailStats,
    staleTime: 30_000,
  })

  const logsQuery = useQuery({
    queryKey: ['email-logs'],
    queryFn: fetchEmailLogs,
    staleTime: 30_000,
  })

  const testMutation = useMutation({
    mutationFn: sendTestEmail,
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: 'Email de prueba enviado', description: data.message })
        queryClient.invalidateQueries({ queryKey: ['email-logs'] })
        queryClient.invalidateQueries({ queryKey: ['email-stats'] })
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
      setTestTemplate(null)
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    },
  })

  const handleTest = () => {
    if (!testEmail.trim() || !testTemplate) return
    testMutation.mutate({ to: testEmail.trim(), template: testTemplate })
  }

  const handlePreview = async (template: 'invitation' | 'welcome') => {
    try {
      const res = await fetch(`/api/superadmin/emails/preview?template=${template}`)
      const json = await res.json()
      setPreviewHtml(json.html || '<p>Sin preview disponible</p>')
      setPreviewTemplate(template)
    } catch {
      toast({ title: 'Error', description: 'No se pudo cargar el preview', variant: 'destructive' })
    }
  }

  const stats = statsQuery.data
  const logs = logsQuery.data ?? []
  const configured = stats?.configured ?? false

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
            <Mail className="h-6 w-6 text-slate-600" />
            Emails del Sistema
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Supervisá y probá los correos automáticos (Resend)
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Estado API"
          tone={configured ? 'ok' : 'bad'}
          value={
            <span className="flex items-center gap-2 text-lg">
              {configured ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <AlertTriangle className="h-5 w-5 text-amber-500" />}
              {configured ? 'Configurado' : 'Sin API Key'}
            </span>
          }
        />
        <StatCard label="Enviados" value={stats?.totalSent ?? '—'} />
        <StatCard label="Fallidos" tone="bad" value={stats?.totalFailed ?? '—'} />
      </div>

      {!configured && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-sm font-semibold text-amber-800 dark:text-amber-300">Resend no configurado</AlertTitle>
          <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
            Agregá <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/40">RESEND_API_KEY</code> y{' '}
            <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/40">RESEND_FROM_EMAIL</code> al entorno para activar el envío. (Podés previsualizar igual.)
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Templates */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Copy className="h-5 w-5 text-slate-600" /> Plantillas
            </CardTitle>
            <CardDescription>Previsualizá y probá las plantillas del sistema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <TemplateCard
              name="Invitación de equipo"
              description="Se envía cuando un admin invita a alguien a la organización."
              disabledTest={!configured}
              onPreview={() => handlePreview('invitation')}
              onTest={() => { setTestTemplate('invitation'); setTestEmail('') }}
            />
            <TemplateCard
              name="Bienvenida"
              description="Se envía al completar el registro de una nueva empresa."
              disabledTest={!configured}
              onPreview={() => handlePreview('welcome')}
              onTest={() => { setTestTemplate('welcome'); setTestEmail('') }}
            />
          </CardContent>
        </Card>

        {/* Logs */}
        <Card className="flex flex-col lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <RefreshCw className="h-5 w-5 text-slate-600" /> Últimos envíos
              </CardTitle>
              <CardDescription>Historial reciente de emails procesados por Resend.</CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['email-logs'] })}
              disabled={logsQuery.isFetching}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', logsQuery.isFetching && 'animate-spin')} />
              Actualizar
            </Button>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            {logsQuery.isLoading ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                <p className="text-sm">Cargando envíos...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <Mail className="h-12 w-12 text-slate-300 dark:text-slate-700" />
                <p className="text-sm font-medium text-slate-900 dark:text-white">No hay envíos registrados</p>
                <p className="text-xs text-slate-500">Los correos aparecerán acá una vez enviados</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.slice(0, 20).map((log) => (
                  <div key={log.id} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{log.to}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{log.subject}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center">
                      <span className="text-[11px] text-slate-400">
                        {new Date(log.sentAt).toLocaleString('es-PY', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <StatusBadge status={log.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Test Email Dialog */}
      <Dialog open={!!testTemplate} onOpenChange={(o) => !o && setTestTemplate(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-slate-600" /> Enviar email de prueba
            </DialogTitle>
            <DialogDescription>
              Plantilla: <strong>{testTemplate === 'invitation' ? 'Invitación' : 'Bienvenida'}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="test-email">Email de destino</Label>
            <Input
              id="test-email"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="vos@ejemplo.com"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestTemplate(null)}>Cancelar</Button>
            <Button onClick={handleTest} disabled={!testEmail.trim() || testMutation.isPending} className="gap-2">
              {testMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={(o) => !o && setPreviewTemplate(null)}>
        <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-slate-600" /> Preview: {previewTemplate === 'invitation' ? 'Invitación' : 'Bienvenida'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto border-y border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            {/* sandbox="" : el HTML se renderiza pero no ejecuta JS (anti-XSS) */}
            <iframe
              srcDoc={previewHtml}
              className="h-[500px] w-full rounded-md border border-slate-200 bg-white dark:border-slate-800"
              sandbox=""
              title="Email preview"
            />
          </div>
          <DialogFooter className="p-4">
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                navigator.clipboard.writeText(previewHtml)
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              }}
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copiado' : 'Copiar HTML'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
