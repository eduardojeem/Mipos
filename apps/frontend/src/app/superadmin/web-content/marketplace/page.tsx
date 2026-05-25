"use client";

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, RotateCcw, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MARKETPLACE_CONTENT_DEFAULTS, type MarketplaceContent } from '@/lib/web-content/types';

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

type Status = 'idle' | 'loading' | 'saving' | 'saved' | 'error';

export default function MarketplaceContentPage() {
  const [content, setContent] = useState<MarketplaceContent>(deepClone(MARKETPLACE_CONTENT_DEFAULTS));
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchContent = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await fetch('/api/superadmin/web-content?key=marketplace_content');
      if (!res.ok) throw new Error(await res.text());
      const { content: fetched } = await res.json();
      setContent(fetched ?? deepClone(MARKETPLACE_CONTENT_DEFAULTS));
      setStatus('idle');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMsg('No se pudo cargar el contenido. Se muestran los valores por defecto.');
    }
  }, []);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const save = async () => {
    setStatus('saving');
    setErrorMsg('');
    try {
      const res = await fetch('/api/superadmin/web-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'marketplace_content', content }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || 'Error al guardar');
      }
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Error al guardar');
    }
  };

  const reset = () => {
    setContent(deepClone(MARKETPLACE_CONTENT_DEFAULTS));
    setStatus('idle');
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const setHeroField = (field: keyof MarketplaceContent['hero'], value: string) =>
    setContent((prev) => ({ ...prev, hero: { ...prev.hero, [field]: value } }));

  type SectionKey = keyof MarketplaceContent['sections'];
  type SectionField = keyof MarketplaceContent['sections'][SectionKey];

  const setSectionField = (section: SectionKey, field: SectionField, value: string) =>
    setContent((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [section]: { ...prev.sections[section], [field]: value },
      },
    }));

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const sectionConfig = [
    {
      key: 'organizations' as SectionKey,
      label: 'Empresas',
      color: 'text-blue-600',
    },
    {
      key: 'categories' as SectionKey,
      label: 'Categorias',
      color: 'text-emerald-600',
    },
    {
      key: 'catalog' as SectionKey,
      label: 'Catalogo',
      color: 'text-amber-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Marketplace publico — /home
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Edita el contenido del marketplace global: hero, secciones y textos de navegacion.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={reset} className="gap-2">
            <RotateCcw className="h-3.5 w-3.5" />
            Restablecer
          </Button>
          <Button size="sm" onClick={save} disabled={status === 'saving'} className="gap-2">
            {status === 'saving' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Guardar cambios
          </Button>
        </div>
      </div>

      {/* Status */}
      {status === 'saved' && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Contenido guardado correctamente. El marketplace se actualizara en los proximos minutos.
        </div>
      )}
      {status === 'error' && errorMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      <Tabs defaultValue="hero" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="hero">Hero principal</TabsTrigger>
          <TabsTrigger value="sections">Secciones</TabsTrigger>
        </TabsList>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <TabsContent value="hero">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-base">Hero del marketplace</CardTitle>
              <CardDescription>
                Bloque principal visible al entrar a /home desde el dominio raiz.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Badge (etiqueta superior)</Label>
                <Input
                  value={content.hero.badge}
                  onChange={(e) => setHeroField('badge', e.target.value)}
                  placeholder="Ecosistema publico multiempresa"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Titular principal</Label>
                  <Input
                    value={content.hero.headline}
                    onChange={(e) => setHeroField('headline', e.target.value)}
                    placeholder="Directorio comercial"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Texto destacado (gradiente)</Label>
                  <Input
                    value={content.hero.headlineHighlight}
                    onChange={(e) => setHeroField('headlineHighlight', e.target.value)}
                    placeholder="conectado a MiPOS"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descripcion</Label>
                <Textarea
                  value={content.hero.description}
                  onChange={(e) => setHeroField('description', e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Boton primario</Label>
                  <Input
                    value={content.hero.ctaPrimary}
                    onChange={(e) => setHeroField('ctaPrimary', e.target.value)}
                    placeholder="Explorar catalogo global"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Boton secundario</Label>
                  <Input
                    value={content.hero.ctaSecondary}
                    onChange={(e) => setHeroField('ctaSecondary', e.target.value)}
                    placeholder="Registrar mi empresa"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Secciones ────────────────────────────────────────────────────── */}
        <TabsContent value="sections" className="space-y-6">
          {sectionConfig.map(({ key, label, color }) => (
            <Card key={key} className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className={`text-base ${color}`}>{label}</CardTitle>
                <CardDescription>
                  Badge, titular, palabra destacada y enlace de la seccion.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Badge</Label>
                  <Input
                    value={content.sections[key].badge}
                    onChange={(e) => setSectionField(key, 'badge', e.target.value)}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Titular</Label>
                    <Input
                      value={content.sections[key].headline}
                      onChange={(e) => setSectionField(key, 'headline', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Palabra destacada (color)</Label>
                    <Input
                      value={content.sections[key].headlineHighlight}
                      onChange={(e) => setSectionField(key, 'headlineHighlight', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Texto del enlace "Ver todos"</Label>
                  <Input
                    value={content.sections[key].ctaLabel}
                    onChange={(e) => setSectionField(key, 'ctaLabel', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Floating save bar */}
      <div className="sticky bottom-0 -mx-4 -mb-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Cambios no guardados se perderan al salir.
          </p>
          <Button onClick={save} disabled={status === 'saving'} className="gap-2">
            {status === 'saving' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar cambios
          </Button>
        </div>
      </div>
    </div>
  );
}
