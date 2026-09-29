import { describe, it, expect } from 'vitest';

import { editNameSchema, FULL_NAME_MAX_LENGTH } from '../../schemas/editName.schema';

describe('Edit Name Schema', () => {
  it('accepts an ordinary name', () => {
    const result = editNameSchema.safeParse({ full_name: 'Asha Kaur' });
    expect(result.success).toBe(true);
  });

  it('trims the surrounding spaces', () => {
    const result = editNameSchema.safeParse({ full_name: '  Asha Kaur  ' });
    expect(result.success && result.data.full_name).toBe('Asha Kaur');
  });

  it('rejects an empty name', () => {
    const result = editNameSchema.safeParse({ full_name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a name that is only spaces', () => {
    const result = editNameSchema.safeParse({ full_name: '    ' });
    expect(result.success).toBe(false);
  });

  it('matches the width of the backend column', () => {
    expect(FULL_NAME_MAX_LENGTH).toBe(150);
  });

  it('accepts a name at the limit', () => {
    const result = editNameSchema.safeParse({ full_name: 'A'.repeat(FULL_NAME_MAX_LENGTH) });
    expect(result.success).toBe(true);
  });

  it('rejects a name over the limit', () => {
    const result = editNameSchema.safeParse({ full_name: 'A'.repeat(FULL_NAME_MAX_LENGTH + 1) });
    expect(result.success).toBe(false);
  });
});
