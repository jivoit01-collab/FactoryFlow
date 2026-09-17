import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, useNavigate: () => navigate };
});

const held: { permissions: string[] } = { permissions: [] };
vi.mock('@/core/auth/hooks/usePermission', () => ({
  usePermission: () => ({
    hasPermission: (permission: string) => held.permissions.includes(permission),
    hasAnyPermission: (required: readonly string[]) =>
      required.some((permission) => held.permissions.includes(permission)),
  }),
}));

// The page half is local, synchronous and tested in pageSearch.test.ts. Here
// it is stubbed so these tests stay about the dialog -- and because the real
// hook reaches Redux for the current company, which this suite has no store
// for.
const pageHits: { value: PageHit[] } = { value: [] };
vi.mock('../hooks/usePageSearch', () => ({
  usePageSearch: (query: string) => (query ? pageHits.value : []),
}));

const search = vi.fn();
const document_ = vi.fn();
vi.mock('../api/universalSearch.api', () => ({
  universalSearchApi: {
    search: (...args: unknown[]) => search(...args),
    document: (...args: unknown[]) => document_(...args),
    itemStock: vi.fn(),
  },
}));

import { UNIVERSAL_SEARCH_PERMISSIONS } from '@/config/permissions';

import type { CompanyResults, UniversalSearchResult } from '../api';
import type { PageHit } from '../utils/pageSearch';
import { UniversalSearchButton } from '../components/UniversalSearchButton';
import { UniversalSearchDialog } from '../components/UniversalSearchDialog';

function company(overrides: Partial<CompanyResults> = {}): CompanyResults {
  return {
    company_code: 'JIVO_OIL',
    company_name: 'Jivo Oil',
    documents: [],
    app_records: [],
    items: [],
    batches: [],
    total: 0,
    error: '',
    ...overrides,
  };
}

const INVOICE = {
  kind: 'AR_INVOICE' as const,
  label: 'A/R Invoice',
  obj_type: '13',
  doc_entry: 80341,
  doc_num: 626090411,
  doc_date: '2026-09-16',
  card_code: 'CUSTA000606',
  card_name: 'JIVO MART PVT LTD',
  partner_label: 'Customer',
  doc_total: 1512000,
  currency: 'INR',
  status: 'Open',
  is_cancelled: false,
  ref_no: '926224503',
};

function pageHit(title: string, path: string, section = ''): PageHit {
  return {
    entry: {
      path,
      title,
      section,
      permissions: [],
      companies: [],
      modulePrefix: undefined,
      tier: 'NAV',
      terms: [],
    },
    score: 100,
    matched: [],
  };
}

function result(companies: CompanyResults[]): UniversalSearchResult {
  return {
    term: '626090411',
    companies,
    total: companies.reduce((sum, one) => sum + one.total, 0),
  };
}

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <UniversalSearchDialog open onOpenChange={vi.fn()} />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

async function typeTerm(term: string) {
  fireEvent.change(screen.getByPlaceholderText(/bill number/i), {
    target: { value: term },
  });
}

