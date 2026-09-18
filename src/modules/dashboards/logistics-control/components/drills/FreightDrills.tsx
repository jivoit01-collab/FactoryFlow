import { OpsDrill } from '../OpsDrill';
import type { Board } from './board';
import { decimal, money, whole } from './format';

/**
 * The two freight panels.
 *
 * Both stop at one level, and deliberately: SAP answers this plant's freight
 * questions per HAULIER, not per document. `/dispatch/transporter-account/`
 * returns a vendor's open balance and the age of its oldest invoice — the
 * invoice numbers behind it are not in the response, and neither is the split
 * of one haulier's spend across the service GRPOs that make it up.
 *
 * So these rows do not offer a chevron. A row that looks openable and then
 * shows the reader nothing is worse than one that never offered — the same
 * rule the tiles follow. Giving either a second level means a backend that
 * lists the documents first.
 */

/** What SAP says is owed to the hauliers. */
export function FreightVendorsDrill({
  account,
  onClose,
}: {
  account: Board['freight']['account'];
  onClose: () => void;
}) {
  // Null where SAP could not be reached — not zero, which would read as a
  // plant that owes its hauliers nothing.
  const owed = account.outstanding ?? 0;

  return (
    <OpsDrill
      title="Transport account"
      subtitle="What SAP says is owed, by haulier"
      domain="transport"
      onClose={onClose}
      stats={[
        { label: 'Outstanding', value: money(account.outstanding) },
        { label: 'Invoices', value: whole(account.documents) },
        {
          label: 'Oldest',
          value: account.oldestDays == null ? '—' : `${whole(account.oldestDays)} days`,
        },
      ]}
      rows={account.vendors}
      rowKey={(row) => row.card_code}
      empty="SAP reports nothing outstanding to the hauliers."
      loading={account.loading}
      columns={[
        { label: 'Haulier', cell: (row) => row.card_name || row.card_code },
        { label: 'Invoices', cell: (row) => whole(row.documents), numeric: true },
        { label: 'Outstanding', cell: (row) => money(row.outstanding), numeric: true },
        {
          label: 'Share of the debt',
          numeric: true,
          // A dash where SAP could not be read at all: a share of an unknown
          // total is not a small share, it is no answer.
          cell: (row) =>
            owed > 0 ? `${decimal((row.outstanding / owed) * 100, 1)}%` : '—',
        },
        {
          label: 'Oldest',
          cell: (row) => (row.oldest_days == null ? '—' : `${whole(row.oldest_days)} days`),
          numeric: true,
        },
      ]}
    />
  );
}

/** The plant's freight rate, and the spend behind it by haulier. */
export function CostPerLitreDrill({
  costLitre,
  onClose,
}: {
  costLitre: Board['dispatch']['costPerLitre'];
  onClose: () => void;
}) {
  return (
    <OpsDrill
      title="Cost per litre"
      /* Spend per haulier, not a rate per haulier. SAP cannot say which
         dispatch a freight document paid for, so there are no litres to
         divide one haulier's spend by -- see `byTransporter` on the hook. */
      subtitle="Plant rate above; freight posted in the window, by haulier"
      domain="transport"
      onClose={onClose}
      stats={
        costLitre
          ? [
              { label: 'Per litre', value: `₹${decimal(costLitre.total, 2)}` },
              { label: 'Litres priced', value: `${decimal(costLitre.coveragePct, 0)}%` },
            ]
          : undefined
      }
      rows={costLitre?.byTransporter ?? []}
      rowKey={(row) => row.card_code}
      empty="SAP posted no freight for this window."
      columns={[
        { label: 'Haulier', cell: (row) => row.transporter_name || row.card_code },
        { label: 'Service GRPOs', cell: (row) => whole(row.documents), numeric: true },
        { label: 'Freight', cell: (row) => money(row.amount), numeric: true },
      ]}
    />
  );
}
