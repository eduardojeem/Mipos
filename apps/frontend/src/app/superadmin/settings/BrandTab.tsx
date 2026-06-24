'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import {
  CheckCircle2,
  Copy,
  Crown,
  Globe,
  ImageIcon,
  LayoutDashboard,
  Link2,
  Loader2,
  Mail,
  Palette,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/lib/toast';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface BrandSettings {
  system_name: string;
  system_email: string;
  platform_logo: string;
  platform_tagline: string;
  platform_primary_color: string;
  platform_support_email: string;
}

interface BrandTabProps {
  settings: BrandSettings;
  setSettings: (s: BrandSettings) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Color presets
// ─────────────────────────────────────────────────────────────────────────────

const COLOR_PRESETS = [
  { label: 'Índigo', hex: '#6366f1' },
  { label: 'Violeta', hex: '#8b5cf6' },
  { label: 'Esmeralda', hex: '#059669' },
  { label: 'Cielo', hex: '#0ea5e9' },
  { label: 'Rosa', hex: '#ec4899' },
  { label: 'Ámbar', hex: '#f59e0b' },
  { label: 'Naranja', hex: '#f97316' },
  { label: 'Rosa rojo', hex: '#ef4444' },
  { label: 'Teal', hex: '#14b8a6' },
  { label: 'Lima', hex: '#84cc16' },
  { label: 'Slate', hex: '#475569' },
  { label: 'Negro', hex: '#0f172a' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function StyledInput(props: React.ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      className={`border-slate-700 bg-slate-950/60 text-slate-200 placeholder:text-slate-600 focus:border-indigo-500/50 focus:ring-indigo-500/20 ${props.className ?? ''}`}
    />
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
      {children}
    </Label>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-slate-800" />
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">{label}</span>
      <div className="h-px flex-1 bg-slate-800" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Logo Upload Zone
// ─────────────────────────────────────────────────────────────────────────────

function LogoUploadZone({
  currentUrl,
  onUploaded,
  onClear,
}: {
  currentUrl: string;
  onUploaded: (url: string) => void;
  onClear: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [urlInput, setUrlInput] = useState(currentUrl);

  // Keep input in sync when parent changes
  useEffect(() => { setUrlInput(currentUrl); }, [currentUrl]);

  const doUpload = useCallback(async (file: File) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      toast.error('Formato no soportado. Usá JPG, PNG, WebP o SVG.'); return;
    }
    if (file.size > 1 * 1024 * 1024) {
      toast.error('El archivo supera el límite de 1 MB.'); return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('bucket', 'platform-assets');
      form.append('prefix', 'logos');
      form.append('purpose', 'business-logo');

      const res = await fetch('/api/assets/upload', { method: 'POST', body: form });
      const json = await res.json();

      if (!res.ok || !json.success) throw new Error(json.error || 'Error al subir');

      const url: string = json.files?.[0]?.url || '';
      if (!url) throw new Error('No se recibió URL');

      onUploaded(url);
      toast.success('Logo subido correctamente ✓');
    } catch (err: any) {
      toast.error(err.message || 'Error al subir el logo');
    } finally {
      setUploading(false);
    }
  }, [onUploaded]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) doUpload(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) doUpload(file);
  };

  const handleUrlBlur = () => {
    if (urlInput !== currentUrl) onUploaded(urlInput);
  };

  const copyUrl = () => {
    if (!currentUrl) return;
    navigator.clipboard.writeText(currentUrl);
    toast.success('URL copiada');
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border-2 border-dashed transition-all duration-200 ${
          dragging
            ? 'border-indigo-500 bg-indigo-500/10'
            : currentUrl
            ? 'border-emerald-500/30 bg-emerald-500/5'
            : 'border-slate-700 bg-slate-950/40 hover:border-slate-600 hover:bg-slate-900/60'
        }`}
      >
        {uploading ? (
          <>
            <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
            <p className="text-xs text-slate-400">Subiendo al storage…</p>
          </>
        ) : currentUrl ? (
          <>
            {/* Preview */}
            <div className="flex max-h-[72px] max-w-[200px] items-center justify-center p-2">
              <img
                src={currentUrl}
                alt="Logo actual"
                className="max-h-[72px] max-w-full object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
            <div className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span className="text-[10px] font-semibold text-emerald-400">Logo activo</span>
            </div>
            <p className="text-[10px] text-slate-600">Clic o arrastrá para reemplazar</p>
          </>
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-900">
              <ImageIcon className="h-6 w-6 text-slate-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-300">Arrastrá o clic para subir</p>
              <p className="text-xs text-slate-600">JPG, PNG, WebP, SVG — máx 1 MB</p>
            </div>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {/* URL row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-600" />
          <StyledInput
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onBlur={handleUrlBlur}
            onKeyDown={(e) => { if (e.key === 'Enter') handleUrlBlur(); }}
            placeholder="https://... o pegá una URL directa"
            className="pl-9 font-mono text-xs"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={!currentUrl}
          onClick={copyUrl}
          className="h-9 w-9 shrink-0 border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          title="Copiar URL"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={!currentUrl || uploading}
          onClick={() => { onClear(); setUrlInput(''); }}
          className="h-9 w-9 shrink-0 border-rose-800/50 bg-rose-900/20 text-rose-400 hover:bg-rose-900/40 hover:text-rose-300"
          title="Eliminar logo"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Live Preview — Email Header
// ─────────────────────────────────────────────────────────────────────────────

function EmailPreview({ name, tagline, logo, color }: {
  name: string; tagline: string; logo: string; color: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 text-[13px] shadow-inner">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800/80 px-4 py-2">
        <div className="flex gap-1.5">
          {['bg-rose-500', 'bg-amber-400', 'bg-emerald-500'].map((c) => (
            <span key={c} className={`h-2.5 w-2.5 rounded-full ${c}`} />
          ))}
        </div>
        <span className="text-[10px] text-slate-500">Vista previa de email</span>
        <Mail className="h-3.5 w-3.5 text-slate-600" />
      </div>

      {/* Email body */}
      <div className="bg-slate-950 p-4">
        {/* From / subject bar */}
        <div className="mb-4 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-[11px]">
          <p className="text-slate-500"><span className="text-slate-600">De: </span><span className="text-slate-300">{name} &lt;noreply@{name.toLowerCase().replace(/\s/g,'')}.com&gt;</span></p>
          <p className="text-slate-500"><span className="text-slate-600">Asunto: </span><span className="text-slate-300">¡Bienvenido a {name}!</span></p>
        </div>

        {/* Email card */}
        <div className="overflow-hidden rounded-lg border border-slate-800">
          {/* Header */}
          <div className="flex items-center justify-center p-5" style={{ backgroundColor: color }}>
            {logo ? (
              <img src={logo} alt={name} className="max-h-10 max-w-[160px] object-contain" />
            ) : (
              <span className="text-xl font-black text-white tracking-tight">{name}</span>
            )}
          </div>
          {/* Body */}
          <div className="bg-slate-900 px-6 py-5 text-center">
            <p className="text-sm font-bold text-slate-100">Bienvenido a {name}</p>
            <p className="mt-1 text-xs text-slate-500">{tagline || 'Tu plataforma de gestión'}</p>
            <div className="mt-4 flex justify-center">
              <span
                className="rounded-lg px-5 py-2 text-xs font-semibold text-white"
                style={{ backgroundColor: color }}
              >
                Acceder a mi cuenta
              </span>
            </div>
          </div>
          {/* Footer */}
          <div className="border-t border-slate-800 bg-slate-950/60 px-4 py-3 text-center">
            <p className="text-[10px] text-slate-600">{tagline}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Live Preview — Sidebar mini-mock
// ─────────────────────────────────────────────────────────────────────────────

function SidebarPreview({ name, logo, color }: { name: string; logo: string; color: string }) {
  const items = ['Dashboard', 'Productos', 'Ventas', 'Clientes', 'Ajustes'];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 text-[12px] shadow-inner">
      <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800/80 px-3 py-2">
        <div className="flex gap-1.5">
          {['bg-rose-500', 'bg-amber-400', 'bg-emerald-500'].map((c) => (
            <span key={c} className={`h-2 w-2 rounded-full ${c}`} />
          ))}
        </div>
        <span className="text-[10px] text-slate-500">Vista previa — Sidebar</span>
        <LayoutDashboard className="h-3 w-3 text-slate-600" />
      </div>

      <div className="flex h-48 bg-slate-950">
        {/* Sidebar */}
        <div className="flex w-36 flex-col border-r border-slate-800 bg-slate-900/80">
          {/* Brand */}
          <div className="flex items-center gap-2 border-b border-slate-800 px-3 py-2.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md" style={{ backgroundColor: color }}>
              {logo ? (
                <img src={logo} alt="" className="h-5 w-5 object-contain" />
              ) : (
                <Crown className="h-3.5 w-3.5 text-white" />
              )}
            </div>
            <span className="truncate text-[11px] font-bold text-slate-200">{name || 'Mi Tienda'}</span>
          </div>

          {/* Nav items */}
          <div className="flex-1 space-y-0.5 p-1.5">
            {items.map((item, i) => (
              <div
                key={item}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors"
                style={i === 0 ? { backgroundColor: color + '20', borderLeft: `2px solid ${color}` } : {}}
              >
                <div
                  className="h-2 w-2 rounded-sm"
                  style={i === 0 ? { backgroundColor: color } : { backgroundColor: '#334155' }}
                />
                <span className={`text-[10px] ${i === 0 ? 'font-semibold text-slate-100' : 'text-slate-500'}`}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main content mock */}
        <div className="flex flex-1 flex-col p-3 gap-2">
          <div className="h-4 w-24 rounded bg-slate-800" />
          <div className="grid grid-cols-2 gap-2 flex-1">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                <div className="mb-1.5 h-2 w-10 rounded bg-slate-800" />
                <div className="h-4 w-8 rounded" style={{ backgroundColor: color + '40' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main BrandTab
// ─────────────────────────────────────────────────────────────────────────────

export function BrandTab({ settings, setSettings }: BrandTabProps) {
  const [previewMode, setPreviewMode] = useState<'email' | 'sidebar'>('email');

  const set = useCallback(
    (partial: Partial<BrandSettings>) => setSettings({ ...settings, ...partial }),
    [settings, setSettings]
  );

  return (
    <div className="grid gap-4 lg:grid-cols-5">

      {/* ── Left column: form ── */}
      <div className="space-y-4 lg:col-span-3">

        {/* Identity */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 backdrop-blur-sm">
          <div className="flex items-start gap-3 border-b border-slate-800 px-5 py-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10">
              <Palette className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-100">Identidad de la plataforma</p>
              <p className="text-xs text-slate-500">Nombre y eslogan que ven todos los usuarios</p>
            </div>
          </div>
          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <FieldLabel>Nombre</FieldLabel>
                <StyledInput
                  value={settings.system_name}
                  onChange={(e) => set({ system_name: e.target.value })}
                  placeholder="MITIENDA"
                  maxLength={32}
                />
                <p className="flex justify-between text-[10px] text-slate-600">
                  <span>Sidebar, emails y footer</span>
                  <span className={settings.system_name.length > 28 ? 'text-amber-500' : ''}>
                    {settings.system_name.length}/32
                  </span>
                </p>
              </div>
              <div className="space-y-1.5">
                <FieldLabel>Tagline / Eslogan</FieldLabel>
                <StyledInput
                  value={settings.platform_tagline}
                  onChange={(e) => set({ platform_tagline: e.target.value })}
                  placeholder="Sistema de gestión para tu negocio"
                  maxLength={60}
                />
                <p className="flex justify-between text-[10px] text-slate-600">
                  <span>Emails y meta tags</span>
                  <span className={settings.platform_tagline.length > 52 ? 'text-amber-500' : ''}>
                    {settings.platform_tagline.length}/60
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Logo */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 backdrop-blur-sm">
          <div className="flex items-start gap-3 border-b border-slate-800 px-5 py-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10">
              <ImageIcon className="h-4 w-4 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-100">Logo</p>
              <p className="text-xs text-slate-500">Subí desde tu dispositivo o pegá una URL pública</p>
            </div>
          </div>
          <div className="p-5">
            <LogoUploadZone
              currentUrl={settings.platform_logo}
              onUploaded={(url) => set({ platform_logo: url })}
              onClear={() => set({ platform_logo: '' })}
            />
          </div>
        </div>

        {/* Color */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 backdrop-blur-sm">
          <div className="flex items-start gap-3 border-b border-slate-800 px-5 py-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/10">
              <Palette className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-100">Color primario</p>
              <p className="text-xs text-slate-500">Botones CTA, headers de emails y acentos de UI</p>
            </div>
          </div>
          <div className="space-y-4 p-5">
            {/* Presets */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">Presets</p>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => set({ platform_primary_color: preset.hex })}
                    title={preset.label}
                    className="relative h-8 w-8 rounded-lg border-2 transition-all hover:scale-110"
                    style={{
                      backgroundColor: preset.hex,
                      borderColor: settings.platform_primary_color === preset.hex
                        ? 'white'
                        : 'transparent',
                      boxShadow: settings.platform_primary_color === preset.hex
                        ? `0 0 0 3px ${preset.hex}60`
                        : 'none',
                    }}
                  >
                    {settings.platform_primary_color === preset.hex && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <svg viewBox="0 0 12 12" className="h-3 w-3 text-white drop-shadow" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M2 6l3 3 5-5" />
                        </svg>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <SectionDivider label="o personalizado" />

            {/* Custom picker */}
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.platform_primary_color}
                onChange={(e) => set({ platform_primary_color: e.target.value })}
                className="h-10 w-10 cursor-pointer rounded-lg border border-slate-700 bg-slate-950 p-0.5"
              />
              <StyledInput
                value={settings.platform_primary_color}
                onChange={(e) => set({ platform_primary_color: e.target.value })}
                placeholder="#059669"
                className="max-w-[130px] font-mono text-sm"
              />
              <div
                className="flex h-10 flex-1 items-center justify-center rounded-lg text-xs font-semibold text-white shadow-inner"
                style={{ backgroundColor: settings.platform_primary_color }}
              >
                Vista previa del color
              </div>
            </div>
          </div>
        </div>

        {/* Emails */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 backdrop-blur-sm">
          <div className="flex items-start gap-3 border-b border-slate-800 px-5 py-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10">
              <Mail className="h-4 w-4 text-sky-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-100">Emails</p>
              <p className="text-xs text-slate-500">Remitente y soporte para comunicaciones transaccionales</p>
            </div>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <FieldLabel>Email del sistema (sender)</FieldLabel>
              <StyledInput
                type="email"
                value={settings.system_email}
                onChange={(e) => set({ system_email: e.target.value })}
                placeholder="admin@mitienda.com"
              />
              <p className="text-[10px] text-slate-600">Aparece como remitente en emails transaccionales</p>
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Email de soporte</FieldLabel>
              <StyledInput
                type="email"
                value={settings.platform_support_email}
                onChange={(e) => set({ platform_support_email: e.target.value })}
                placeholder="soporte@mitienda.com"
              />
              <p className="text-[10px] text-slate-600">Donde los usuarios escriben si tienen problemas</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right column: live preview ── */}
      <div className="lg:col-span-2">
        <div className="sticky top-4 space-y-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 backdrop-blur-sm">
            {/* Preview header with toggle */}
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Vista previa en vivo</p>
              <div className="flex gap-1 rounded-lg border border-slate-700 bg-slate-950 p-0.5">
                <button
                  type="button"
                  onClick={() => setPreviewMode('email')}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-semibold transition-all ${
                    previewMode === 'email'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Mail className="h-3 w-3" /> Email
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('sidebar')}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-semibold transition-all ${
                    previewMode === 'sidebar'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <LayoutDashboard className="h-3 w-3" /> Sidebar
                </button>
              </div>
            </div>

            <div className="p-4">
              {previewMode === 'email' ? (
                <EmailPreview
                  name={settings.system_name || 'Mi Plataforma'}
                  tagline={settings.platform_tagline}
                  logo={settings.platform_logo}
                  color={settings.platform_primary_color}
                />
              ) : (
                <SidebarPreview
                  name={settings.system_name || 'Mi Plataforma'}
                  logo={settings.platform_logo}
                  color={settings.platform_primary_color}
                />
              )}
            </div>
          </div>

          {/* Summary card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Resumen de marca</p>
            <div className="space-y-2">
              {[
                { label: 'Nombre', value: settings.system_name || '—' },
                { label: 'Tagline', value: settings.platform_tagline || '—' },
                { label: 'Color', value: settings.platform_primary_color },
                { label: 'Logo', value: settings.platform_logo ? '✓ Configurado' : 'Sin logo' },
                { label: 'Email sender', value: settings.system_email || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-2 text-xs">
                  <span className="shrink-0 text-slate-600">{label}</span>
                  <span className="truncate text-right font-medium text-slate-300">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
