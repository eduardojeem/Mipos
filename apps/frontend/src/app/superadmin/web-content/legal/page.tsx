"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ScrollText, RefreshCw, ExternalLink, Save, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ── Tipos ────────────────────────────────────────────────────────────────────
interface LegalContent {
  version: string;
  lastUpdated: string;
  termsTitle: string;
  termsBody: string;
  privacyTitle: string;
  privacyBody: string;
}

interface AcceptanceItem {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  organizationId: string | null;
  organizationName: string | null;
  termsVersion: string | null;
  source: string | null;
  ip: string | null;
  acceptedAt: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('es-PY', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

// ── Editor de contenido legal ────────────────────────────────────────────────
function LegalContentEditor() {
  const [content, setContent] = useState<LegalContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/superadmin/web-content?key=legal_content', { credentials: 'include' });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `Error ${res.status}`);
        }
        const data = await res.json();
        setContent(data.content as LegalContent);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const update = (field: keyof LegalContent, value: string) => {
    setContent((prev) => (prev ? { ...prev, [field]: value } : prev));
    setStatus(null);
  };

  const save = useCallback(async () => {
    if (!content) return;
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch('/api/superadmin/web-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ key: 'legal_content', content }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Error ${res.status}`);
      }
      setStatus('Cambios guardados. Las páginas /terms y /privacy se actualizan en breve.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }, [content]);

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">Cargando contenido…</div>;
  }
  if (error && !content) {
    return <div className="p-8 text-center text-sm text-red-600 dark:text-red-400">{error}</div>;
  }
  if (!content) return null;

  return (
    <div className="space-y-6">
      <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          Estás editando texto <strong>legal</strong>. Subí la <strong>versión</strong> cuando hagas cambios
          sustanciales (así el registro de aceptaciones refleja qué versión aceptó cada usuario). Hacé revisar
          el contenido por un abogado. Formato: <code>## </code> para subtítulos, <code>- </code> para listas,
          línea en blanco para separar párrafos.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Versión</span>
          <input className={inputClass} value={content.version} onChange={(e) => update('version', e.target.value)} />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">Última actualización (texto)</span>
          <input className={inputClass} value={content.lastUpdated} onChange={(e) => update('lastUpdated', e.target.value)} />
        </label>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Términos de Servicio (/terms)</p>
        <label className="space-y-1.5 text-sm">
          <span className="text-slate-600 dark:text-slate-300">Título</span>
          <input className={inputClass} value={content.termsTitle} onChange={(e) => update('termsTitle', e.target.value)} />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="text-slate-600 dark:text-slate-300">Cuerpo</span>
          <textarea
            className={`${inputClass} min-h-[320px] font-mono text-[13px] leading-relaxed`}
            value={content.termsBody}
            onChange={(e) => update('termsBody', e.target.value)}
          />
        </label>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Política de Privacidad (/privacy)</p>
        <label className="space-y-1.5 text-sm">
          <span className="text-slate-600 dark:text-slate-300">Título</span>
          <input className={inputClass} value={content.privacyTitle} onChange={(e) => update('privacyTitle', e.target.value)} />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="text-slate-600 dark:text-slate-300">Cuerpo</span>
          <textarea
            className={`${inputClass} min-h-[320px] font-mono text-[13px] leading-relaxed`}
            value={content.privacyBody}
            onChange={(e) => update('privacyBody', e.target.value)}
          />
        </label>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="text-sm">
          {error ? <span className="text-red-600 dark:text-red-400">{error}</span> : null}
          {status ? <span className="text-emerald-600 dark:text-emerald-400">{status}</span> : null}
        </div>
        <Button onClick={save} disabled={saving} className="gap-1.5">
          <Save className="h-4 w-4" />
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  );
}

// ── Tabla de aceptaciones ────────────────────────────────────────────────────
function AcceptancesTable() {
  const [items, setItems] = useState<AcceptanceItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (page: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/superadmin/terms-acceptances?page=${page}&limit=25`, { credentials: 'include' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Error ${res.status}`);
      }
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      if (data.pagination) setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Aceptaciones {pagination.total > 0 ? `(${pagination.total})` : ''}
          </p>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => load(pagination.page)} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        {error ? (
          <div className="p-8 text-center text-sm text-red-600 dark:text-red-400">{error}</div>
        ) : loading && items.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">Cargando…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Sin aceptaciones todavía</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Aparecerán aquí cuando un usuario complete el registro.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="px-4 py-2.5 font-medium">Usuario</th>
                  <th className="px-4 py-2.5 font-medium">Organización</th>
                  <th className="px-4 py-2.5 font-medium">Versión</th>
                  <th className="px-4 py-2.5 font-medium">Origen</th>
                  <th className="px-4 py-2.5 font-medium">IP</th>
                  <th className="px-4 py-2.5 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr
                    key={it.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/30"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{it.userName || '—'}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{it.userEmail || it.userId || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{it.organizationName || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="font-mono text-[11px]">
                        {it.termsVersion || '—'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{it.source || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{it.ip || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{formatDate(it.acceptedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Página {pagination.page} de {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={pagination.page <= 1 || loading} onClick={() => load(pagination.page - 1)}>
                Anterior
              </Button>
              <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages || loading} onClick={() => load(pagination.page + 1)}>
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Página ───────────────────────────────────────────────────────────────────
export default function LegalContentPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/superadmin/web-content"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Contenido web
          </Link>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
              <ScrollText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Legal</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Editá Términos y Privacidad, y revisá las aceptaciones.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <a href="/terms" target="_blank" rel="noopener noreferrer">
              Ver /terms <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <a href="/privacy" target="_blank" rel="noopener noreferrer">
              Ver /privacy <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="contenido">
        <TabsList>
          <TabsTrigger value="contenido">Contenido</TabsTrigger>
          <TabsTrigger value="aceptaciones">Aceptaciones</TabsTrigger>
        </TabsList>
        <TabsContent value="contenido" className="mt-6">
          <LegalContentEditor />
        </TabsContent>
        <TabsContent value="aceptaciones" className="mt-6">
          <AcceptancesTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
