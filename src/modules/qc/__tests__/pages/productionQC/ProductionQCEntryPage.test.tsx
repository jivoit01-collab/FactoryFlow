/**
 * The reading form: one value per parameter, mandatory ones required, a remark
 * required when anything is out of spec, Pass / Fail sent as those strings, and
 * the backend's own refusals shown where they belong.
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  ProductionParameter,
  ProductionParameterType,
  ProductionQCEntry,
} from '@/modules/qc/types/productionQC.types';

import ProductionQCEntryPage from '../../../pages/productionQC/ProductionQCEntryPage';

const state = vi.hoisted(() => ({
  parameters: [] as unknown[],
  preset: null as unknown,
  siblings: [] as unknown[],
  entry: null as unknown,
  create: vi.fn(),
  update: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/modules/qc/api/productionQC/productionQC.queries', () => ({
  useProductionParameterType: (id: number | null) => ({
    data: id
      ? ({
          id,
          code: 'PET_1L',
          name: '1 L PET Oil',
          description: '',
          is_active: true,
          parameter_count: 3,
          default_count: 1,
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
  useProductionParameterTypeDefault: (id: number | null) => ({
    data: id ? state.preset : undefined,
    isLoading: false,
    error: null,
  }),
  useCreateProductionQCEntry: () => ({ mutateAsync: state.create, isPending: false }),
  useProductionQCEntry: () => ({ data: state.entry, isLoading: false, error: null }),
  useProductionQCSubmissionEntries: (submissionId: number | null) => ({
    data: submissionId ? state.siblings : undefined,
    isLoading: false,
    error: null,
  }),
  useUpdateProductionQCEntry: () => ({ mutateAsync: state.update, isPending: false }),
}));

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
        <Route path="/qc/qa-reports/new" element={<ProductionQCEntryPage />} />
        <Route path="/qc/qa-reports/entries/:entryId/edit" element={<ProductionQCEntryPage />} />
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
  state.parameters = PARAMETERS;
  state.entry = null;
  state.preset = null;
  state.siblings = [];
  state.create = vi.fn().mockResolvedValue({ id: 99 });
  state.update = vi.fn().mockResolvedValue({ id: 7 });
});

describe('a new entry', () => {
  it('shows the document being filled, and nothing about lines or runs', () => {
    renderAt('/qc/qa-reports/new?type=1');

    expect(screen.getByText('1 L PET Oil')).toBeInTheDocument();
    expect(screen.getByText('PET_1L')).toBeInTheDocument();
    expect(screen.queryByText(/^(Line|Run No\.|Product|Item Code)$/)).not.toBeInTheDocument();
  });

  it('asks for the document first when the address has none', () => {
    renderAt('/qc/qa-reports/new');
    expect(screen.getByText('Pick a report first')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to QA Reports' }));
    expect(screen.getByTestId('where').textContent).toBe('/qc/qa-reports');
  });

  it('will not save with a mandatory parameter missing', () => {
    renderAt('/qc/qa-reports/new?type=1');
    fireEvent.change(netWeight(), { target: { value: '912' } });
    save();

    expect(state.create).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter a value for every mandatory parameter: Leak Test.',
    );
    expect(screen.getByText('Enter a value — this parameter is mandatory.')).toBeInTheDocument();
  });

  it('asks for a remark when a reading is out of spec, then sends Pass / Fail as strings', async () => {
    renderAt('/qc/qa-reports/new?type=1');
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
      parameter_type_id: 1,
      default_id: null,
      remarks: 'Two bottles leaking at the cap',
      results: [
        { parameter_id: 1, result_value: '912', is_within_spec: true },
        { parameter_id: 2, result_value: 'Fail' },
        { parameter_id: 3, result_value: '' },
      ],
    });
    await waitFor(() =>
      expect(screen.getByTestId('where').textContent).toBe('/qc/qa-reports/entries/99'),
    );
  });

  it('sends Pass for a passing check, and the hand-set verdict for a text reading', async () => {
    renderAt('/qc/qa-reports/new?type=1');
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
    renderAt('/qc/qa-reports/new?type=1');
    fireEvent.change(netWeight(), { target: { value: '912' } });
    fireEvent.change(leakTest(), { target: { value: 'Pass' } });
    save();

    expect(
      await screen.findByText('A remark is required when any parameter is out of spec.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^Remarks/)).toHaveAttribute('data-error', 'true');
  });

  it('says so, with a way back, when the document was removed before the save', async () => {
    state.create = vi.fn().mockRejectedValue({
      status: 400,
      message: 'parameter type id: Pick a report.',
      errors: { parameter_type_id: ['Pick a report.'] },
    });
    renderAt('/qc/qa-reports/new?type=1');
    fireEvent.change(netWeight(), { target: { value: '912' } });
    fireEvent.change(leakTest(), { target: { value: 'Pass' } });
    save();

    expect(await screen.findByText('Pick a report.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pick again' }));
    expect(screen.getByTestId('where').textContent).toBe('/qc/qa-reports');
  });

  it('shows a detail error from the backend as it is', async () => {
    state.create = vi.fn().mockRejectedValue({
      status: 400,
      message: 'This parameter type has no parameters yet.',
    });
    renderAt('/qc/qa-reports/new?type=1');
    fireEvent.change(netWeight(), { target: { value: '912' } });
    fireEvent.change(leakTest(), { target: { value: 'Pass' } });
    save();

    expect(
      await screen.findByText('This parameter type has no parameters yet.'),
    ).toBeInTheDocument();
  });
});

describe('a new entry with a default', () => {
  beforeEach(() => {
    state.preset = {
      id: 5,
      parameter_type_id: 1,
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
        {
          parameter_id: 3,
          standard_value: '',
          min_value: null,
          max_value: null,
          value: 'Batch L2',
        },
      ],
      created_at: '',
      updated_at: '',
    };
  });

  it('judges on the default’s standards, fills in its values, and saves it with the entry', async () => {
    renderAt('/qc/qa-reports/new?type=1&default=5');

    expect(screen.getByText('1 L PET Canola')).toBeInTheDocument();
    expect(screen.getByText('Spec: 1000 ± 5 g')).toBeInTheDocument();
    expect(screen.getByLabelText('Label Print')).toHaveValue('Batch L2');

    fireEvent.change(netWeight(), { target: { value: '1002' } });
    // The verdict the spec gives (not the hand-set box of the text reading):
    // within the default's 1000 ± 5, though out of the report's 910±5.
    expect(screen.getByText('Within spec', { selector: 'p' })).toBeInTheDocument();
    fireEvent.change(leakTest(), { target: { value: 'Pass' } });
    save();

    await waitFor(() => expect(state.create).toHaveBeenCalledTimes(1));
    expect(state.create.mock.calls[0][0]).toMatchObject({
      parameter_type_id: 1,
      default_id: 5,
      results: [
        { parameter_id: 1, result_value: '1002', is_within_spec: true },
        { parameter_id: 2, result_value: 'Pass' },
        { parameter_id: 3, result_value: 'Batch L2' },
      ],
    });
  });

  it('lets a filled-in value be changed', () => {
    renderAt('/qc/qa-reports/new?type=1&default=5');
    fireEvent.change(screen.getByLabelText('Label Print'), { target: { value: 'Batch L3' } });
    expect(screen.getByLabelText('Label Print')).toHaveValue('Batch L3');
  });

  it('refuses a default of another report, with a way back', () => {
    state.preset = { ...(state.preset as object), parameter_type_id: 9 };
    renderAt('/qc/qa-reports/new?type=1&default=5');
    expect(screen.getByText('That default is not available')).toBeInTheDocument();
  });

  it('keeps the report’s own standards with no default', () => {
    renderAt('/qc/qa-reports/new?type=1');
    expect(screen.getByText('Spec: 910±5 g')).toBeInTheDocument();
    expect(screen.queryByText('1 L PET Canola')).not.toBeInTheDocument();
  });
});

describe('correcting an entry', () => {
  const entry = (overrides: Partial<ProductionQCEntry> = {}): ProductionQCEntry => ({
    id: 7,
    default_id: null,
    default_name: '',
    submission_id: 70,
    submission_entry_ids: [7],
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
    renderAt('/qc/qa-reports/entries/7/edit');

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
      expect(screen.getByTestId('where').textContent).toBe('/qc/qa-reports/entries/7'),
    );
  });

  it('will not open an approved entry for changes', () => {
    state.entry = entry({
      status: 'APPROVED',
      status_label: 'Approved',
      approved_by_name: 'QC Lead',
    });
    renderAt('/qc/qa-reports/entries/7/edit');

    expect(screen.getByText('An approved entry cannot be changed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save/ })).not.toBeInTheDocument();
  });
});

describe('several samples in one entry', () => {
  const cell = (name: string, sample: number) => screen.getByLabelText(`${name}, sample ${sample}`);
  const fillSample = (sample: number, weight: string) => {
    fireEvent.change(cell('Net Weight', sample), { target: { value: weight } });
    fireEvent.change(cell('Leak Test', sample), { target: { value: 'Pass' } });
  };

  it('adds samples as columns and sends one entry per sample, together', async () => {
    renderAt('/qc/qa-reports/new?type=1');
    fireEvent.click(screen.getByRole('button', { name: /Add sample/ }));
    fireEvent.click(screen.getByRole('button', { name: /Add sample/ }));

    expect(screen.getByRole('heading', { name: 'New Entry · 3 samples' })).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader', { name: /^Sample \d/ })).toHaveLength(3);
    fillSample(1, '911');
    fillSample(2, '909');
    fillSample(3, '912');
    fireEvent.change(cell('Label Print', 1), { target: { value: 'Clear' } });
    fireEvent.click(
      screen.getByRole('button', { name: 'Copy Label Print from Sample 1 to every sample' }),
    );
    expect(cell('Label Print', 3)).toHaveValue('Clear');
    save();

    await waitFor(() => expect(state.create).toHaveBeenCalledTimes(1));
    const sent = state.create.mock.calls[0][0];
    expect(sent.results).toBeUndefined();
    expect(sent.samples).toHaveLength(3);
    expect(
      sent.samples.map(
        (sample: { results: { result_value: string }[] }) => sample.results[0].result_value,
      ),
    ).toEqual(['911', '909', '912']);
    expect(sent.samples[2].results[2]).toMatchObject({ parameter_id: 3, result_value: 'Clear' });
  });

  it('names the sample short of a mandatory value', () => {
    renderAt('/qc/qa-reports/new?type=1');
    fireEvent.click(screen.getByRole('button', { name: /Add sample/ }));
    fillSample(1, '911');
    fireEvent.change(cell('Net Weight', 2), { target: { value: '910' } });
    save();

    expect(state.create).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Sample 2: Leak Test');
  });

  it('drops a sample, back to the single form at one', () => {
    renderAt('/qc/qa-reports/new?type=1');
    fireEvent.click(screen.getByRole('button', { name: /Add sample/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove sample 2' }));
    expect(screen.getByRole('heading', { name: 'New Entry' })).toBeInTheDocument();
    expect(netWeight()).toBeInTheDocument();
  });

  it('starts each added sample with the default’s values', () => {
    state.preset = {
      id: 5,
      parameter_type_id: 1,
      name: '1 L PET Canola',
      is_active: true,
      values: [
        {
          parameter_id: 3,
          standard_value: '',
          min_value: null,
          max_value: null,
          value: 'Batch L2',
        },
      ],
      created_at: '',
      updated_at: '',
    };
    renderAt('/qc/qa-reports/new?type=1&default=5');
    fireEvent.click(screen.getByRole('button', { name: /Add sample/ }));
    expect(cell('Label Print', 2)).toHaveValue('Batch L2');
  });

  it('corrects the entries sent together on one form, and sends them all', async () => {
    const result = (id: number, value: string) => ({
      id,
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
      result_value: value,
      result_numeric: null,
      is_within_spec: true,
      remarks: '',
    });
    const sibling = (id: number, value: string) => ({
      id,
      default_id: null,
      default_name: '',
      submission_id: 70,
      submission_entry_ids: [7, 8],
      parameter_type: { id: 1, code: 'PET_1L', name: '1 L PET Oil' },
      checked_at: '2026-09-29T08:00:00+05:30',
      status: 'SENT_BACK',
      status_label: 'Sent Back',
      out_of_spec_count: 0,
      submitted_by_name: 'QC',
      submitted_at: null,
      approved_by_name: null,
      approved_at: null,
      sent_back_by_name: 'Lead',
      sent_back_at: null,
      send_back_remarks: 'Recheck both',
      remarks: '',
      approval_remarks: '',
      results: [result(id * 10, value)],
    });
    state.entry = sibling(7, '900');
    state.siblings = [sibling(8, '905'), sibling(7, '900')];
    renderAt('/qc/qa-reports/entries/7/edit');

    expect(
      screen.getByRole('heading', { name: 'Correct Entry #7 · 2 samples' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add sample/ })).not.toBeInTheDocument();
    const grid = screen.getByRole('table');
    expect(within(grid).queryByText('#8')).not.toBeInTheDocument();
    expect(cell('Net Weight', 2)).toHaveValue(905);
    fireEvent.change(cell('Net Weight', 1), { target: { value: '911' } });
    save();

    await waitFor(() => expect(state.update).toHaveBeenCalledTimes(1));
    expect(state.update.mock.calls[0][0]).toEqual({
      id: 7,
      data: {
        remarks: '',
        samples: [
          {
            entry_id: 7,
            results: [{ parameter_id: 1, result_value: '911', is_within_spec: true }],
          },
          {
            entry_id: 8,
            results: [{ parameter_id: 1, result_value: '905', is_within_spec: true }],
          },
        ],
      },
    });
  });
});
