import { describe, expect, it } from 'vitest';

import type { SalesDispatchAttachment, SalesDispatchGateOut } from '@/modules/gate/api';

import { biltyTargetsOf } from '../biltyTargets';

const doc = (patch: Record<string, unknown>) => ({
  id: 1,
  document_type: 'INVOICE',
  sap_doc_entry: 1,
  sap_doc_num: '1',
  dispatch_plan: 10,
  plan_bilty_no: '',
  plan_bilty_date: null,
  plan_bilty_attachment_name: '',
  ...patch,
});

const docking = (id: number, documents: unknown[], status = 'DOCKED') =>
  ({
    id,
    status,
    customer_code: '',
    customer_name: '',
    documents,
  }) as unknown as SalesDispatchGateOut;

describe('biltyTargetsOf', () => {
  it('shows the number and date from linking, and asks only for the file', () => {
    const [target] = biltyTargetsOf(
      [
        docking(1, [
          doc({
            customer_code: 'C1',
            customer_name: 'SHIVAYE BEVERAGES',
            plan_bilty_no: 'NCR-4494',
            plan_bilty_date: '2026-10-05',
          }),
        ]),
      ],
      [],
    );

    expect(target).toMatchObject({
      key: 'C1',
      linkedNo: 'NCR-4494',
      linkedDate: '2026-10-05',
      hasFile: false,
      editableDockingIds: [1],
    });
  });

  it('leaves the number blank for a truck linked before it was asked for', () => {
    const [target] = biltyTargetsOf(
      [docking(1, [doc({ customer_code: 'C1', customer_name: 'Goel' })])],
      [],
    );
    expect(target.linkedNo).toBe('');
    expect(target.linkedDate).toBe('');
  });

  it("is covered only once every one of the customer's plans holds the file", () => {
    const [partly] = biltyTargetsOf(
      [
        docking(1, [
          doc({ customer_code: 'C1', plan_bilty_attachment_name: 'lr.pdf' }),
          doc({ id: 2, dispatch_plan: 11, customer_code: 'C1' }),
        ]),
      ],
      [],
    );
    expect(partly.hasFile).toBe(false);

    const [fully] = biltyTargetsOf(
      [
        docking(1, [
          doc({ customer_code: 'C1', plan_bilty_attachment_name: 'lr.pdf' }),
          doc({
            id: 2,
            dispatch_plan: 11,
            customer_code: 'C1',
            plan_bilty_attachment_name: 'lr.pdf',
          }),
        ]),
      ],
      [],
    );
    expect(fully).toMatchObject({ hasFile: true, fileName: 'lr.pdf' });
  });

  it("sends a customer's file to every open docking carrying them, never a printed one", () => {
    const targets = biltyTargetsOf(
      [
        docking(1, [doc({ customer_code: 'C1' }), doc({ id: 2, customer_code: 'C2' })]),
        docking(2, [doc({ id: 3, customer_code: 'C1' })]),
        docking(3, [doc({ id: 4, customer_code: 'C1' })], 'PRINT_COMMITTED'),
      ],
      [],
    );

    expect(targets.map((target) => target.key)).toEqual(['C1', 'C2']);
    expect(targets[0].editableDockingIds).toEqual([1, 2]);
    expect(targets[1].editableDockingIds).toEqual([1]);
  });

  it('falls back to the docking upload for a bill no linking ever touched', () => {
    const uploaded = {
      id: 9,
      attachment_type: 'BILTY',
      customer_code: 'C1',
      original_filename: 'old.pdf',
      file: '/media/old.pdf',
    } as SalesDispatchAttachment;

    const [target] = biltyTargetsOf(
      [docking(1, [doc({ customer_code: 'C1', dispatch_plan: null })])],
      [uploaded],
    );
    expect(target).toMatchObject({ hasFile: true, fileName: 'old.pdf' });
  });
});
