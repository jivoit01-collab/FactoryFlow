/**
 * QA report types, one thing per screen: the list shows the document types
 * only, and a type opens on its own page with its parameters. Types are not
 * tied to products, so neither screen shows any.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductionParameterType } from '@/modules/qc/types/productionQC.types';

const data = vi.hoisted(() => ({
  types: [] as ProductionParameterType[],
  defaults: [] as unknown[],
  updateType: null as unknown as ReturnType<typeof vi.fn>,
}));

const mutation = () => ({ mutateAsync: vi.fn(), isPending: false });

vi.mock('@/modules/qc/api/productionQC/productionQC.queries', () => ({
  useProductionParameterTypes: () => ({
    data: data.types,
    isLoading: false,
    isFetching: false,
    error: null,
  }),
  useProductionParameterType: (id: number | null) => {
    const found = data.types.find((t) => t.id === id);
    return { data: found, isLoading: false, error: found ? null : new Error('404') };
  },
  useProductionParameters: () => ({ data: [], isLoading: false }),
  useCreateProductionParameterType: mutation,
  useUpdateProductionParameterType: () => ({ mutateAsync: data.updateType, isPending: false }),
  useDeleteProductionParameterType: mutation,
  useCreateProductionParameter: mutation,
  useUpdateProductionParameter: mutation,
  useDeleteProductionParameter: mutation,
  useProductionParameterTypeDefaults: () => ({ data: data.defaults, isLoading: false }),
  useDeleteProductionParameterTypeDefault: mutation,
}));
vi.mock('@/modules/qc/components/qcSections', () => ({ ProductionQCTabs: () => null }));

const { default: ProductionParameterTypesPage } =
  await import('../../../pages/productionQC/ProductionParameterTypesPage');
const { default: ProductionParameterTypePage } =
  await import('../../../pages/productionQC/ProductionParameterTypePage');

const type = (id: number, overrides: Partial<ProductionParameterType> = {}) =>
  ({
    id,
    code: `TYPE${id}`,
    name: `Type ${id}`,
    description: '',
    is_active: true,
    parameter_count: 2,
    default_count: 0,
    print_document_id: '',
    revision: '',
    revision_date: null,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    ...overrides,
  }) as ProductionParameterType;

function Where() {
  const { pathname, search } = useLocation();
  return <div data-testid="where">{pathname + search}</div>;
}

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/qc/qa-reports/types" element={<ProductionParameterTypesPage />} />
        <Route path="/qc/qa-reports/types/:typeId" element={<ProductionParameterTypePage />} />
      </Routes>
      <Where />
    </MemoryRouter>,
  );
}

const where = () => screen.getByTestId('where').textContent;

beforeEach(() => {
  data.defaults = [];
  data.updateType = vi.fn().mockResolvedValue({});
  data.types = Array.from({ length: 30 }, (_, i) => type(i + 1));
});

describe('the document types list', () => {
  it('shows the types and nothing else', () => {
    renderAt('/qc/qa-reports/types');

    expect(screen.getAllByRole('row')).toHaveLength(31); // header + 30
    expect(screen.queryByRole('button', { name: /Add Parameter$/ })).toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'Products' })).toBeNull();
  });

  it('opens a type on its own page', () => {
    renderAt('/qc/qa-reports/types');

    fireEvent.click(screen.getByRole('link', { name: 'TYPE27' }));

    expect(where()).toBe('/qc/qa-reports/types/27');
  });

  it('opens a type when its row is clicked', () => {
    renderAt('/qc/qa-reports/types');

    fireEvent.click(screen.getByRole('cell', { name: 'Type 4' }));

    expect(where()).toBe('/qc/qa-reports/types/4');
  });

  it('sends an address from the earlier layout to the type page', () => {
    renderAt('/qc/qa-reports/types?type=12');
    expect(where()).toBe('/qc/qa-reports/types/12');
  });
});

describe('the type dialog', () => {
  it('shows the form’s number — the Print Documents one — and saves it with the type', async () => {
    data.types = [
      type(3, {
        code: 'OIL_ONLINE_MONITORING',
        name: 'Oil Plant On-line Monitoring',
        print_document_id: 'QA-FRM-14-01-05-02',
        revision: '02',
        revision_date: '2026-05-22',
      }),
    ];
    renderAt('/qc/qa-reports/types');
    fireEvent.click(screen.getByRole('button', { name: 'Edit OIL_ONLINE_MONITORING' }));

    const number = screen.getByLabelText('Document number');
    expect(number).toHaveValue('QA-FRM-14-01-05-02');
    expect(screen.getByText(/same number as in Master Data/)).toBeInTheDocument();

    fireEvent.change(number, { target: { value: 'QA-FRM-14-01-05-03' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(data.updateType).toHaveBeenCalledWith({
        id: 3,
        data: expect.objectContaining({
          print_document_id: 'QA-FRM-14-01-05-03',
          revision: '02',
          revision_date: '2026-05-22',
        }),
      }),
    );
  });
});

describe('a document type page', () => {
  it('opens on its parameters, its defaults on their own tab', () => {
    renderAt('/qc/qa-reports/types/3');

    expect(screen.getByRole('heading', { name: 'TYPE3 Type 3' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Parameters/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('button', { name: /Add Parameter/ })).toBeInTheDocument();
    expect(screen.queryByText(/Linked Products|Link a product/)).toBeNull();
  });

  it('lists its defaults, each opening its own page', () => {
    data.types = [type(3, { default_count: 2 })];
    data.defaults = [
      {
        id: 21,
        parameter_type_id: 3,
        name: '1 L PET Canola',
        is_active: true,
        values: [
          {
            parameter_id: 1,
            standard_value: '1000 ± 5',
            min_value: null,
            max_value: null,
            value: '',
          },
          { parameter_id: 2, standard_value: '', min_value: null, max_value: null, value: 'L2' },
        ],
        created_at: '',
        updated_at: '',
      },
    ];
    renderAt('/qc/qa-reports/types/3?view=defaults');

    expect(screen.getByRole('tab', { name: 'Defaults (2)' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const row = screen.getByRole('row', { name: /1 L PET Canola/ });
    expect(row).toHaveTextContent('1 L PET Canola11'); // one standard, one value filled in
    fireEvent.click(row);
    expect(where()).toBe('/qc/qa-reports/types/3/defaults/21');
  });

  it('adds a default on its own page', () => {
    renderAt('/qc/qa-reports/types/3?view=defaults');
    fireEvent.click(screen.getByRole('button', { name: /Add Default/ }));
    expect(where()).toBe('/qc/qa-reports/types/3/defaults/new');
  });

  it('still opens on the parameters from an old products address', () => {
    renderAt('/qc/qa-reports/types/3?view=products');
    expect(screen.getByRole('button', { name: /Add Parameter/ })).toBeInTheDocument();
  });

  it('goes back to the list', () => {
    renderAt('/qc/qa-reports/types/3');

    fireEvent.click(screen.getByRole('button', { name: 'Report Types' }));

    expect(where()).toBe('/qc/qa-reports/types');
  });

  it('says so when the type is gone', () => {
    renderAt('/qc/qa-reports/types/999');
    expect(screen.getByText(/could not be found/)).toBeInTheDocument();
  });
});
