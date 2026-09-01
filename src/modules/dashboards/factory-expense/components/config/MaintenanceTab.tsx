import { ExternalLink, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Button, Input, Label, Switch } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils';

import { useExpenseSettings, useMonthlyBudgets, useSaveBudget, useSaveSettings } from '../../api';
import { BUCKET_META, BUCKET_ORDER } from '../../constants';
import type { ExpenseBucketKey } from '../../types';

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * What counts as maintenance and electricity spend, and the monthly target each
 * of the four buckets is measured against.
 *
 * Electricity deliberately has no rate field here. The rate per unit and the
 * grid multiplying factor already live on the meter master in the maintenance
 * module, and a second copy would let the register and the board disagree about
 * what a unit costs — so this tab links there instead of duplicating it.
 */
export function MaintenanceTab() {
  const { data: settings, isLoading } = useExpenseSettings();
  const saveSettings = useSaveSettings();

  const [month, setMonth] = useState(currentMonth);
  const { data: budgets = [] } = useMonthlyBudgets(month);
  const saveBudget = useSaveBudget();
  const [drafts, setDrafts] = useState<Partial<Record<ExpenseBucketKey, string>>>({});

  const budgetFor = (bucket: ExpenseBucketKey) =>
    budgets.find((row) => row.bucket === bucket && row.is_active);

  const toggle = (field: string, value: boolean) => {
    saveSettings.mutate(
      { [field]: value },
      {
        onError: (error) =>
          toast.error(getErrorMessage(error, 'That setting could not be saved.')),
      },
    );
  };

  const commitBudget = (bucket: ExpenseBucketKey) => {
    const raw = drafts[bucket];
    if (raw === undefined) return;
    const existing = budgetFor(bucket);
    if (raw === '' && !existing) return;

    saveBudget.mutate(
      {
        id: existing?.id,
        payload: {
          bucket,
          month,
          amount: raw === '' ? '0' : raw,
          notes: '',
          is_active: true,
        },
      },
      {
        onSuccess: () => {
          toast.success(`${BUCKET_META[bucket].label} budget saved`);
          setDrafts((current) => ({ ...current, [bucket]: undefined }));
        },
        onError: (error) =>
          toast.error(getErrorMessage(error, 'That budget could not be saved.')),
      },
    );
  };

  if (isLoading || !settings) {
    return (
      <div className="flex items-center gap-2 py-10 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading settings…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div>
          <h3 className="text-base font-semibold">What counts as maintenance spend</h3>
          <p className="text-sm text-muted-foreground">
            Both are read from the maintenance module as they happen. Turning one off
            removes it from the board without changing any record.
          </p>
        </div>

        <SettingRow
          label="Spares issued and consumed"
          hint="Priced at the unit cost on the movement, so a later price change does not reprice history."
          checked={settings.maintenance_include_spares}
          onChange={(value) => toggle('maintenance_include_spares', value)}
        />
        <SettingRow
          label="Material indents"
          hint="Counted once a company has been selected or the goods have moved — not while the indent is still a request."
          checked={settings.maintenance_include_indents}
          onChange={(value) => toggle('maintenance_include_indents', value)}
        />
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h3 className="text-base font-semibold">Electricity</h3>
          <p className="text-sm text-muted-foreground">
            Units and cost come straight from the Daily Electricity register. The rate
            per unit and the multiplying factor belong to each meter, not to this board.
          </p>
        </div>

        <SettingRow
          label="Only meters tagged with this company"
          hint="Off shows every meter on the campus, including ones not attributed to any company."
          checked={settings.electricity_only_company_meters}
          onChange={(value) => toggle('electricity_only_company_meters', value)}
        />

        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/maintenance/daily-electricity">
              <ExternalLink className="h-4 w-4" />
              Daily Electricity register
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/maintenance/masters">
              <ExternalLink className="h-4 w-4" />
              Meter master &amp; rates
            </Link>
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Monthly budgets</h3>
            <p className="text-sm text-muted-foreground">
              Optional. A bucket with no budget shows no progress bar rather than
              reading as 100% over.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="budget-month">Month</Label>
            <Input
              id="budget-month"
              type="month"
              value={month.slice(0, 7)}
              onChange={(event) => setMonth(`${event.target.value}-01`)}
              className="w-48"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BUCKET_ORDER.map((bucket) => {
            const existing = budgetFor(bucket);
            const draft = drafts[bucket];
            const value = draft ?? (existing ? existing.amount : '');
            return (
              <div
                key={bucket}
                className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted/30 p-4"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: BUCKET_META[bucket].hex }}
                  />
                  <Label htmlFor={`budget-${bucket}`}>{BUCKET_META[bucket].label}</Label>
                </div>
                <Input
                  id={`budget-${bucket}`}
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="No budget"
                  value={value}
                  onChange={(event) =>
                    setDrafts((current) => ({ ...current, [bucket]: event.target.value }))
                  }
                  onBlur={() => commitBudget(bucket)}
                />
                <span className="text-xs text-muted-foreground">
                  {BUCKET_META[bucket].source}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function SettingRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border p-4 transition-colors hover:bg-muted/30">
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-sm text-muted-foreground">{hint}</span>
      </span>
      <Switch checked={checked} onChange={onChange} />
    </label>
  );
}
