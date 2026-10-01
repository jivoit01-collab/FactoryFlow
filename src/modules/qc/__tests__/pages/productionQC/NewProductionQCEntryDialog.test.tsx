/**
 * New entry: pick the report, then — when it has defaults (one per SKU, say) —
 * the default to fill it with, or none for the report's own standards.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  ProductionParameterType,
  ProductionParameterTypeDefault,
} from '@/modules/qc/types/productionQC.types';

import { NewProductionQCEntryDialog } from '../../../pages/productionQC/NewProductionQCEntryDialog';

const data = vi.hoisted(() => ({
  types: [] as ProductionParameterType[],
  defaults: [] as ProductionParameterTypeDefault[],
  defaultCalls: [] as { typeId: number | null; enabled: boolean }[],
}));

vi.mock('@/modules/qc/api/productionQC/productionQC.queries', () => ({
  useProductionParameterTypes: () => ({ data: data.types, isLoading: false, error: null }),
  useProductionParameterTypeDefaults: (typeId: number | null, enabled: boolean) => {
    data.defaultCalls.push({ typeId, enabled });
    return { data: enabled ? data.defaults : undefined, isLoading: false, error: null };
  },
}));

const type = (overrides: Partial<ProductionParameterType>): ProductionParameterType => ({
  id: 1,
  code: 'PET_1L',
  name: '1 L PET Oil',
  description: '',
  is_active: true,
  parameter_count: 4,
  default_count: 0,
  print_document_id: '',
  revision: '',
  revision_date: null,
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
  ...overrides,
});

const preset = (id: number, name: string): ProductionParameterTypeDefault => ({
  id,
  parameter_type_id: 1,
  name,
  is_active: true,
  values: [],
  created_at: '',
  updated_at: '',
});

function Where() {
  const location = useLocation();
  return <div data-testid="where">{location.pathname + location.search}</div>;
}

function renderDialog() {
  render(
    <MemoryRouter initialEntries={['/qc/qa-reports']}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <NewProductionQCEntryDialog open onOpenChange={vi.fn()} />
              <Where />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

const where = () => screen.getByTestId('where').textContent;
const next = () => fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

beforeEach(() => {
  data.types = [
    type({
      id: 1,
      code: 'OIL_ONLINE',
      name: 'Oil Plant On-line Monitoring',
      print_document_id: 'QA-FRM-14-01-05-02',
      default_count: 2,
    }),
    type({ id: 2, code: 'BACKWASHING', name: 'Backwashing Record', parameter_count: 5 }),
    type({ id: 3, code: 'EMPTY', name: 'Not Ready Yet', parameter_count: 0 }),
  ];
  data.defaults = [preset(11, '1 L PET Canola'), preset(12, '5 L Jar Mustard')];
  data.defaultCalls = [];
});

describe('picking the report', () => {
  it('offers every report straight away — no line to pick first', () => {
    renderDialog();

    expect(screen.getByRole('heading', { name: 'Pick a report' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.queryByText(/running/i)).not.toBeInTheDocument();
    // The defaults are not fetched until a report with some is picked.
    expect(data.defaultCalls.every((call) => !call.enabled)).toBe(true);
  });

  it('shows a report by its form number, and how many defaults it has', () => {
    renderDialog();
    const oil = screen
      .getByRole('radio', { name: /Oil Plant On-line Monitoring/ })
      .closest('label');
    expect(oil).toHaveTextContent('QA-FRM-14-01-05-02');
    expect(oil).toHaveTextContent('2 defaults');
    expect(
      screen.getByRole('radio', { name: /Backwashing Record/ }).closest('label'),
    ).toHaveTextContent('BACKWASHING');
  });

  it('opens a report with no defaults straight away', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();

    fireEvent.click(screen.getByRole('radio', { name: /Backwashing Record/ }));
    next();

    expect(where()).toBe('/qc/qa-reports/new?type=2');
  });

  it('picks the only usable report for you', () => {
    data.types = [data.types[1], data.types[2]];
    renderDialog();

    expect(screen.getByRole('radio', { name: /Backwashing Record/ })).toBeChecked();
    next();
    expect(where()).toBe('/qc/qa-reports/new?type=2');
  });

  it('disables a report with no parameters yet', () => {
    renderDialog();

    const empty = screen.getByRole('radio', { name: /Not Ready Yet/ });
    expect(empty).toBeDisabled();
    expect(empty.closest('label')).toHaveTextContent('no parameters yet');
  });

  it('narrows a long list by search', () => {
    data.types = Array.from({ length: 10 }, (_, i) =>
      type({
        id: i + 1,
        code: `DOC_${i + 1}`,
        name: i === 6 ? 'RO Testing Record' : `Doc ${i + 1}`,
      }),
    );
    renderDialog();

    fireEvent.change(screen.getByRole('textbox', { name: /Search reports/ }), {
      target: { value: 'ro test' },
    });

    expect(screen.getAllByRole('radio')).toHaveLength(1);
    expect(screen.getByRole('radio', { name: /RO Testing Record/ })).toBeInTheDocument();
  });
});

describe('picking the default', () => {
  const toDefaults = () => {
    renderDialog();
    fireEvent.click(screen.getByRole('radio', { name: /Oil Plant On-line Monitoring/ }));
    next();
  };

  it('asks which default, with none on offer, before opening the form', () => {
    toDefaults();

    expect(screen.getByRole('heading', { name: 'Pick a default' })).toBeInTheDocument();
    expect(data.defaultCalls.at(-1)).toEqual({ typeId: 1, enabled: true });
    expect(
      screen.getAllByRole('radio').map((radio) => radio.closest('label')?.textContent),
    ).toEqual([expect.stringContaining('None'), '1 L PET Canola', '5 L Jar Mustard']);
    // Optional, but a choice: nothing is picked for the user.
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    expect(where()).toBe('/qc/qa-reports');
  });

  it('opens the form with the default picked', () => {
    toDefaults();
    fireEvent.click(screen.getByRole('radio', { name: /5 L Jar Mustard/ }));
    next();
    expect(where()).toBe('/qc/qa-reports/new?type=1&default=12');
  });

  it('opens the form on the report’s own standards with none', () => {
    toDefaults();
    fireEvent.click(screen.getByRole('radio', { name: /None/ }));
    next();
    expect(where()).toBe('/qc/qa-reports/new?type=1');
  });

  it('goes back to the reports', () => {
    toDefaults();
    fireEvent.click(screen.getByRole('button', { name: /Change report/ }));
    expect(screen.getByRole('heading', { name: 'Pick a report' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });
});
