import { afterEach, describe, expect, it, vi } from 'vitest';

import { createWmsId } from '../utils';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createWmsId', () => {
  it('returns a syntactically valid v4 UUID', () => {
    expect(createWmsId()).toMatch(UUID_RE);
  });

  it('returns unique ids across many calls', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => createWmsId()));
    expect(ids.size).toBe(1000);
  });

  it('still generates an id when crypto.randomUUID is unavailable (non-secure context)', () => {
    // Simulate plain-HTTP / LAN-IP browsers where randomUUID is undefined but
    // getRandomValues still works. This is the case the fallback fixes.
    vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => {
      throw new TypeError('crypto.randomUUID is not a function');
    });
    expect(createWmsId()).toMatch(UUID_RE);
  });
});
