import { CheckCircle2, Clock, Factory, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';

import { PageHeader, StatusPill } from '@/shared/components/page';
import { formatDateTimeShort } from '@/shared/utils';

import { type EntryDetail, type SapLogin, type StepKey } from '../api';
import { STATUS_TONE, STEP_TITLE } from '../utils/format';
import { SapLoginNotice } from './SapLoginNotice';
import { StepProgress } from './StepProgress';

/** How this page's step stands in SAP: posted, waiting for SAP, or refused. */
function StepState({ entry, step }: { entry: EntryDetail; step: StepKey }) {
  const row = entry.steps.find((candidate) => candidate.step === step);
  if (!row) return null;
  if (row.done) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Posted to SAP
          {row.sap_doc_num ? (
            <>
              {' '}
              as <span className="font-mono font-semibold">{row.sap_doc_num}</span>
            </>
          ) : null}{' '}
          by {row.by || 'someone'}, {formatDateTimeShort(row.at)}.
        </span>
      </div>
    );
  }
  const posting = row.posting;
  if (posting?.status === 'QUEUED' || posting?.status === 'SENDING') {
    return (
      <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
        <Clock className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {posting.status === 'SENDING'
            ? 'Being sent to SAP…'
            : 'Waiting for SAP: it posts by itself when SAP answers.'}
          {posting.last_error ? ` ${posting.last_error}` : ''}
        </span>
      </div>
    );
  }
  if (posting?.status === 'REJECTED') {
    return (
      <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{posting.last_error || 'SAP refused it.'}</span>
      </div>
    );
  }
  return null;
}

/**
 * One step's page: the header and progress bar, how the step stands in SAP,
 * the step's own form, and its buttons at the foot.
 */
export function StepShell({
  entry,
  step,
  sapLogin,
  children,
  footer,
}: {
  entry: EntryDetail | null;
  step: StepKey;
  sapLogin: SapLogin | undefined;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        title={STEP_TITLE[step]}
        icon={Factory}
        accent="emerald"
        backTo={entry ? `/production-orders/entries/${entry.id}` : '/production-orders'}
        backLabel={entry ? entry.entry_no : 'Production orders'}
        meta={
          entry ? (
            <StatusPill tone={STATUS_TONE[entry.status]} dot>
              {entry.status_label}
            </StatusPill>
          ) : (
            <StatusPill tone="neutral">New entry</StatusPill>
          )
        }
      />
      <StepProgress entry={entry} current={step} />
      {entry && <StepState entry={entry} step={step} />}
      <SapLoginNotice login={sapLogin} />
      {children}
      {footer && (
        <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-end">
          {footer}
        </div>
      )}
    </div>
  );
}
