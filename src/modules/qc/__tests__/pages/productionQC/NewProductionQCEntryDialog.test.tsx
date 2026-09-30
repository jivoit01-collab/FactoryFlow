/**
 * New entry: pick a running line, then a parameter type. A product linked to
 * types is offered only those; an unlinked one is offered every type (and is
 * linked to the one picked when the entry is saved).
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  ProductionParameterType,
  ProductionRunningLine,
} from '@/modules/qc/types/productionQC.types';

import { NewProductionQCEntryDialog } from '../../../pages/productionQC/NewProductionQCEntryDialog';

const data = vi.hoisted(() => ({
  lines: [] as ProductionRunningLine[],
  types: [] as ProductionParameterType[],
}));

vi.mock('@/modules/qc/api/productionQC/productionQC.queries', () => ({
  useProductionQCRunningLines: () => ({
    data: data.lines,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useProductionParameterTypes: () => ({ data: data.types, isLoading: false, error: null }),
}));

const line = (overrides: Partial<ProductionRunningLine>): ProductionRunningLine => ({
  line_id: 1,
  line_name: 'Line 1',
  run_id: 11,
  run_number: 3,
  run_date: '2026-09-29',
  item_code: 'FG0001',
  product: 'Jivo Canola 1L PET',
  is_running_now: true,
  last_started_at: '2026-09-29T06:00:00+05:30',
  stopped_at: null,
  linked_parameter_types: [],
  ...overrides,
});

const type = (overrides: Partial<ProductionParameterType>): ProductionParameterType => ({
  id: 1,
  code: 'PET_1L',
  name: '1 L PET Oil',
  description: '',
  is_active: true,
  parameter_count: 4,
  items: [],
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
  ...overrides,
});

function Where() {
  const location = useLocation();
  return <div data-testid="where">{location.pathname + location.search}</div>;
}

function renderDialog() {
  const onOpenChange = vi.fn();
  render(
    <MemoryRouter initialEntries={['/qc/production']}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <NewProductionQCEntryDialog open onOpenChange={onOpenChange} />
              <Where />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
  return { onOpenChange };
}

beforeEach(() => {
  data.lines = [];
  data.types = [
    type({ id: 1, code: 'PET_1L', name: '1 L PET Oil', parameter_count: 4 }),
    type({ id: 2, code: 'JAR_5L', name: '5 L Jar Oil', parameter_count: 6 }),
    type({ id: 3, code: 'TIN_15L', name: '15 L Tin Oil', parameter_count: 0 }),
  ];
});

describe('step 1 — the running line', () => {
  it('says so when no line is running', () => {
    renderDialog();
    expect(screen.getByText('No line is running right now')).toBeInTheDocument();
  });

  it('shows each line with its product, item code and whether it is running', () => {
    data.lines = [
      line({}),
      line({
        line_id: 2,
        line_name: 'Line 2',
        run_id: 12,
        item_code: 'FG0002',
        product: 'Jivo Olive 5L',
        is_running_now: false,
        stopped_at: new Date(new Date().setHours(13, 5, 0, 0)).toISOString(),
      }),
    ];
    renderDialog();

    const first = screen.getByRole('button', { name: /Line 1/ });
    expect(first).toHaveTextContent('Jivo Canola 1L PET');
    expect(first).toHaveTextContent('FG0001');
    expect(first).toHaveTextContent('Running');

    const second = screen.getByRole('button', { name: /Line 2/ });
    expect(second).toHaveTextContent('Jivo Olive 5L');
    expect(second).toHaveTextContent('Stopped since 13:05');
  });
});

describe('step 2 — the parameter type', () => {
  it('offers only the linked types, and picks the only one for you', () => {
    data.lines = [
      line({ linked_parameter_types: [{ id: 1, code: 'PET_1L', name: '1 L PET Oil' }] }),
    ];
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /Line 1/ }));

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(1);
    expect(screen.getByRole('radio', { name: /1 L PET Oil/ })).toBeChecked();
    expect(screen.queryByRole('radio', { name: /5 L Jar Oil/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/not linked to a parameter type yet/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByTestId('where').textContent).toBe('/qc/production/new?run=11&type=1');
  });

  it('lets the user choose among several linked types', () => {
    data.lines = [
      line({
        linked_parameter_types: [
          { id: 1, code: 'PET_1L', name: '1 L PET Oil' },
          { id: 2, code: 'JAR_5L', name: '5 L Jar Oil' },
        ],
      }),
    ];
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /Line 1/ }));

    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();

    fireEvent.click(screen.getByRole('radio', { name: /5 L Jar Oil/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByTestId('where').textContent).toBe('/qc/production/new?run=11&type=2');
  });

  it('offers every type to an unlinked product, and says the pick will be linked', () => {
    data.lines = [line({ linked_parameter_types: [] })];
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /Line 1/ }));

    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByText(/not linked to a parameter type yet/)).toHaveTextContent(
      'will be linked to it when the entry is saved',
    );
    // Nothing is chosen for an unlinked product.
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();

    fireEvent.click(screen.getByRole('radio', { name: /1 L PET Oil/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByTestId('where').textContent).toBe('/qc/production/new?run=11&type=1');
  });

  it('picks the only usable type for an unlinked product too', () => {
    data.types = [
      type({
        id: 1,
        code: 'OIL_ONLINE',
        name: 'Oil Plant On-line Monitoring',
        parameter_count: 16,
      }),
      type({ id: 3, code: 'TIN_15L', name: '15 L Tin Oil', parameter_count: 0 }),
    ];
    data.lines = [line({ linked_parameter_types: [] })];
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /Line 1/ }));

    expect(screen.getByRole('radio', { name: /Oil Plant On-line Monitoring/ })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByTestId('where').textContent).toBe('/qc/production/new?run=11&type=1');
  });

  it('does not promise a link for a run without an item code', () => {
    data.lines = [line({ item_code: '', linked_parameter_types: [] })];
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /Line 1/ }));

    expect(screen.getByText(/has no SAP item code/)).toHaveTextContent('Pick it each time');
    expect(screen.queryByText(/will be linked to it/)).not.toBeInTheDocument();
  });

  it('disables a type with no parameters yet', () => {
    data.lines = [line({ linked_parameter_types: [] })];
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /Line 1/ }));

    const empty = screen.getByRole('radio', { name: /15 L Tin Oil/ });
    expect(empty).toBeDisabled();
    expect(empty.closest('label')).toHaveTextContent('no parameters yet');
    expect(screen.getByRole('radio', { name: /1 L PET Oil/ })).toBeEnabled();
  });

  it('does not preselect the only linked type when it has no parameters', () => {
    data.lines = [
      line({ linked_parameter_types: [{ id: 3, code: 'TIN_15L', name: '15 L Tin Oil' }] }),
    ];
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /Line 1/ }));

    expect(screen.getByRole('radio', { name: /15 L Tin Oil/ })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /15 L Tin Oil/ })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('goes back to the lines', () => {
    data.lines = [line({})];
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /Line 1/ }));
    fireEvent.click(screen.getByRole('button', { name: /Change line/ }));

    expect(screen.getByRole('button', { name: /Line 1/ })).toBeInTheDocument();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });
});
