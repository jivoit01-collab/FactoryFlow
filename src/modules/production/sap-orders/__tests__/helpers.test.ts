import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { batchesMatch, percent, remaining } from '../utils/format';
import { isRepeatPost } from '../utils/postToSap';

describe('SAP order helpers', () => {
  it('knows the server refusing a repeat post from any other failure', () => {
    expect(isRepeatPost({ response: { status: 409, data: { code: 'REPEAT_POST' } } })).toBe(true);
    // SAP did not answer last time: confirmable after checking SAP.
    expect(isRepeatPost({ response: { status: 409, data: { code: 'UNCERTAIN_POST' } } })).toBe(true);
    // Still in flight: never confirmable.
    expect(isRepeatPost({ response: { status: 409, data: { code: 'POSTING_IN_PROGRESS' } } })).toBe(false);
    expect(isRepeatPost({ response: { status: 409, data: {} } })).toBe(false);
    expect(isRepeatPost({ response: { status: 400, data: { code: 'REPEAT_POST' } } })).toBe(false);
    expect(isRepeatPost(new Error('network'))).toBe(false);
  });

  it('checks batches add up to the line', () => {
    expect(batchesMatch(30, [{ quantity: '20' }, { quantity: '10' }])).toBe(true);
    expect(batchesMatch(30, [{ quantity: '20' }])).toBe(false);
  });

  it('never shows a negative remainder or more than 100%', () => {
    expect(remaining(10, 12)).toBe(0);
    expect(remaining(10, 2.5)).toBe(7.5);
    expect(percent(150, 100)).toBe(100);
    expect(percent(5, 0)).toBe(0);
  });
});

describe('production module config — SAP orders', () => {
  const content = readFileSync(resolve(process.cwd(), 'src/modules/production/module.config.tsx'), 'utf-8');

  it('gates both SAP order routes and the sidebar entry on the SAP order rights', () => {
    const entries = content
      .split(/path:\s*'\/production\/sap-orders(?:\/:docEntry)?'/)
      .slice(1)
      .map((rest) => rest.slice(0, rest.indexOf('},')));
    expect(entries).toHaveLength(3);
    for (const entry of entries) expect(entry).toContain('permissions: SAP_ORDER_ACCESS');
  });
});
