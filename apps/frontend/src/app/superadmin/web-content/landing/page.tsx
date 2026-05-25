"use client";

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { LANDING_CONTENT_DEFAULTS, type LandingContent } from '@/lib/web-content/types';

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

type Status = 'idle' | 'loading' | 'saving' | 'saved' | 'error';

export default function LandingContentPage() {
  const [content, setContent] = useState<LandingContent>(deepClone(LANDING_CONTENT_DEFAULTS));
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchContent = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await fetch('/api/superadmin/web-content?key=landing_content');
      if (!res.ok) throw new Error(await res.text());
      const { content: fetched } = await res.json();
      setContent(fetched ?? deepClone(LANDING_CONTENT_DEFAULTS));
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
        body: JSON.stringify({ key: 'landing_content', content }),
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
    setContent(deepClone(LANDING_CONTENT_DEFAULTS));
    setStatus('idle');
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const setHeroField = (field: string, value: string) =>
    setContent((prev) => ({ ...prev, hero: { ...prev.hero, [field]: value } }));

  const setHeroSignal = (index: number, field: 'title' | 'description', value: string) =>
    setContent((prev) => {
      const signals = [...prev.hero.signals];
      signals[index] = { ...signals[index], [field]: value };
      return { ...prev, hero: { ...prev.hero, signals } };
    });

  const addHeroSignal = () =>
    setContent((prev) => ({
      ...prev,
      hero: { ...prev.hero, signals: [...prev.hero.signals, { title: '', description: '' }] },
    }));

  const removeHeroSignal = (index: number) =>
    setContent((prev) => {
      const signals = prev.hero.signals.filter((_, i) => i !== index);
      return { ...prev, hero: { ...prev.hero, signals } };
    });

  const setHowField = (field: string, value: string) =>
    setContent((prev) => ({ ...prev, howItWorks: { ...prev.howItWorks, [field]: value } }));

  const setStep = (index: number, field: 'title' | 'description', value: string) =>
    setContent((prev) => {
      const steps = [...prev.howItWorks.steps];
      steps[index] = { ...steps[index], [field]: value };
      return { ...prev, howItWorks: { ...prev.howItWorks, steps } };
    });

  const setCapability = (index: number, field: 'title' | 'description', value: string) =>
    setContent((prev) => {
      const capabilities = [...prev.howItWorks.capabilities];
      capabilities[index] = { ...capabilities[index], [field]: value };
      return { ...prev, howItWorks: { ...prev.howItWorks, capabilities } };
    });

  const addCapability = () =>
    setContent((prev) => ({
      ...prev,
      howItWorks: {
        ...prev.howItWorks,
        capabilities: [...prev.howItWorks.capabilities, { title: '', description: '' }],
      },
    }));

  const removeCapability = (index: number) =>
    setContent((prev) => ({
      ...prev,
      howItWorks: {
        ...prev.howItWorks,
        capabilities: prev.howItWorks.capabilities.filter((_, i) => i !== index),
      },
    }));

  const setFit = (index: number, value: string) =>
    setContent((prev) => {
      const fits = [...prev.howItWorks.fits];
      fits[index] = { label: value };
      return { ...prev, howItWorks: { ...prev.howItWorks, fits } };
    });

  const addFit = () =>
    setContent((prev) => ({
      ...prev,
      howItWorks: { ...prev.howItWorks, fits: [...prev.howItWorks.fits, { label: '' }] },
    }));

  const removeFit = (index: number) =>
    setContent((prev) => ({
      ...prev,
      howItWorks: {
        ...prev.howItWorks,
        fits: prev.howItWorks.fits.filter((_, i) => i !== index),
      },
    }));

  const setBenefitsField = (field: string, value: string) =>
    setContent((prev) => ({ ...prev, benefits: { ...prev.benefits, [field]: value } }));

  const setBenefitItem = (index: number, field: 'title' | 'description', value: string) =>
    setContent((prev) => {
      const items = [...prev.benefits.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, benefits: { ...prev.benefits, items } };
    });

  const setResolve = (index: number, value: string) =>
    setContent((prev) => {
      const resolves = [...prev.benefits.resolves];
      resolves[index] = value;
      return { ...prev, benefits: { ...prev.benefits, resolves } };
    });

  const addResolve = () =>
    setContent((prev) => ({
      ...prev,
      benefits: { ...prev.benefits, resolves: [...prev.benefits.resolves, ''] },
    }));

  const removeResolve = (index: number) =>
    setContent((prev) => ({
      ...prev,
      benefits: { ...prev.benefits, resolves: prev.benefits.resolves.filter((_, i) => i !== index) },
    }));

  // ─── Render ──────────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Pagina de inicio — /inicio
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Edita el contenido publico de la pagina de aterrizaje del sistema SaaS.
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
          Contenido guardado correctamente. La pagina se actualizara en los proximos minutos.
        </div>
      )}
      {status === 'error' && errorMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      <Tabs defaultValue="hero" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="how">Como funciona</TabsTrigger>
          <TabsTrigger value="benefits">Beneficios</TabsTrigger>
        </TabsList>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <TabsContent value="hero" className="space-y-6">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-base">Textos principales</CardTitle>
              <CardDescription>Badge, titular, descripcion y botones de accion.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Badge</Label>
                <Input
                  value={content.hero.badge}
                  onChange={(e) => setHeroField('badge', e.target.value)}
                  placeholder="Plataforma SaaS para retail..."
                />
              </div>
              <div className="space-y-2">
                <Label>Titular principal (H1)</Label>
                <Textarea
                  value={content.hero.headline}
                  onChange={(e) => setHeroField('headline', e.target.value)}
                  rows={2}
                  placeholder="Gestiona ventas, inventario..."
                />
              </div>
              <div className="space-y-2">
                <Label>Descripcion</Label>
                <Textarea
                  value={content.hero.subtext}
                  onChange={(e) => setHeroField('subtext', e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Boton primario</Label>
                  <Input
                    value={content.hero.ctaPrimary}
                    onChange={(e) => setHeroField('ctaPrimary', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Boton secundario</Label>
                  <Input
                    value={content.hero.ctaSecondary}
                    onChange={(e) => setHeroField('ctaSecondary', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Senales de valor (cards laterales)</CardTitle>
                <CardDescription>Hasta 3 tarjetas con titulo y descripcion breve.</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={addHeroSignal} className="gap-2">
                <Plus className="h-3.5 w-3.5" />
                Agregar
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {content.hero.signals.map((signal, i) => (
                <div key={i} className="space-y-3 rounded-lg border border-slate-100 p-4 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-widest text-slate-400">
                      Senal {i + 1}
                    </span>
                    {content.hero.signals.length > 1 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeHeroSignal(i)}
                        className="h-7 w-7 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Titulo</Label>
                      <Input
                        value={signal.title}
                        onChange={(e) => setHeroSignal(i, 'title', e.target.value)}
                        placeholder="Venta y caja"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Descripcion</Label>
                      <Input
                        value={signal.description}
                        onChange={(e) => setHeroSignal(i, 'description', e.target.value)}
                        placeholder="Operacion diaria con inventario..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Como funciona ────────────────────────────────────────────────── */}
        <TabsContent value="how" className="space-y-6">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-base">Encabezado de seccion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Titular</Label>
                <Textarea
                  value={content.howItWorks.headline}
                  onChange={(e) => setHowField('headline', e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Descripcion</Label>
                <Input
                  value={content.howItWorks.subtext}
                  onChange={(e) => setHowField('subtext', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-base">Pasos de activacion</CardTitle>
              <CardDescription>Los 3 pasos para activar MiPOS en un negocio.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {content.howItWorks.steps.map((step, i) => (
                <div key={i} className="space-y-3 rounded-lg border border-slate-100 p-4 dark:border-slate-800">
                  <span className="text-xs font-medium uppercase tracking-widest text-slate-400">
                    Paso {step.number}
                  </span>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Titulo</Label>
                      <Input
                        value={step.title}
                        onChange={(e) => setStep(i, 'title', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Descripcion</Label>
                      <Input
                        value={step.description}
                        onChange={(e) => setStep(i, 'description', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Capacidades clave</CardTitle>
                <CardDescription>Funcionalidades listadas en la grilla de capacidades.</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={addCapability} className="gap-2">
                <Plus className="h-3.5 w-3.5" />
                Agregar
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Titulo de la seccion</Label>
                <Input
                  value={content.howItWorks.capabilitiesHeadline}
                  onChange={(e) => setHowField('capabilitiesHeadline', e.target.value)}
                />
              </div>
              <Separator />
              {content.howItWorks.capabilities.map((cap, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={cap.title}
                      onChange={(e) => setCapability(i, 'title', e.target.value)}
                      placeholder="Nombre de la capacidad"
                    />
                    <Input
                      value={cap.description}
                      onChange={(e) => setCapability(i, 'description', e.target.value)}
                      placeholder="Descripcion breve"
                    />
                  </div>
                  {content.howItWorks.capabilities.length > 1 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeCapability(i)}
                      className="mt-1 h-8 w-8 shrink-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Para quien encaja</CardTitle>
                <CardDescription>Lista de tipos de negocio ideales.</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={addFit} className="gap-2">
                <Plus className="h-3.5 w-3.5" />
                Agregar
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Descripcion introductoria</Label>
                <Textarea
                  value={content.howItWorks.fitsDescription}
                  onChange={(e) => setHowField('fitsDescription', e.target.value)}
                  rows={2}
                />
              </div>
              <Separator />
              {content.howItWorks.fits.map((fit, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={fit.label}
                    onChange={(e) => setFit(i, e.target.value)}
                    placeholder="Tipo de negocio"
                    className="flex-1"
                  />
                  {content.howItWorks.fits.length > 1 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeFit(i)}
                      className="h-9 w-9 shrink-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Beneficios ───────────────────────────────────────────────────── */}
        <TabsContent value="benefits" className="space-y-6">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-base">Encabezado de seccion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Titular</Label>
                <Textarea
                  value={content.benefits.headline}
                  onChange={(e) => setBenefitsField('headline', e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Descripcion</Label>
                <Textarea
                  value={content.benefits.subtext}
                  onChange={(e) => setBenefitsField('subtext', e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-base">Tarjetas de beneficios</CardTitle>
              <CardDescription>Hasta 4 tarjetas con titulo y descripcion.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {content.benefits.items.map((item, i) => (
                <div key={i} className="space-y-3 rounded-lg border border-slate-100 p-4 dark:border-slate-800">
                  <span className="text-xs font-medium uppercase tracking-widest text-slate-400">
                    Beneficio {i + 1}
                  </span>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Titulo</Label>
                      <Input
                        value={item.title}
                        onChange={(e) => setBenefitItem(i, 'title', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Descripcion</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => setBenefitItem(i, 'description', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Que resuelve</CardTitle>
                <CardDescription>Puntos clave del panel lateral derecho.</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={addResolve} className="gap-2">
                <Plus className="h-3.5 w-3.5" />
                Agregar
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {content.benefits.resolves.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={item}
                    onChange={(e) => setResolve(i, e.target.value)}
                    placeholder="Punto clave"
                    className="flex-1"
                  />
                  {content.benefits.resolves.length > 1 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeResolve(i)}
                      className="h-9 w-9 shrink-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
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
