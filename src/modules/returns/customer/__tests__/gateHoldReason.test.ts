import { describe, expect, it } from 'vitest';

import { gateHoldReason } from '../utils';

describe('gateHoldReason', () => {
  it('lets in a return that needs no approval', () => {
    expect(
      gateHoldReason({ requires_approval: false, approval_status: 'NOT_REQUIRED' }),
    ).toBeNull();
  });

  it('lets in a return once it is approved', () => {
    expect(gateHoldReason({ requires_approval: true, approval_status: 'APPROVED' })).toBeNull();
  });

  it('holds a return still awaiting approval', () => {
    expect(gateHoldReason({ requires_approval: true, approval_status: 'PENDING' })).toMatch(
      /awaiting admin approval/i,
    );
  });

  it('holds a rejected return', () => {
    expect(gateHoldReason({ requires_approval: true, approval_status: 'REJECTED' })).toMatch(
      /rejected/i,
    );
  });

  // The server holds anything flagged and not approved, so the card must too —
  // otherwise it offers a button the server will refuse.
  it('holds a flagged return whose approval status reads not-required', () => {
    expect(
      gateHoldReason({ requires_approval: true, approval_status: 'NOT_REQUIRED' }),
    ).not.toBeNull();
  });
});
