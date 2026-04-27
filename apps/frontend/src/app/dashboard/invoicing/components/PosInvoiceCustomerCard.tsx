'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDebounce } from '@/hooks/useDebounce';
import { useCurrentOrganizationId } from '@/hooks/use-current-organization';

type CustomerSuggestion = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  tax_id?: string | null;
  ruc?: string | null;
};

export function PosInvoiceCustomerCard({
  customerId,
  onCustomerIdChange,
  customerName,
  onCustomerNameChange,
  customerEmail,
  onCustomerEmailChange,
  customerPhone,
  onCustomerPhoneChange,
  customerAddress,
  onCustomerAddressChange,
  customerTaxId,
  onCustomerTaxIdChange,
  isDraft,
}: {
  customerId: string | null;
  onCustomerIdChange: (value: string | null) => void;
  customerName: string;
  onCustomerNameChange: (value: string) => void;
  customerEmail: string;
  onCustomerEmailChange: (value: string) => void;
  customerPhone: string;
  onCustomerPhoneChange: (value: string) => void;
  customerAddress: string;
  onCustomerAddressChange: (value: string) => void;
  customerTaxId: string;
  onCustomerTaxIdChange: (value: string) => void;
  isDraft: boolean;
}) {
  const organizationId = useCurrentOrganizationId();
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 350);
  const [results, setResults] = useState<CustomerSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const q = debounced.trim();
      if (!q || !organizationId) {
        setResults([]);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ q, limit: '6' });
        const response = await fetch(`/api/customers/search?${params.toString()}`, {
          method: 'GET',
          headers: { 'x-organization-id': organizationId },
          credentials: 'same-origin',
        });
        const json = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error((json as any)?.error || (json as any)?.message || 'No se pudo buscar clientes');
        }
        const raw = (json as any)?.data?.results;
        const normalized = Array.isArray(raw) ? raw : [];
        if (!cancelled) {
          setResults(normalized);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setResults([]);
          setError((e as Error).message || 'No se pudo buscar clientes');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [debounced, organizationId]);

  const selectCustomer = (c: CustomerSuggestion) => {
    onCustomerIdChange(c.id);
    onCustomerNameChange(c.name || '');
    onCustomerEmailChange((c.email || '') as any);
    onCustomerPhoneChange((c.phone || '') as any);
    onCustomerAddressChange((c.address || '') as any);
    onCustomerTaxIdChange(((c.ruc || c.tax_id || '') as any) || '');
    setQuery('');
    setResults([]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cliente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Buscar</Label>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nombre, email o teléfono"
          />
          {loading ? <div className="text-xs text-muted-foreground">Buscando…</div> : null}
          {error ? <div className="text-xs text-destructive">{error}</div> : null}
          {results.length > 0 ? (
            <div className="rounded-md border bg-background">
              {results.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => selectCustomer(c)}
                >
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.email || c.phone || ''}</div>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Nombre</Label>
          <Input value={customerName} onChange={(e) => onCustomerNameChange(e.target.value)} disabled={!isDraft} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={customerEmail} onChange={(e) => onCustomerEmailChange(e.target.value)} disabled={!isDraft} />
          </div>
          <div className="space-y-2">
            <Label>Teléfono</Label>
            <Input value={customerPhone} onChange={(e) => onCustomerPhoneChange(e.target.value)} disabled={!isDraft} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Dirección</Label>
          <Input value={customerAddress} onChange={(e) => onCustomerAddressChange(e.target.value)} disabled={!isDraft} />
        </div>
        <div className="space-y-2">
          <Label>Documento fiscal</Label>
          <Input value={customerTaxId} onChange={(e) => onCustomerTaxIdChange(e.target.value)} disabled={!isDraft} />
        </div>
        {customerId ? (
          <div className="text-xs text-muted-foreground">Cliente vinculado: {customerId}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

