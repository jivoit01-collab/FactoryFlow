/**
 * One SAP production order: its components against their plan, the issues and
 * receipts made, and what was done to it from this app.
 *
 * Ported from SAP Portal's order modal, Issue, Receipt and Close pages. Each
 * action shows only when SAP would accept it (release a planned order; issue,
 * receive or close a released one) and only with the right its endpoint checks.
 */
import { ArrowDownToLine, ArrowUpFromLine, Lock, Play } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { EXECUTION_PERMISSIONS } from '@/config/permissions';
import { usePermission } from '@/core/auth';
import { confirmSapPost } from '@/shared/components';
import {
  PageHeader,
  PageSection,
  ROW_CLASSES,
  StatTile,
  StatTileRow,
  StatusPill,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  TableLoading,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components/page';
import { Button } from '@/shared/components/ui';
import { formatDateTimeShort } from '@/shared/utils';

import { useCloseSapOrder, useReleaseSapOrder, useSapOrder } from '../api/sapOrders.queries';
import { IssueDialog } from '../components/IssueDialog';
import { ReceiptDialog } from '../components/ReceiptDialog';
import { percent, qty, remaining, sapDate, STATUS_TONE } from '../utils/format';
import { postToSap } from '../utils/postToSap';

export default function SapOrderDetailPage() {
  const docEntry = Number(useParams().docEntry);
  const { hasPermission } = usePermission();
  const query = useSapOrder(docEntry);
  const release = useReleaseSapOrder();
  const close = useCloseSapOrder();
  const [issuing, setIssuing] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const order = query.data;

  const canReleaseClose = hasPermission(EXECUTION_PERMISSIONS.RELEASE_CLOSE_SAP_ORDERS);
  const canIssue = hasPermission(EXECUTION_PERMISSIONS.ISSUE_SAP_ORDERS);
  const canReceive = hasPermission(EXECUTION_PERMISSIONS.RECEIVE_SAP_ORDERS);

  if (query.isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading the order from SAP…</p>;
  if (!order) return <p className="p-6 text-sm text-muted-foreground">This production order could not be read from SAP.</p>;

  const number = order.doc_num ?? order.doc_entry;

  const doRelease = async () => {
    const ok = await confirmSapPost({
      title: `Release production order ${number} in SAP?`,
      details: [{ label: 'Product', value: `${order.item_code} — ${order.item_name}` }],
      confirmLabel: 'Release',
    });
    if (!ok) return;
    if ((await postToSap(() => release.mutateAsync(order.doc_entry).then(() => true))) !== null) {
      toast.success(`Order ${number} released in SAP`);
    }
  };

  const doClose = async () => {
    const ok = await confirmSapPost({
      title: `Close production order ${number} in SAP?`,
      description: 'A closed order takes no more issues or receipts.',
      details: [
        { label: 'Received', value: `${qty(order.received_quantity)} of ${qty(order.planned_quantity)} ${order.uom}` },
      ],
      confirmLabel: 'Close order',
      destructive: true,
    });
    if (!ok) return;
    if ((await postToSap(() => close.mutateAsync(order.doc_entry).then(() => true))) !== null) {
      toast.success(`Order ${number} closed in SAP`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Production order ${number}`}
        description={`${order.item_code} — ${order.item_name}`}
        backTo="/production/sap-orders"
        backLabel="SAP production orders"
        meta={
          <StatusPill tone={STATUS_TONE[order.status]} dot>
            {order.status_label}
          </StatusPill>
        }
      >
        {order.status === 'P' && canReleaseClose && (
          <Button onClick={doRelease} disabled={release.isPending}>
            <Play className="mr-2 h-4 w-4" /> Release
          </Button>
        )}
        {order.status === 'R' && canIssue && (
          <Button variant="outline" onClick={() => setIssuing(true)}>
            <ArrowUpFromLine className="mr-2 h-4 w-4" /> Issue components
          </Button>
        )}
        {order.status === 'R' && canReceive && (
          <Button variant="outline" onClick={() => setReceiving(true)}>
            <ArrowDownToLine className="mr-2 h-4 w-4" /> Receive product
          </Button>
        )}
        {order.status === 'R' && canReleaseClose && (
          <Button variant="outline" onClick={doClose} disabled={close.isPending}>
            <Lock className="mr-2 h-4 w-4" /> Close
          </Button>
        )}
      </PageHeader>

      <StatTileRow>
        <StatTile label="Planned" value={`${qty(order.planned_quantity)} ${order.uom}`} sub={`Due ${sapDate(order.due_date)}`} />
        <StatTile
          label="Received"
          value={`${qty(order.received_quantity)} ${order.uom}`}
          sub={`${percent(order.received_quantity, order.planned_quantity)}% of plan`}
        />
        <StatTile label="Rejected" value={qty(order.rejected_quantity)} sub="As SAP records it" />
        <StatTile label="Warehouse" value={order.warehouse || '-'} sub={order.start_date ? `Started ${sapDate(order.start_date)}` : undefined} />
      </StatTileRow>

      <PageSection title="Components" description="Each line against its own plan">
        <TableCard>
          <table className={TABLE_CLASSES}>
            <thead className={THEAD_CLASSES}>
              <tr>
                <Th>#</Th>
                <Th>Component</Th>
                <Th>Warehouse</Th>
                <Th align="right">Planned</Th>
                <Th align="right">Issued</Th>
                <Th align="right">Still to issue</Th>
              </tr>
            </thead>
            <tbody>
              {order.lines.length === 0 ? (
                <TableEmpty colSpan={6} message="SAP has no component lines on this order" />
              ) : (
                order.lines.map((line) => (
                  <tr key={line.line_num} className={ROW_CLASSES}>
                    <Td numeric>{line.line_num}</Td>
                    <Td>
                      <div className="font-medium">
                        {line.item_code}
                        {line.is_resource && <span className="ml-1 text-xs text-muted-foreground">(resource)</span>}
                        {line.batch_managed && <span className="ml-1 text-xs text-muted-foreground">(batches)</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">{line.item_name}</div>
                    </Td>
                    <Td>{line.warehouse || '-'}</Td>
                    <Td numeric>
                      {qty(line.planned_quantity)} {line.uom}
                    </Td>
                    <Td numeric>{qty(line.issued_quantity)}</Td>
                    <Td numeric>{qty(remaining(line.planned_quantity, line.issued_quantity))}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableCard>
      </PageSection>

      <div className="grid gap-6 lg:grid-cols-2">
        <PageSection title="Issues" description="Goods issues posted against this order">
          <MovementTable rows={order.issues} empty="Nothing issued yet" />
        </PageSection>
        <PageSection title="Receipts" description="Finished goods received from this order">
          <MovementTable rows={order.receipts} empty="Nothing received yet" />
        </PageSection>
      </div>

      <PageSection title="Done from this app" description="Who created, released, issued, received or closed — SAP records only the service account">
        <TableCard>
          <table className={TABLE_CLASSES}>
            <thead className={THEAD_CLASSES}>
              <tr>
                <Th>When</Th>
                <Th>Action</Th>
                <Th align="right">Quantity</Th>
                <Th>SAP document</Th>
                <Th>By</Th>
              </tr>
            </thead>
            <tbody>
              {query.isFetching && order.actions.length === 0 ? (
                <TableLoading colSpan={5} />
              ) : order.actions.length === 0 ? (
                <TableEmpty colSpan={5} message="Nothing done to this order from the app" />
              ) : (
                order.actions.map((action) => (
                  <tr key={action.id} className={ROW_CLASSES}>
                    <Td>{formatDateTimeShort(action.created_at)}</Td>
                    <Td>{action.action_label}</Td>
                    <Td numeric>{action.quantity ? qty(Number(action.quantity)) : '-'}</Td>
                    <Td>
                      {action.pending_approval_draft
                        ? `Draft ${action.pending_approval_draft} (awaiting approval)`
                        : action.sap_doc_num ?? action.sap_doc_entry ?? '-'}
                    </Td>
                    <Td>{action.taken_by || '-'}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableCard>
      </PageSection>

      {issuing && <IssueDialog order={order} open={issuing} onOpenChange={setIssuing} />}
      {receiving && <ReceiptDialog order={order} open={receiving} onOpenChange={setReceiving} />}
    </div>
  );
}

function MovementTable({
  rows,
  empty,
}: {
  rows: { doc_entry: number; doc_num: number | null; date: string | null; quantity: number; comments: string }[];
  empty: string;
}) {
  return (
    <TableCard>
      <table className={TABLE_CLASSES}>
        <thead className={THEAD_CLASSES}>
          <tr>
            <Th>Document</Th>
            <Th>Posted</Th>
            <Th align="right">Quantity</Th>
            <Th>Remarks</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <TableEmpty colSpan={4} message={empty} />
          ) : (
            rows.map((row) => (
              <tr key={row.doc_entry} className={ROW_CLASSES}>
                <Td numeric>{row.doc_num ?? row.doc_entry}</Td>
                <Td>{sapDate(row.date)}</Td>
                <Td numeric>{qty(row.quantity)}</Td>
                <Td className="max-w-xs truncate" title={row.comments}>
                  {row.comments || '-'}
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </TableCard>
  );
}
