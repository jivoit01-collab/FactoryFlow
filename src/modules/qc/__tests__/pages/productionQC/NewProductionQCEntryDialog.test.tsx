/**
 * New entry: pick the document, then fill it. Documents are not tied to lines
 * or runs, so the document is the only thing to choose.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductionParameterType } from '@/modules/qc/types/productionQC.types';

import { NewProductionQCEntryDialog } from '../../../pages/productionQC/NewProductionQCEntryDialog';

const data = vi.hoisted(() => ({ types: [] as ProductionParameterType[] }));

vi.mock('@/modules/qc/api/productionQC/productionQC.queries', () => ({
  useProductionParameterTypes: () => ({ data: data.types, isLoading: false, error: null }),
}));

const type = (overrides: Partial<ProductionParameterType>): ProductionParameterType => ({
  id: 1,
  code: 'PET_1L',
  name: '1 L PET Oil',
  description: '',
  is_active: true,
  parameter_count: 4,
  print_document_id: '',
  revision: '',
  revision_date: null,
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
  ...overrides,
});

function Where() {
  const location = useLocation();
  return <div data-testid="where">{location.pathname + location.search}</div>;
}

function renderDialog() {
  render(
    <MemoryRouter initialEntries={['/qc/documents']}>
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

beforeEach(() => {
  data.types = [
    type({
      id: 1,
      code: 'OIL_ONLINE',
      name: 'Oil Plant On-line Monitoring',
      print_document_id: 'QA-FRM-14-01-05-02',
    }),
    type({ id: 2, code: 'BACKWASHING', name: 'Backwashing Record', parameter_count: 5 }),
    type({ id: 3, code: 'EMPTY', name: 'Not Ready Yet', parameter_count: 0 }),
  ];
});

describe('picking the document', () => {
  it('offers every document straight away — no line to pick first', () => {
    renderDialog();

    expect(screen.getByRole('heading', { name: 'Pick a document' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.queryByText(/running/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Change line/ })).not.toBeInTheDocument();
  });

  it('shows a document by its form number when it has one', () => {
    renderDialog();
    expect(
      screen.getByRole('radio', { name: /Oil Plant On-line Monitoring/ }).closest('label'),
    ).toHaveTextContent('QA-FRM-14-01-05-02');
    expect(
      screen.getByRole('radio', { name: /Backwashing Record/ }).closest('label'),
    ).toHaveTextContent('BACKWASHING');
  });

  it('opens the form for the document picked', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();

    fireEvent.click(screen.getByRole('radio', { name: /Backwashing Record/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(where()).toBe('/qc/documents/new?type=2');
  });

  it('picks the only usable document for you', () => {
    data.types = [data.types[0], data.types[2]];
    renderDialog();

    expect(screen.getByRole('radio', { name: /Oil Plant On-line Monitoring/ })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(where()).toBe('/qc/documents/new?type=1');
  });

  it('disables a document with no parameters yet', () => {
    renderDialog();

    const empty = screen.getByRole('radio', { name: /Not Ready Yet/ });
    expect(empty).toBeDisabled();
    expect(empty.closest('label')).toHaveTextContent('no parameters yet');
  });

  it('does not preselect the only document when it has no parameters', () => {
    data.types = [data.types[2]];
    renderDialog();

    expect(screen.getByRole('radio', { name: /Not Ready Yet/ })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
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

    fireEvent.change(screen.getByRole('textbox', { name: /Search documents/ }), {
      target: { value: 'ro test' },
    });

    expect(screen.getAllByRole('radio')).toHaveLength(1);
    expect(screen.getByRole('radio', { name: /RO Testing Record/ })).toBeInTheDocument();
  });
});
