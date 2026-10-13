import { Eye, FileCheck2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { usePermission } from '@/core/auth';
import { confirmDialog } from '@/shared/components';
import { Button, NativeSelect } from '@/shared/components/ui';
import { formatDateTimeShort, getErrorMessage } from '@/shared/utils';

import { useDiscardSimulatedFAGRPO, useFAHistory } from '../api/faGrpo.queries';
import { FA_GRPO_POST_ACCESS } from '../constants/permissions';
import { faGrpoPaths } from '../constants/routes';
import { useFAListState } from '../hooks/useFAListState';
import type { FAGRPOHistoryEntry, FAListParams } from '../types';
import { FAGRPOPrintButton } from './FAGRPOPrintButton';
import { FAListFrame } from './FAListFrame';
import { FAListToolbar } from './FAListToolbar';
import { FAPostingStatusBadge } from './FAPostingStatusBadge';

const STATUS_OPTIONS = [
  { value: '', label: 'Every status' },
  { value: 'POSTED', label: 'Posted' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'QUEUED', label: 'Waiting for SAP' },
  { value: 'DRAFT', label: 'Draft' },
] as const;

const SIMULATED_OPTIONS = [
  { value: '', label: 'Real and simulated' },
  { value: 'false', label: 'Real only' },
  { value: 'true', label: 'Simulated only' },
] as const;

/**
 * History: every fixed-asset GRPO the app made -- posted, simulated, failed,
 * waiting for SAP, and saved drafts.
 *
 * A simulated post wrote nothing to SAP but blocks a real post of the same PO,
 * so it carries a SIMULATED badge and, for the post right, **Discard**.
 */
export function FAHistoryTab() {
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermission();
  const canPost = hasAnyPermission(FA_GRPO_POST_ACCESS);

  const [status, setStatus] = useState('');
  const [simulated, setSimulated] = useState<'' | 'true' | 'false'>('');
  const extra: FAListParams = {
    ...(status ? { status } : {}),
    ...(simulated ? { simulated } : {}),
  };
  const list = useFAListState(extra);
  const { data, isLoading, error, refetch } = useFAHistory(list.params);
  const discard = useDiscardSimulatedFAGRPO();

  const handleDiscard = async (posting: FAGRPOHistoryEntry) => {
    const ok = await confirmDialog({
      title: `Discard the simulated GRPO of ${posting.entry_no}?`,
      description:
        'Nothing was sent to SAP for it. Discarding frees the PO, so it can be posted for real.',
      confirmLabel: 'Discard',
      destructive: true,
    });
    if (!ok) return;
    try {
      await discard.mutateAsync(posting.id);
      toast.success('Simulated GRPO discarded.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not discard the simulated GRPO.'));
    }
  };

  return (
    <div className="space-y-3">
      <FAListToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        month={list.month}
        onMonthChange={list.setMonth}
        placeholder="Search entry, SAP doc no., PO, supplier…"
      >
        <NativeSelect
          className="w-[170px]"
          aria-label="Filter by status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            list.setPage(1);
          }}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          className="w-[180px]"
          aria-label="Real or simulated"
          value={simulated}
          onChange={(e) => {
            setSimulated(e.target.value as '' | 'true' | 'false');
            list.setPage(1);
          }}
        >
          {SIMULATED_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
      </FAListToolbar>

      <FAListFrame
        data={data}
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        emptyText="No fixed-asset GRPO yet."
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
      >
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-2 text-left font-medium">Entry</th>
              <th className="p-2 text-left font-medium">PO</th>
              <th className="p-2 text-left font-medium">Status</th>
              <th className="p-2 text-left font-medium">SAP doc</th>
              <th className="p-2 text-right font-medium">Total</th>
              <th className="p-2 text-left font-medium">When</th>
              <th className="p-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.results.map((posting) => {
              const pos = posting.po_numbers?.length
                ? posting.po_numbers.join(', ')
                : posting.po_number;
              const unsent = posting.status !== 'POSTED';
              return (
                <tr key={posting.id} className="border-t">
                  <td className="p-2 font-medium">{posting.entry_no}</td>
                  <td className="p-2">{pos || '—'}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap items-center gap-1">
                      <FAPostingStatusBadge status={posting.status} simulated={posting.simulated} />
                      {posting.is_superseded && (
                        <span className="text-xs text-muted-foreground">(resolved later)</span>
                      )}
                    </div>
                    {posting.status === 'FAILED' && posting.error_message && (
                      <div
                        className="mt-1 max-w-xs truncate text-xs text-red-600"
                        title={posting.error_message}
                      >
                        {posting.error_message}
                      </div>
                    )}
                  </td>
                  <td className="p-2">{posting.sap_doc_num ?? '—'}</td>
                  <td className="p-2 text-right">
                    {posting.sap_doc_total && !posting.simulated
                      ? Number(posting.sap_doc_total).toLocaleString('en-IN', {
                          style: 'currency',
                          currency: 'INR',
                        })
                      : '—'}
                  </td>
                  <td className="p-2 whitespace-nowrap">
                    {formatDateTimeShort(posting.posted_at || posting.created_at)}
                  </td>
                  <td className="p-2">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(faGrpoPaths.historyDetail(posting.id))}
                      >
                        <Eye className="mr-1 h-3.5 w-3.5" /> View
                      </Button>
                      {unsent && !posting.is_superseded && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(faGrpoPaths.preview(posting.vehicle_entry))}
                        >
                          <FileCheck2 className="mr-1 h-3.5 w-3.5" /> Open entry
                        </Button>
                      )}
                      <FAGRPOPrintButton posting={posting} />
                      {posting.simulated && canPost && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          disabled={discard.isPending}
                          onClick={() => void handleDiscard(posting)}
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" /> Discard
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </FAListFrame>
    </div>
  );
}
