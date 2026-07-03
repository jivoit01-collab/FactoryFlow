import { FileText } from 'lucide-react';

import type { BSTTransferDoc } from '../../types';

/**
 * The SAP documents combined into a BST entry. A single entry can carry several
 * stock-transfer documents that share one source → destination route.
 */
export function BSTDocList({ docs }: { docs: BSTTransferDoc[] }) {
  if (!docs || docs.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[520px] text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="p-3 text-left font-medium">SAP Document</th>
            <th className="p-3 text-left font-medium">Date</th>
            <th className="w-[110px] p-3 text-right font-medium">Items</th>
            <th className="w-[130px] p-3 text-right font-medium">Boxes</th>
          </tr>
        </thead>
        <tbody>
          {docs.map((d) => (
            <tr key={d.id} className="border-b last:border-b-0">
              <td className="p-3">
                <div className="flex items-center gap-2 font-medium">
                  <FileText className="h-4 w-4 text-muted-foreground" />#{d.sap_doc_num || d.sap_doc_entry}
                </div>
                {d.sap_reference ? (
                  <div className="mt-0.5 text-xs text-muted-foreground">{d.sap_reference}</div>
                ) : null}
              </td>
              <td className="p-3 text-muted-foreground">
                {d.sap_doc_date ? new Date(d.sap_doc_date).toLocaleDateString() : '—'}
              </td>
              <td className="p-3 text-right tabular-nums">{d.item_count}</td>
              <td className="p-3 text-right tabular-nums">
                {d.expected_box_count} box{d.expected_box_count === 1 ? '' : 'es'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
