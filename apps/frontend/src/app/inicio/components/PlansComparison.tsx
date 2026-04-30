'use client';

import { useMemo, useState } from 'react';
import { Check, Minus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Plan } from '@/hooks/use-subscription';
import { buildComparisonRows, formatCurrency } from '@/lib/public-plan-utils';

interface PlansComparisonProps {
  plans: Plan[];
  billingCycle: 'monthly' | 'yearly';
}

export function PlansComparison({ plans, billingCycle }: PlansComparisonProps) {
  const [featureQuery, setFeatureQuery] = useState('');

  const rows = useMemo(() => buildComparisonRows(plans), [plans]);
  const filteredFeatureRows = useMemo(() => {
    const query = featureQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (row.kind !== 'feature') return false;
      if (!query) return true;
      return row.label.toLowerCase().includes(query);
    });
  }, [featureQuery, rows]);

  const limitRows = rows.filter((row) => row.kind === 'limit');

  return (
    <section className="border-t border-white/10 py-20">
      <div className="landing-container">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-300">Comparacion clara</p>
            <h2 className="mt-3 text-3xl font-semibold text-white md:text-4xl">Lo importante, sin ruido comercial</h2>
            <p className="mt-3 text-base text-slate-300">
              Revisa capacidad operativa y funciones habilitadas por plan antes de iniciar el registro.
            </p>
          </div>
          <div className="w-full max-w-sm">
            <label htmlFor="plan-feature-search" className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
              Buscar funcionalidad
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                id="plan-feature-search"
                value={featureQuery}
                onChange={(event) => setFeatureQuery(event.target.value)}
                placeholder="API, multi sucursal, reportes..."
                className="border-white/10 bg-slate-900 pl-9 text-slate-100 placeholder:text-slate-500"
              />
            </div>
          </div>
        </div>

        <Tabs defaultValue="capacity" className="mt-10">
          <TabsList className="landing-panel grid h-auto w-full max-w-md grid-cols-2 rounded-lg p-1 text-slate-400">
            <TabsTrigger value="capacity" className="rounded-md data-[state=active]:bg-slate-800 data-[state=active]:text-white">
              Capacidad
            </TabsTrigger>
            <TabsTrigger value="features" className="rounded-md data-[state=active]:bg-slate-800 data-[state=active]:text-white">
              Funciones
            </TabsTrigger>
          </TabsList>

          <TabsContent value="capacity" className="mt-6">
            <ComparisonTable plans={plans} billingCycle={billingCycle} rows={limitRows} />
          </TabsContent>

          <TabsContent value="features" className="mt-6">
            <ComparisonTable
              plans={plans}
              billingCycle={billingCycle}
              rows={filteredFeatureRows}
              emptyMessage="No encontramos funciones con ese termino."
            />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}

type ComparisonTableProps = {
  plans: Plan[];
  billingCycle: 'monthly' | 'yearly';
  rows: ReturnType<typeof buildComparisonRows>;
  emptyMessage?: string;
};

function ComparisonTable({ plans, billingCycle, rows, emptyMessage = 'No hay datos para comparar.' }: ComparisonTableProps) {
  if (!rows.length) {
    return (
      <div className="rounded-lg border border-dashed border-white/10 px-6 py-12 text-center text-sm text-slate-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      <div className="landing-panel hidden overflow-x-auto rounded-lg md:block">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="w-[280px] px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Criterio
              </th>
              {plans.map((plan) => (
                <th key={plan.id} className="min-w-[180px] px-5 py-4 text-left">
                  <p className="text-sm font-semibold text-white">{plan.name}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {billingCycle === 'yearly'
                      ? `${formatCurrency(plan.priceYearly, plan.currency)} / ano`
                      : `${formatCurrency(plan.priceMonthly, plan.currency)} / mes`}
                  </p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-white/5 last:border-b-0">
                <td className="px-5 py-4 text-sm font-medium text-slate-200">{row.label}</td>
                {plans.map((plan) => (
                  <td key={`${row.key}-${plan.id}`} className="px-5 py-4 text-sm text-slate-300">
                    {row.kind === 'limit' ? (
                      row.value(plan)
                    ) : plan.features.includes(row.feature) ? (
                      <span className="inline-flex items-center gap-2 text-emerald-300">
                        <Check className="h-4 w-4" />
                        Incluido
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-slate-500">
                        <Minus className="h-4 w-4" />
                        No incluido
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 md:hidden">
        {rows.map((row) => (
          <div key={row.key} className="landing-panel rounded-lg p-4">
            <p className="text-sm font-medium text-white">{row.label}</p>
            <div className="mt-4 space-y-3">
              {plans.map((plan) => (
                <div key={`${row.key}-${plan.id}`} className="flex items-center justify-between gap-4 border-t border-white/5 pt-3 first:border-t-0 first:pt-0">
                  <div>
                    <p className="text-sm font-medium text-slate-100">{plan.name}</p>
                    <p className="text-xs text-slate-500">
                      {billingCycle === 'yearly'
                        ? `${formatCurrency(plan.priceYearly, plan.currency)} / ano`
                        : `${formatCurrency(plan.priceMonthly, plan.currency)} / mes`}
                    </p>
                  </div>
                  <div className="text-right text-sm text-slate-300">
                    {row.kind === 'limit' ? (
                      row.value(plan)
                    ) : plan.features.includes(row.feature) ? (
                      <span className="inline-flex items-center gap-1 text-emerald-300">
                        <Check className="h-4 w-4" />
                        Si
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Minus className="h-4 w-4" />
                        No
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
