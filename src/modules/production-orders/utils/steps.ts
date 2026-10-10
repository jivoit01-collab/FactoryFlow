import { type EntryDetail, type StepKey, STEPS } from '../api';

/** The page of one step of an entry. */
export function stepPath(entryId: number, step: StepKey): string {
  return `/production-orders/entries/${entryId}/${step.toLowerCase()}`;
}

/** The step after `step`, or null after Close. */
export function stepAfter(step: StepKey): StepKey | null {
  return STEPS[STEPS.indexOf(step) + 1] ?? null;
}

/** Where to go once `step` has posted: the next step's page when the caller may take it, else the entry. */
export function pathAfterPosting(entry: Pick<EntryDetail, 'id' | 'steps'>, step: StepKey): string {
  const next = stepAfter(step);
  const row = next ? entry.steps.find((candidate) => candidate.step === next) : undefined;
  return next && row?.can_take
    ? stepPath(entry.id, next)
    : `/production-orders/entries/${entry.id}`;
}
