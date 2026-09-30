/**
 * The reading form: one value per parameter, mandatory ones required, a remark
 * required when anything is out of spec, Pass / Fail sent as those strings, and
 * the backend's own refusals shown where they belong.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  ProductionParameter,
  ProductionParameterType,
  ProductionQCEntry,
  ProductionRunningLine,
} from '@/modules/qc/types/productionQC.types';

import ProductionQCEntryPage from '../../../pages/productionQC/ProductionQCEntryPage';

const state = vi.hoisted(() => ({
  lines: [] as unknown[],
  parameters: [] as unknown[],
  entry: null as unknown,
  create: vi.fn(),
  update: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/modules/qc/api/productionQC/productionQC.queries', () => ({
  useProductionQCRunningLines: () => ({ data: state.lines, isLoading: false, error: null }),
  useProductionParameterType: (id: number | null) => ({
    data: id
      ? ({
          id,
          code: 'PET_1L',
          name: '1 L PET Oil',
          description: '',
          is_active: true,
          parameter_count: 3,
          print_document_id: '',
          revision: '',
          revision_date: null,
          created_at: '',
          updated_at: '',
        } satisfies ProductionParameterType)
      : undefined,
    isLoading: false,
    error: null,
  }),
  useProductionParameters: () => ({ data: state.parameters, isLoading: false, error: null }),
  useCreateProductionQCEntry: () => ({ mutateAsync: state.create, isPending: false }),
  useProductionQCEntry: () => ({ data: state.entry, isLoading: false, error: null }),
  useUpdateProductionQCEntry: () => ({ mutateAsync: state.update, isPending: false }),
}));

const runningLine = (overrides: Partial<ProductionRunningLine> = {}): ProductionRunningLine => ({
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
  ...overrides,
});

const parameter = (overrides: Partial<ProductionParameter>): ProductionParameter => ({
  id: 1,
  parameter_type_id: 1,
  parameter_code: 'NET_WT',
  parameter_name: 'Net Weight',
  standard_value: '910±5',
  value_type: 'NUMERIC',
  min_value: null,
  max_value: null,
  uom: 'g',
  sequence: 1,
  is_mandatory: true,
  is_active: true,
  ...overrides,
});

const PARAMETERS = [
  parameter({}),
  parameter({
    id: 2,
    parameter_code: 'LEAK',
    parameter_name: 'Leak Test',
    standard_value: 'Free from leak',
    value_type: 'BOOLEAN',
    uom: '',
    sequence: 2,
  }),
  parameter({
    id: 3,
    parameter_code: 'LABEL',
    parameter_name: 'Label Print',
    standard_value: 'Proper',
    value_type: 'TEXT',
    uom: '',
    sequence: 3,
    is_mandatory: false,
  }),
];

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>;
}

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/qc/production/new" element={<ProductionQCEntryPage />} />
        <Route path="/qc/production/entries/:entryId/edit" element={<ProductionQCEntryPage />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

const save = () =>
  fireEvent.click(screen.getByRole('button', { name: /Save & Send for Approval/ }));
const netWeight = () => screen.getByLabelText('Net Weight *');
const leakTest = () => screen.getByLabelText('Leak Test *');

beforeEach(() => {
  state.lines = [runningLine()];
  state.parameters = PARAMETERS;
  state.entry = null;
  state.create = vi.fn().mockResolvedValue({ id: 99 });
  state.update = vi.fn().mockResolvedValue({ id: 7 });
});

describe('a new entry', () => {
  it('shows the line, product, item code, run and parameter type', () => {
    renderAt('/qc/production/new?run=11&type=1');

    expect(screen.getByText('Line 1')).toBeInTheDocument();
    expect(screen.getByText('Jivo Canola 1L PET')).toBeInTheDocument();
    expect(screen.getByText('FG0001')).toBeInTheDocument();
    expect(screen.getByText('#3')).toBeInTheDocument();
    expect(screen.getByText('1 L PET Oil')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('will not save with a mandatory parameter missing', () => {
    renderAt('/qc/production/new?run=11&type=1');
    fireEvent.change(netWeight(), { target: { value: '912' } });
    save();

    expect(state.create).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter a value for every mandatory parameter: Leak Test.',
    );
    expect(screen.getByText('Enter a value — this parameter is mandatory.')).toBeInTheDocument();
  });

  it('asks for a remark when a reading is out of spec, then sends Pass / Fail as strings', async () => {
    renderAt('/qc/production/new?run=11&type=1');
    fireEvent.change(netWeight(), { target: { value: '912' } });
    expect(screen.getByText('Within spec')).toBeInTheDocument();

    fireEvent.change(leakTest(), { target: { value: 'Fail' } });
    expect(screen.getByText('Out of spec')).toBeInTheDocument();

    save();
    expect(state.create).not.toHaveBeenCalled();
    expect(
      screen.getByText('A remark is required when any parameter is out of spec.'),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Remarks/), {
      target: { value: 'Two bottles leaking at the cap' },
    });
    save();

    await waitFor(() => expect(state.create).toHaveBeenCalledTimes(1));
    expect(state.create).toHaveBeenCalledWith({
      run_id: 11,
      parameter_type_id: 1,
      remarks: 'Two bottles leaking at the cap',
      results: [
        { parameter_id: 1, result_value: '912', is_within_spec: true },
        { parameter_id: 2, result_value: 'Fail' },
        { parameter_id: 3, result_value: '' },
      ],
    });
    await waitFor(() =>
      expect(screen.getByTestId('where').textContent).toBe('/qc/production/entries/99'),
    );
  });

  it('sends Pass for a passing check, and the hand-set verdict for a text reading', async () => {
    renderAt('/qc/production/new?run=11&type=1');
    fireEvent.change(netWeight(), { target: { value: '909' } });
    fireEvent.change(leakTest(), { target: { value: 'Pass' } });
    fireEvent.change(screen.getByLabelText('Label Print'), { target: { value: 'Smudged' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Within spec' }));
    fireEvent.change(screen.getByLabelText(/^Remarks/), { target: { value: 'Label smudged' } });
    save();

    await waitFor(() => expect(state.create).toHaveBeenCalledTimes(1));
    expect(state.create.mock.calls[0][0].results).toEqual([
      { parameter_id: 1, result_value: '909', is_within_spec: true },
      { parameter_id: 2, result_value: 'Pass' },
      { parameter_id: 3, result_value: 'Smudged', is_within_spec: false },
    ]);
  });

  it('shows the backend’s field errors where they belong', async () => {
    state.create = vi.fn().mockRejectedValue({
      status: 400,
      message: 'remarks: A remark is required when any parameter is out of spec.',
      errors: { remarks: ['A remark is required when any parameter is out of spec.'] },
    });
    renderAt('/qc/production/new?run=11&type=1');
    fireEvent.change(netWeight(), { target: { value: '912' } });
    fireEvent.change(leakTest(), { target: { value: 'Pass' } });
    save();

    expect(
      await screen.findByText('A remark is required when any parameter is out of spec.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^Remarks/)).toHaveAttribute('data-error', 'true');
  });

  it('says so, with a way back, when the run left the line before the save', async () => {
    state.create = vi.fn().mockRejectedValue({
      status: 400,
      message: 'run id: That run is not on a running line any more. Pick the line again.',
      errors: { run_id: ['That run is not on a running line any more. Pick the line again.'] },
    });
    renderAt('/qc/production/new?run=11&type=1');
    fireEvent.change(netWeight(), { target: { value: '912' } });
    fireEvent.change(leakTest(), { target: { value: 'Pass' } });
    save();

    expect(
      await screen.findByText('That run is not on a running line any more. Pick the line again.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pick again' }));
    expect(screen.getByTestId('where').textContent).toBe('/qc/production');
  });

  it('shows a detail error from the backend as it is', async () => {
    state.create = vi.fn().mockRejectedValue({
      status: 400,
      message: 'This parameter type has no parameters yet.',
    });
    renderAt('/qc/production/new?run=11&type=1');
    fireEvent.change(netWeight(), { target: { value: '912' } });
    fireEvent.change(leakTest(), { target: { value: 'Pass' } });
    save();

    expect(
      await screen.findByText('This parameter type has no parameters yet.'),
    ).toBeInTheDocument();
  });

  it('refuses a run that is no longer on a running line, with a way back', () => {
    state.lines = [runningLine({ run_id: 12 })];
    renderAt('/qc/production/new?run=11&type=1');

    expect(screen.getByText('This line is not running any more')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Pick the line again/ }));
    expect(screen.getByTestId('where').textContent).toBe('/qc/production');
  });

  it('takes any type on any line, with nothing said about linking', () => {
    state.lines = [runningLine({ item_code: '', product: 'Demo run' })];
    renderAt('/qc/production/new?run=11&type=1');

    expect(screen.getByRole('button', { name: /Save & Send for Approval/ })).toBeInTheDocument();
    expect(screen.queryByText(/linked/i)).not.toBeInTheDocument();
  });
});

describe('correcting an entry', () => {
  const entry = (overrides: Partial<ProductionQCEntry> = {}): ProductionQCEntry => ({
    id: 7,
    line_id: 1,
    line_name: 'Line 1',
    run_id: 11,
    run_number: 3,
    item_code: 'FG0001',
    product: 'Jivo Canola 1L PET',
    parameter_type: { id: 1, code: 'PET_1L', name: '1 L PET Oil' },
    checked_at: '2026-09-29T08:00:00+05:30',
    status: 'SENT_BACK',
    status_label: 'Sent Back',
    out_of_spec_count: 1,
    submitted_by_name: 'QC Chemist',
    submitted_at: '2026-09-29T08:00:00+05:30',
    approved_by_name: null,
    approved_at: null,
    sent_back_by_name: 'QC Lead',
    sent_back_at: '2026-09-29T09:00:00+05:30',
    send_back_remarks: 'Recheck the weight',
    remarks: 'Weight low',
    approval_remarks: '',
    results: [
      {
        id: 70,
        parameter_id: 1,
        parameter_code: 'NET_WT',
        parameter_name: 'Net Weight',
        standard_value: '910±5',
        parameter_type: 'NUMERIC',
        min_value: null,
        max_value: null,
        uom: 'g',
        sequence: 1,
        is_mandatory: true,
        result_value: '900',
        result_numeric: '900.0000',
        is_within_spec: false,
        remarks: '',
      },
    ],
    ...overrides,
  });

  it('opens with the saved readings and the send-back remark, and PATCHes the correction', async () => {
    state.entry = entry();
    renderAt('/qc/production/entries/7/edit');

    expect(screen.getByText('Recheck the weight')).toBeInTheDocument();
    expect(netWeight()).toHaveValue(900);
    expect(screen.getByLabelText(/^Remarks/)).toHaveValue('Weight low');

    fireEvent.change(netWeight(), { target: { value: '911' } });
    save();

    await waitFor(() => expect(state.update).toHaveBeenCalledTimes(1));
    expect(state.update).toHaveBeenCalledWith({
      id: 7,
      data: {
        remarks: 'Weight low',
        results: [{ parameter_id: 1, result_value: '911', is_within_spec: true }],
      },
    });
    await waitFor(() =>
      expect(screen.getByTestId('where').textContent).toBe('/qc/production/entries/7'),
    );
  });

  it('will not open an approved entry for changes', () => {
    state.entry = entry({
      status: 'APPROVED',
      status_label: 'Approved',
      approved_by_name: 'QC Lead',
    });
    renderAt('/qc/production/entries/7/edit');

    expect(screen.getByText('An approved entry cannot be changed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save/ })).not.toBeInTheDocument();
  });
});
