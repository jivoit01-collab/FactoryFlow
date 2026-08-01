/**
 * A compact, always-visible pipeline indicator so operators understand where they
 * are in the sheet-driven flow and can jump to any stage. Steps with a route are
 * clickable: Upload → Review & Map → Warehouse → Issue & Receive → Pack →
 * Dispatch → Gate.
 */
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const STEPS: { n: number; label: string; to?: string }[] = [
  { n: 1, label: 'Upload', to: '/marketplace/import' },
  { n: 2, label: 'Review & map' },
  { n: 3, label: 'Warehouse', to: '/marketplace/issues' },
  { n: 4, label: 'Issue & receive', to: '/marketplace/issues' },
  { n: 5, label: 'Pack', to: '/marketplace/packing' },
  { n: 6, label: 'Dispatch', to: '/marketplace/outward' },
  { n: 7, label: 'Gate', to: '/marketplace/gate' },
];

export function MpFlowSteps({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      {STEPS.map((step, i) => {
        const done = step.n < current;
        const active = step.n === current;
        const dot = (
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
        );
        const label = <span className={active ? 'font-medium text-foreground' : ''}>{step.label}</span>;
        return (
          <li key={step.n} className="flex items-center gap-1">
            {step.to ? (
              <Link
                to={step.to}
                className="flex items-center gap-1 rounded px-0.5 hover:text-foreground"
                title={step.label}
              >
                {dot}
                {label}
              </Link>
            ) : (
              <span className="flex items-center gap-1">
                {dot}
                {label}
              </span>
            )}
            {i < STEPS.length - 1 && <span className="mx-1 text-muted-foreground/50">→</span>}
          </li>
        );
      })}
    </ol>
  );
}
