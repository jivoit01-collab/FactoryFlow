import { CLEARANCE_RESULT_LABELS } from '../constants';
import type { ClearanceResult, LineClearanceItem } from '../types';

interface LocalItem {
  id: number;
  result: ClearanceResult;
  remarks: string;
}

interface ClearanceChecklistTableProps {
  items: LineClearanceItem[];
  localItems?: LocalItem[];
  onLocalChange?: (id: number, result: ClearanceResult) => void;
  readOnly?: boolean;
}

export function ClearanceChecklistTable({ items, localItems, onLocalChange, readOnly }: ClearanceChecklistTableProps) {
  const resultOptions: ClearanceResult[] = ['YES', 'NO', 'NA'];

  const getResult = (item: LineClearanceItem): ClearanceResult => {
    if (localItems) {
      const local = localItems.find((l) => l.id === item.id);
      return local ? local.result : item.result;
    }
    return item.result;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th scope="col" className="text-left p-2 font-medium w-8">#</th>
            <th scope="col" className="text-left p-2 font-medium">Checkpoint</th>
            <th scope="col" className="text-center p-2 font-medium w-32">Result</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const currentResult = getResult(item);
            return (
              <tr key={item.id} className="border-b">
                <td className="p-2 text-muted-foreground">{item.sort_order}</td>
                <td className="p-2">{item.checkpoint}</td>
                <td className="p-2 text-center">
                  {readOnly ? (
                    <span className={`font-medium ${currentResult === 'YES' ? 'text-green-600' : currentResult === 'NO' ? 'text-red-600' : 'text-gray-500'}`}>
                      {CLEARANCE_RESULT_LABELS[currentResult]}
                    </span>
                  ) : (
                    <div className="flex justify-center gap-1">
                      {resultOptions.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => onLocalChange?.(item.id, opt)}
                          className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
                            currentResult === opt
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
