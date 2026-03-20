import { CLEARANCE_RESULT_LABELS } from '../constants';
import type { ClearanceResult, LineClearanceItem } from '../types';

interface ClearanceChecklistTableProps {
  items: LineClearanceItem[];
  onUpdateItem?: (id: number, result: ClearanceResult, remarks?: string) => void;
  readOnly?: boolean;
}

export function ClearanceChecklistTable({ items, onUpdateItem, readOnly }: ClearanceChecklistTableProps) {
  const resultOptions: ClearanceResult[] = ['YES', 'NO', 'NA'];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left p-2 font-medium w-8">#</th>
            <th className="text-left p-2 font-medium">Checkpoint</th>
            <th className="text-center p-2 font-medium w-32">Result</th>
            <th className="text-left p-2 font-medium">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b">
              <td className="p-2 text-muted-foreground">{item.sort_order}</td>
              <td className="p-2">{item.checkpoint}</td>
              <td className="p-2 text-center">
                {readOnly ? (
                  <span className={`font-medium ${item.result === 'YES' ? 'text-green-600' : item.result === 'NO' ? 'text-red-600' : 'text-gray-500'}`}>
                    {CLEARANCE_RESULT_LABELS[item.result]}
                  </span>
                ) : (
                  <div className="flex justify-center gap-1">
                    {resultOptions.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => onUpdateItem?.(item.id, opt)}
                        className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
                          item.result === opt
                            ? opt === 'YES' ? 'bg-green-100 text-green-800 border-green-300' : opt === 'NO' ? 'bg-red-100 text-red-800 border-red-300' : 'bg-gray-100 text-gray-800 border-gray-300'
                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {CLEARANCE_RESULT_LABELS[opt]}
                      </button>
                    ))}
                  </div>
                )}
              </td>
              <td className="p-2 text-muted-foreground">{item.remarks || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
