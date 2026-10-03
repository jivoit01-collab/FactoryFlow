import { IndianRupee } from 'lucide-react';

import type { ReportPalette } from '../constants';
import type { OperationsReport } from '../types';
import { NIL, perLitre, rupees } from '../utils';
import { ReportPanel } from './ReportPanel';

/**
 * What a litre cost, and what it was made of.
 *
 * One stacked bar — labour, power, wastage, left to right — because the
 * question is composition: which head is the big one. Every segment's figure
 * is printed in the table beside it, so the bar is never read off by colour
 * alone and nobody has to estimate a width.
 */
export function CostPerLitrePanel({
  report,
  palette,
}: {
  report: OperationsReport;
  palette: ReportPalette;
}) {
  const { totals, previous, previousLabel } = report;

  const heads = [
    {
      key: 'labour',
      label: 'Labour',
      spend: totals.labourCost,
      per: totals.perLitre.labour,
      hue: palette.labour,
    },
    {
      key: 'power',
      label: 'Electricity',
      spend: totals.powerCost,
      per: totals.perLitre.power,
      hue: palette.power,
    },
    {
      key: 'wastage',
      label: 'Wastage',
      spend: totals.wastageValue,
      per: totals.perLitre.wastage,
      hue: palette.wastage,
    },
  ];
  // Shares and the total only when every head is known: a bar of two heads
  // with the third missing would show the other two as bigger than they are.
  const complete = heads.every((head) => head.spend !== null);
  const spend = complete ? heads.reduce((sum, head) => sum + (head.spend ?? 0), 0) : null;
  const missing = heads.filter((head) => head.spend === null).map((head) => head.label);

  return (
    <ReportPanel
      title="Cost per litre"
      subtitle="Contract labour, electricity and priced packing waste, over the litres filled"
      icon={IndianRupee}
      accent="slate"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] lg:items-center">
        <div>
          <p className="text-4xl font-semibold tabular-nums tracking-tight">
            {perLitre(totals.perLitre.total)}
            {totals.perLitre.total !== null && (
              <span className="ml-1 text-base font-medium text-muted-foreground">/ L</span>
            )}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {totals.perLitre.total !== null
              ? `${perLitre(previous.perLitre.total)} on ${previousLabel}`
              : totals.litres === null
                ? 'The litres filled are not known, so there is no cost per litre.'
                : missing.length
                  ? `No ${missing.join(' or ').toLowerCase()} figure, so no total.`
                  : 'Nothing was filled, so there is no cost per litre.'}
          </p>
        </div>

        <div className="space-y-3">
          {spend !== null && spend > 0 && (
            <div
              className="flex h-3 w-full gap-[2px] overflow-hidden rounded-[4px]"
              role="img"
              aria-label={heads
                .map((head) => `${head.label} ${Math.round(((head.spend ?? 0) / spend) * 100)}%`)
                .join(', ')}
            >
              {heads.map((head) => (
                <div
                  key={head.key}
                  style={{
                    width: `${((head.spend ?? 0) / spend) * 100}%`,
                    backgroundColor: head.hue,
                  }}
                  title={`${head.label}: ${perLitre(head.per)} a litre`}
                />
              ))}
            </div>
          )}

          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="py-1.5 text-left font-semibold">
                  Head
                </th>
                <th scope="col" className="py-1.5 text-right font-semibold">
                  Spend
                </th>
                <th scope="col" className="py-1.5 text-right font-semibold">
                  Per litre
                </th>
                <th scope="col" className="py-1.5 text-right font-semibold">
                  Share
                </th>
              </tr>
            </thead>
            <tbody>
              {heads.map((head) => (
                <tr key={head.key} className="border-t">
                  <td className="py-1.5">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ backgroundColor: head.hue }}
                        aria-hidden
                      />
                      {head.label}
                    </span>
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{rupees(head.spend)}</td>
                  <td className="py-1.5 text-right tabular-nums">{perLitre(head.per)}</td>
                  <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                    {spend !== null && spend > 0 && head.spend !== null
                      ? `${((head.spend / spend) * 100).toFixed(0)}%`
                      : NIL}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t font-semibold">
                <td className="py-1.5">Total</td>
                <td className="py-1.5 text-right tabular-nums">{rupees(spend)}</td>
                <td className="py-1.5 text-right tabular-nums">
                  {perLitre(totals.perLitre.total)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </ReportPanel>
  );
}
