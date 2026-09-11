import { describe, expect, it, vi } from 'vitest';

// The module pulls in the axios client at import time; the precedence rules
// under test are pure, so stub it out rather than standing up a real client.
vi.mock('@/core/api', () => ({ apiClient: { get: vi.fn() } }));

import { resolveSupportContact } from '../../hooks/useSupportContact';

const SERVED = { phone: '+91 1111111111', dial: '+911111111111' };
const REMEMBERED = { phone: '+91 2222222222', dial: '+912222222222' };
const FALLBACK = { phone: '+91 3333333333', dial: '+913333333333' };

describe('resolveSupportContact', () => {
  it('shows the number the server just served', () => {
    expect(resolveSupportContact(SERVED, REMEMBERED, FALLBACK)).toEqual({
      phone: SERVED.phone,
      telHref: 'tel:+911111111111',
    });
  });

  it('treats a blank number from the server as "no support line"', () => {
    // The admin took it down on purpose. Falling back to a remembered number
    // here would keep publishing a line nobody answers.
    expect(resolveSupportContact({ phone: '', dial: '' }, REMEMBERED, FALLBACK)).toBeNull();
  });

  it('falls back to the last number served while the server is silent', () => {
    expect(resolveSupportContact(undefined, REMEMBERED, FALLBACK)).toEqual({
      phone: REMEMBERED.phone,
      telHref: 'tel:+912222222222',
    });
  });

  it('falls back to the build-time number on a browser that has never fetched', () => {
    expect(resolveSupportContact(undefined, null, FALLBACK)).toEqual({
      phone: FALLBACK.phone,
      telHref: 'tel:+913333333333',
    });
  });

  it('reports nothing when a payload is half-filled', () => {
    expect(resolveSupportContact({ phone: '+91 123', dial: '' }, null, FALLBACK)).toBeNull();
  });
});
