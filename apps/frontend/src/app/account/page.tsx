'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  Package,
  Phone,
  Save,
  ShoppingBag,
  Store,
  Truck,
  User,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { NavBar } from '@/app/home/components/NavBar';
import { Footer } from '@/app/home/components/Footer';
import { MarketplaceHeader } from '@/app/home/components/marketplace/MarketplaceHeader';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { useUserOrganizations } from '@/hooks/use-user-organizations';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { useTenantPublicRouting } from '@/hooks/useTenantPublicRouting';
import { formatPrice } from '@/utils/formatters';
import { defaultBusinessConfig, type BusinessConfig } from '@/types/business-config';

interface PurchaseItem {
  id: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface PurchaseSummary {
  id: string;
  orderNumber: string;
  sellerName: string;
  sellerSlug?: string;
  sellerOrganizationId?: string;
  total: number;
  subtotal?: number;
  shippingCost?: number;
  status: string;
  paymentMethod: string;
  fulfillmentType?: string;
  orderSource?: string;
  createdAt: string;
  buyerType?: string;
  buyerOrganizationId?: string | null;
  buyerOrganizationName?: string | null;
  items?: PurchaseItem[];
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  PREPARING: 'Preparando',
  READY: 'Listo',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

function buildMarketplaceOrderHref(purchase: PurchaseSummary, fallbackHref: string) {
  const orderParam = encodeURIComponent(purchase.orderNumber);
  return purchase.sellerSlug ? `/${purchase.sellerSlug}/orders/track?orderNumber=${orderParam}` : fallbackHref;
}

function getPurchaseItemCount(purchase: PurchaseSummary) {
  return (purchase.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

function PurchaseCard({
  purchase,
  href,
  config,
}: {
  purchase: PurchaseSummary;
  href: string;
  config: BusinessConfig;
}) {
  const items = purchase.items || [];
  const itemCount = getPurchaseItemCount(purchase);
  const isBusinessPurchase = purchase.buyerType === 'business';
  const isPickup = purchase.fulfillmentType === 'PICKUP';

  return (
    <Link
      href={href}
      className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950/60 dark:hover:bg-slate-900"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {isBusinessPurchase ? (
              <Building2 className="h-4 w-4 text-slate-400" />
            ) : (
              <Package className="h-4 w-4 text-slate-400" />
            )}
            <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
              {purchase.orderNumber}
            </span>
            <Badge variant="outline">{STATUS_LABELS[purchase.status] || purchase.status}</Badge>
          </div>

          <div className="grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
            <span className="flex min-w-0 items-center gap-2">
              <Store className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Tienda: {purchase.sellerName || 'Tienda'}</span>
            </span>
            <span className="flex items-center gap-2">
              {isPickup ? <Package className="h-3.5 w-3.5 shrink-0" /> : <Truck className="h-3.5 w-3.5 shrink-0" />}
              {isPickup ? 'Retiro en local' : 'Delivery'}
            </span>
            <span className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              {purchase.createdAt ? new Date(purchase.createdAt).toLocaleDateString('es-PY') : 'Sin fecha'}
            </span>
            <span className="flex items-center gap-2">
              <CreditCard className="h-3.5 w-3.5 shrink-0" />
              {purchase.paymentMethod || 'Metodo pendiente'}
            </span>
          </div>

          {isBusinessPurchase ? (
            <p className="text-xs text-slate-500">
              Compra como empresa: {purchase.buyerOrganizationName || 'Empresa'}
            </p>
          ) : (
            <p className="text-xs text-slate-500">Compra como persona</p>
          )}

          {items.length > 0 ? (
            <div className="space-y-1 rounded-xl border border-slate-200 bg-white/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-900/50">
              {items.slice(0, 2).map((item) => (
                <div key={item.id || item.productId || item.productName} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate">
                    {item.quantity}x {item.productName}
                  </span>
                  <span className="shrink-0 text-slate-600 dark:text-slate-300">
                    {formatPrice(item.subtotal, config)}
                  </span>
                </div>
              ))}
              {items.length > 2 ? (
                <p className="text-slate-400">+{items.length - 2} producto{items.length - 2 === 1 ? '' : 's'} mas</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="text-left sm:text-right">
          <p className="text-base font-bold text-slate-900 dark:text-slate-100">
            {formatPrice(purchase.total, config)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {itemCount > 0 ? `${itemCount} ${itemCount === 1 ? 'unidad' : 'unidades'}` : 'Ver detalle'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {isPickup ? 'Sin envio' : `Envio: ${formatPrice(Number(purchase.shippingCost || 0), config)}`}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { profile, isLoading: profileLoading, updateProfile } = useProfile();
  const {
    organizations,
    selectedOrganization,
    loading: organizationsLoading,
    selectOrganization,
    clearSelectedOrganization,
  } = useUserOrganizations(user?.id);
  const { config } = useBusinessConfig();
  const { tenantHref, tenantApiPath, isPathTenantRouting } = useTenantPublicRouting();
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [purchases, setPurchases] = useState<PurchaseSummary[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);

  const displayConfig = isPathTenantRouting ? config : defaultBusinessConfig;
  const primary = displayConfig.branding?.primaryColor || '#0f766e';
  const isLoading = authLoading || profileLoading;
  const personalPurchases = purchases.filter((purchase) => purchase.buyerType !== 'business');
  const businessPurchases = purchases.filter((purchase) => purchase.buyerType === 'business');
  const initials = useMemo(() => {
    const label = form.name || profile?.name || user?.email || 'Cliente';
    return label.trim().charAt(0).toUpperCase() || 'C';
  }, [form.name, profile?.name, user?.email]);

  useEffect(() => {
    if (!profile) return;
    setForm({
      name: profile.name || '',
      phone: profile.phone || '',
      address: profile.location || '',
    });
  }, [profile]);

  useEffect(() => {
    if (!user?.id) {
      setPurchases([]);
      return;
    }

    let cancelled = false;
    const loadPurchases = async () => {
      try {
        setLoadingPurchases(true);
        const response = await fetch(tenantApiPath('/api/profile/purchases?tenantOnly=true&limit=30'), {
          cache: 'no-store',
        });
        const data = await response.json().catch(() => ({}));
        if (!cancelled) {
          setPurchases(response.ok && Array.isArray(data?.purchases) ? data.purchases : []);
        }
      } catch {
        if (!cancelled) setPurchases([]);
      } finally {
        if (!cancelled) setLoadingPurchases(false);
      }
    };

    void loadPurchases();
    return () => {
      cancelled = true;
    };
  }, [tenantApiPath, user?.id]);

  const handleSave = async () => {
    const name = form.name.trim();
    const phone = form.phone.trim();
    const address = form.address.trim();

    if (name.length < 2) {
      toast({
        title: 'Nombre requerido',
        description: 'Ingresa al menos 2 caracteres para tu nombre.',
        variant: 'destructive',
      });
      return;
    }

    if (phone && phone.replace(/\D/g, '').length < 6) {
      toast({
        title: 'Telefono invalido',
        description: 'Ingresa un telefono valido para coordinar tus pedidos.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const ok = await updateProfile({
        name,
        phone,
        location: address,
      });

      if (ok) {
        toast({
          title: 'Mi cuenta actualizada',
          description: 'Usaremos estos datos como predeterminados en tus futuras compras.',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleNavigate = (sectionId: string) => {
    router.push(tenantHref(`/home#${sectionId}`));
  };

  const handleSelectBuyingOrganization = (organizationId: string) => {
    const organization = organizations.find((item) => item.id === organizationId);
    if (!organization) return;
    selectOrganization(organization);
    toast({
      title: 'Empresa seleccionada',
      description: `Tus próximas compras pueden hacerse como ${organization.name}.`,
    });
  };

  const getPurchaseHref = (purchase: PurchaseSummary) => {
    const tenantOrderHref = tenantHref(`/orders/track?orderNumber=${encodeURIComponent(purchase.orderNumber)}`);
    return isPathTenantRouting ? tenantOrderHref : buildMarketplaceOrderHref(purchase, tenantOrderHref);
  };

  return (
    <div className={isPathTenantRouting ? 'min-h-screen bg-slate-50 dark:bg-slate-950' : 'min-h-screen bg-[linear-gradient(180deg,_#fffdf8_0%,_#f8fafc_42%,_#eef4f3_100%)] text-slate-900 dark:bg-[linear-gradient(180deg,_#020617_0%,_#0f172a_42%,_#111827_100%)] dark:text-slate-100'}>
      {isPathTenantRouting ? (
        <NavBar config={displayConfig} activeSection="account" onNavigate={handleNavigate} />
      ) : (
        <MarketplaceHeader />
      )}

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Button variant="ghost" className="mb-5 gap-2" onClick={() => router.push(tenantHref('/home'))}>
          <ArrowLeft className="h-4 w-4" />
          Volver a la tienda
        </Button>

        {isLoading ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-2xl border bg-white dark:border-slate-800 dark:bg-slate-900">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : !user ? (
          <Card className="rounded-2xl border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="flex min-h-[360px] flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <User className="h-6 w-6 text-slate-500" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Mi cuenta</h1>
              <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
                Inicia sesion como cliente para editar tus datos, guardar tu direccion predeterminada y ver tus compras.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button asChild style={{ backgroundColor: primary }}>
                  <Link href={tenantHref(`/auth/signin?type=customer&returnUrl=${encodeURIComponent(tenantHref('/account'))}`)}>
                    Iniciar sesion
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={tenantHref(`/auth/signup?type=customer&returnUrl=${encodeURIComponent(tenantHref('/account'))}`)}>
                    Crear cuenta
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-6">
              <Card className="rounded-2xl border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-900">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white"
                      style={{ backgroundColor: primary }}
                    >
                      {initials}
                    </div>
                    <div>
                      <CardTitle className="text-xl">Mi cuenta</CardTitle>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{profile?.email || user.email}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="account-name" className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      Nombre completo
                    </Label>
                    <Input
                      id="account-name"
                      value={form.name}
                      onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="Tu nombre"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account-phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400" />
                      Telefono
                    </Label>
                    <Input
                      id="account-phone"
                      value={form.phone}
                      onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                      placeholder="+595 981 123456"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account-address" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      Direccion predeterminada
                    </Label>
                    <Input
                      id="account-address"
                      value={form.address}
                      onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                      placeholder="Calle, numero, barrio, ciudad"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Se usa como sugerencia en futuras compras. Los pedidos anteriores conservan su direccion original.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <span>{profile?.email || user.email}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      El email se usa para iniciar sesion y buscar pedidos.
                    </p>
                  </div>

                  <Button onClick={handleSave} disabled={saving} className="w-full gap-2" style={{ backgroundColor: primary }}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Guardar cambios
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-900">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Building2 className="h-5 w-5" />
                    Mis empresas
                  </CardTitle>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Usa la misma cuenta para comprar como persona o como empresa.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      clearSelectedOrganization();
                      toast({ title: 'Modo personal seleccionado', description: 'Tus próximas compras saldrán como persona.' });
                    }}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm transition hover:bg-white dark:border-slate-800 dark:bg-slate-950/60"
                  >
                    <span className="font-medium">Comprar como persona</span>
                    {!selectedOrganization ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : null}
                  </button>

                  {organizationsLoading ? (
                    <div className="flex h-20 items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                    </div>
                  ) : organizations.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">
                      Todavia no tenes empresas asociadas a esta cuenta.
                    </div>
                  ) : (
                    organizations.map((organization) => {
                      const active = selectedOrganization?.id === organization.id;
                      return (
                        <div
                          key={organization.id}
                          className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/60"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-slate-100">{organization.name}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                Plan {organization.subscription_plan || 'sin plan'} / {organization.subscription_status || 'sin estado'}
                              </p>
                            </div>
                            {active ? <Badge className="bg-emerald-600">Activo</Badge> : null}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={active ? 'secondary' : 'outline'}
                              onClick={() => handleSelectBuyingOrganization(organization.id)}
                            >
                              Comprar como empresa
                            </Button>
                            <Button asChild size="sm" variant="outline">
                              <Link href="/dashboard">
                                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                                Dashboard
                              </Link>
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-2xl border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-900">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xl">Mis compras</CardTitle>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Pedidos realizados con esta cuenta, identificando el negocio y el detalle de la compra.
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={tenantHref('/orders/track')}>Seguimiento</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {loadingPurchases ? (
                  <div className="flex h-40 items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  </div>
                ) : purchases.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center dark:border-slate-700">
                    <ShoppingBag className="mx-auto h-8 w-8 text-slate-400" />
                    <p className="mt-3 font-medium text-slate-900 dark:text-slate-100">Todavia no hay compras</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Cuando hagas una compra con esta cuenta, aparecera aqui.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {personalPurchases.length > 0 ? (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Personales</p>
                        <div className="space-y-3">
                          {personalPurchases.map((purchase) => (
                            <PurchaseCard
                              key={purchase.id}
                              purchase={purchase}
                              href={getPurchaseHref(purchase)}
                              config={displayConfig}
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {businessPurchases.length > 0 ? (
                      <div className="pt-2">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Empresas</p>
                        <div className="space-y-3">
                          {businessPurchases.map((purchase) => (
                            <PurchaseCard
                              key={purchase.id}
                              purchase={purchase}
                              href={getPurchaseHref(purchase)}
                              config={displayConfig}
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {isPathTenantRouting ? (
        <Footer config={displayConfig} onNavigate={handleNavigate} />
      ) : (
        <footer className="border-t border-slate-200/60 bg-white/50 py-10 text-center text-sm text-slate-500 backdrop-blur-sm dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-400">
          MiPOS Marketplace
        </footer>
      )}
    </div>
  );
}
