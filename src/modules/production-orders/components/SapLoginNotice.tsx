import { KeyRound, TriangleAlert } from 'lucide-react';

import type { SapLogin } from '../api';

/**
 * Every step posts under the person's own SAP user, so before anything else the
 * page says which one — or why the person cannot post yet (no SAP user linked,
 * or its password not on the server).
 */
export function SapLoginNotice({ login }: { login: SapLogin | undefined }) {
  if (!login) return null;
  if (login.ready) {
    return (
      <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <KeyRound className="h-3.5 w-3.5" />
        Posts to SAP as <span className="font-mono font-semibold">{login.sap_user_code}</span>
      </p>
    );
  }
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{login.message} You can save entries, but not post them to SAP.</span>
    </div>
  );
}
