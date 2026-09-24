import { OpsDrill } from '../../logistics-control/components';
import type { AdminDispatch, AdminDispatchCompany } from '../types';
import { NO_VALUE, num, pctRough, tons, whole } from '../utils';

/**
 * 'JIVO_OIL' -> 'Jivo Oil'.
 *
 * The topbar's own `replace('JIVO_', 'Jivo ')` leaves 'Jivo OIL', which is fine
 * shouted across a band and wrong in a table read at arm's length. An unknown
 * code passes through untouched rather than being mangled into title case.
 */
export function companyName(code: string): string {
  if (!code.startsWith('JIVO_')) return code;
  const rest = code.slice(5);
  return `Jivo ${rest.charAt(0)}${rest.slice(1).toLowerCase()}`;
}

export interface AdminDispatchDrillProps {
  dispatch: AdminDispatch;
  /** The window the figures cover, as the tile prints it. */
  period: string;
  onClose: () => void;
}

/**
 * What left the gate, and whose it was.
 *
 * THE ROWS ADD UP TO THE HEADLINE. Every tonne that went out belongs to exactly
 * one company, so the table is the tile's own figure split — which is why the
 * share column can be trusted and why a company missing from it is a company
 * that shipped nothing rather than one the panel forgot.
 *
 * THE BILLED FIGURE IS NOT A DISCREPANCY. `invoiced_tons` answers a different
 * question from the gate register — what SAP billed this month, against what
 * physically moved — and the gap between them is how much of this month's
 * billing is still standing in the warehouse. It is a cut of its own above the
 * table rather than a column in it, because it does not divide by company.
 */
export function AdminDispatchDrill({ dispatch, period, onClose }: AdminDispatchDrillProps) {
  const total = dispatch.mtd_tons;
  const invoiced = num(dispatch.invoiced_tons);

  const share = (value: number) => (total > 0 ? (value / total) * 100 : null);

  return (
    <OpsDrill
      title="Total dispatch"
      // The Output band's hue — see `AdminBand`, where output borrows the
      // dispatch blue because it is about goods moving.
      domain="dispatch"
      subtitle={`${period} · ${dispatch.basis}`}
      onClose={onClose}
      stats={[
        { label: 'This month', value: `${tons(total)} T` },
        {
          label: 'Today',
          // Nothing out yet and nothing readable are different answers, and
          // only the first of them is a fact about the gate.
          value: dispatch.today_tons > 0 ? `${tons(dispatch.today_tons)} T` : 'nothing out yet',
        },
        {
          label: 'Left the gate',
          // A truck carrying four invoices is one truck and four bills, so the
          // two counts are printed together rather than either standing alone.
          value: `${whole(dispatch.trucks)} trucks · ${whole(dispatch.bills)} bills`,
        },
        {
          label: 'An average dispatch day',
          value:
            dispatch.avg_tons_per_dispatch_day == null
              ? NO_VALUE
              : `${tons(dispatch.avg_tons_per_dispatch_day)} T over ${dispatch.dispatch_days} days`,
        },
      ]}
      breakdown={{
        title: 'Shipped against billed',
        empty: 'SAP could not be read, so what was billed this month is unknown.',
        items:
          invoiced === null
            ? []
            : [
                {
                  key: 'shipped',
                  label: 'Left the gate',
                  value: `${tons(total)} T`,
                  sub: 'the gate-out register',
                },
                {
                  key: 'billed',
                  label: 'Billed this month',
                  value: `${tons(invoiced)} T`,
                  sub: 'SAP invoices, intercompany excluded',
                },
                {
                  key: 'gap',
                  // Named for what it MEANS in whichever direction it falls.
                  // More billed than shipped is stock still standing here;
                  // more shipped than billed is earlier months' bills moving,
                  // which is normal and must not read as a shortfall.
                  label: invoiced > total ? 'Billed but still here' : 'Shipped on earlier bills',
                  value: `${tons(Math.abs(invoiced - total))} T`,
                  sub: invoiced > total ? 'raised this month, not yet out' : 'billed before this month',
                },
              ],
      }}
      rows={dispatch.companies}
      rowKey={(company: AdminDispatchCompany) => company.company_code}
      empty="No truck left the gate this month."
      columns={[
        {
          label: 'Company',
          cell: (company: AdminDispatchCompany) => companyName(company.company_code),
        },
        {
          label: 'Tonnes',
          cell: (company: AdminDispatchCompany) => `${tons(company.tons)} T`,
          numeric: true,
        },
        {
          label: 'Share',
          // A rule rather than 0% on a month that shipped nothing: no share of
          // nothing exists, and 0% would claim one was computed.
          cell: (company: AdminDispatchCompany) => pctRough(share(company.tons)),
          numeric: true,
          dim: true,
        },
        {
          label: 'Trucks',
          cell: (company: AdminDispatchCompany) => whole(company.trucks),
          numeric: true,
        },
        {
          label: 'Bills',
          cell: (company: AdminDispatchCompany) => whole(company.bills),
          numeric: true,
        },
      ]}
    />
  );
}
