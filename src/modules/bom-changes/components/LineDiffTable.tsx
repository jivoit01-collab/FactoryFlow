import {
  ROW_CLASSES,
  StatusPill,
  TABLE_CLASSES,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components/page';

import type { LineChange, LineDiff } from '../utils/requestDraft';

const CHANGE_TONE = {
  added: 'done',
  removed: 'blocked',
  changed: 'warn',
  same: 'neutral',
} as const;
const CHANGE_LABEL: Record<LineChange, string> = {
  added: 'Added',
  removed: 'Removed',
  changed: 'Changed',
  same: 'Unchanged',
};

function quantity(value: number | null): string {
  return value === null ? '—' : value.toLocaleString('en-IN', { maximumFractionDigits: 6 });
}

/** What a change does to each component of the tree SAP holds. */
export function LineDiffTable({ diff }: { diff: readonly LineDiff[] }) {
  return (
    <table className={TABLE_CLASSES}>
      <thead className={THEAD_CLASSES}>
        <tr>
          <Th>Change</Th>
          <Th>Code</Th>
          <Th>Name</Th>
          <Th align="right">In SAP now</Th>
          <Th align="right">Asked for</Th>
        </tr>
      </thead>
      <tbody>
        {diff.map((row) => (
          <tr key={row.item_code} className={ROW_CLASSES}>
            <Td>
              <StatusPill tone={CHANGE_TONE[row.change]} dot>
                {CHANGE_LABEL[row.change]}
              </StatusPill>
            </Td>
            <Td className="font-mono text-xs">{row.item_code}</Td>
            <Td>{row.item_name || '—'}</Td>
            <Td numeric>{quantity(row.before)}</Td>
            <Td numeric className={row.change === 'same' ? 'text-muted-foreground' : 'font-medium'}>
              {quantity(row.after)}
            </Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
