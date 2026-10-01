import { describe, expect, it } from 'vitest';

import { isEditable } from '../utils';

describe('isEditable', () => {
  // A truck already inside still has its count corrected before it is posted.
  it.each(['DRAFT', 'AWAITING_ARRIVAL', 'ARRIVED'] as const)('lets %s be edited', (status) => {
    expect(isEditable(status)).toBe(true);
  });

  // Confirm Receipt has run: stock, and maybe a SAP document, sit behind the lines.
  it.each(['RECEIVED', 'SAP_QUEUED', 'PARTIALLY_POSTED', 'POSTED', 'CANCELLED'] as const)(
    'closes %s',
    (status) => {
      expect(isEditable(status)).toBe(false);
    },
  );
});
