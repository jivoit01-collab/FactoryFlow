/**
 * A report default's own page: its name, and per parameter the standard it sets
 * and the value it fills in. A row left blank keeps the report's standard.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  ProductionParameter,
  ProductionParameterTypeDefault,
} from '@/modules/qc/types/productionQC.types';

const data = vi.hoisted(() => ({
  existing: null as unknown,
  create: null as unknown as ReturnType<typeof vi.fn>,
  update: null as unknown as ReturnType<typeof vi.fn>,
  remove: null as unknown as ReturnType<typeof vi.fn>,
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/shared/components', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  confirmDialog: () => Promise.resolve(true),
}));
vi.mock('@/modules/qc/api/productionQC/productionQC.queries', () => ({
  useProductionParameterType: (id: number | null) => ({
    data:
      id === 3 ? { id: 3, code: 'NET_CONTENT_OIL', name: 'Net Content — Oil Plant' } : undefined,
    isLoading: false,
    error: null,
  }),
  useProductionParameters: () => ({ data: PARAMETERS, isLoading: false, error: null }),
  useProductionParameterTypeDefault: (id: number | null) => ({
    data: id ? data.existing : undefined,
    isLoading: false,
    error: null,
  }),
  useCreateProductionParameterTypeDefault: () => ({ mutateAsync: data.create, isPending: false }),
  useUpdateProductionParameterTypeDefault: () => ({ mutateAsync: data.update, isPending: false }),
  useDeleteProductionParameterTypeDefault: () => ({ mutateAsync: data.remove, isPending: false }),
}));

const { default: ProductionParameterTypeDefaultPage } =
  await import('../../../pages/productionQC/ProductionParameterTypeDefaultPage');

const parameter = (overrides: Partial<ProductionParameter>): ProductionParameter => ({
  id: 1,
  parameter_type_id: 3,
  parameter_code: 'SKU',
  parameter_name: 'SKU',
  standard_value: '-',
  value_type: 'TEXT',
  min_value: null,
  max_value: null,
  uom: '',
  sequence: 1,
  is_mandatory: false,
  is_active: true,
  ...overrides,
});

const PARAMETERS = [
  parameter({}),
  parameter({
    id: 2,
    parameter_code: 'NET_CONTENT_G',
    parameter_name: 'Net Content (g)',
    value_type: 'NUMERIC',
    uom: 'g',
    sequence: 2,
  }),
  parameter({
    id: 3,
    parameter_code: 'LEAK',
    parameter_name: 'Leak Test',
    value_type: 'BOOLEAN',
    standard_value: 'No leakage',
    sequence: 3,
  }),
];

function Where() {
  const { pathname, search } = useLocation();
  return <div data-testid="where">{pathname + search}</div>;
}

function renderAt(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/qc/qa-reports/types/:typeId/defaults/:defaultId"
          element={<ProductionParameterTypeDefaultPage />}
        />
        <Route
          path="/qc/qa-reports/types/:typeId/defaults"
          element={<ProductionParameterTypeDefaultPage />}
        />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

const save = () => fireEvent.click(screen.getByRole('button', { name: /Save Default/ }));
const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => {
  data.existing = null;
  data.create = vi.fn().mockResolvedValue({ id: 9 });
  data.update = vi.fn().mockResolvedValue({ id: 9 });
  data.remove = vi.fn().mockResolvedValue(undefined);
});

describe('a new default', () => {
  it('shows each parameter with the report’s spec, min / max only for numbers', () => {
    renderAt('/qc/qa-reports/types/3/defaults/new');

    expect(screen.getByRole('heading', { name: 'New Default' })).toBeInTheDocument();
    expect(screen.getByText('Net Content — Oil Plant')).toBeInTheDocument();
    expect(screen.getByLabelText('Net Content (g) min')).toBeInTheDocument();
    expect(screen.queryByLabelText('SKU min')).not.toBeInTheDocument();
    // Pass / Fail fills in as one of those.
    expect(screen.getByLabelText('Leak Test pre-filled value').tagName).toBe('SELECT');
  });

  it('saves the name and only the rows that set something', async () => {
    renderAt('/qc/qa-reports/types/3/defaults/new');
    type('Name *', '1 L Jar Canola');
    type('SKU pre-filled value', '1 L JAR');
    type('Net Content (g) standard', '910 ± 5');
    save();

    await waitFor(() => expect(data.create).toHaveBeenCalledTimes(1));
    expect(data.create).toHaveBeenCalledWith({
      typeId: 3,
      data: {
        name: '1 L Jar Canola',
        values: [
          {
            parameter_id: 1,
            standard_value: '',
            min_value: null,
            max_value: null,
            value: '1 L JAR',
          },
          {
            parameter_id: 2,
            standard_value: '910 ± 5',
            min_value: null,
            max_value: null,
            value: '',
          },
        ],
      },
    });
    await waitFor(() =>
      expect(screen.getByTestId('where').textContent).toBe('/qc/qa-reports/types/3?view=defaults'),
    );
  });

  it('asks for a name, and refuses a max below the min', () => {
    renderAt('/qc/qa-reports/types/3/defaults/new');
    type('Net Content (g) min', '915');
    type('Net Content (g) max', '905');
    save();

    expect(data.create).not.toHaveBeenCalled();
    expect(screen.getByText('Enter a name')).toBeInTheDocument();
    expect(screen.getByText('Max must not be below min.')).toBeInTheDocument();
  });
});

describe('an existing default', () => {
  beforeEach(() => {
    data.existing = {
      id: 9,
      parameter_type_id: 3,
      name: '1 L Jar Canola',
      is_active: true,
      values: [
        {
          parameter_id: 2,
          standard_value: '',
          min_value: '905.0000',
          max_value: '915.0000',
          value: '',
        },
      ],
      created_at: '',
      updated_at: '',
    } satisfies ProductionParameterTypeDefault;
  });

  it('opens with its values and replaces them on save', async () => {
    renderAt('/qc/qa-reports/types/3/defaults/9');

    expect(screen.getByRole('heading', { name: '1 L Jar Canola' })).toBeInTheDocument();
    expect(screen.getByLabelText('Net Content (g) min')).toHaveValue(905);
    type('Net Content (g) max', '912');
    save();

    await waitFor(() => expect(data.update).toHaveBeenCalledTimes(1));
    expect(data.update.mock.calls[0][0]).toEqual({
      id: 9,
      data: {
        name: '1 L Jar Canola',
        values: [
          { parameter_id: 2, standard_value: '', min_value: 905, max_value: 912, value: '' },
        ],
      },
    });
  });

  it('is removed from its own page', async () => {
    renderAt('/qc/qa-reports/types/3/defaults/9');
    fireEvent.click(screen.getByRole('button', { name: /Remove/ }));

    await waitFor(() => expect(data.remove).toHaveBeenCalledWith(9));
  });

  it('will not open a default of another report', () => {
    data.existing = { ...(data.existing as object), parameter_type_id: 4 };
    renderAt('/qc/qa-reports/types/3/defaults/9');
    expect(screen.getByText(/This default could not be found/)).toBeInTheDocument();
  });
});

describe('the defaults address itself', () => {
  it('is the type page’s Defaults tab', () => {
    renderAt('/qc/qa-reports/types/3/defaults');
    expect(screen.getByTestId('where').textContent).toBe('/qc/qa-reports/types/3?view=defaults');
  });
});
