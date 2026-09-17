import { describe, expect, it } from 'vitest';

import { shortWarehouseTags } from './warehouseTag';

describe('shortWarehouseTags', () => {
  it('keeps the word that tells the two warehouses apart', () => {
    const tags = shortWarehouseTags([
      { warehouseId: 'wh-1', name: 'Gupta Godown' },
      { warehouseId: 'wh-2', name: 'Bhakharpur Basement' },
    ]);

    expect(tags.get('wh-1')).toBe('Gupta');
    expect(tags.get('wh-2')).toBe('Basement');
  });

  it('leaves a one-word name alone', () => {
    const tags = shortWarehouseTags([{ warehouseId: 'wh-1', name: 'Bhakharpur' }]);

    expect(tags.get('wh-1')).toBe('Bhakharpur');
  });

  it('keeps the phrase when the last word is a number or an initial', () => {
    const tags = shortWarehouseTags([
      { warehouseId: 'wh-1', name: 'Jaipur Unit 2' },
      { warehouseId: 'wh-2', name: 'Gupta Godown B' },
    ]);

    expect(tags.get('wh-1')).toBe('Jaipur 2');
    expect(tags.get('wh-2')).toBe('Gupta B');
  });

  it('falls back to full names when two would shorten alike', () => {
    const tags = shortWarehouseTags([
      { warehouseId: 'wh-1', name: 'Bhakharpur Basement' },
      { warehouseId: 'wh-2', name: 'Gupta Basement' },
      { warehouseId: 'wh-3', name: 'Gupta Godown' },
    ]);

    expect(tags.get('wh-1')).toBe('Bhakharpur Basement');
    expect(tags.get('wh-2')).toBe('Gupta Basement');
    expect(tags.get('wh-3')).toBe('Gupta');
  });
});
