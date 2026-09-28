/**
 * The full draft under an approval (SAP Portal's Document / TDS / GL /
 * Attachments tabs), read and opened through the inbox. The API and the
 * document body are mocked.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
vi.mock('@/core/api', () => ({ apiClient: { get: (...args: unknown[]) => get(...args) } }));
vi.mock('@/modules/sap-documents/components/DocumentDetailDialog', () => ({
  DocumentDetailBody: ({ attachments }: { attachments: React.ReactNode }) => (
    <div>
      <p>document body</p>
      {attachments}
    </div>
  ),
}));
// Without the document browser's right, "Copied from" stays plain text.
vi.mock('@/core/auth', () => ({ usePermission: () => ({ hasAllPermissions: () => false }) }));
const openOrSave = vi.fn();
vi.mock('@/modules/sap-documents/utils/attachments', () => ({ openOrSave: (...a: unknown[]) => openOrSave(...a) }));

import { sapApprovalsApi } from '../api/sap-approvals.api';
import { ApprovalDocument } from '../components/ApprovalDocument';

function renderDocument() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ApprovalDocument wddCode={75424} />
    </QueryClientProvider>,
  );
}

describe('the inbox serves the draft and its files itself', () => {
  beforeEach(() => {
    get.mockReset();
    openOrSave.mockReset();
  });

  it('calls the inbox endpoints, quietly', async () => {
    get.mockResolvedValue({ data: { lines: [] } });
    await sapApprovalsApi.attachmentLines(75424, 9002);
    expect(get).toHaveBeenLastCalledWith('/sap-approvals/requests/75424/attachments/9002/', { suppressErrorToast: true });
    get.mockResolvedValue({ data: new Blob(['x']) });
    await sapApprovalsApi.downloadAttachment(75424, 9002, 1);
    expect(get).toHaveBeenLastCalledWith('/sap-approvals/requests/75424/attachments/9002/1/download/', {
      responseType: 'blob',
      suppressErrorToast: true,
    });
  });

  it('reads the document only when asked, then lists and opens its files', async () => {
    get.mockImplementation(async (url: string) => {
      if (url.endsWith('/document/')) {
        return {
          data: {
            type: { key: 'Drafts', label: 'Draft' },
            document: { warnings: [] },
            attachment_sources: [{ label: 'A/R Invoice #4411', abs_entry: 9002 }],
          },
        };
      }
      if (url.endsWith('/attachments/9002/')) return { data: { lines: [{ line: 1, file_name: 'scan.pdf' }] } };
      return { data: new Blob(['%PDF'], { type: 'application/pdf' }) };
    });
    renderDocument();
    expect(get).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Show the full document' }));
    expect(await screen.findByText('document body')).toBeInTheDocument();
    expect(await screen.findByText('A/R Invoice #4411')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'scan.pdf' }));
    await waitFor(() => expect(openOrSave).toHaveBeenCalled());
    expect(openOrSave.mock.calls[0][1]).toBe('scan.pdf');
  });
});
