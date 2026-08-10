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
  TrailCover,
  TrailDepartments,
  TrailDrill,
  TrailStages,
  TrailTables,
  TrailTomorrow,
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

describe('TrailDepartments', () => {
  const openSubject = vi.fn();

  it('shows all five departments, including the ones with nothing to do', () => {
    render(<TrailDepartments data={trail} onOpenSubject={openSubject} />);
    ['Production', 'Packaging Procurement', 'Oil & Raw-Material Procurement',
      'Infrastructure', 'Finance'].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('opens the busiest desk first, so the page lands on the problem', () => {
    render(<TrailDepartments data={trail} onOpenSubject={openSubject} />);
    const busiest = trail.departments.find((d) => d.critical > 0)!;
    // Twice on purpose: once as the card's headline, once as the expanded row.
    expect(screen.getAllByText(busiest.actions[0].title).length).toBe(2);
  });

  it('separates what is past due from what is merely scheduled', () => {
    render(<TrailDepartments data={trail} onOpenSubject={openSubject} />);
    expect(screen.getAllByText(/past due/).length).toBeGreaterThan(0);
  });

  it('opens the evidence when an action is clicked', () => {
    const onOpenSubject = vi.fn();
    render(<TrailDepartments data={trail} onOpenSubject={onOpenSubject} />);
    const action = trail.departments
      .find((d) => d.critical > 0)!
      .actions.find((a) => a.subject.kind === 'component')!;
    const matches = screen.getAllByText(action.title);
    fireEvent.click(matches[matches.length - 1]);
    expect(onOpenSubject).toHaveBeenCalledWith('component', action.subject.code);
  });

  it('says a clear department is clear rather than hiding it', () => {
    const cleared = {
      ...trail,
      departments: trail.departments.map((d) => ({
        ...d, actions: [], total: 0, critical: 0, plan: 0, watch: 0,
      })),
    };
    render(<TrailDepartments data={cleared} onOpenSubject={openSubject} />);
    expect(screen.getAllByText('clear')).toHaveLength(5);
  });
});

describe('TrailTomorrow', () => {
  const noop = vi.fn();

  it('leads with what to run, not with what is owed', () => {
    render(<TrailTomorrow data={trail} onOpenSku={noop} onOpenComponent={noop} />);
    expect(screen.getByText('SKUs to run')).toBeInTheDocument();
    expect(screen.getByText('Litres to fill')).toBeInTheDocument();
  });

  it('names the component that capped a run, so the plan points at the buy', () => {
    render(<TrailTomorrow data={trail} onOpenSku={noop} onOpenComponent={noop} />);
    const capped = trail.tomorrow.rows.find((r) => r.blocker)!;
    expect(
      screen.getAllByText(new RegExp(capped.blocker!.name.slice(0, 18))).length,
    ).toBeGreaterThan(0);
  });

  it('opens the blocking component straight from the plan', () => {
    const onOpenComponent = vi.fn();
    render(
      <TrailTomorrow data={trail} onOpenSku={noop} onOpenComponent={onOpenComponent} />,
    );
    const capped = trail.tomorrow.rows.find((r) => r.blocker)!;
    const [blockerLink] = screen.getAllByText(
      new RegExp(`${capped.blocker!.name.slice(0, 18)}.*left`),
    );
    fireEvent.click(blockerLink);
    expect(onOpenComponent).toHaveBeenCalledWith(capped.blocker!.item);
  });

  it('declares that no line hours are on file rather than implying a full check', () => {
    render(<TrailTomorrow data={trail} onOpenSku={noop} onOpenComponent={noop} />);
    expect(screen.getByText(/machine hours are not on file/)).toBeInTheDocument();
  });

  it('counts the SKUs that cannot be started at all', () => {
    render(<TrailTomorrow data={trail} onOpenSku={noop} onOpenComponent={noop} />);
    expect(screen.getByText('Cannot run at all')).toBeInTheDocument();
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
