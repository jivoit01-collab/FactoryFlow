import { describe, expect, it } from 'vitest';

import { buildEdit, initialState } from '../../utils/sapEdit';
import { serviceGRPO } from '../fixtures.sapEdit';

describe('what the GRPO edit form sends', () => {
  it('sends nothing for an untouched form', () => {
    const doc = serviceGRPO();
    const built = buildEdit(doc, initialState(doc));
    expect(built.request).toEqual({ header: {}, lines: [] });
    expect(built.changes).toEqual([]);
  });

  it('sends each changed field with the value the page showed', () => {
    const doc = serviceGRPO();
    const state = initialState(doc);
    state.header.vendor_ref = '7320A';
    state.header.contact_person = '7';
    state.header.U_VehicleNoM = ' HR55X1 ';
    state.amounts[0] = '3100';
    state.months[0] = '09-2026';
    const built = buildEdit(doc, state);
    expect(built.problems).toEqual([]);
    expect(built.request.header).toEqual({
      vendor_ref: { before: '7320', after: '7320A' },
      contact_person: { before: null, after: 7 },
      U_VehicleNoM: { before: '', after: 'HR55X1' },
    });
    expect(built.request.lines).toEqual([
      { line_num: 0, field: 'amount', before: '2769.00', after: '3100' },
      { line_num: 0, field: 'month', before: '10-2026', after: '09-2026' },
    ]);
    expect(built.changes.find((c) => c.label === 'Contact Person')?.after).toBe('AMIT');
  });

  it('treats an amount typed to the paisa as unchanged', () => {
    const doc = serviceGRPO();
    const state = initialState(doc);
    state.amounts[0] = '2769';
    expect(buildEdit(doc, state).request.lines).toEqual([]);
  });

  it('clears a date to null, and flags what SAP would refuse', () => {
    const doc = serviceGRPO();
    const state = initialState(doc);
    state.header.document_date = '';
    state.header.U_VehicleNoM = 'X'.repeat(13);
    state.amounts[0] = '0';
    const built = buildEdit(doc, state);
    expect(built.request.header.document_date).toEqual({ before: '2026-10-10', after: null });
    expect(built.problems).toEqual([
      'Vehicle Number takes at most 12 characters.',
      'Amount, line 1 must be a number above 0.',
    ]);
  });

  it('never sends a line SAP has closed', () => {
    const doc = serviceGRPO();
    const state = initialState(doc);
    state.amounts[1] = '9999';
    expect(buildEdit(doc, state).request.lines).toEqual([]);
  });
});
