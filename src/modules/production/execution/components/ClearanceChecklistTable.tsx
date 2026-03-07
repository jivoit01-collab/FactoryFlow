import { cn } from '@/shared/utils';
import { Input } from '@/shared/components/ui';

import type { ClearanceChecklistItem, ClearanceResult } from '../types';

interface ClearanceChecklistTableProps {
  items: ClearanceChecklistItem[];
  disabled?: boolean;
  onItemChange: (itemId: number, result: ClearanceResult, remarks?: string) => void;
}

const RESULT_OPTIONS: { value: ClearanceResult; label: string }[] = [
  { value: 'YES', label: 'YES' },
  { value: 'NO', label: 'NO' },
  { value: 'NA', label: 'N/A' },
];

export function ClearanceChecklistTable({
  items,
  disabled = false,
  onItemChange,
}: ClearanceChecklistTableProps) {
  const yesCount = items.filter((i) => i.result === 'YES').length;
  const noCount = items.filter((i) => i.result === 'NO').length;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-10 px-3 py-3 text-center font-medium text-muted-foreground">#</th>
              <th className="px-4 py-3 text-left font-medium">Checkpoint</th>
              {RESULT_OPTIONS.map((opt) => (
                <th key={opt.value} className="w-16 px-2 py-3 text-center font-medium">
                  {opt.label}
                </th>
              ))}
              <th className="w-48 px-4 py-3 text-left font-medium">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {items
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((item) => (
                <tr
                  key={item.id}
                  className={cn(
                    'border-b last:border-0 transition-colors',
                    item.result === 'NO' && 'bg-red-50 dark:bg-red-900/10',
                  )}
                >
                  <td className="px-3 py-3 text-center text-muted-foreground">
                    {item.sort_order}
                  </td>
                  <td className="px-4 py-3">{item.checkpoint}</td>
                  {RESULT_OPTIONS.map((opt) => (
                    <td key={opt.value} className="px-2 py-3 text-center">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onItemChange(item.id, opt.value, item.remarks)}
                        className={cn(
                          'h-5 w-5 rounded-full border-2 inline-flex items-center justify-center transition-colors',
                          disabled && 'cursor-not-allowed opacity-50',
                          item.result === opt.value
                            ? opt.value === 'YES'
                              ? 'border-green-500 bg-green-500 text-white'
                              : opt.value === 'NO'
                                ? 'border-red-500 bg-red-500 text-white'
                                : 'border-gray-400 bg-gray-400 text-white'
                            : 'border-gray-300 hover:border-gray-400 dark:border-gray-600',
                        )}
                      >
                        {item.result === opt.value && (
                          <span className="text-[10px] font-bold">
                            {opt.value === 'YES' ? '✓' : opt.value === 'NO' ? '✕' : '—'}
                          </span>
                        )}
                      </button>
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <Input
                      value={item.remarks}
                      disabled={disabled}
                      placeholder={
                        item.result === 'NO' || item.result === 'NA' ? 'Add remarks...' : ''
                      }
                      className="h-8 text-xs"
                      onChange={(e) => onItemChange(item.id, item.result, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>
          {yesCount} of {items.length} items checked YES
        </span>
        <div className="flex items-center gap-1">
          {items
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((item) => (
              <span
                key={item.id}
                className={cn(
                  'h-2.5 w-2.5 rounded-full',
                  item.result === 'YES'
                    ? 'bg-green-500'
                    : item.result === 'NO'
                      ? 'bg-red-500'
                      : 'bg-gray-300 dark:bg-gray-600',
                )}
              />
            ))}
        </div>
        {noCount > 0 && (
          <span className="text-red-600 font-medium">{noCount} item(s) marked NO</span>
        )}
      </div>
    </div>
  );
}
