import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { AdminCostSlice } from '../types';
import { AdminDonut } from './AdminDonut';

function slice(over: Partial<AdminCostSlice> = {}): AdminCostSlice {
  return {
    key: 'labour',
    label: 'Labour',
    bucket: 'LABOUR',
    amount: 856_700,
    has_source: true,
    warning: null,
    share_pct: 14.9,
    detail: '1,318 across 4 of 5 departments over 21 days',
    detail_value: 1318,
    today: 34_450,
    today_detail: '53 on the floors today',
    today_detail_value: 53,
    today_detail_unit: 'in',
    rows: [],
    basis: null,
    ...over,
  };
}

/** The legend row for a cost line, by the label it prints. */
function row(label: string): HTMLElement {
  const node = screen.getByText(label).closest('.adm-lrow');
  if (!node) throw new Error(`no legend row for ${label}`);
  return node as HTMLElement;
}

/** The drawn arcs, in the legend's own order. */
function arcs() {
  return Array.from(document.querySelectorAll<SVGCircleElement>('.adm-arc'));
}

describe('AdminDonut — pairing an arc with its row on hover', () => {
  const THREE = [
    slice(),
    slice({ key: 'electricity', label: 'Electricity', bucket: 'ELECTRICITY', amount: 2_800_044 }),
    slice({
      key: 'maintenance',
      label: 'Maintenance',
      bucket: 'MAINTENANCE',
      amount: 0,
      detail: null,
      today: 0,
      today_detail: null,
      today_detail_value: null,
      today_detail_unit: null,
    }),
  ];

  it('marks an arc and its legend row together, from the arc', () => {
    render(<AdminDonut slices={THREE} total={3_656_744} period="" />);

    // Only the two lines with money have arcs; the nil one is not on the ring.
    expect(arcs()).toHaveLength(2);

    fireEvent.mouseEnter(arcs()[1]);
    expect(arcs()[1].dataset.on).toBe('1');
    expect(arcs()[0].dataset.on).toBeUndefined();
    expect(row('Electricity').dataset.on).toBe('1');
    expect(row('Labour').dataset.on).toBeUndefined();
    // The containers carry the "something is hovered" flag the dimming keys off.
    expect(document.querySelector('.adm-donut')?.getAttribute('data-hover')).toBe('1');
    expect(document.querySelector('.adm-legend')?.getAttribute('data-hover')).toBe('1');

    fireEvent.mouseLeave(arcs()[1]);
    expect(arcs()[1].dataset.on).toBeUndefined();
    expect(document.querySelector('.adm-donut')?.getAttribute('data-hover')).toBeNull();
  });

  it('marks the same pair from the legend row', () => {
    render(<AdminDonut slices={THREE} total={3_656_744} period="" />);

    fireEvent.mouseEnter(row('Labour'));
    expect(arcs()[0].dataset.on).toBe('1');
    expect(row('Labour').dataset.on).toBe('1');
  });

  /*
   * A nil line has no arc. Pairing it with one would point at nothing while
   * dimming the arcs that are really there.
   */
  it('does not respond to a line that is not on the ring', () => {
    render(<AdminDonut slices={THREE} total={3_656_744} period="" />);

    fireEvent.mouseEnter(row('Maintenance'));
    expect(row('Maintenance').dataset.on).toBeUndefined();
    expect(document.querySelector('.adm-legend')?.getAttribute('data-hover')).toBeNull();
  });

  /*
   * THE PROPERTY THAT KEEPS THIS HONEST. Hover is emphasis, not a channel: a
   * figure only reachable by hovering is unreachable on the wall screen this
   * board also runs on, and a hole that swapped the month's total for whatever
   * the pointer grazed would make the tile's headline flicker.
   */
  it('changes nothing the tile was already saying', () => {
    render(<AdminDonut slices={THREE} total={3_656_744} period="1–21 Sept" />);

    const before = document.querySelector('.adm-hole')?.textContent;
    const label = document.querySelector('.adm-donut svg')?.getAttribute('aria-label');

    fireEvent.mouseEnter(arcs()[1]);

    expect(document.querySelector('.adm-hole')?.textContent).toBe(before);
    expect(document.querySelector('.adm-donut svg')?.getAttribute('aria-label')).toBe(label);
    // Every figure is still on the face, hovered or not.
    expect(row('Labour')).toHaveTextContent('₹8.57 L');
    expect(row('Electricity')).toHaveTextContent('₹28.00 L');
  });

  it('keeps the arc’s share identical when it is emphasised', () => {
    render(<AdminDonut slices={THREE} total={3_656_744} period="" />);

    // The dash array is the arc's angular extent — the share it claims. Only
    // the stroke WIDTH may change, and that is the stylesheet's business.
    const dash = arcs()[1].getAttribute('stroke-dasharray');
    const offset = arcs()[1].getAttribute('stroke-dashoffset');
    fireEvent.mouseEnter(arcs()[1]);
    expect(arcs()[1].getAttribute('stroke-dasharray')).toBe(dash);
    expect(arcs()[1].getAttribute('stroke-dashoffset')).toBe(offset);
  });
});

