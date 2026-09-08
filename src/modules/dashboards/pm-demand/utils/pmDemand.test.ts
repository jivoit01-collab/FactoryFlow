import { describe, expect, it } from 'vitest';

import {
  defaultPmDemandFilters,
  defaultPmDemandRange,
  PM_DEMAND_BOARDS,
} from '../constants';
import type { PmDemandItem } from '../types';
import {
  buildFunnel,
  collectSubGroups,
  COVER_LABELS,
  describeCover,
  filterPmItems,
  formatCover,
  formatInrCompact,
  formatPct,
  formatQty,
  varianceTone,
} from './pmDemand';

function makeItem(overrides: Partial<PmDemandItem> = {}): PmDemandItem {
  return {
    item_code: 'PM0000085',
    item_name: 'CAPS 1 OR 2 LTR WHITE AND YELLOW WITH LOGO',
    sub_group: 'CAPS',
    uom: 'PCS',
    unit_price: 1.29,
    in_house: false,
    in_house_qty: 0,
    consumed_qty: 570331,
    consumed_value: 735727,
    bom_qty: 516323,
    bom_value: 666057,
    variance_qty: 54008,
    variance_value: 69670,
    variance_pct: 10.46,
    wastage_qty: 7282,
    wastage_value: 9394,
    dispatched_qty: 514259,
    dispatched_value: 663394,
    retained_qty: 56072,
    retained_value: 72333,
    per_1000_fg: 325.2,
    share_pct: 2.6,
    stock_qty: 285000,
    stock_value: 367650,
    avg_daily_qty: 21936,
    days_cover: 13,
    days_cover_incl_po: 66,
    open_po_qty: 1148000,
    open_po_lines: 5,
    open_po_earliest_due: '2026-06-11',
    open_po_overdue: true,
    cover_status: 'ok',
    ...overrides,
  };
}

describe('formatQty', () => {
  it('carries the unit, because a bare number on this board is ambiguous', () => {
    expect(formatQty(570331, 'PCS')).toBe('5,70,331 PCS');
    expect(formatQty(97300, 'MTR')).toBe('97,300 MTR');
  });

  it('keeps decimals on sub-unit quantities that would otherwise round away', () => {
    expect(formatQty(0.05, 'KGS')).toBe('0.05 KGS');
  });

  it('omits the unit when there is not one', () => {
    expect(formatQty(1200)).toBe('1,200');
  });
});

describe('formatInrCompact', () => {
  it('speaks crore and lakh', () => {
    expect(formatInrCompact(28248575)).toBe('₹2.82 Cr');
    expect(formatInrCompact(735727)).toBe('₹7.36 L');
  });

  it('falls back to plain rupees below a lakh', () => {
    expect(formatInrCompact(8400)).toBe('₹8,400');
  });

  it('keeps the sign, because a negative variance is money saved', () => {
    expect(formatInrCompact(-12500000)).toBe('-₹1.25 Cr');
  });
});

describe('formatPct', () => {
  it('signs an over-consumption so the direction is unmissable', () => {
    expect(formatPct(10.46)).toBe('+10.5%');
    expect(formatPct(-3.2)).toBe('-3.2%');
  });

  it('renders a missing variance as a dash rather than NaN', () => {
    expect(formatPct(null)).toBe('--');
  });
});

describe('varianceTone', () => {
  it('treats a sub-1% gap as agreement, since SAP backflushes off the BOM', () => {
    expect(varianceTone(makeItem({ variance_pct: 0.4 }))).toBe('match');
    expect(varianceTone(makeItem({ variance_pct: -0.9 }))).toBe('match');
  });

  it('flags real over- and under-issue', () => {
    expect(varianceTone(makeItem({ variance_pct: 10.46 }))).toBe('over');
    expect(varianceTone(makeItem({ variance_pct: -8 }))).toBe('under');
  });

  it('says nothing about an item no recipe calls for', () => {
    expect(varianceTone(makeItem({ variance_pct: null }))).toBe('unknown');
  });
});

describe('filterPmItems', () => {
  const items = [
    makeItem(),
    makeItem({ item_code: 'PM0000020', item_name: 'LABEL 1 LTR KACHCHI GHANI FRONT', sub_group: 'LABEL' }),
    makeItem({ item_code: 'PM0000075', item_name: 'TAPE LOGO PRINTED', sub_group: '' }),
  ];

  it('matches on code, name and family', () => {
    expect(filterPmItems(items, { search: 'kachchi' }).map((i) => i.item_code)).toEqual([
      'PM0000020',
    ]);
    expect(filterPmItems(items, { search: 'PM0000075' }).map((i) => i.item_code)).toEqual([
      'PM0000075',
    ]);
    expect(filterPmItems(items, { search: 'caps' }).map((i) => i.item_code)).toEqual([
      'PM0000085',
    ]);
  });

  it('buckets an un-grouped item under UNGROUPED rather than losing it', () => {
    expect(filterPmItems(items, { subGroup: ['UNGROUPED'] }).map((i) => i.item_code)).toEqual([
      'PM0000075',
    ]);
  });

  it('leaves the rows alone when nothing is asked for', () => {
    expect(filterPmItems(items, {})).toHaveLength(3);
  });

  it('does not restate the shares it filtered, so a family is not 100%', () => {
    const capsOnly = filterPmItems(items, { subGroup: ['CAPS'] });
    expect(capsOnly[0].share_pct).toBe(2.6);
  });
});

