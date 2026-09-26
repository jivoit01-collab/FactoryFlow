/**
 * One journal entry: the posted one SAP holds, or — for a draft or a payment
 * draft still waiting for approval — the reconstruction the server builds from
 * the draft, which SAP has not posted yet and says so.
 */
import { StatusPill } from '@/shared/components/page';

import type { JournalEntry } from '../api';
import { money, sapDate } from '../utils/format';

export function JournalEntryTable({ entry, title }: { entry: JournalEntry; title: string }) {
  const balanced = Math.abs(entry.total_debit - entry.total_credit) < 0.005;
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {entry.preview ? (
          <StatusPill tone="warn">Preview — SAP posts the final entry on approval</StatusPill>
        ) : (
          <span className="text-xs text-muted-foreground">
            Entry {entry.number ?? '-'} · #{entry.trans_id} · {entry.trans_type_label} · {sapDate(entry.ref_date)}
          </span>
        )}
        {!balanced && <StatusPill tone="blocked">Debits and credits differ</StatusPill>}
      </div>
      {entry.memo && <p className="text-xs text-muted-foreground">{entry.memo}</p>}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-1.5 text-left font-medium">#</th>
              <th className="px-3 py-1.5 text-left font-medium">Account</th>
              <th className="px-3 py-1.5 text-right font-medium">Debit</th>
              <th className="px-3 py-1.5 text-right font-medium">Credit</th>
              <th className="px-3 py-1.5 text-left font-medium">Memo</th>
              <th className="px-3 py-1.5 text-left font-medium">Cost centres</th>
            </tr>
          </thead>
          <tbody>
            {entry.lines.map((line, index) => (
              <tr key={line.line_id ?? index} className="border-t">
                <td className="px-3 py-1.5 tabular-nums">{line.line_id}</td>
                <td className="px-3 py-1.5">
                  <span className="font-medium">{line.account}</span>
                  {line.account_name && <span className="text-muted-foreground"> — {line.account_name}</span>}
                  {line.short_name && line.short_name !== line.account && (
                    <span className="ml-1 text-muted-foreground">({line.short_name})</span>
                  )}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">{money(line.debit, true)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{money(line.credit, true)}</td>
                <td className="px-3 py-1.5">{line.line_memo}</td>
                <td className="px-3 py-1.5 text-muted-foreground">{line.cost_centers.filter(Boolean).join(' · ')}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t bg-muted/20 font-medium">
            <tr>
              <td colSpan={2} className="px-3 py-1.5 text-right text-muted-foreground">
                Total
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums">{money(entry.total_debit)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{money(entry.total_credit)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
