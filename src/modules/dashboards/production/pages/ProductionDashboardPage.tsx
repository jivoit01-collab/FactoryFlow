import { Boxes, ClipboardCheck, Coins, Factory, Info, OctagonAlert } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { useAuth } from '@/core/auth';
import { useLines, useRuns } from '@/modules/production/execution/api/execution.queries';
import type { AnalyticsParams } from '@/modules/production/execution/types';
import { Button } from '@/shared/components/ui';

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

import { useProductionReconciliation } from '../api/reconciliation.queries';
import {
  BreakdownAnalysis,
  MaterialSection,
  ProductionEconomics,
  ReconciliationPanel,
  RunningLinesSummary,
  WastageSection,
} from '../components';
import { variantForCompany } from '../constants/production-dashboard.constants';

function SectionHeading({ icon: Icon, title }: { icon: typeof Coins; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
    </div>
  );
}

/**
 * Company-aware Production dashboard (Dashboards module, /dashboards/production).
 * Three sections — Production (running lines, App-vs-SAP reconciliation, OEE),
 * Wastage (App-vs-SAP reconciliation + trend), and Cost analysis. Company decides
 * the variant (Oil / Beverages); a from→to range drives every panel.
 */
export default function ProductionDashboardPage() {
  const { currentCompany } = useAuth();
  const variant = useMemo(() => variantForCompany(currentCompany), [currentCompany]);

  // Whole dashboard is driven by a single day (defaults to today).
  const [date, setDate] = useState(() => todayISO());
  const [selectedLine, setSelectedLine] = useState<number | undefined>(undefined);

  // Downstream panels still take a {from, to} range — here from === to.
  const range = useMemo(() => ({ from: date, to: date }), [date]);

  const linesQuery = useLines(true);
  const lines = linesQuery.data ?? [];

  const params: AnalyticsParams = useMemo(
    () => ({ date_from: date, date_to: date, line: selectedLine }),
    [date, selectedLine],
  );
  const today = useMemo(() => todayISO(), []);

  // SKUs (product names) running today — used to scope the production panel.
  const runningToday = useRuns({ status: 'IN_PROGRESS', date: today });
  const todaySkus = useMemo(
    () =>
      new Set(
        (runningToday.data ?? []).map((r) => (r.product || '').trim().toUpperCase()).filter(Boolean),
      ),
    [runningToday.data],
  );

  // All reconciliations follow the selected date + line.
  const reconParams = useMemo(
    () => ({ date_from: date, date_to: date, line: selectedLine }),
    [date, selectedLine],
  );
  // Only restrict to "SKUs running today" when the selected day is today.
  const isToday = date === today;

  const prodRecon = useProductionReconciliation(reconParams);

  const onDate = useCallback((d: string) => {
    if (d) setDate(d);
  }, []);
  const resetToday = useCallback(() => {
    setDate(todayISO());
  }, []);

  return (
    <div className="relative min-h-full space-y-8 p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-primary/[0.05] to-transparent" />

      {/* header */}
      <header className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both flex flex-col gap-4 duration-500 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Factory className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-3xl font-bold tracking-tight">Production</h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${variant.accent.iconBg} ${variant.accent.icon}`}
            >
              {variant.label}
            </span>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            {currentCompany?.company_name ?? 'Select a company'} — live production, App-vs-SAP
            reconciliation, wastage and cost in one view.
          </p>
        </div>

        {/* line + date */}
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border/60 bg-card/60 p-3 shadow-sm backdrop-blur-sm">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Line
            <select
              value={selectedLine ?? ''}
              onChange={(e) => setSelectedLine(e.target.value ? Number(e.target.value) : undefined)}
              className="min-w-[140px] rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
            >
              <option value="">All lines</option>
              {lines.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Date
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => onDate(e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
            />
          </label>
          <Button variant="outline" size="sm" onClick={resetToday} className="bg-background">
            Today
          </Button>
        </div>
      </header>

      {/* production lines for the selected date */}
      <RunningLinesSummary variant={variant} range={range} />

      {/* ---------------- Section 1: Production ---------------- */}
      <section className="space-y-4">
        <SectionHeading icon={ClipboardCheck} title="Production (FG) — App vs SAP · TransType 59" />
        <ReconciliationPanel
          title={isToday ? 'Production reconciliation · SKUs running today' : 'Production reconciliation'}
          icon={Boxes}
          report={prodRecon.data}
          isLoading={prodRecon.isLoading || (isToday && runningToday.isLoading)}
          isError={prodRecon.isError}
          unitNoun={variant.unitNoun}
          appLabel="Produced"
          showInProgress
          appOnly
          showLitres
          filterSkus={isToday ? todaySkus : undefined}
          emptyLabel={isToday ? 'No SKUs are running today.' : 'No production in this range.'}
        />
      </section>

      {/* ---------------- Section 2: Material (RM / PM) ---------------- */}
      <MaterialSection range={range} lines={lines} />

      {/* ---------------- Section 3: Wastage ---------------- */}
      <WastageSection range={range} />

      {/* ---------------- Section 4: Breakdowns ---------------- */}
      <section className="space-y-4">
        <SectionHeading icon={OctagonAlert} title="Breakdown analysis — what stopped the line" />
        <BreakdownAnalysis params={params} />
      </section>

      {/* ---------------- Section 5: Cost analysis ---------------- */}
      <section className="space-y-4">
        <SectionHeading icon={Coins} title="Cost analysis" />
        <ProductionEconomics params={params} variant={variant} />
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Output is recorded in <strong className="mx-1">cases</strong>, so cost and reconciliation
          are shown per {variant.unitNoun} with litres alongside. Litres are derived from the SKU
          name (unit volume × pack size) — SAP&apos;s item master
          (<code className="mx-1">U_UNE_TOTL</code>) is the authoritative source and would also cover
          weight-based and combo packs, which the name can&apos;t describe.
        </p>
      </section>
    </div>
  );
}
