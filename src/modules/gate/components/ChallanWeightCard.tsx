import { Scale } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

const VARIANCE_TONE = {
  good: { box: 'border-emerald-200 bg-emerald-50 text-emerald-800', label: 'Within tolerance' },
  warn: { box: 'border-amber-200 bg-amber-50 text-amber-800', label: 'Check the load' },
  bad: { box: 'border-red-200 bg-red-50 text-red-800', label: 'Large weight mismatch' },
} as const;

function getVarianceTone(pct: number): keyof typeof VARIANCE_TONE {
  const abs = Math.abs(pct);
  if (abs <= 2) return 'good';
  if (abs <= 5) return 'warn';
  return 'bad';
}

function toFiniteNumber(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function formatKg(value: number) {
  return `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value)} kg`;
}

/**
 * Optional challan-weight input with a live variance check against the weighbridge
 * net weight (gross − tare). Shared by the empty-vehicle-out weighment step and the
 * quick out-empty modal on the gate dashboards.
 */
export function ChallanWeightCard({
  value,
  onChange,
  net,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  net: number | null;
  disabled?: boolean;
}) {
  const challan = toFiniteNumber(value);
  const hasChallan = challan !== null && challan > 0;
  const variance = net !== null && hasChallan ? net - challan : null;
  const variancePct = variance !== null && hasChallan ? (variance / challan) * 100 : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5" />
          Challan Weight
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Enter the weight declared on the delivery challan to check it against the weighbridge net
          weight. Leave it blank if there is no challan.
        </p>
        <div className="grid gap-2 sm:max-w-xs">
          <Label htmlFor="challan-weight">Challan Weight (kg)</Label>
          <Input
            id="challan-weight"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            placeholder="e.g. 2450"
          />
        </div>

        {net === null ? (
          <p className="text-xs text-muted-foreground">
            Enter gross and tare weight to compare the net weight against the challan.
          </p>
        ) : !hasChallan ? (
          <p className="text-xs text-muted-foreground">
            Net weight is {formatKg(net)}. Enter a challan weight above to compare.
          </p>
        ) : (
          <div
            className={cn(
              'flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm',
              VARIANCE_TONE[getVarianceTone(variancePct ?? 0)].box,
            )}
          >
            <span className="font-medium">
              {VARIANCE_TONE[getVarianceTone(variancePct ?? 0)].label}
            </span>
            <span>
              Net {formatKg(net)} vs Challan {formatKg(challan)} ·{' '}
              <span className="font-semibold">
                {variance !== null && variance >= 0 ? '+' : ''}
                {variance !== null ? formatKg(variance) : '—'}
                {variancePct !== null
                  ? ` (${variancePct >= 0 ? '+' : ''}${variancePct.toFixed(1)}%)`
                  : ''}
              </span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
