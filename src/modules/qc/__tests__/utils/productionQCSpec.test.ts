/**
 * The form's in/out-of-spec hint predicts the verdict the backend records
 * (`quality_control/services/spec_evaluation.py`), so the two must agree.
 */

import { describe, expect, it } from 'vitest';

import { describeSpec, judgeReading, parseSpecRange } from '@/modules/qc/utils/productionQCSpec';

const spec = (
  standard_value: string,
  overrides: Partial<Parameters<typeof judgeReading>[0]> = {},
) => ({
  standard_value,
  min_value: null,
  max_value: null,
  value_type: 'NUMERIC' as const,
  ...overrides,
});

describe('parseSpecRange', () => {
  it.each([
    ['910±5', { low: 905, high: 915 }],
    ['235+-5.0', { low: 230, high: 240 }],
    ['10.00 +/- 1.00', { low: 9, high: 11 }],
    ['NLT 20 Kgf', { low: 20, high: null }],
    ['NMT 0.5', { low: null, high: 0.5 }],
    ['Max. 125', { low: null, high: 125 }],
    ['58.6-61.7', { low: 58.6, high: 61.7 }],
  ])('reads %s', (text, bounds) => {
    expect(parseSpecRange(text)).toEqual(bounds);
  });

  it.each(['Proper', 'Free from leak', 'Aluminium seal', ''])('finds no bounds in %j', (text) => {
    expect(parseSpecRange(text)).toBeNull();
  });
});

describe('judgeReading', () => {
  it('judges a number against the spec text', () => {
    expect(judgeReading(spec('910±5'), '912')).toBe(true);
    expect(judgeReading(spec('910±5'), '904.9')).toBe(false);
    expect(judgeReading(spec('NLT 20'), '19')).toBe(false);
  });

  it('prefers min / max over the spec text', () => {
    expect(
      judgeReading(spec('910±5', { min_value: '900.0000', max_value: '920.0000' }), '918'),
    ).toBe(true);
    expect(judgeReading(spec('', { max_value: 10 }), '11')).toBe(false);
  });

  it('takes Pass / Fail as the verdict', () => {
    expect(judgeReading(spec('Free from leak', { value_type: 'BOOLEAN' }), 'Pass')).toBe(true);
    expect(judgeReading(spec('Free from leak', { value_type: 'BOOLEAN' }), 'Fail')).toBe(false);
  });

  it('cannot judge an empty reading, text, or a spec with no numbers', () => {
    expect(judgeReading(spec('910±5'), '  ')).toBeNull();
    expect(judgeReading(spec('Proper', { value_type: 'TEXT' }), 'Smudged')).toBeNull();
    expect(judgeReading(spec('Proper'), '12')).toBeNull();
  });
});

describe('describeSpec', () => {
  it('joins the written spec, the bounds and the unit', () => {
    expect(
      describeSpec({ standard_value: '910±5', min_value: '905.0000', max_value: '915', uom: 'g' }),
    ).toBe('910±5 · 905 – 915 g');
    expect(describeSpec({ standard_value: '-', min_value: 20, max_value: null, uom: '' })).toBe(
      '≥ 20',
    );
    expect(describeSpec({ standard_value: '', min_value: null, max_value: null, uom: '' })).toBe(
      '-',
    );
  });
});
