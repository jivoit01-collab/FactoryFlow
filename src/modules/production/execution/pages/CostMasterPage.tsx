import { Info, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui';

import {
  useCostRates,
  useDeleteCostRate,
  useLines,
  useUpsertCostRate,
} from '../api';
import type { CostBasis, CostCategory, CostRate } from '../types';

// ---------------------------------------------------------------------------
// Cost catalog — the fixed set of categories the run-costing engine understands.
// `defaultBasis` pre-fills the basis; the board can still change it per row.
// ---------------------------------------------------------------------------
const BASIS_LABEL: Record<CostBasis, string> = {
  PER_UNIT: 'Per Unit (per case)',
  PER_HOUR: 'Per Hour (running)',
  PER_DAY: 'Per Day (fixed)',
  PER_MONTH: 'Per Month (fixed)',
};

const COST_CATALOG: {
  category: CostCategory;
  label: string;
  defaultBasis: CostBasis;
  credit?: boolean;
  hint: string;
}[] = [
  {
    category: 'ELECTRICITY_VARIABLE',
    label: 'Electricity — Variable',
    defaultBasis: 'PER_UNIT',
    hint: 'Rate per electricity unit (e.g. ₹7). Units = line units/hr × running hours.',
  },
  {
    category: 'ELECTRICITY_FIXED',
    label: 'Electricity — Fixed (Demand Charge)',
    defaultBasis: 'PER_MONTH',
    hint: 'Fixed monthly demand / sanctioned-load charge, apportioned by running hours.',
  },
  {
    category: 'LABOUR',
    label: 'Labour',
    defaultBasis: 'PER_HOUR',
    hint: 'Rate per worker-hour. Cost = labour count × rate × running hours.',
  },
  {
    category: 'MANPOWER_SALARIED',
    label: 'Supervisor / Salaried Manpower',
    defaultBasis: 'PER_MONTH',
    hint: 'Monthly salaried cost, apportioned by running hours.',
  },
  {
    category: 'LUBRICATION',
    label: 'Lubrication',
    defaultBasis: 'PER_MONTH',
    hint: 'Lubricant cost. Monthly (apportioned) or per running hour.',
  },
  {
    category: 'LAB_CHEMICALS',
    label: 'Lab Chemicals',
    defaultBasis: 'PER_MONTH',
    hint: 'QC lab chemical consumables. Monthly (apportioned) or per running hour.',
  },
  {
    category: 'BATCH_CODING',
    label: 'Batch Coding (Ink)',
    defaultBasis: 'PER_HOUR',
    hint: 'Batch coder ink/consumables. Per running hour or per case.',
  },
  {
    category: 'MAINTENANCE',
    label: 'Maintenance / Spares',
    defaultBasis: 'PER_MONTH',
    hint: 'Routine maintenance & spares budget, apportioned by running hours.',
  },
  {
    category: 'WATER',
    label: 'Water',
    defaultBasis: 'PER_UNIT',
    hint: 'Water cost per case (or per running hour).',
  },
  {
    category: 'OVERHEAD',
    label: 'Overhead (Rent / Admin / ETP)',
    defaultBasis: 'PER_MONTH',
    hint: 'General plant overhead, apportioned by running hours.',
  },
  {
    category: 'WASTE_RECOVERY',
    label: 'Waste Sale Recovery',
    defaultBasis: 'PER_UNIT',
    credit: true,
    hint: 'Credit — value recovered by selling waste/scrap. Reduces net cost.',
  },
];

const GLOBAL = 'global';

// Stable empty reference so react-query's `undefined` loading state doesn't
// produce a fresh array each render (which would loop the re-seed effect).
const EMPTY_RATES: CostRate[] = [];

interface Draft {
  basis: CostBasis;
  rate: string;
}

function CostMasterPage() {
  const { data: lines = [] } = useLines(true);
  const [scope, setScope] = useState<string>(GLOBAL);
  const isGlobal = scope === GLOBAL;
  const lineId = isGlobal ? undefined : Number(scope);

  const { data: ratesData, isLoading } = useCostRates(
    isGlobal ? { scope: 'global' } : { lineId },
  );
  // Always fetch global rates so per-line scope can show what a category inherits.
  const { data: globalRatesData } = useCostRates({ scope: 'global' });

  const rates = ratesData ?? EMPTY_RATES;
  const globalRates = globalRatesData ?? EMPTY_RATES;

  const upsert = useUpsertCostRate();
  const remove = useDeleteCostRate();

  const ratesByCat = new Map<CostCategory, CostRate>(rates.map((r) => [r.category, r]));
  const globalByCat = new Map<CostCategory, CostRate>(globalRates.map((r) => [r.category, r]));

  // Local editable drafts, re-seeded whenever the scope or fetched rates change.
  // Depend on `ratesData` (a stable react-query reference), not the defaulted
  // `rates` array, so an undefined loading state doesn't loop this effect.
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  useEffect(() => {
    const next: Record<string, Draft> = {};
    for (const item of COST_CATALOG) {
      const existing = (ratesData ?? EMPTY_RATES).find((r) => r.category === item.category);
      next[item.category] = {
        basis: existing?.basis ?? item.defaultBasis,
        rate: existing?.rate ?? '',
      };
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Re-seed editable drafts when the scope or fetched rates change.
    setDrafts(next);
  }, [scope, ratesData]);

  const setDraft = (category: CostCategory, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [category]: { ...prev[category], ...patch } }));

  const handleSave = async (item: (typeof COST_CATALOG)[number]) => {
    const draft = drafts[item.category];
    if (!draft) return;
    const existing = ratesByCat.get(item.category);

    // Empty rate clears the entry (deletes an existing override/default).
    if (draft.rate.trim() === '') {
      if (existing) {
        try {
          await remove.mutateAsync(existing.id);
          toast.success('Rate cleared');
        } catch {
          toast.error('Failed to clear rate');
        }
      }
      return;
    }

    const value = Number(draft.rate);
    if (!Number.isFinite(value) || value < 0) {
      toast.error('Enter a valid non-negative rate');
      return;
    }

    try {
      await upsert.mutateAsync({
        line_id: lineId ?? null,
        category: item.category,
        basis: draft.basis,
        rate: draft.rate,
        is_credit: !!item.credit,
      });
      toast.success('Rate saved');
    } catch {
      toast.error('Failed to save rate');
    }
  };

  const scopeName = isGlobal
    ? 'Company-wide defaults'
    : lines.find((l) => l.id === lineId)?.name ?? '';

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Cost Master"
        description="Rates that drive automatic run costing. Set company-wide defaults, then override per line where a line differs."
      />

      {/* Scope selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <Label className="min-w-fit font-medium">Scope:</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger className="w-[280px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={GLOBAL}>Company-wide defaults</SelectItem>
                {lines.map((line) => (
                  <SelectItem key={line.id} value={String(line.id)}>
                    {line.name} (override)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isGlobal && (
              <p className="text-xs text-muted-foreground">
                Leave a rate blank to inherit the company-wide default.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rates table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rates — {scopeName}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Cost Item</th>
                    <th className="text-left p-3 font-medium w-[200px]">Basis</th>
                    <th className="text-right p-3 font-medium w-[160px]">Rate (₹)</th>
                    <th className="text-center p-3 font-medium w-[130px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {COST_CATALOG.map((item) => {
                    const draft = drafts[item.category] ?? {
                      basis: item.defaultBasis,
                      rate: '',
                    };
                    const existing = ratesByCat.get(item.category);
                    const inherited = !isGlobal ? globalByCat.get(item.category) : undefined;
                    return (
                      <tr key={item.category} className="border-b align-top hover:bg-muted/30">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.label}</span>
                            {item.credit && (
                              <Badge variant="secondary" className="text-[10px]">
                                credit
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-start gap-1">
                            <Info className="h-3 w-3 mt-0.5 shrink-0" />
                            {item.hint}
                          </p>
                          {!isGlobal && !existing && inherited && (
                            <p className="text-xs text-blue-600 mt-1">
                              Inherits global: ₹{inherited.rate} · {BASIS_LABEL[inherited.basis]}
                            </p>
                          )}
                        </td>
                        <td className="p-3">
                          <Select
                            value={draft.basis}
                            onValueChange={(v) =>
                              setDraft(item.category, { basis: v as CostBasis })
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.keys(BASIS_LABEL) as CostBasis[]).map((b) => (
                                <SelectItem key={b} value={b}>
                                  {BASIS_LABEL[b]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            min={0}
                            step="0.0001"
                            className="text-right"
                            value={draft.rate}
                            placeholder={inherited && !isGlobal ? inherited.rate : '—'}
                            onChange={(e) => setDraft(item.category, { rate: e.target.value })}
                          />
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              title="Save"
                              onClick={() => handleSave(item)}
                              disabled={upsert.isPending || remove.isPending}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            {existing && (
                              <Button
                                size="sm"
                                variant="outline"
                                title="Clear"
                                onClick={() => remove.mutate(existing.id)}
                                disabled={remove.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default CostMasterPage;
