import { describe, it, expect } from 'vitest';
import { ID_PROOF_TYPES } from '@/config/constants/idProof.constants';

// ═══════════════════════════════════════════════════════════════
// ID_PROOF_TYPES
// ═══════════════════════════════════════════════════════════════

describe('ID_PROOF_TYPES', () => {
  it('is an array', () => {
    expect(Array.isArray(ID_PROOF_TYPES)).toBe(true);
  });

  it('has 5 entries', () => {
    expect(ID_PROOF_TYPES).toHaveLength(5);
  });

  it('each entry has value and label properties', () => {
    for (const entry of ID_PROOF_TYPES) {
      expect(entry).toHaveProperty('value');
      expect(entry).toHaveProperty('label');
      expect(typeof entry.value).toBe('string');
      expect(typeof entry.label).toBe('string');
    }
  });

  it('contains Aadhar option', () => {
    expect(ID_PROOF_TYPES.some((t) => t.value === 'Aadhar')).toBe(true);
  });

  it('contains PAN Card option', () => {
    expect(ID_PROOF_TYPES.some((t) => t.value === 'PAN Card')).toBe(true);
  });

  it('contains Driving License option', () => {
    expect(ID_PROOF_TYPES.some((t) => t.value === 'Driving License')).toBe(true);
  });

  it('contains Voter ID option', () => {
    expect(ID_PROOF_TYPES.some((t) => t.value === 'Voter ID')).toBe(true);
  });

  it('contains Other option', () => {
    expect(ID_PROOF_TYPES.some((t) => t.value === 'Other')).toBe(true);
  });
});
