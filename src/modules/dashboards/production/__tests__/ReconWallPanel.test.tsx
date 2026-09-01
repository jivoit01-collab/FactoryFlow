import { render, screen } from '@testing-library/react';
import { Boxes } from 'lucide-react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { ThemeProvider } from '@/shared/contexts';

import type { ReconRow } from '../api/reconciliation.api';
import { ReconWallPanel } from '../components/ReconWallPanel';
import type { ReconSlice } from '../hooks';

function row(overrides: Partial<ReconRow> & { sku: string }): ReconRow {
  return {
    item_code: overrides.sku,
    app_qty: 0,
    sap_qty: 0,
    difference: 0,
    difference_pct: 0,
    status: 'MATCHED',
    ...overrides,
  };
}

function slice(overrides: Partial<ReconSlice> = {}): ReconSlice {
  return {
    rows: [],
    produced: 0,
    inProgress: 0,
    sap: 0,
    difference: 0,
    differencePct: 0,
    status: 'MATCHED',
    litres: { perRow: [], app: 0, sap: 0, unknown: 0 },
    isLoading: false,
    isError: false,
    ...overrides,
  };
}

function renderPanel(value: ReconSlice) {
  return render(
    <ThemeProvider>
      <ReconWallPanel
        title="Produced · App vs SAP"
        icon={Boxes}
        hue="match"
        slice={value}
        appLabel="Produced"
        unitNoun="case"
        emptyText="Nothing was produced on this day."
      />
    </ThemeProvider>,
  );
}

// jsdom ships no matchMedia, and ThemeProvider reads it to resolve the "system"
// setting. Stubbed the same way the dispatch wall's suites do it.
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

describe('ReconWallPanel', () => {
  it('ranks the worst disagreement first, not the biggest producer', () => {
    renderPanel(
      slice({
        rows: [
          row({ sku: 'BIG BUT MATCHED', app_qty: 900, sap_qty: 900 }),
          row({
            sku: 'SMALL BUT WRONG',
            app_qty: 40,
            sap_qty: 10,
            difference: 30,
            status: 'MISMATCH',
          }),
        ],
        produced: 940,
        sap: 910,
        difference: 30,
      }),
    );

    const skus = screen.getAllByTitle(/MATCHED|WRONG/).map((node) => node.textContent);
    expect(skus).toEqual(['SMALL BUT WRONG', 'BIG BUT MATCHED']);
  });

  it('shows nothing rather than the app side alone when SAP is unreachable', () => {
    renderPanel(slice({ isError: true, rows: [row({ sku: 'MUSTARD 1 LTR', app_qty: 500 })] }));

    expect(screen.getByText('SAP down')).toBeInTheDocument();
    expect(screen.queryByText('MUSTARD 1 LTR')).not.toBeInTheDocument();
  });

  it('keeps live output out of the produced total and calls it out separately', () => {
    renderPanel(
      slice({
        rows: [row({ sku: 'EXTRA LIGHT OLIVE', app_qty: 0, in_progress: 220 })],
        produced: 0,
        inProgress: 220,
      }),
    );

    // Once as the panel's badge, once on the SKU's own row.
    expect(screen.getAllByText('+220 live')).toHaveLength(2);
    // ...and never folded into the figure SAP is being compared against.
    expect(screen.getByText('Produced · case')).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });
});
