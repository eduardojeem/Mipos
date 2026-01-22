 'use client';
 import React, { useEffect, useState } from 'react';
 import NextDynamic from 'next/dynamic';
 const Providers = NextDynamic(() => import('@/components/providers').then(m => m.Providers), { ssr: false });
 const DebugView = () => {
  const [config, setConfig] = useState<any>(null);
  const [persisted, setPersisted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const setStore = (updater: (prev: any) => any) => setConfig((prev: any) => updater(prev));
  const loadLocal = () => {
    try {
      const raw = localStorage.getItem('businessConfig');
      setConfig(raw ? JSON.parse(raw) : null);
      setPersisted(localStorage.getItem('businessConfigPersisted') === 'true');
     } catch {
       setConfig(null);
       setPersisted(false);
     }
   };
   const fetchRemote = async () => {
     setLoading(true);
     setError(null);
     try {
       const res = await fetch('/api/business-config');
       const data = await res.json().catch(() => null);
       if (res.ok && data?.config) {
         setConfig(data.config);
       } else {
         setError(data?.error || 'Error al cargar configuración');
       }
     } catch (e: any) {
     setError(e?.message || 'Error de red');
    } finally {
      setLoading(false);
    }
   };
   const onChangeBool = (path: string) => (e: any) => {
     const val = !!e.target.checked;
     setStore((prev: any) => {
       const next = { ...(prev || {}) };
       const parts = path.split('.');
       let ref: any = next;
       for (let i = 0; i < parts.length - 1; i++) {
         const p = parts[i];
         ref[p] = ref[p] ?? {};
         ref = ref[p];
       }
       ref[parts[parts.length - 1]] = val;
       return next;
     });
   };
   const onChangeNum = (path: string) => (e: any) => {
     const val = Number(e.target.value);
     setStore((prev: any) => {
       const next = { ...(prev || {}) };
       const parts = path.split('.');
       let ref: any = next;
       for (let i = 0; i < parts.length - 1; i++) {
         const p = parts[i];
         ref[p] = ref[p] ?? {};
         ref = ref[p];
       }
       ref[parts[parts.length - 1]] = val;
       return next;
     });
   };
   const onChangeText = (path: string) => (e: any) => {
     const val = String(e.target.value);
     setStore((prev: any) => {
       const next = { ...(prev || {}) };
       const parts = path.split('.');
       let ref: any = next;
       for (let i = 0; i < parts.length - 1; i++) {
         const p = parts[i];
         ref[p] = ref[p] ?? {};
         ref = ref[p];
       }
       ref[parts[parts.length - 1]] = val;
       return next;
     });
   };
   useEffect(() => {
     loadLocal();
     fetchRemote();
     const onUpdated = (e: any) => {
       setConfig(e?.detail?.config || null);
       try {
         setPersisted(localStorage.getItem('businessConfigPersisted') === 'true');
       } catch {}
     };
     window.addEventListener('business-config:updated', onUpdated as any);
     return () => window.removeEventListener('business-config:updated', onUpdated as any);
   }, []);
   const persistLocal = async () => {
     try {
       if (!config) return;
       const res = await fetch('/api/business-config', {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(config)
       });
       if (res.ok) {
         localStorage.setItem('businessConfig', JSON.stringify(config));
         localStorage.setItem('businessConfigPersisted', 'true');
         setPersisted(true);
       } else {
         const data = await res.json().catch(() => null);
         setError(data?.error || 'Error al guardar');
       }
     } catch (e: any) {
       setError(e?.message || 'Error de red');
     }
   };
  const resetLocal = () => {
    try {
      localStorage.removeItem('businessConfig');
      localStorage.setItem('businessConfigPersisted', 'false');
    } catch {}
    setPersisted(false);
    loadLocal();
  };
  const emitRealtime = async () => {
    try {
      if (!config) return;
      const res = await fetch('/api/business-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        try {
          window.dispatchEvent(new CustomEvent('business-config:updated', { detail: { config } }));
        } catch {}
      } else {
        setError(data?.error || 'Error al emitir actualización');
      }
    } catch (e: any) {
      setError(e?.message || 'Error de red al emitir');
    }
  };
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Business Config Debug</h1>
      <div className="flex gap-2">
        <button className="bg-blue-600 text-white px-3 py-2 rounded" onClick={fetchRemote} disabled={loading}>Recargar remoto</button>
        <button className="bg-green-600 text-white px-3 py-2 rounded" onClick={persistLocal} disabled={!config}>Persistir en API</button>
        <button className="bg-gray-600 text-white px-3 py-2 rounded" onClick={resetLocal}>Reset local</button>
        <button className="bg-violet-600 text-white px-3 py-2 rounded" onClick={emitRealtime} disabled={!config}>Emitir cambio (Realtime)</button>
      </div>
    <div className="text-sm text-gray-600">Persistido: {persisted ? 'sí' : 'no'}</div>
    {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 bg-white rounded-lg shadow space-y-3">
          <h2 className="text-lg font-semibold">Store Settings</h2>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!!config?.storeSettings?.taxEnabled} onChange={onChangeBool('storeSettings.taxEnabled')} />
            <span>Tax Enabled</span>
          </label>
          <label className="flex items-center gap-2">
            <span>Tax Rate (%)</span>
            <input type="number" className="border rounded px-2 py-1 w-28" value={Number(config?.storeSettings?.taxRate ?? 10)} onChange={onChangeNum('storeSettings.taxRate')} />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!!config?.storeSettings?.taxIncludedInPrices} onChange={onChangeBool('storeSettings.taxIncludedInPrices')} />
            <span>Tax Included In Prices</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!!config?.storeSettings?.freeShippingEnabled} onChange={onChangeBool('storeSettings.freeShippingEnabled')} />
            <span>Free Shipping Enabled</span>
          </label>
          <label className="flex items-center gap-2">
            <span>Free Shipping Threshold</span>
            <input type="number" className="border rounded px-2 py-1 w-28" value={Number(config?.storeSettings?.freeShippingThreshold ?? 0)} onChange={onChangeNum('storeSettings.freeShippingThreshold')} />
          </label>
        </div>
        <div className="p-4 bg-white rounded-lg shadow space-y-3">
          <h2 className="text-lg font-semibold">Carousel</h2>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!!config?.carousel?.enabled} onChange={onChangeBool('carousel.enabled')} />
            <span>Enabled</span>
          </label>
          <label className="flex items-center gap-2">
            <span>Ratio</span>
            <input type="number" className="border rounded px-2 py-1 w-28" step="0.01" value={Number(config?.carousel?.ratio ?? 2)} onChange={onChangeNum('carousel.ratio')} />
          </label>
          <label className="flex items-center gap-2">
            <span>Transition Seconds</span>
            <input type="number" className="border rounded px-2 py-1 w-28" value={Number(config?.carousel?.transitionSeconds ?? 5)} onChange={onChangeNum('carousel.transitionSeconds')} />
          </label>
          <label className="flex items-center gap-2">
            <span>Transition Ms</span>
            <input type="number" className="border rounded px-2 py-1 w-28" value={Number(config?.carousel?.transitionMs ?? 500)} onChange={onChangeNum('carousel.transitionMs')} />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!!config?.carousel?.autoplay} onChange={onChangeBool('carousel.autoplay')} />
            <span>Autoplay</span>
          </label>
        </div>
        <div className="p-4 bg-white rounded-lg shadow space-y-3">
          <h2 className="text-lg font-semibold">Home Offers Carousel</h2>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!!config?.homeOffersCarousel?.enabled} onChange={onChangeBool('homeOffersCarousel.enabled')} />
            <span>Enabled</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!!config?.homeOffersCarousel?.autoplay} onChange={onChangeBool('homeOffersCarousel.autoplay')} />
            <span>Autoplay</span>
          </label>
          <label className="flex items-center gap-2">
            <span>Interval (s)</span>
            <input type="number" className="border rounded px-2 py-1 w-28" value={Number(config?.homeOffersCarousel?.intervalSeconds ?? 5)} onChange={onChangeNum('homeOffersCarousel.intervalSeconds')} />
          </label>
          <label className="flex items-center gap-2">
            <span>Transition Ms</span>
            <input type="number" className="border rounded px-2 py-1 w-28" value={Number(config?.homeOffersCarousel?.transitionMs ?? 700)} onChange={onChangeNum('homeOffersCarousel.transitionMs')} />
          </label>
          <label className="flex items-center gap-2">
            <span>Ratio</span>
            <input type="number" className="border rounded px-2 py-1 w-28" step="0.01" value={Number(config?.homeOffersCarousel?.ratio ?? (config?.carousel?.ratio ?? 1.777))} onChange={onChangeNum('homeOffersCarousel.ratio')} />
          </label>
        </div>
      </div>
      <pre className="bg-muted p-4 rounded overflow-auto text-xs">{JSON.stringify(config, null, 2)}</pre>
    </div>
   );
  };
 export default function Page() {
   return (
     <Providers>
       <DebugView />
     </Providers>
   );
 }
