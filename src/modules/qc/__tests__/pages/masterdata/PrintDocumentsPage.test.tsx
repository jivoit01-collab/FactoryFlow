/**
 * Master Data > Print Documents: every printed form's document number — the
 * arrival slip reports and each production QC sheet.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { QCPrintDocument, QCPrintDocumentOption } from '@/modules/qc/types';

const data = vi.hoisted(() => ({
  documents: [] as QCPrintDocument[],
  options: [] as QCPrintDocumentOption[],
  create: vi.fn(),
}));

vi.mock('@/modules/qc/api/printDocument', () => ({
  usePrintDocuments: () => ({ data: data.documents, isLoading: false, error: null }),
  usePrintDocumentOptions: () => ({ data: data.options }),
  useCreatePrintDocument: () => ({ mutateAsync: data.create, isPending: false }),
  useUpdatePrintDocument: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeletePrintDocument: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@/modules/qc/components/qcSections', () => ({ MasterDataTabs: () => null }));

const { default: PrintDocumentsPage } =
  await import('../../../pages/masterdata/PrintDocumentsPage');

const document = (overrides: Partial<QCPrintDocument>): QCPrintDocument => ({
  id: 1,
  document_key: 'RAW_MATERIAL_INSPECTION',
  document_key_label: 'Arrival Slip Inspection Print',
  production_parameter_type: null,
  document_id: 'fhgjk',
  notes: '',
  is_active: true,
  created_at: '2026-08-19T00:00:00Z',
  updated_at: '2026-08-19T00:00:00Z',
  ...overrides,
});

function renderPage() {
  render(
    <MemoryRouter>
      <PrintDocumentsPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  data.options = [
    {
      document_key: 'RAW_MATERIAL_INSPECTION',
      production_parameter_type: null,
      label: 'Arrival Slip Inspection Print',
    },
    {
      document_key: 'QC_PARAMETERS',
      production_parameter_type: null,
      label: 'Arrival Slip QC Parameters Print',
    },
    {
      document_key: 'PRODUCTION_QC_SHEET',
      production_parameter_type: 3,
      label: 'Production QC — Oil Plant On-line Monitoring',
    },
  ];
  data.documents = [
    document({}),
    document({
      id: 2,
      document_key: 'QC_PARAMETERS',
      document_key_label: 'Arrival Slip QC Parameters Print',
      document_id: 'qwertyu',
    }),
  ];
  data.create = vi.fn().mockResolvedValue({});
});

describe('PrintDocumentsPage', () => {
  it('lists every form’s number, production sheets included', () => {
    data.documents = [
      ...data.documents,
      document({
        id: 3,
        document_key: 'PRODUCTION_QC_SHEET',
        document_key_label: 'Production QC — Oil Plant On-line Monitoring',
        production_parameter_type: 3,
        document_id: 'QA-FRM-14-01-05-02',
      }),
    ];
    renderPage();
    expect(screen.getByText('Production QC — Oil Plant On-line Monitoring')).toBeInTheDocument();
    expect(screen.getByText('QA-FRM-14-01-05-02')).toBeInTheDocument();
  });

  it('offers the production QC forms still without a number, and saves one with its form', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Add Document ID/ }));

    const select = screen.getByRole('combobox', { name: 'Document' });
    // The two arrival reports already have numbers; the production form is picked.
    expect(select).toHaveValue('PRODUCTION_QC_SHEET:3');
    expect(screen.getByRole('option', { name: 'Arrival Slip Inspection Print' })).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/QA-FRM-14-01-05-02/), {
      target: { value: 'QA-FRM-14-01-05-02' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(data.create).toHaveBeenCalledWith({
        document_key: 'PRODUCTION_QC_SHEET',
        production_parameter_type: 3,
        document_id: 'QA-FRM-14-01-05-02',
        notes: '',
      }),
    );
  });

  it('cannot add when every form has a number', () => {
    data.options = data.options.slice(0, 2);
    renderPage();
    expect(screen.getByRole('button', { name: /Add Document ID/ })).toBeDisabled();
  });
});
