'use client';

import { useMemo, useState } from 'react';
import { Check, Minus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Plan } from '@/hooks/use-subscription';
import { buildComparisonRows, formatCurrency, getPlanBillingPrice } from '@/lib/public-plan-utils';
import type { BusinessVertical } from '@/config/verticals';
import { getPublicVerticalPositioning } from '@/lib/public-vertical-positioning';

interface PlansComparisonProps {
  plans: Plan[];
  billingCycle: 'monthly' | 'yearly';
  vertical?: BusinessVertical;
}

export function PlansComparison({ plans, billingCycle, vertical = 'RETAIL' }: PlansComparisonProps) {
  const [activeTab, setActiveTab] = useState<'capacity' | 'features'>('capacity');
  const [featureQuery, setFeatureQuery] = useState('');
  const verticalCopy = getPublicVerticalPositioning(vertical);

  const rows = useMemo(() => buildComparisonRows(plans), [plans]);
  const limitRows = useMemo(() => rows.filter((row) => row.kind === 'limit'), [rows]);

  const filteredFeatureRows = useMemo(() => {
    const query = featureQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (row.kind === 'limit') return false;
      if (row.kind === 'group') return !query;
      return !query || row.label.toLowerCase().includes(query);
    });
  }, [featureQuery, rows]);

  return (
    <section className="relative border-t border-white/5 bg-slate-950/40 py-20">
      <div className="landing-container">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
              Comparativa tecnica
            </p>
            <h2 className="mt-3 text-3xl font-extrabold text-white md:text-4xl">
              Capacidad transparente, sin sorpresas
            </h2>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              {verticalCopy.comparisonDescription}
            </p>
          </div>

          {activeTab === 'features' && (
            <div className="w-full max-w-sm">
              <label
                htmlFor="plan-feature-search"
                className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500"
              >
                Buscar caracteristica
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  id="plan-feature-search"
                  value={featureQuery}
                  onChange={(event) => setFeatureQuery(event.target.value)}
                  placeholder="Ej: reportes, sucursales, fidelizacion..."
                  className="h-10 rounded-xl border-white/10 bg-slate-900/60 pl-9 text-slate-200 placeholder:text-slate-500 focus:border-emerald-400 focus:ring-emerald-400/20"
                />
              </div>
            </div>
          )}
        </div>

        <Tabs
          defaultValue="capacity"
          className="mt-10"
          onValueChange={(value) => setActiveTab(value as 'capacity' | 'features')}
        >
          <TabsList className="grid h-auto w-full max-w-md grid-cols-2 rounded-xl border border-white/10 bg-slate-900/60 p-1 text-slate-400">
            <TabsTrigger
              value="capacity"
              className="rounded-lg py-2.5 text-xs font-bold transition-colors data-[state=active]:bg-emerald-400 data-[state=active]:text-slate-950"
            >
              Limites operativos
            </TabsTrigger>
            <TabsTrigger
              value="features"
              className="rounded-lg py-2.5 text-xs font-bold transition-colors data-[state=active]:bg-emerald-400 data-[state=active]:text-slate-950"
            >
              Modulos incluidos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="capacity" className="mt-6">
            <p className="mb-4 text-xs text-slate-500">{verticalCopy.capacityDescription}</p>
            <ComparisonTable
              plans={plans}
              billingCycle={billingCycle}
              rows={limitRows}
              columnHeader="Limites operativos"
            />
          </TabsContent>

          <TabsContent value="features" className="mt-6">
            <p className="mb-4 text-xs text-slate-500">
              Modulos confirmados y disponibles en el sistema actual.
            </p>
            <ComparisonTable
              plans={plans}
              billingCycle={billingCycle}
              rows={filteredFeatureRows}
              emptyMessage="No encontramos funciones con ese termino."
              columnHeader="Modulo o funcion"
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
  columnHeader?: string;
};

function ComparisonTable({
  plans,
  billingCycle,
  rows,
  emptyMessage = 'No hay datos para comparar.',
  columnHeader = 'Criterio',
}: ComparisonTableProps) {
  const hasContent = rows.some((row) => row.kind !== 'group');

  if (!hasContent) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/10 px-6 py-12 text-center text-xs text-slate-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-2xl border border-white/5 bg-slate-900/40 shadow-2xl md:block">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-slate-950/40">
              <th className="w-[300px] px-6 py-5 text-left text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                {columnHeader}
              </th>
              {plans.map((plan) => (
                <th key={plan.id} className="min-w-[190px] px-6 py-5 text-left">
                  <p className="text-sm font-extrabold text-white">{plan.name}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    {plan.slug === 'enterprise'
                      ? 'A consultar'
                      : billingCycle === 'yearly'
                        ? `${formatCurrency(getPlanBillingPrice(plan, 'yearly'), plan.currency)} / ano`
                        : `${formatCurrency(plan.priceMonthly, plan.currency)} / mes`}
                  </p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              if (row.kind === 'group') {
                return (
                  <tr key={row.key} className="border-b border-white/5 bg-white/[0.02]">
                    <td
                      colSpan={plans.length + 1}
                      className="px-6 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-400"
                    >
                      {row.label}
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={row.key} className="border-b border-white/5 transition-colors last:border-b-0 hover:bg-white/[0.01]">
                  <td className="px-6 py-4 text-xs font-semibold text-slate-300">{row.label}</td>
                  {plans.map((plan) => (
                    <td key={`${row.key}-${plan.id}`} className="px-6 py-4 text-xs text-slate-300">
                      {row.kind === 'limit' ? (
                        <span className="font-extrabold text-white">{row.value(plan)}</span>
                      ) : row.includedByPlanId.has(plan.id) ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/15 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-400">
                          <Check className="h-3.5 w-3.5" />
                          Incluido
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                          <Minus className="h-3.5 w-3.5" />
                          No incluido
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 md:hidden">
        {rows.map((row) => {
          if (row.kind === 'group') {
            return (
              <p key={row.key} className="pt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-400 first:pt-0">
                {row.label}
              </p>
            );
          }

          return (
            <div key={row.key} className="rounded-2xl border border-white/5 bg-slate-900/50 p-4 shadow-xl">
              <p className="text-xs font-bold text-slate-300">{row.label}</p>
              <div className="mt-4 space-y-3">
                {plans.map((plan) => (
                  <div key={`${row.key}-${plan.id}`} className="flex items-center justify-between gap-4 border-t border-white/5 pt-3 first:border-t-0 first:pt-0">
                    <div>
                      <p className="text-xs font-bold text-white">{plan.name}</p>
                      <p className="text-[10px] font-semibold text-slate-500">
                        {plan.slug === 'enterprise'
                          ? 'A consultar'
                          : billingCycle === 'yearly'
                            ? `${formatCurrency(getPlanBillingPrice(plan, 'yearly'), plan.currency)}/ano`
                            : `${formatCurrency(plan.priceMonthly, plan.currency)}/mes`}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      {row.kind === 'limit' ? (
                        <span className="font-bold text-white">{row.value(plan)}</span>
                      ) : row.includedByPlanId.has(plan.id) ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
                          <Check className="h-3.5 w-3.5" />
                          Si
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                          <Minus className="h-3.5 w-3.5" />
                          No
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