describe('UniversalSearchDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    held.permissions = [UNIVERSAL_SEARCH_PERMISSIONS.USE];
    pageHits.value = [];
    search.mockResolvedValue(result([company()]));
  });

  it('asks for something before searching anything', () => {
    renderDialog();

    expect(screen.getByText('Type to search')).toBeInTheDocument();
    expect(search).not.toHaveBeenCalled();
  });

  it('does not search on a single character', async () => {
    renderDialog();

    await typeTerm('6');

    await new Promise((resolve) => setTimeout(resolve, 450));
    expect(search).not.toHaveBeenCalled();
  });

  it('searches once the term is long enough', async () => {
    renderDialog();

    await typeTerm('626090411');

    await waitFor(() => expect(search).toHaveBeenCalledWith('626090411', expect.anything()));
  });

  it('groups the hits by company', async () => {
    search.mockResolvedValue(
      result([
        company({ documents: [INVOICE], total: 1 }),
        company({
          company_code: 'JIVO_MART',
          company_name: 'Jivo Mart',
          documents: [{ ...INVOICE, doc_entry: 12, label: 'Purchase Order', kind: 'PURCHASE_ORDER' }],
          total: 1,
        }),
      ]),
    );
    renderDialog();

    await typeTerm('626090411');

    // The same number is a different document in each company; the search
    // shows both rather than picking one.
    await waitFor(() => expect(screen.getByText('Jivo Oil')).toBeInTheDocument());
    expect(screen.getByText('Jivo Mart')).toBeInTheDocument();
    expect(screen.getByText('A/R Invoice')).toBeInTheDocument();
    expect(screen.getByText('Purchase Order')).toBeInTheDocument();
  });

  it('says when a company could not be reached, rather than reading as empty', async () => {
    search.mockResolvedValue(
      result([company({ error: 'SAP did not answer for this company.', total: 0 })]),
    );
    renderDialog();

    await typeTerm('626090411');

    await waitFor(() =>
      expect(screen.getByText(/SAP did not answer for this company/)).toBeInTheDocument(),
    );
  });

  it('names the companies it searched when nothing is found', async () => {
    pageHits.value = [];
    search.mockResolvedValue(result([company(), company({ company_name: 'Jivo Mart' })]));
    renderDialog();

    await typeTerm('626090411');

    await waitFor(() => expect(screen.getByText('Nothing found')).toBeInTheDocument());
    expect(screen.getByText(/Jivo Oil, Jivo Mart/)).toBeInTheDocument();
  });

  it('opens a document into its lines and comes back', async () => {
    search.mockResolvedValue(result([company({ documents: [INVOICE], total: 1 })]));
    document_.mockResolvedValue({
      ...INVOICE,
      lines: [
        {
          line_num: 0,
          item_code: 'FG-OLIVE-1L',
          description: 'JIVO OLIVE OIL 1 LTR',
          quantity: 240,
          unit: 'PCS',
          warehouse: 'BH-BT',
          price: 6300,
          line_total: 1512000,
          open_quantity: 0,
        },
      ],
    });
    renderDialog();
    await typeTerm('626090411');
    await waitFor(() => expect(screen.getByText('A/R Invoice')).toBeInTheDocument());

    fireEvent.click(screen.getByText('A/R Invoice'));

    await waitFor(() => expect(screen.getByText('FG-OLIVE-1L')).toBeInTheDocument());
    // Fetched by DocEntry, which is the real key -- DocNum repeats per series.
    expect(document_).toHaveBeenCalledWith('JIVO_OIL', 'AR_INVOICE', 80341);

    fireEvent.click(screen.getByText('Back to results'));
    await waitFor(() => expect(screen.getByText('Jivo Oil')).toBeInTheDocument());
  });

  it('navigates to the module that owns an app record', async () => {
    search.mockResolvedValue(
      result([
        company({
          app_records: [
            {
              kind: 'BST',
              label: 'Branch stock transfer',
              id: 42,
              entry_no: 'BST-0001',
              summary: 'BH-BT -> DP-HR',
              status: 'SEALED',
              matched_on: 'Inventory transfer',
              route: '/warehouse/bst/42',
            },
          ],
          total: 1,
        }),
      ]),
    );
    renderDialog();
    await typeTerm('4455');
    await waitFor(() => expect(screen.getByText('BST-0001')).toBeInTheDocument());

    fireEvent.click(screen.getByText('BST-0001'));

    expect(navigate).toHaveBeenCalledWith('/warehouse/bst/42');
  });

  it('offers matching screens, above the SAP results', async () => {
    pageHits.value = [pageHit('Material GRPO', '/warehouse/grpo/material', 'Warehouse')];
    renderDialog();

    await typeTerm('material grpo');

    await waitFor(() => expect(screen.getByText('Pages')).toBeInTheDocument());
    expect(screen.getByText('Material GRPO')).toBeInTheDocument();
  });

  it('opens a screen when it is clicked', async () => {
    pageHits.value = [pageHit('Material GRPO', '/warehouse/grpo/material', 'Warehouse')];
    renderDialog();
    await typeTerm('material grpo');
    await waitFor(() => expect(screen.getByText('Material GRPO')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Material GRPO'));

    expect(navigate).toHaveBeenCalledWith('/warehouse/grpo/material');
  });

  it('opens the first screen on Enter, without touching the mouse', async () => {
    pageHits.value = [
      pageHit('Material GRPO', '/warehouse/grpo/material', 'Warehouse'),
      pageHit('Finished Goods GRPO', '/warehouse/grpo/fg', 'Warehouse'),
    ];
    renderDialog();
    await typeTerm('grpo');

    fireEvent.keyDown(screen.getByPlaceholderText(/bill number/i), { key: 'Enter' });

    expect(navigate).toHaveBeenCalledWith('/warehouse/grpo/material');
  });

  it('walks the list with the arrow keys', async () => {
    pageHits.value = [
      pageHit('Material GRPO', '/warehouse/grpo/material', 'Warehouse'),
      pageHit('Finished Goods GRPO', '/warehouse/grpo/fg', 'Warehouse'),
    ];
    renderDialog();
    await typeTerm('grpo');
    const input = screen.getByPlaceholderText(/bill number/i);

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(navigate).toHaveBeenCalledWith('/warehouse/grpo/fg');
  });

  it('does not send a whole question to three company databases', async () => {
    pageHits.value = [pageHit('Material GRPO', '/warehouse/grpo/material', 'Warehouse')];
    renderDialog();

    await typeTerm('where do i put the material grpo');

    await new Promise((resolve) => setTimeout(resolve, 450));
    expect(search).not.toHaveBeenCalled();
    // The screen was still found, which is the whole point.
    expect(screen.getByText('Material GRPO')).toBeInTheDocument();
  });

  it('still answers with screens when SAP fails', async () => {
    pageHits.value = [pageHit('Material GRPO', '/warehouse/grpo/material', 'Warehouse')];
    search.mockRejectedValue(new Error('SAP is down'));
    renderDialog();

    await typeTerm('grpo');

    await waitFor(() => expect(screen.getByText('Material GRPO')).toBeInTheDocument());
  });

  it('says why nothing came back when SAP was deliberately not asked', async () => {
    pageHits.value = [];
    renderDialog();

    await typeTerm('where do i put the flux capacitor');

    await waitFor(() => expect(screen.getByText('Nothing found')).toBeInTheDocument());
    expect(screen.getByText(/SAP was not asked/)).toBeInTheDocument();
  });

  it('says why an app record matched', async () => {
    search.mockResolvedValue(
      result([
        company({
          app_records: [
            {
              kind: 'BST',
              label: 'Branch stock transfer',
              id: 42,
              entry_no: 'BST-0001',
              summary: 'BH-BT -> DP-HR',
              status: '',
              matched_on: 'Invoice on the transfer',
              route: '/warehouse/bst/42',
            },
          ],
          total: 1,
        }),
      ]),
    );
    renderDialog();

    await typeTerm('4455');

    await waitFor(() =>
      expect(screen.getByText(/matched on Invoice on the transfer/)).toBeInTheDocument(),
    );
  });
});

describe('UniversalSearchButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    search.mockResolvedValue(result([company()]));
  });

  function renderButton() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <UniversalSearchButton />
        </QueryClientProvider>
      </MemoryRouter>,
    );
  }

  it('is hidden from a user without the right', () => {
    held.permissions = [];

    renderButton();

    expect(screen.queryByLabelText('Search')).not.toBeInTheDocument();
  });

  it('is shown to a user who holds it', () => {
    held.permissions = [UNIVERSAL_SEARCH_PERMISSIONS.USE];

    renderButton();

    expect(screen.getByLabelText('Search')).toBeInTheDocument();
  });

  it('opens on Ctrl+K', async () => {
    held.permissions = [UNIVERSAL_SEARCH_PERMISSIONS.USE];
    renderButton();

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    await waitFor(() =>
      expect(screen.getByPlaceholderText(/bill number/i)).toBeInTheDocument(),
    );
  });

  it('does not bind the shortcut for a user without the right', () => {
    held.permissions = [];
    renderButton();

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    expect(screen.queryByPlaceholderText(/bill number/i)).not.toBeInTheDocument();
  });
});