describe('AdminDonut — today, per cost line', () => {
  it("prints today's money beside the month's", () => {
    render(<AdminDonut slices={[slice()]} total={856_700} period="1–21 Sept" />);

    // Both figures on one line, the month in rupees-lakhs and the day in the
    // plain rupees it is still small enough to be read in.
    expect(row('Labour')).toHaveTextContent('₹8.57 L');
    expect(row('Labour')).toHaveTextContent('₹34,450 · 53 in today');
  });

  it('puts the head count beside the money, in the line’s own unit', () => {
    render(<AdminDonut slices={[slice()]} total={856_700} period="" />);

    expect(row('Labour')).toHaveTextContent('₹34,450 · 53 in today');
  });

  it('takes the unit word from the payload rather than the slice key', () => {
    const power = slice({
      key: 'electricity',
      label: 'Electricity',
      bucket: 'ELECTRICITY',
      today: 91_000,
      today_detail_value: 13_204,
      today_detail_unit: 'units',
    });
    render(<AdminDonut slices={[power]} total={2_800_044} period="" />);

    expect(row('Electricity')).toHaveTextContent('₹91,000 · 13,204 units today');
  });

  it('shows the money alone on a line that counts nothing', () => {
    // The salary accrual is a fraction of a monthly bill, not a tally, so there
    // is nothing to put beside it — and "· 0" would be an empty fact.
    const salary = slice({
      key: 'salary',
      label: 'Salary',
      bucket: 'SALARY',
      today: 99_766,
      today_detail_value: null,
      today_detail_unit: null,
    });
    render(<AdminDonut slices={[salary]} total={2_095_083} period="" />);

    expect(row('Salary')).toHaveTextContent('₹99,766 today');
    expect(row('Salary')).not.toHaveTextContent('·');
  });

  it("carries today's unit count in the row's tooltip", () => {
    render(<AdminDonut slices={[slice({ basis: 'Labour is five departments only.' })]} total={856_700} period="" />);

    // The money is on the face; what it is made of is one hover away, with the
    // line's basis, because a rupee figure is not checkable by eye.
    expect(row('Labour').title).toContain('53 on the floors today');
    expect(row('Labour').title).toContain('Labour is five departments only.');
  });

  /*
   * THE CASE THIS COMPONENT EXISTS TO GET RIGHT.
   *
   * Electricity at ₹0 today does not mean the plant drew no power — a meter is
   * read once a day, and a nil almost always means today's reading has not been
   * entered. So the line states that, not "nothing today", which would be a
   * claim about the factory made in order to fill a line.
   */
  it('says why a line with a month behind it is nil today', () => {
    render(
      <AdminDonut
        slices={[
          slice({
            key: 'electricity',
            label: 'Electricity',
            bucket: 'ELECTRICITY',
            amount: 2_800_044,
            detail: '11 Jivo Oil meters · 400,001 units',
            today: 0,
            today_detail: 'no reading entered today',
          }),
        ]}
        total={2_800_044}
        period=""
      />,
    );

    expect(row('Electricity')).toHaveTextContent('no reading entered today');
    expect(row('Electricity')).not.toHaveTextContent('nothing today');
    // Already said on the line, so the tooltip does not repeat it.
    expect(row('Electricity').title).toBe('');
  });

  it('falls back to a plain nil where the server offers no reason', () => {
    render(<AdminDonut slices={[slice({ today: 0, today_detail: null })]} total={856_700} period="" />);

    expect(row('Labour')).toHaveTextContent('nothing today');
  });

  /*
   * A line that is nil for the whole month already says "no rate" or "nil" in
   * its share column. A second nil under it spends a line saying that again.
   */
  it('prints no today line at all on a line that is nil all month', () => {
    render(
      <AdminDonut
        slices={[
          slice({
            key: 'maintenance',
            label: 'Maintenance',
            bucket: 'MAINTENANCE',
            amount: 0,
            share_pct: 0,
            detail: null,
            detail_value: null,
            today: 0,
            today_detail: null,
          }),
        ]}
        total={0}
        period=""
      />,
    );

    expect(row('Maintenance')).toHaveTextContent('nil');
    expect(row('Maintenance')).not.toHaveTextContent('today');
    expect(row('Maintenance').querySelector('.adm-ldet')).toBeNull();
  });
});
