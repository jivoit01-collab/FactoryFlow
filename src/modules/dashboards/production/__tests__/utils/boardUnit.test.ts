import { describe, expect, it } from 'vitest';

import { nounOf, perNounOf, quantityOf, rateOf } from '../../utils/boardUnit';

describe('quantityOf', () => {
  it('counts in cases by default, naming them what the plant calls them', () => {
    expect(quantityOf('cases', 1_509, 30_180, 'case')).toEqual({ text: '1,509', noun: 'cases' });
  });

  it('switches the figure and its noun together', () => {
    expect(quantityOf('litres', 1_509, 30_180, 'case')).toEqual({ text: '30,180', noun: 'ltr' });
  });

  it('shows a dash, never a zero, where SAP holds no volume', () => {
    // "0 ltr" would read as a line that made nothing, rather than as a SKU
    // whose volume nobody can state — a weight-packed pouch, say.
    expect(quantityOf('litres', 1_509, null, 'case')).toEqual({ text: '—', noun: null });
  });
});

describe('nounOf / perNounOf', () => {
  it('speaks the plant’s word for a case, and "ltr" for litres', () => {
    expect(nounOf('cases', 'case')).toBe('cases');
    expect(nounOf('litres', 'case')).toBe('ltr');
    expect(perNounOf('cases', 'case')).toBe('case');
    expect(perNounOf('litres', 'case')).toBe('ltr');
  });
});

describe('rateOf', () => {
  it('prices a case in whole rupees', () => {
    expect(rateOf('cases', 450_000, 300, 6_000)).toBe('₹1,500');
  });

  it('prices a litre in paise — a rupee either way is a tenth of the rate', () => {
    expect(rateOf('litres', 450_000, 300, 6_000)).toBe('₹75.00');
  });

  it('keeps whole rupees where the litre rate is large enough not to need paise', () => {
    expect(rateOf('litres', 450_000, 300, 1_000)).toBe('₹450');
  });

  it('refuses a rate rather than dividing by nothing', () => {
    expect(rateOf('cases', 450_000, 0, 6_000)).toBeNull();
    expect(rateOf('litres', 450_000, 300, null)).toBeNull();
    expect(rateOf('litres', 450_000, 300, 0)).toBeNull();
  });
});
