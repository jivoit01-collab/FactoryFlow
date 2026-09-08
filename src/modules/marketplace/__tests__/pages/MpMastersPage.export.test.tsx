/**
 * Masters export — the CSV each tab hands over.
 *
 * Drives the real buttons rather than the builders directly, because the part
 * worth guarding is the wiring: the SKU tab must export what the filters leave
 * on screen (not the whole list), and each tab must carry the fields that sit
 * behind its rows.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  ComboDefinition,
  MarketplaceWarehouse,
  SkuMapping,
} from '../../types/marketplace.types';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const MAPPINGS: SkuMapping[] = [
  {
    id: 1,
    channel: 'FLIPKART',
    marketplace_sku: 'Canola 1L',
    fsn: 'EDOGDTNZGDAHUDUJ',
    sku_name: 'Canola 1L',
    sku_type: 'RAW',
    fg_item_code: 'FG0000032',
    fg_item_name: 'COLD PRESS 1 LTR 20 PCS',
    default_uom: 'PCS',
    is_active: true,
    options: [
      { sku_type: 'RAW', fg_item_code: 'FG0000032', is_default: true },
      { label: 'tin', sku_type: 'RAW', fg_item_code: 'FG0000033', is_default: false },
    ],
  },
  {
    id: 2,
    channel: 'FLIPKART',
    // A comma in the name has to survive the round-trip as ONE field.
    marketplace_sku: 'Canola 1+1L',
    fsn: 'EDOFRXTMJGAE9DCT',
    sku_name: 'Canola 1+1L, combo pack',
    sku_type: 'COMBO',
    combo: 39,
    combo_code: 'SL39',
    combo_name: 'Canola 1+1L',
    is_active: false,
    options: [],
  },
];

const COMBOS: ComboDefinition[] = [
  {
    id: 39,
    channel: 'FLIPKART',
    code: 'SL39',
    name: 'Canola 1+1L',
    fsn: 'EDOFRXTMJGAE9DCT',
    marketplace_sku: 'Canola 1+1L',
    is_active: true,
    components: [
      {
        component_type: 'FG',
        item_code: 'FG0000032',
        item_name: 'COLD PRESS 1 LTR 20 PCS',
        quantity: '2',
        uom: 'PCS',
        options: [{ item_code: 'FG0000033', quantity: '2' }],
      },
      { component_type: 'FG', item_code: 'FG0000008', quantity: '1', uom: 'PCS' },
    ],
  },
  // A combo whose components were never filled in must still reach the file.
  { id: 40, channel: 'FLIPKART', code: 'SL40', name: 'Empty', is_active: false, components: [] },
];

const WAREHOUSES: MarketplaceWarehouse[] = [
  {
    id: 7,
    channel: 'FLIPKART',
    name: 'Gupta Godown',
    sap_warehouse_code: 'BH-GPM',
    sap_customer_card_code: 'CUSTA000606',
    facility_code: 'BLR_FC',
    sap_series: '77',
    sap_tax_code: 'GST18',
    sap_branch_id: 2,
    post_goods_issue: true,
    is_default: true,
    is_active: true,
  },
];

vi.mock('../../api/marketplace.queries', () => ({
  useSkuMappings: () => ({ data: MAPPINGS }),
  useCombos: () => ({ data: COMBOS }),
  useMpWarehouses: () => ({ data: WAREHOUSES }),
  useSapWarehouses: () => ({ data: [] }),
  useUpsertSkuMapping: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteSkuMapping: () => ({ mutate: vi.fn(), isPending: false }),
  useUpsertCombo: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteCombo: () => ({ mutate: vi.fn(), isPending: false }),
  useUpsertWarehouse: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteWarehouse: () => ({ mutate: vi.fn(), isPending: false }),
}));

import MpMastersPage from '../../pages/MpMastersPage';

type Download = { blob: Blob; filename: string };

/** Capture the file the page hands to the browser, plus the filename it chose. */
function captureDownloads(): Download[] {
  const captured: Download[] = [];
  let pending: Blob | null = null;
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob: Blob | MediaSource) => {
    pending = blob as Blob;
    return 'blob:masters';
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    if (pending) captured.push({ blob: pending, filename: this.download });
  });
  return captured;
}

/** The download's lines: [header, ...rows]. jsdom's Blob has no `text()`. */
async function linesOf(download: Download): Promise<string[]> {
  const text = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(download.blob);
  });
  return text.split('\n');
}

/** Radix tab triggers switch on mousedown, not click. */
function openTab(name: string) {
  fireEvent.mouseDown(screen.getByRole('tab', { name }));
}

/** The export button of the tab currently on screen. */
function exportButton(): HTMLElement {
  return within(screen.getByRole('tabpanel')).getByRole('button', { name: /Export CSV/ });
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <MpMastersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Masters export', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('exports the SKU mappings the filters leave on screen', async () => {
    const downloads = captureDownloads();
    renderPage();

    // Both mappings are listed, so both are exported.
    expect(exportButton()).toHaveTextContent('Export CSV (2)');
    fireEvent.click(exportButton());
    expect(downloads).toHaveLength(1);
    const [header, ...rows] = await linesOf(downloads[0]);
    expect(header).toContain('Marketplace SKU');
    expect(header).toContain('Variant detail');
    expect(rows).toHaveLength(2);
    // Variants read as "* default | label: item"; the default is starred.
    expect(rows[0]).toContain('* FG0000032 | tin: FG0000033');
    // The comma in the SKU name is quoted, not a new column.
    expect(rows[1]).toContain('"Canola 1+1L, combo pack"');
    expect(rows[1]).toContain('SL39');
    expect(downloads[0].filename).toMatch(/^masters_flipkart_sku-mappings_\d{4}-\d{2}-\d{2}\.csv$/);

    // Narrow to RAW: the export follows the filter, not the full list.
    fireEvent.click(screen.getByRole('button', { name: /^Raw/ }));
    expect(exportButton()).toHaveTextContent('Export CSV (1)');
    fireEvent.click(exportButton());
    expect(downloads).toHaveLength(2);
    const rawRows = (await linesOf(downloads[1])).slice(1);
    expect(rawRows).toHaveLength(1);
    expect(rawRows[0]).toContain('FG0000032');
  });

  it('exports combos one row per component, keeping component-less combos', async () => {
    const downloads = captureDownloads();
    renderPage();

    openTab('Combos');
    expect(exportButton()).toHaveTextContent('Export CSV (2)');
    fireEvent.click(exportButton());

    const [header, ...rows] = await linesOf(downloads[0]);
    expect(header).toContain('Component #');
    // 2 components for SL39 + 1 placeholder row for the empty SL40.
    expect(rows).toHaveLength(3);
    expect(rows[0]).toContain('FG0000032');
    expect(rows[0]).toContain('FG0000033'); // the component's alternative
    expect(rows[1]).toContain('FG0000008');
    expect(rows[2]).toContain('SL40');
    expect(downloads[0].filename).toContain('_combos_');
  });

  it('exports the warehouse links with their posting config', async () => {
    const downloads = captureDownloads();
    renderPage();

    openTab('Warehouses');
    expect(exportButton()).toHaveTextContent('Export CSV (1)');
    fireEvent.click(exportButton());

    const [header, row] = await linesOf(downloads[0]);
    expect(header).toContain('Branch (BPLId)');
    expect(row).toBe('FLIPKART,Gupta Godown,BH-GPM,CUSTA000606,BLR_FC,77,GST18,2,yes,yes,yes');
    expect(downloads[0].filename).toContain('_warehouses_');
  });
});
