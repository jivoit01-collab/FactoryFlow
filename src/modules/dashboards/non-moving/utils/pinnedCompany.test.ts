import { describe, expect, it } from 'vitest';

import { pinnedCompany } from './pinnedCompany';

describe('pinnedCompany', () => {
  it('pins a group company other than the active one', () => {
    expect(pinnedCompany('JIVO_BEVERAGES', 'JIVO_OIL')).toEqual({
      code: 'JIVO_BEVERAGES',
      label: 'Jivo Beverages',
    });
  });

  it('reads the code case-insensitively', () => {
    expect(pinnedCompany(' jivo_beverages ', 'JIVO_OIL')?.code).toBe('JIVO_BEVERAGES');
  });

  it('pins nothing for the active company, an unknown code or no param', () => {
    expect(pinnedCompany('JIVO_OIL', 'JIVO_OIL')).toBeNull();
    expect(pinnedCompany('SOMEWHERE_ELSE', 'JIVO_OIL')).toBeNull();
    expect(pinnedCompany(null, 'JIVO_OIL')).toBeNull();
  });
});
