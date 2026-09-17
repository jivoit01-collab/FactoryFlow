import { AlertCircle } from 'lucide-react';

import { cn } from '@/shared/utils';

import { WIZARD_CONFIG } from '../constants';

interface StepHeaderProps {
  currentStep: number;
  totalSteps?: number;
  title?: string;
  error?: string | null;
}

/**
 * Shared header for every wizard step in Gate — Material Inward, Docking, job
 * work, the empty-vehicle flows.
 *
 * The progress is drawn as one segment per step rather than a single filled
 * bar with a percentage beside it: on a five-step flow "60%" tells an operator
 * nothing they can act on, while four segments with the third lit says exactly
 * where they are and how much is left.
 */
export function StepHeader({
  currentStep,
  totalSteps = WIZARD_CONFIG.TOTAL_STEPS,
  title = 'Material Inward',
  error,
}: StepHeaderProps) {
  const steps = Array.from({ length: Math.max(totalSteps, 1) }, (_, i) => i + 1);

  return (
    <>
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-3xl font-semibold tracking-tight">{title}</h2>
          <span className="rounded-full border bg-muted/50 px-3 py-1 text-xs font-semibold tabular-nums text-muted-foreground">
            Step {currentStep} of {totalSteps}
          </span>
        </div>

        <div className="flex items-center gap-1.5" aria-hidden="true">
          {steps.map((step) => (
            <span
              key={step}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors duration-300',
                step < currentStep && 'bg-primary/40',
                step === currentStep && 'bg-primary',
                step > currentStep && 'bg-muted',
              )}
            />
          ))}
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
    </>
  );
}
