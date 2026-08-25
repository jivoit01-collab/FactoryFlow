import { ArrowLeft, Info, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

import { useCostRates, useDeleteCostRate, useMachines, useUpsertCostRate } from '../api';
import type { BlowingCostBasis, BlowingCostCategory, BlowingCostRate } from '../types';

// ---------------------------------------------------------------------------
// Cost catalog — the fixed set of categories the blowing run-costing engine
// understands. `defaultBasis` pre-fills the basis; it can be changed per row.
// ---------------------------------------------------------------------------
const BASIS_LABEL: Record<BlowingCostBasis, string> = {
  PER_DAY: 'Per Day (fixed)',
  PER_PERSON_DAY: 'Per Person / Day',
  PER_UNIT: 'Per Electricity Unit',
  PER_BOTTLE: 'Per Bottle',
};

const COST_CATALOG: {
  category: BlowingCostCategory;
  label: string;
  defaultBasis: BlowingCostBasis;
  credit?: boolean;
  hint: string;
}[] = [
  {
    category: 'OPERATOR',
    label: 'Operator',
    defaultBasis: 'PER_PERSON_DAY',
    hint: 'Rate per operator per day. Cost = operator count × rate.',
  },
  {
    category: 'LABOUR',
    label: 'Labour (contract + own)',
    defaultBasis: 'PER_PERSON_DAY',
    hint: 'Rate per worker per day. Cost = (contract + own) count × rate.',
  },
  {
    category: 'ELECTRICITY_MACHINE',
    label: 'Electricity — Machine (per day)',
    defaultBasis: 'PER_DAY',
    hint: 'Fixed machine electricity / demand charge, added once per run day.',
  },
  {
    category: 'ELECTRICITY_UTILITY',
    label: 'Electricity — Utility (usage)',
    defaultBasis: 'PER_UNIT',
    hint: 'Rate per metered electricity unit. Cost = total units × rate.',
  },
  {
    category: 'PACKING',
    label: 'Packing',
    defaultBasis: 'PER_BOTTLE',
    hint: 'Packing cost per good bottle. Cost = good bottles × rate.',
  },
  {
    category: 'SCRAP_RECOVERY',
    label: 'Scrap Recovery',
    defaultBasis: 'PER_BOTTLE',
    credit: true,
    hint: 'Credit — value recovered per rejected bottle sold as scrap. Reduces blowing cost.',
  },
  {
    category: 'BENCHMARK_BLOWING_PER_BOTTLE',
    label: 'Industry Blowing Cost / Bottle (benchmark)',
    defaultBasis: 'PER_BOTTLE',
    hint: 'Target the run is measured against (industry ≈ ₹0.50/bottle). Not a cost.',
  },
];

const GLOBAL = 'global';

// Stable empty reference so react-query's `undefined` loading state doesn't
// produce a fresh array each render (which would loop the re-seed effect).
const EMPTY_RATES: BlowingCostRate[] = [];

interface Draft {
  basis: BlowingCostBasis;
  rate: string;
}

function CostMasterPage() {
  const navigate = useNavigate();
  const { data: machines = [] } = useMachines(true);
  const [scope, setScope] = useState<string>(GLOBAL);
  // Rates are effective-dated: saving does not overwrite the old rate, it adds a
  // row from this date. That is what lets a past run keep costing at the rate
  // that applied on its own date instead of being repriced at today's.
  const [effectiveFrom, setEffectiveFrom] = useState<string>(
    () => new Date().toISOString().slice(0, 10),
  );
  const isGlobal = scope === GLOBAL;
  const machineId = isGlobal ? undefined : Number(scope);

  const { data: ratesData, isLoading } = useCostRates(
    isGlobal ? { scope: 'global' } : { machineId },
  );
  // Always fetch global rates so per-machine scope can show what a category inherits.
  const { data: globalRatesData } = useCostRates({ scope: 'global' });

  const rates = ratesData ?? EMPTY_RATES;
  const globalRates = globalRatesData ?? EMPTY_RATES;

  const upsert = useUpsertCostRate();
  const remove = useDeleteCostRate();

  const ratesByCat = new Map<BlowingCostCategory, BlowingCostRate>(rates.map((r) => [r.category, r]));
  const globalByCat = new Map<BlowingCostCategory, BlowingCostRate>(
    globalRates.map((r) => [r.category, r]),
  );

  // Local editable drafts, re-seeded whenever the scope or fetched rates change.
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

  const setDraft = (category: BlowingCostCategory, patch: Partial<Draft>) =>
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
        machine_id: machineId ?? null,
        category: item.category,
        basis: draft.basis,
        rate: draft.rate,
        is_credit: !!item.credit,
        effective_from: effectiveFrom,
      });
      toast.success(`Rate saved, effective ${effectiveFrom}`);
    } catch {
      toast.error('Failed to save rate');
    }
  };

  const scopeName = isGlobal
    ? 'Company-wide defaults'
    : machines.find((m) => m.id === machineId)?.name ?? '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <DashboardHeader
          title="Blowing — Cost Master"
          description="Rates that drive automatic run costing. Set company-wide defaults, then override per machine where a machine differs."
        />
        <Button variant="outline" onClick={() => navigate('/production/blowing/master-data')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Master Data
        </Button>
      </div>

      {/* Scope selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <Label className="min-w-fit font-medium">Scope:</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger className="w-[280px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={GLOBAL}>Company-wide defaults</SelectItem>
                {machines.map((machine) => (
                  <SelectItem key={machine.id} value={String(machine.id)}>
                    {machine.name} (override)
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

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
            <Label htmlFor="effective-from" className="min-w-fit font-medium">
              New rates effective from:
            </Label>
            <Input
              id="effective-from"
              type="date"
              className="w-[180px]"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Runs dated before this keep their existing rate — saving adds a new
              dated rate rather than replacing the old one.
            </p>
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
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">Cost Item</th>
                    <th className="w-[200px] p-3 text-left font-medium">Basis</th>
                    <th className="w-[160px] p-3 text-right font-medium">Rate (₹)</th>
                    <th className="w-[130px] p-3 text-left font-medium">In force since</th>
                    <th className="w-[130px] p-3 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {COST_CATALOG.map((item) => {
                    const draft = drafts[item.category] ?? { basis: item.defaultBasis, rate: '' };
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
                          <p className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground">
                            <Info className="mt-0.5 h-3 w-3 shrink-0" />
                            {item.hint}
                          </p>
                          {!isGlobal && !existing && inherited && (
                            <p className="mt-1 text-xs text-blue-600">
                              Inherits global: ₹{inherited.rate} · {BASIS_LABEL[inherited.basis]}
                            </p>
                          )}
                        </td>
                        <td className="p-3">
                          <Select
                            value={draft.basis}
                            onValueChange={(v) => setDraft(item.category, { basis: v as BlowingCostBasis })}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.keys(BASIS_LABEL) as BlowingCostBasis[]).map((b) => (
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
                        <td className="p-3 text-xs text-muted-foreground">
                          {existing?.effective_from ?? '—'}
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
