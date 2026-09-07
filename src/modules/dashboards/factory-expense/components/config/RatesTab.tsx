import { AlertTriangle, ExternalLink, HardHat, Loader2, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { COST_MASTER_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import {
  Badge,
  Button,
  Label,
  NativeSelect as Select,
  SelectOption,
} from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import {
  useCostTypeOptions,
  useExpenseSettings,
  useResolvedRates,
  useSaveSettings,
} from '../../api';
import { BUCKET_META } from '../../constants';
import type { CostTypeOption, ResolvedRateGroup } from '../../types';

/**
 * What the board prices with — read from the Cost Master, not set here.
 *
 * The board is one consumer of `cost_master`, the factory-wide rate catalog
 * behind Admin › Cost Master. Letting a rate be edited from two screens is how
 * two cost masters start, so this tab shows the resolved rows and sends anyone
 * who wants to change one to the place that owns them.
 *
 * Rows are listed most-specific-first, which is also the order the board
 * resolves them in: a department rate beats a company rate beats the
 * factory-wide one, and the latest start date breaks the tie.
 */
export function RatesTab() {
  const { data, isLoading } = useResolvedRates();
  const { data: settings } = useExpenseSettings();
  const { data: costTypes = [] } = useCostTypeOptions();
  const save = useSaveSettings();
  const { hasPermission } = usePermission();
  const canOpenCostMaster = hasPermission(COST_MASTER_PERMISSIONS.VIEW);

  const point = (field: 'labour_cost_type_code' | 'salary_cost_type_code', code: string) => {
    save.mutate(
      { [field]: code },
      {
        onSuccess: () => toast.success(`Now reading ${code}`),
        onError: (error) =>
          toast.error(getErrorMessage(error, 'That cost type could not be saved.')),
      },
    );
  };

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-2 py-10 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Reading the Cost Master…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-muted/30 p-4">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Labour and salary are priced from the factory Cost Master, so the same rate serves this
          board and anything else that costs a day&rsquo;s work. Rates are effective-dated: to
          change one, add a row with a later start date rather than editing the old one, and the
          board keeps pricing past days correctly.
        </p>
        {canOpenCostMaster && (
          <Button asChild variant="outline" className="gap-2">
            <Link to="/admin/cost-master">
              <ExternalLink className="h-4 w-4" />
              Open Cost Master
            </Link>
          </Button>
        )}
      </div>

      <RateGroup
        title="Labour"
        icon={HardHat}
        hex={BUCKET_META.LABOUR.hex}
        group={data.labour}
        options={costTypes}
        selected={settings?.labour_cost_type_code ?? ''}
        onSelect={(code) => point('labour_cost_type_code', code)}
        wants="PER_PERSON_DAY"
        wantsLabel="Per Person / Day"
        emptyHint="Either add a rate under this cost type, or point the tile at one that already has rates."
      />
      <RateGroup
        title="Salary"
        icon={Users}
        hex={BUCKET_META.SALARY.hex}
        group={data.salary}
        options={costTypes}
        selected={settings?.salary_cost_type_code ?? ''}
        onSelect={(code) => point('salary_cost_type_code', code)}
        wants="PER_MONTH"
        wantsLabel="Per Month"
        emptyHint="Either add a rate under this cost type, or point the tile at one that already has rates."
      />
    </div>
  );
}

function RateGroup({
  title,
  icon: Icon,
  hex,
  group,
  options,
  selected,
  onSelect,
  wants,
  wantsLabel,
  emptyHint,
}: {
  title: string;
  icon: typeof HardHat;
  hex: string;
  group: ResolvedRateGroup;
  options: CostTypeOption[];
  selected: string;
  onSelect: (code: string) => void;
  /** The basis this tile can actually price with. */
  wants: string;
  wantsLabel: string;
  emptyHint: string;
}) {
  const chosen = options.find((option) => option.code === group.cost_type_code);
  const basisMismatch = chosen != null && chosen.default_basis !== wants;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${hex}24` }}
        >
          <Icon className="h-4 w-4" style={{ color: hex }} />
        </span>
        <h3 className="text-base font-semibold">{title}</h3>
        <Badge variant="outline" className="font-mono text-xs">
          {group.cost_type_code}
        </Badge>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-muted/30 p-4">
        <div className="flex min-w-64 flex-col gap-1.5">
          <Label htmlFor={`cost-type-${title}`}>Read this tile from</Label>
          <Select
            id={`cost-type-${title}`}
            value={selected || group.cost_type_code}
            onChange={(event) => onSelect(event.target.value)}
          >
            {options.map((option) => (
              <SelectOption key={option.code} value={option.code}>
                {option.name} — {option.code}
                {option.rates_in_force ? ` (${option.rates_in_force} rates)` : ' (no rates)'}
              </SelectOption>
            ))}
          </Select>
        </div>
        <p className="max-w-md text-xs text-muted-foreground">
          Point this at whichever cost type your factory actually maintains. The tile
          expects <strong>{wantsLabel}</strong>.
        </p>
      </div>

      {basisMismatch && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-600/30 bg-amber-500/10 p-4 dark:border-amber-400/30 dark:bg-amber-400/10">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>{chosen?.name}</strong> is a <strong>{chosen?.default_basis}</strong> rate
            but this tile prices on <strong>{wantsLabel}</strong>. The board honours whatever
            basis each rate row carries, so a mismatched one may read differently than you
            expect — or zero, if the basis cannot price this tile at all.
          </p>
        </div>
      )}

      {group.rates.length === 0 ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-600/30 bg-amber-500/10 p-4 dark:border-amber-400/30 dark:bg-amber-400/10">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium">
              No rate in force — this tile shows a warning instead of a number.
            </p>
            <p className="mt-1">{emptyHint}</p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Applies to</th>
                <th className="px-4 py-2.5 text-left font-medium">Scope</th>
                <th className="px-4 py-2.5 text-left font-medium">Basis</th>
                <th className="px-4 py-2.5 text-right font-medium">Rate</th>
                <th className="px-4 py-2.5 text-left font-medium">From</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {group.rates.map((rate) => (
                <tr key={rate.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5">
                    {rate.department ?? rate.company_code ?? 'Whole factory'}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {rate.scope_display}
                    {rate.scope === 'DEPARTMENT' && rate.company_code && (
                      <span className="ml-1 text-xs">({rate.company_code})</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{rate.basis_display}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    ₹{Number(rate.rate).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                    {rate.effective_from}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
