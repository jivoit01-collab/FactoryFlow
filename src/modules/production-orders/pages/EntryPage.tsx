/**
 * One production entry at a glance: where it stands in its five SAP steps,
 * the SAP document each produced, and the way on to the next step's page.
 */
import { ArrowRight, Factory, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { PRODUCTION_ORDERS_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { confirmDialog } from '@/shared/components';
import {
  EmptyPanel,
  PageHeader,
  PageSection,
  StatusPill,
  TABLE_CLASSES,
  TableCard,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components/page';
import { Button } from '@/shared/components/ui';
import { formatDateTimeShort, getErrorMessage } from '@/shared/utils';

import { useDeleteEntry } from '../api';
import { LinesTable } from '../components/LinesTable';
import { SapLoginNotice } from '../components/SapLoginNotice';
import { useStepEntry } from '../hooks/useStepEntry';
import { boxesLabel, dateLabel, POSTING_TONE, qty, STATUS_TONE, STEP_LABEL } from '../utils/format';
import { stepPath } from '../utils/steps';

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

export default function EntryPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const { entry: query, me } = useStepEntry();
  const remove = useDeleteEntry();
  if (query.isLoading) return <EmptyPanel loading message="Loading the entry…" />;
  if (!query.data) {
    return <EmptyPanel message={getErrorMessage(query.error, 'This entry could not be loaded.')} />;
  }
  const entry = query.data;
  const next = entry.next_step;
  const nextRow = entry.steps.find((step) => step.step === next);
  const deletable =
    entry.status === 'DRAFT' &&
    !entry.sap_order_entry &&
    hasPermission(PRODUCTION_ORDERS_PERMISSIONS.CREATE);

  const deleteDraft = async () => {
    const ok = await confirmDialog({
      title: `Delete ${entry.entry_no}?`,
      description: 'The draft has not reached SAP. Deleting it cannot be undone.',
      confirmLabel: 'Delete draft',
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(entry.id);
      toast.success(`${entry.entry_no} deleted.`);
      navigate('/production-orders');
    } catch (error) {
      toast.error(getErrorMessage(error, 'The draft could not be deleted.'));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={entry.entry_no}
        icon={Factory}
        accent="emerald"
        backTo="/production-orders"
        backLabel="Production orders"
        meta={
          <StatusPill tone={STATUS_TONE[entry.status]} dot>
            {entry.status_label}
          </StatusPill>
        }
      >
        {deletable && (
          <Button variant="outline" onClick={deleteDraft} disabled={remove.isPending}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete draft
          </Button>
        )}
        {next && (
          <Button onClick={() => navigate(stepPath(entry.id, next))}>
            {nextRow?.can_take ? `Continue: ${STEP_LABEL[next]}` : `Open ${STEP_LABEL[next]}`}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </PageHeader>
      <SapLoginNotice login={me?.sap_login} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <PageSection title="What was made">
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <div className="sm:col-span-3">
              <dt className="text-xs text-muted-foreground">Product</dt>
              <dd className="font-medium">
                <span className="font-mono">{entry.item_code}</span> — {entry.item_name}
              </dd>
            </div>
            <Fact label="Made">
              {boxesLabel(entry.boxes, entry.loose_pieces)}
              <span className="block text-xs font-normal text-muted-foreground">
                {qty(entry.quantity)} pcs
              </span>
            </Fact>
            <Fact label="Posting date">{dateLabel(entry.posting_date)}</Fact>
            <Fact label="Received into">{entry.warehouse}</Fact>
            <Fact label="Variety">{entry.variety || '—'}</Fact>
            <Fact label="Batch">
              <span className="font-mono">{entry.batch_number || '—'}</span>
            </Fact>
            <Fact label="Entered by">{entry.created_by_name || '—'}</Fact>
            {entry.remarks && (
              <div className="sm:col-span-3">
                <dt className="text-xs text-muted-foreground">Remarks</dt>
                <dd>{entry.remarks}</dd>
              </div>
            )}
          </dl>
        </PageSection>

        <TableCard summary="In SAP">
          <table className={TABLE_CLASSES}>
            <thead className={THEAD_CLASSES}>
              <tr>
                <Th>Step</Th>
                <Th>SAP</Th>
                <Th>By</Th>
              </tr>
            </thead>
            <tbody>
              {entry.steps.map((row) => (
                <tr
                  key={row.step}
                  className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                  onClick={() => navigate(stepPath(entry.id, row.step))}
                >
                  <Td className="font-medium">{STEP_LABEL[row.step]}</Td>
                  <Td>
                    {row.done ? (
                      <span className="font-mono text-xs">{row.sap_doc_num ?? 'Done'}</span>
                    ) : row.posting && row.posting.status !== 'POSTED' ? (
                      <StatusPill tone={POSTING_TONE[row.posting.status]} dot>
                        {row.posting.status_label}
                      </StatusPill>
                    ) : (
                      <span className="text-muted-foreground">{row.is_next ? 'Next' : '—'}</span>
                    )}
                  </Td>
                  <Td className="text-xs text-muted-foreground">
                    {row.done ? `${row.by} · ${formatDateTimeShort(row.at)}` : ''}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>

      <LinesTable
        lines={entry.lines}
        summary={`${entry.lines.length} lines, from the BOM${entry.sap_order_num ? ` · SAP order ${entry.sap_order_num}` : ''}`}
      />
    </div>
  );
}
