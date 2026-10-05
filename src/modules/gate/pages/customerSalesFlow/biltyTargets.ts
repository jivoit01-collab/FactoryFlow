/**
 * The docking's bilty panels: one per consignee on the whole truck.
 *
 * A bilty (LR) is issued per consignee. Its number and date are entered at
 * Vehicle Linking and are read-only on the docking; the file is the docking's to
 * upload, after scanning, and the server copies it onto that customer's plans.
 */
import type {
  SalesDispatchAttachment,
  SalesDispatchGateOut,
  SalesDispatchGateOutDocument,
} from '@/modules/gate/api';

/** A consignee on a docking. Attachments are still tagged with one. */
export interface DockingCustomer {
  code: string;
  name: string;
  key: string;
}

/**
 * One consignee on the whole truck, with the bilty its plans hold.
 *
 * The number and date are entered at Vehicle Linking and read-only here; the
 * file is this screen's to upload. A customer can ride on several companies'
 * dockings, and each docking's plans need the file, so the upload goes to every
 * open docking carrying them.
 */
export interface BiltyTarget extends DockingCustomer {
  editableDockingIds: number[];
  /** From the plans, as Vehicle Linking left them. Blank on a truck linked before it asked. */
  linkedNo: string;
  linkedDate: string;
  /** Every one of this customer's planned bills already holds a file. */
  hasFile: boolean;
  fileName: string;
}

const BILTY_READONLY_STATUSES = ['PRINT_COMMITTED', 'DISPATCHED', 'REJECTED', 'CANCELLED'];

export function biltyTargetsOf(
  dockings: SalesDispatchGateOut[],
  currentAttachments: SalesDispatchAttachment[],
): BiltyTarget[] {
  const byKey = new Map<string, BiltyTarget & { planned: number; filed: number }>();
  for (const docking of dockings) {
    const editable = !BILTY_READONLY_STATUSES.includes(docking.status);
    const rows = docking.documents?.length
      ? docking.documents
      : [
          {
            customer_code: docking.customer_code,
            customer_name: docking.customer_name,
            dispatch_plan: docking.dispatch_plan,
          } as SalesDispatchGateOutDocument,
        ];
    for (const row of rows) {
      const code = (row.customer_code || '').trim();
      const name = (row.customer_name || '').trim();
      const key = code || name;
      if (!key) continue;
      let target = byKey.get(key);
      if (!target) {
        target = {
          code,
          name,
          key,
          editableDockingIds: [],
          linkedNo: '',
          linkedDate: '',
          hasFile: false,
          fileName: '',
          planned: 0,
          filed: 0,
        };
        byKey.set(key, target);
      }
      if (editable && !target.editableDockingIds.includes(docking.id)) {
        target.editableDockingIds.push(docking.id);
      }
      target.linkedNo ||= (row.plan_bilty_no || '').trim();
      target.linkedDate ||= row.plan_bilty_date?.slice(0, 10) || '';
      if (row.dispatch_plan) {
        target.planned += 1;
        if (row.plan_bilty_attachment_name) {
          target.filed += 1;
          target.fileName ||= row.plan_bilty_attachment_name;
        }
      }
    }
  }
  return [...byKey.values()].map(({ planned, filed, ...target }) => {
    // A customer with no plan behind any bill was never linked: only this
    // docking's own upload can cover it.
    const uploaded = currentAttachments.find(
      (attachment) =>
        attachment.attachment_type === 'BILTY' &&
        ((attachment.customer_code || '').trim() || (attachment.customer_name || '').trim()) ===
          target.key,
    );
    return {
      ...target,
      hasFile: planned > 0 ? filed === planned : Boolean(uploaded),
      fileName: target.fileName || uploaded?.original_filename || '',
    };
  });
}
