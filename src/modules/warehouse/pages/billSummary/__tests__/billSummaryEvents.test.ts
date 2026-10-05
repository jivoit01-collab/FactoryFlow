import { describe, expect, it } from 'vitest';

import { billSummaryEvents, wasResent } from '../billSummaryEvents';

const NOBODY = {
  issued_by_name: '',
  rejected_by_name: '',
  approved_by_name: '',
  printed_by_name: '',
  picked_by_name: '',
};

const SENT_ONCE = {
  ...NOBODY,
  issued_by_name: 'Shivam',
  approved_by_name: 'Warehouse',
  // Raised and sent in the same request, a few milliseconds apart.
  issued_at: '2026-10-05T14:02:11.120+05:30',
  submitted_at: '2026-10-05T14:02:11.180+05:30',
  rejected_at: null,
  approved_at: '2026-10-05T15:10:00+05:30',
  sap_posted_at: '2026-10-05T15:10:04+05:30',
  printed_at: null,
  picked_at: null,
};

describe('billSummaryEvents', () => {
  it('names who sent a sheet and who approved it, in order', () => {
    expect(billSummaryEvents(SENT_ONCE)).toEqual([
      { key: 'sent', label: 'Sent', at: SENT_ONCE.submitted_at, by: 'Shivam' },
      { key: 'approved', label: 'Approved', at: SENT_ONCE.approved_at, by: 'Warehouse' },
    ]);
  });

  it('leaves the SAP posting out unless asked for', () => {
    expect(billSummaryEvents(SENT_ONCE).map((e) => e.key)).not.toContain('posted');
    expect(billSummaryEvents(SENT_ONCE, { withSap: true }).map((e) => e.key)).toEqual([
      'sent',
      'approved',
      'posted',
    ]);
  });

  it('shows a sheet handed back and sent again as raised, sent back, re-sent', () => {
    const resent = {
      ...SENT_ONCE,
      rejected_by_name: 'Warehouse',
      submitted_at: '2026-10-05T16:30:00+05:30',
      rejected_at: '2026-10-05T15:00:00+05:30',
      approved_at: null,
      sap_posted_at: null,
    };
    expect(wasResent(resent)).toBe(true);
    expect(billSummaryEvents(resent)).toEqual([
      { key: 'raised', label: 'Raised', at: resent.issued_at, by: 'Shivam' },
      { key: 'rejected', label: 'Sent back', at: resent.rejected_at, by: 'Warehouse' },
      // Nobody is recorded against the re-send itself.
      { key: 'sent', label: 'Re-sent', at: resent.submitted_at, by: '' },
    ]);
  });

  it('has nothing for a dispatch stamped straight into SAP', () => {
    const fromSap = {
      ...NOBODY,
      issued_at: null as unknown as string,
      submitted_at: null,
      rejected_at: null,
      approved_at: null,
      sap_posted_at: null,
      printed_at: null,
      picked_at: null,
    };
    expect(wasResent(fromSap)).toBe(false);
    expect(billSummaryEvents(fromSap, { withSap: true })).toEqual([]);
  });
});
