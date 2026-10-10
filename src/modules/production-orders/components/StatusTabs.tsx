import { cn } from '@/shared/utils';

/** A list's status filter: one pill per status with its count; '' is "All". */
export function StatusTabs<T extends string>({
  tabs,
  value,
  counts,
  onChange,
  label,
}: {
  tabs: { id: T | ''; label: string }[];
  value: T | '';
  counts: Partial<Record<T, number>>;
  onChange: (id: T | '') => void;
  label: string;
}) {
  const total = Object.values<number | undefined>(counts).reduce<number>(
    (sum, n) => sum + (n ?? 0),
    0,
  );
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={label}>
      {tabs.map((tab) => {
        const active = tab.id === value;
        const count = tab.id ? (counts[tab.id] ?? 0) : total;
        return (
          <button
            key={tab.id || 'all'}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'bg-card hover:bg-muted',
            )}
          >
            {tab.label}
            <span
              className={cn(
                'rounded-full px-1.5 text-xs tabular-nums',
                active ? 'bg-primary-foreground/20' : 'bg-muted text-muted-foreground',
              )}
            >
              {count.toLocaleString('en-IN')}
            </span>
          </button>
        );
      })}
    </div>
  );
}
