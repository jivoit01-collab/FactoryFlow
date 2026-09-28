import { AlertTriangle } from 'lucide-react';

import type { SapComponentHealth } from './sapHealth.api';
import { useSapHealth } from './useSapHealth';

function sinceClock(since: string | null): string {
  if (!since) return '';
  const at = new Date(since);
  if (Number.isNaN(at.getTime())) return '';
  const sameDay = at.toDateString() === new Date().toDateString();
  const time = at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return sameDay ? time : `${at.toLocaleDateString([], { day: '2-digit', month: 'short' })} ${time}`;
}

function isDown(component?: SapComponentHealth): component is SapComponentHealth {
  return component?.status === 'down';
}

/**
 * The app-wide "SAP is down" strip, above every page.
 *
 * Says nothing unless the backend says SAP is down: an unknown, a failed poll
 * or a backend that predates the endpoint all render nothing, so this can
 * never be the thing that takes a screen down.
 */
export function SapHealthBanner() {
  const { data } = useSapHealth();
  const serviceLayer = data?.components?.service_layer;
  const hana = data?.components?.hana;
  if (!isDown(serviceLayer) && !isDown(hana)) return null;

  const lines: string[] = [];
  if (isDown(serviceLayer)) {
    const at = sinceClock(serviceLayer.since);
    lines.push(
      `SAP is not accepting postings${at ? ` (not answering since ${at})` : ''}. ` +
        'GRPOs, returns, transfers and other postings to SAP will fail until it is back — ' +
        'try the SAP step again later.',
    );
  }
  if (isDown(hana)) {
    const at = sinceClock(hana.since);
    lines.push(
      `SAP data cannot be read${at ? ` (since ${at})` : ''}. ` +
        'Lists, open POs and stock figures that come from SAP may be empty or out of date.',
    );
  }

  return (
    <div
      role="status"
      className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/15"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="space-y-1">
        {lines.map((line) => (
          <p key={line} className="text-sm text-amber-800 dark:text-amber-300">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
