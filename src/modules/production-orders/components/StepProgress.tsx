import { Link } from 'react-router-dom';

import { cn } from '@/shared/utils';

import { type EntryDetail, type StepKey, STEPS } from '../api';
import { STEP_LABEL } from '../utils/format';
import { stepPath } from '../utils/steps';

type SegmentState = 'done' | 'waiting' | 'refused' | 'next' | 'locked';

function segmentState(entry: EntryDetail | null, step: StepKey): SegmentState {
  if (!entry) return step === 'PLAN' ? 'next' : 'locked';
  const row = entry.steps.find((candidate) => candidate.step === step);
  if (row?.done) return 'done';
  if (row?.posting?.status === 'QUEUED' || row?.posting?.status === 'SENDING') return 'waiting';
  if (row?.posting?.status === 'REJECTED' && row.is_next) return 'refused';
  return row?.is_next ? 'next' : 'locked';
}

const BAR: Record<SegmentState, string> = {
  done: 'bg-primary/40',
  waiting: 'bg-amber-500',
  refused: 'bg-destructive',
  next: 'bg-primary/20',
  locked: 'bg-muted',
};

/**
 * The five SAP steps, one segment each, in the gate wizards' style. The page
 * you are on (`current`) is the dark one; done steps are dimmed, the step SAP
 * takes next is faint and says so, later ones are grey. A step that is done or
 * next opens its own page; a later one cannot be taken before the ones before
 * it. Shown on the step pages only; the entry's overview lists the steps in
 * its "In SAP" table instead.
 */
export function StepProgress({ entry, current }: { entry: EntryDetail | null; current?: StepKey }) {
  return (
    <nav aria-label="Steps">
      <ol className="grid grid-cols-5 gap-1.5">
        {STEPS.map((step, index) => {
          const state = segmentState(entry, step);
          const here = step === current;
          const open = entry && state !== 'locked';
          const row = entry?.steps.find((candidate) => candidate.step === step);
          const bar =
            here && state !== 'waiting' && state !== 'refused' ? 'bg-primary' : BAR[state];
          const body = (
            <>
              <span className={cn('block h-1.5 rounded-full transition-colors', bar)} />
              <span
                className={cn(
                  'mt-1.5 block text-xs',
                  here ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground',
                )}
              >
                {index + 1}. {STEP_LABEL[step]}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {state === 'done' && row?.sap_doc_num ? `SAP ${row.sap_doc_num}` : null}
                {state === 'done' && !row?.sap_doc_num ? 'Done' : null}
                {state === 'waiting' ? 'Waiting for SAP' : null}
                {state === 'refused' ? 'Refused by SAP' : null}
                {state === 'next' && entry ? 'Next step' : null}
              </span>
            </>
          );
          return (
            <li key={step} aria-current={here ? 'step' : undefined}>
              {open ? (
                <Link to={stepPath(entry.id, step)} className="block rounded-sm hover:opacity-80">
                  {body}
                </Link>
              ) : (
                <div className="opacity-70">{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
