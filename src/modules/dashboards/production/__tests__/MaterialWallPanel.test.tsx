import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { ThemeProvider } from '@/shared/contexts';

import type { MaterialRow } from '../api/reconciliation.api';
import { MaterialWallPanel } from '../components/MaterialWallPanel';
import type { MaterialSlice } from '../hooks';

function row(overrides: Partial<MaterialRow> & { sku: string }): MaterialRow {
  return {
    item_code: overrides.sku,
    should_use: 0,
    app_issued: 0,
    sap_issued: 0,
    difference: 0,
    difference_pct: 0,
    status: 'MATCHED',
    ...overrides,
  };
}

function slice(overrides: Partial<MaterialSlice> = {}): MaterialSlice {
  return {
    rows: [],
    should: 0,
    app: 0,
    sap: 0,
    differencePct: 0,
    status: 'MATCHED',
    isLoading: false,
    isError: false,
    ...overrides,
  };
}

function renderPanel(value: MaterialSlice) {
  return render(
    <ThemeProvider>
      <MaterialWallPanel slice={value} />
    </ThemeProvider>,
  );
}

// jsdom ships no matchMedia, and ThemeProvider reads it to resolve the "system"
// setting. Stubbed the same way the other wall suites do it.
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe('MaterialWallPanel units', () => {
  it('captions the totals with the unit when every row is counted that way', () => {
    renderPanel(
      slice({
        rows: [
          row({ sku: 'LABEL 5 LTR SUNFLOWER FRONT', uom: 'PCS', app_issued: 3200 }),
          row({ sku: 'HDPE BOTTLE 5 LTR', uom: 'PCS', app_issued: 3200 }),
        ],
        should: 2800,
        app: 6400,
        sap: 6400,
      }),
    );

    expect(screen.getByText('Should use · pcs')).toBeInTheDocument();
    expect(screen.getByText('App issued · pcs')).toBeInTheDocument();
    expect(screen.getByText('SAP issued · pcs')).toBeInTheDocument();
  });

  it('refuses to caption a total that adds litres of oil to pieces of label', () => {
    renderPanel(
      slice({
        rows: [
          row({ sku: 'LABEL 5 LTR SUNFLOWER FRONT', uom: 'PCS', app_issued: 3200 }),
          row({ sku: 'SUNFLOWER OIL REFINED', uom: 'LTR', app_issued: 330000 }),
        ],
        should: 300000,
        app: 333200,
        sap: 333200,
      }),
    );

    expect(screen.getByText('App issued · unit')).toBeInTheDocument();

    // ...and the rows carry their own, so the big number cannot be read as
    // bottles. The lakh abbreviation stays "L": 3.3 lakh LITRES of oil.
    const oil = screen.getByTitle('SUNFLOWER OIL REFINED').closest('li');
    expect(oil?.textContent).toContain('3.3 L ltr');
    const label = screen.getByTitle('LABEL 5 LTR SUNFLOWER FRONT').closest('li');
    expect(label?.textContent).toContain('3.2K pcs');
  });

  it('says "unit" rather than guessing pieces when SAP states no UOM', () => {
    renderPanel(
      slice({ rows: [row({ sku: 'MYSTERY COMPONENT', app_issued: 12 })], app: 12, sap: 12 }),
    );

    expect(screen.getByText('App issued · unit')).toBeInTheDocument();
  });
});
