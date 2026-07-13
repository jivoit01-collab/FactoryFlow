/**
 * A compact, always-visible pipeline indicator so operators understand where
 * they are in the sheet-driven flow: Upload → Review & Map → Send to Warehouse
 * → Issue & Receive → Dispatch.
 */
import { Check } from 'lucide-react';

const STEPS = [
  { n: 1, label: 'Upload sheet' },
  { n: 2, label: 'Review & map' },
  { n: 3, label: 'Send to warehouse' },
  { n: 4, label: 'Issue & receive' },
  { n: 5, label: 'Pack' },
  { n: 6, label: 'Dispatch' },
];

export function MpFlowSteps({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      {STEPS.map((step, i) => {
        const done = step.n < current;
        const active = step.n === current;
        return (
          <li key={step.n} className="flex items-center gap-1">
            <span
              className={[
                'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-semibold',
                done ? 'bg-emerald-600 text-white' : '',
                active ? 'bg-primary text-primary-foreground' : '',
                !done && !active ? 'bg-muted text-muted-foreground' : '',
              ].join(' ')}
            >
              {done ? <Check className="h-3 w-3" /> : step.n}
            </span>
            <span className={active ? 'font-medium text-foreground' : ''}>{step.label}</span>
            {i < STEPS.length - 1 && <span className="mx-1 text-muted-foreground/50">→</span>}
          </li>
        );
      })}
    </ol>
  );
}
