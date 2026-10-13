import { Info, XCircle } from 'lucide-react';

import { cn } from '@/shared/utils';

import type { VoucherSapPlan } from '../types';
import { voucherIssuePoints } from '../utils/voucherIssues';

/**
 * The bunch page's Warnings cell: one short point per problem.
 *
 * "Fix" points (red) stop the bunch from posting until they are dealt with;
 * "Note" points (amber) are only worth a look. Hovering a point shows the
 * backend's full message.
 */
export function VoucherIssues({ voucher }: { voucher: VoucherSapPlan }) {
  const points = voucherIssuePoints(voucher);
  if (points.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <ul className="space-y-1.5">
      {points.map((point, i) => {
        const fix = point.tone === 'fix';
        const Icon = fix ? XCircle : Info;
        return (
          <li
            key={`${point.tone}-${i}`}
            title={point.detail}
            className={cn(
              'flex gap-1.5 leading-snug',
              fix ? 'text-destructive' : 'text-amber-700 dark:text-amber-400',
            )}
          >
            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              <span className="font-semibold">{fix ? 'Fix:' : 'Note:'}</span> {point.text}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
