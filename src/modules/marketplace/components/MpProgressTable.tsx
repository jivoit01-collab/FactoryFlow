import { Badge } from '@/shared/components/ui';

import type { MpProgressLine, MpProgressStatus } from '../types/marketplace.types';

const STATUS_VARIANT: Record<MpProgressStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'outline',
  UNDER: 'secondary',
  COMPLETE: 'default',
  OVER: 'destructive',
};

/** Live required-vs-scanned summary for the FG lines of a dispatch/return. */
export function MpProgressTable({ progress }: { progress: MpProgressLine[] }) {
  if (progress.length === 0) {
    return <p className="text-sm text-muted-foreground">No finished-goods lines to scan.</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-xs text-muted-foreground">
          <th className="py-2 pr-2 font-medium">Item</th>
          <th className="py-2 px-2 text-right font-medium">Required</th>
          <th className="py-2 px-2 text-right font-medium">Scanned</th>
          <th className="py-2 pl-2 font-medium">Status</th>
        </tr>
      </thead>
      <tbody>
        {progress.map((row) => (
          <tr key={row.item_code} className="border-b last:border-0">
            <td className="py-2 pr-2">
              <span className="font-mono">{row.item_code}</span>
              {row.item_name ? (
                <span className="ml-2 text-xs text-muted-foreground">{row.item_name}</span>
              ) : null}
            </td>
            <td className="py-2 px-2 text-right tabular-nums">{row.required_quantity}</td>
            <td className="py-2 px-2 text-right tabular-nums">{row.scanned_quantity}</td>
            <td className="py-2 pl-2">
              <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
