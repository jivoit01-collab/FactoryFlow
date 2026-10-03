import { AlertTriangle, EyeOff, Info } from 'lucide-react';

import type { ReportMeta } from '../types';
import { SECTION_LABEL } from '../utils';

/**
 * What the report could not show, and the caveats on what it did.
 *
 * Three kinds, kept apart because each sends the reader somewhere different:
 * a section hidden from them (an administrator), a section the server could
 * not read (whoever runs it), and a note on figures that are there but partial
 * (the register's owner). A band of the page, not a toast: a warning somebody
 * can dismiss is one the next reader never sees.
 */
export function ReportNotices({ meta }: { meta: ReportMeta }) {
  if (!meta.withheld.length && !meta.degraded.length && !meta.warnings.length) return null;

  const names = (sections: ReportMeta['withheld']) =>
    sections.map((section) => SECTION_LABEL[section]).join(', ');

  return (
    <div className="space-y-2 rounded-xl border bg-card p-3 text-sm shadow-sm">
      {meta.degraded.length > 0 && (
        <p className="flex items-start gap-2 text-rose-700 dark:text-rose-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <b>{names(meta.degraded)}</b> could not be read just now, so{' '}
            {meta.degraded.length === 1 ? 'it is' : 'they are'} left blank rather than shown as
            zero.
          </span>
        </p>
      )}
      {meta.withheld.length > 0 && (
        <p className="flex items-start gap-2 text-muted-foreground">
          <EyeOff className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <b>{names(meta.withheld)}</b> {meta.withheld.length === 1 ? 'is' : 'are'} not shown to
            you, so the cost per litre cannot be worked out. Ask an administrator for the production
            cost or factory expense right.
          </span>
        </p>
      )}
      {meta.warnings.map((warning) => (
        <p key={warning} className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{warning}</span>
        </p>
      ))}
    </div>
  );
}
