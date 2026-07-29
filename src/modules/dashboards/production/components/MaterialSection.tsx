import { Layers } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import { useMaterialReconciliation } from '../api/reconciliation.queries';
import { MaterialVariancePanel } from './MaterialVariancePanel';

interface LineOpt {
  id: number;
  name: string;
}

/**
 * Material (BOM) section with a "By line" toggle. Off = all lines together;
 * On = pick a production line (chip) and see only that line's packing/BOM
 * materials — so you can see which material is used on which line.
 */
export function MaterialSection({
  range,
  lines,
}: {
  range: { from: string; to: string };
  lines: LineOpt[];
}) {
  const [byLine, setByLine] = useState(false);
  const [lineId, setLineId] = useState<number | undefined>(undefined);

  const effectiveLine = byLine ? (lineId ?? lines[0]?.id) : undefined;
  const params = useMemo(
    () => ({ date_from: range.from, date_to: range.to, line: effectiveLine }),
    [range.from, range.to, effectiveLine],
  );
  const query = useMaterialReconciliation(params);

  const activeLineName = lines.find((l) => l.id === effectiveLine)?.name;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold tracking-tight">
            Material (BOM) — App issued vs SAP issued
            {byLine && activeLineName && (
              <span className="ml-2 text-sm font-medium text-muted-foreground">· {activeLineName}</span>
            )}
          </h2>
        </div>
        <Button
          variant={byLine ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setByLine((v) => !v);
            if (!byLine && lineId == null) setLineId(lines[0]?.id);
          }}
        >
          {byLine ? 'By line · on' : 'By line'}
        </Button>
      </div>

      {byLine && (
        <div className="flex flex-wrap gap-2">
          {lines.length === 0 ? (
            <span className="text-xs text-muted-foreground">No production lines found.</span>
          ) : (
            lines.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLineId(l.id)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  effectiveLine === l.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border/60 bg-card text-muted-foreground hover:bg-muted/50',
                )}
              >
                {l.name}
              </button>
            ))
          )}
        </div>
      )}

      <MaterialVariancePanel
        report={query.data}
        isLoading={query.isLoading}
        isError={query.isError}
      />
    </section>
  );
}
