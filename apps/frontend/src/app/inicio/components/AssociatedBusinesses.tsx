'use client';

import { useEffect, useState } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

interface PublicOrganizationsResponse {
  success?: boolean;
  organizations?: Organization[];
  count?: number;
}

interface AssociatedBusinessesProps {
  open: boolean;
  onClose: () => void;
}

export function AssociatedBusinesses({ open, onClose }: AssociatedBusinessesProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) {
      return;
    }

    void fetchOrganizations();
  }, [open]);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/organizations/public', { cache: 'no-store' });
      const data = (await response.json()) as PublicOrganizationsResponse;

      if (data.success) {
        setOrganizations(Array.isArray(data.organizations) ? data.organizations : []);
        setCount(typeof data.count === 'number' ? data.count : 0);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const normalizeDisplayText = (value: string) => {
    try {
      const decoded = new TextDecoder('utf-8').decode(
        Uint8Array.from(value, (char) => char.charCodeAt(0))
      );
      return decoded.includes('�') ? value : decoded;
    } catch {
      return value;
    }
  };

  const getInitials = (name: string) =>
    normalizeDisplayText(name)
      .trim()
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] max-w-5xl overflow-y-auto border-white/10 bg-slate-950 text-white">
        <DialogHeader className="border-b border-white/10 pb-5">
          <DialogTitle className="flex items-center gap-3 text-2xl font-semibold">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
              <Building2 className="h-5 w-5" />
            </div>
            Negocios publicados
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-slate-400">
            Directorio resumido de empresas visibles dentro del ecosistema publico de MiPOS.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="inline-flex items-center gap-3 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando organizaciones
            </div>
          </div>
        ) : organizations.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-white/5 text-slate-500">
              <Building2 className="h-8 w-8" />
            </div>
            <p className="mt-5 text-lg font-medium text-white">No hay negocios para mostrar</p>
            <p className="mt-2 text-sm text-slate-400">Cuando haya publicaciones activas apareceran aqui.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 py-2 sm:grid-cols-2 xl:grid-cols-3">
              {organizations.map((organization) => (
                <div key={organization.id} className="rounded-lg border border-white/10 bg-white/5 p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-400/10 text-sm font-semibold text-emerald-200">
                      {getInitials(organization.name)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-medium text-white">
                        {normalizeDisplayText(organization.name)}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">@{organization.slug}</p>
                      <p className="mt-3 text-xs text-slate-400">
                        Visible desde {new Date(organization.created_at).getFullYear()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 pt-5 text-sm text-slate-400">
              {count > 0 ? `${count} negocios disponibles en el directorio publico.` : `${organizations.length} negocios disponibles.`}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
