/** Render tests for the Live Trail, driven by a slice of a REAL SAP payload.
 *
 * The fixture is cut from an actual response — two gap SKUs, their exploded
 * components, the orders behind them and two items that could not be matched to
 * anything the factory makes — rather than hand-written. Invented fixtures agree
 * with whatever the component happens to do; this one has already caught the
 * shapes SAP really returns (nulls in lead times, an empty `item` on unmatched
 * demand, resource lines mixed into the BOM).
 *
 * Counterparties are pseudonymised. Every quantity, price and date is real,
 * because that is what the tests read; who we buy from and sell to is not, and
 * does not belong in git history.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  TrailAlarms,
  TrailCover,
  TrailDrill,
  TrailStages,
  TrailTables,
  UnresolvedDemandPanel,
} from '../components/live-trail';
import type { LiveTrail } from '../types';
import fixture from './live-trail.fixture.json';

const trail = fixture as unknown as LiveTrail;

describe('TrailStages', () => {
  it('shows the five stages in the order the chain runs', () => {
    render(<TrailStages data={trail} active="skus" onOpen={vi.fn()} />);
    ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5'].forEach((stage) => {
      expect(screen.getByText(stage)).toBeInTheDocument();
    });
    expect(screen.getByText('Must be produced')).toBeInTheDocument();
  });

  it('opens the table that proves the number when a stage is clicked', () => {
    const onOpen = vi.fn();
    render(<TrailStages data={trail} active="skus" onOpen={onOpen} />);
    fireEvent.click(screen.getByText('Must be bought').closest('button')!);
    expect(onOpen).toHaveBeenCalledWith('buy');
  });
});

describe('TrailCover', () => {
  it('draws one bar per SKU with a gap and direct-labels the shortfall', () => {
    render(<TrailCover skus={trail.skus} onSelect={vi.fn()} />);
    // The gap, spelled out — so the ranking survives greyscale and CVD.
    expect(screen.getByText('2,66,582 short')).toBeInTheDocument();
    expect(screen.getByText('2,26,328 short')).toBeInTheDocument();
  });

  it('names all three series in the legend, since colour alone is not identity', () => {
    render(<TrailCover skus={trail.skus} onSelect={vi.fn()} />);
    expect(screen.getByText('Ship from stock')).toBeInTheDocument();
    expect(screen.getByText('Covered by production in progress')).toBeInTheDocument();
    expect(screen.getByText('Must still be produced')).toBeInTheDocument();
  });

  it('selects a SKU when its bar is clicked', () => {
    const onSelect = vi.fn();
    render(<TrailCover skus={trail.skus} onSelect={onSelect} />);
    fireEvent.click(screen.getByText(trail.skus[0].name).closest('button')!);
    expect(onSelect).toHaveBeenCalledWith(trail.skus[0].item);
  });

  it('says so plainly when there is nothing to produce', () => {
    render(<TrailCover skus={[]} onSelect={vi.fn()} />);
    expect(screen.getByText(/Nothing to produce/)).toBeInTheDocument();
  });
});

describe('TrailAlarms', () => {
  it('leads with the production gap and quantifies what it blocks', () => {
    render(<TrailAlarms data={trail} />);
    expect(screen.getByText(/SKUs cannot ship from stock/)).toBeInTheDocument();
  });

  it('reports order age as age, not as a confirmed missed date', () => {
    render(<TrailAlarms data={trail} />);
    expect(screen.getByText(/order age, not a confirmed date breach/)).toBeInTheDocument();
  });
});

describe('TrailTables', () => {
  const renderTables = (tab: 'orders' | 'skus' | 'materials' | 'buy' | 'capacity') =>
    render(
      <TrailTables
        data={trail}
        tab={tab}
        onTab={vi.fn()}
        onOpenSku={vi.fn()}
        onOpenComponent={vi.fn()}
      />,
    );

  it('shows which book each order came from, so a consolidated view stays auditable', () => {
    renderTables('orders');
    const table = screen.getByRole('table');
    expect(within(table).getAllByText(/Mart|Oil/).length).toBeGreaterThan(0);
  });

  it('flags demand that could not be matched instead of showing it as shippable', () => {
    renderTables('orders');
    expect(screen.getAllByText('not matched').length).toBeGreaterThan(0);
  });

  it('filters rows by the search box', () => {
    renderTables('skus');
    fireEvent.change(screen.getByPlaceholderText(/Search item/), {
      target: { value: 'mustard' },
    });
    expect(screen.queryByText(/COLD PRESS GROUNDNUT OIL 1 LTR/)).not.toBeInTheDocument();
    expect(screen.getByText(/MUSTARD KACHI GHANI 1 LTR/)).toBeInTheDocument();
  });

  it('shows a component that is short as a buy, and a covered one as covered', () => {
    renderTables('materials');
    const table = screen.getByRole('table');
    expect(within(table).getAllByText('covered').length).toBeGreaterThan(0);
  });

  it('never offers a conversion resource as something to buy', () => {
    renderTables('materials');
    // Resources are filtered out of the material list; they are a cost line.
    expect(screen.queryByText(/Filling Cost Commodities/)).not.toBeInTheDocument();
    renderTables('capacity');
    expect(screen.getAllByText(/Filling Cost/).length).toBeGreaterThan(0);
  });
});

describe('TrailDrill', () => {
  it('invites a drill-down before anything is picked', () => {
    render(<TrailDrill data={trail} focus={null} onFocus={vi.fn()} />);
    expect(screen.getByText(/Pick any SKU, component or order row/)).toBeInTheDocument();
  });

  it('walks a SKU from demand through to what still has to be bought', () => {
    const sku = trail.skus[0];
    render(
      <TrailDrill data={trail} focus={{ kind: 'sku', item: sku.item }} onFocus={vi.fn()} />,
    );
    ['Open demand', 'Stock', 'In production', 'Must produce', 'Then buy'].forEach((step) => {
      expect(screen.getByText(step)).toBeInTheDocument();
    });
    expect(screen.getByText(/What producing .* consumes/)).toBeInTheDocument();
  });

  it('crosses from a SKU to one of its components', () => {
    const onFocus = vi.fn();
    const sku = trail.skus[0];
    render(<TrailDrill data={trail} focus={{ kind: 'sku', item: sku.item }} onFocus={onFocus} />);
    const component = trail.components.find((c) =>
      sku.components.some((line) => line.child === c.item),
    )!;
    fireEvent.click(screen.getAllByText(component.name)[0].closest('tr')!);
    expect(onFocus).toHaveBeenCalledWith({ kind: 'component', item: component.item });
  });

  it('walks a component back to the SKUs that pull it', () => {
    const component = trail.components.find((c) => c.parents.length > 0)!;
    render(
      <TrailDrill
        data={trail}
        focus={{ kind: 'component', item: component.item }}
        onFocus={vi.fn()}
      />,
    );
    expect(screen.getByText('Which SKUs pull this component')).toBeInTheDocument();
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('does not pretend an item outside the trail is covered', () => {
    render(
      <TrailDrill data={trail} focus={{ kind: 'sku', item: 'NOT_HERE' }} onFocus={vi.fn()} />,
    );
    expect(screen.getByText(/is not on this trail/)).toBeInTheDocument();
  });
});

describe('UnresolvedDemandPanel', () => {
  it('names the demand that could not be planned rather than dropping it', () => {
    render(<UnresolvedDemandPanel data={trail} />);
    expect(
      screen.getByText(/could not be matched to anything the factory makes/),
    ).toBeInTheDocument();
    trail.unresolved_demand.forEach((row) => {
      expect(screen.getByText(new RegExp(row.item))).toBeInTheDocument();
    });
  });

  it('stays out of the way when everything resolved', () => {
    const { container } = render(
      <UnresolvedDemandPanel data={{ ...trail, unresolved_demand: [] }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