describe('collectSubGroups', () => {
  it('gathers families across every list, sorted, with UNGROUPED for the blanks', () => {
    expect(
      collectSubGroups(
        [makeItem({ sub_group: 'LABEL' }), makeItem({ sub_group: '' })],
        [makeItem({ sub_group: 'CAPS' })],
        undefined,
      ),
    ).toEqual(['CAPS', 'LABEL', 'UNGROUPED']);
  });
});

describe('buildFunnel', () => {
  it('splits one item into consumed, shipped and still-in-stock', () => {
    const stages = buildFunnel(makeItem());
    expect(stages.map((s) => s.key)).toEqual(['consumed', 'dispatched', 'retained']);
    expect(stages[0].pctOfConsumed).toBe(100);
    expect(stages[1].pctOfConsumed).toBe(90.2);
  });

  it('relabels the last stage when the period shipped more than it made', () => {
    const stages = buildFunnel(
      makeItem({ consumed_qty: 600, dispatched_qty: 700, retained_qty: -100 }),
    );
    expect(stages[2].label).toBe('Drawn from finished-goods stock');
    expect(stages[2].qty).toBe(-100);
    // the bar is drawn from the magnitude, the figure keeps its sign
    expect(stages[2].pctOfConsumed).toBe(16.7);
  });

  it('does not divide by zero for an item with no movement at all', () => {
    const stages = buildFunnel(
      makeItem({ consumed_qty: 0, dispatched_qty: 0, retained_qty: 0 }),
    );
    expect(stages.every((s) => s.pctOfConsumed === 0)).toBe(true);
  });
});

describe('formatCover', () => {
  it('spells out working days, so nobody counts it on a calendar', () => {
    expect(formatCover(13)).toBe('13 working days');
    expect(formatCover(52)).toBe('52 working days');
  });

  it('keeps a decimal where the difference matters', () => {
    expect(formatCover(6.4)).toBe('6.4 working days');
  });

  it('does not pretend a part-day is a day', () => {
    expect(formatCover(0.3)).toBe('<1 working day');
    expect(formatCover(0)).toBe('<1 working day');
  });

  it('caps an absurd figure rather than printing it', () => {
    expect(formatCover(9999)).toBe('400+ working days');
  });

  it('renders no burn rate as a dash, not as zero cover', () => {
    expect(formatCover(null)).toBe('--');
  });
});

describe('COVER_LABELS', () => {
  it('tells the buyer what to do, not what the number is', () => {
    expect(COVER_LABELS.critical).toBe('Order now');
    expect(COVER_LABELS.low).toBe('Watch');
    expect(COVER_LABELS.ok).toBe('Covered');
  });

  it('does not claim an unconsumed item is covered', () => {
    expect(COVER_LABELS.unknown).toBe('Not consumed');
  });
});

describe('describeCover', () => {
  it('names both figures, so a thin shelf under a green badge makes sense', () => {
    expect(describeCover(makeItem())).toBe(
      '13 working days on hand, 66 working days with open orders',
    );
  });

  it('says plainly when nothing is on order -- the real alarm', () => {
    expect(
      describeCover(makeItem({ open_po_qty: 0, days_cover_incl_po: 13 })),
    ).toBe('13 working days on hand, nothing on order');
  });

  it('does not invent cover for an item nothing consumed', () => {
    expect(
      describeCover(makeItem({ days_cover: null, days_cover_incl_po: null })),
    ).toBe('Nothing consumed this period');
  });
});

describe('defaultPmDemandFilters', () => {
  it('opens on SAP, because that is the system of record', () => {
    expect(defaultPmDemandFilters(new Date('2026-09-08T00:00:00Z')).source).toBe('sap');
  });
});

describe('PM_DEMAND_BOARDS', () => {
  it('renames the production heading when the basis is the approved BOM', () => {
    expect(PM_DEMAND_BOARDS.production.issued.label).toBe('Consumed in production');
    expect(PM_DEMAND_BOARDS.production.approved.label).toBe('Approved to production');
  });

  it('warns in the approved description that it is not the actual issue', () => {
    expect(PM_DEMAND_BOARDS.production.approved.description).toContain('not what the line issued');
  });
});

describe('defaultPmDemandRange', () => {
  it('opens on the month just gone, which is the period people want', () => {
    expect(defaultPmDemandRange(new Date('2026-09-08T00:00:00Z'))).toEqual({
      date_from: '2026-08-01',
      date_to: '2026-08-31',
    });
  });

  it('rolls back over a year boundary', () => {
    expect(defaultPmDemandRange(new Date('2026-01-15T00:00:00Z'))).toEqual({
      date_from: '2025-12-01',
      date_to: '2025-12-31',
    });
  });

  it('gets February right', () => {
    expect(defaultPmDemandRange(new Date('2028-03-02T00:00:00Z'))).toEqual({
      date_from: '2028-02-01',
      date_to: '2028-02-29',
    });
  });
});
