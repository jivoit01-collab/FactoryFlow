/**
 * One licence: what it is, and every bill of entry and shipping bill against it.
 *
 * The two legs sit side by side, the one that creates the obligation first —
 * imports on an Advance Authorisation, exports on a DFIA — so the page reads in
 * the order the licence is worked. Every line write comes back with the licence
 * as it now stands, so the figures at the top move the moment a line is saved.
 */
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  FileBadge,
  Link2,
  Pencil,
  Plus,
  Scale,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { licenceRight } from '@/config/permissions/exim.permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import {
  confirmDialog,
  EmptyPanel,
  PageHeader,
  ROW_CLASSES,
  StatTile,
  StatTileRow,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components';
import { Button } from '@/shared/components/ui';
import { cn, formatDateTimeShort, formatDay } from '@/shared/utils';

import { useDeleteLicence, useDeleteLine, useLicence } from '../api';
import {
  DIRECTION_COPY,
  firstLeg,
  KIND_COPY,
  LicenceFormDialog,
  LicenceLineDialog,
  LicenceStatusPill,
  secondLeg,
  ValidityChip,
} from '../components';
import type { LicenceDetail, LicenceLine, LineDirection } from '../types';
import { fmtMoney, fmtQty } from '../utils';

function LegTable({
  licence,
  direction,
  onAdd,
  onEdit,
}: {
  licence: LicenceDetail;
  direction: LineDirection;
  onAdd: () => void;
  onEdit: (line: LicenceLine) => void;
}) {
  const { hasPermission } = usePermission();
  const copy = DIRECTION_COPY[direction];
  const lines = licence.lines.filter((l) => l.direction === direction);
  const linked = direction === secondLeg(licence.kind);
  const total = lines.reduce((sum, l) => sum + Number(l.quantity_mts), 0);
  const remove = useDeleteLine();

  const canAdd = hasPermission(licenceRight('add', licence.kind, direction));
  const canChange = hasPermission(licenceRight('change', licence.kind, direction));
  const canDelete = hasPermission(licenceRight('delete', licence.kind, direction));
  // EXIM stopped more exports once an Advance licence's obligation was met;
  // the second leg of a DFIA it never stopped. Kept as it was.
  const obligationMet =
    licence.kind === 'ADVANCE' &&
    direction === 'EXPORT' &&
    licence.balance_mts !== null &&
    Number(licence.balance_mts) <= 0;

  async function onDelete(line: LicenceLine) {
    const confirmed = await confirmDialog({
      title: `Remove ${copy.one} ${line.document_no}?`,
      description: `${fmtQty(line.quantity_mts)} MT comes off ${licence.number}'s totals.`,
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await remove.mutateAsync(line.id);
      toast.success(`${line.document_no} removed`);
    } catch {
      // The API client has already shown why.
    }
  }

  const columns = linked ? 7 : 6;

  return (
    <TableCard
      summary={
        <span>
          <span className="font-semibold text-foreground">{copy.title}</span>
          {' · '}
          {lines.length} {copy.one}
          {lines.length === 1 ? '' : 's'} · {fmtQty(total)} MT
        </span>
      }
      actions={
        canAdd && (
          <Button
            size="sm"
            onClick={onAdd}
            disabled={obligationMet}
            title={obligationMet ? 'The export obligation is met.' : undefined}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add {copy.one}
          </Button>
        )
      }
    >
      <table className={TABLE_CLASSES}>
        <thead className={THEAD_CLASSES}>
          <tr>
            <Th className="w-10">#</Th>
            <Th>{copy.docLabel}</Th>
            <Th>{copy.dateLabel}</Th>
            {linked && <Th>Against</Th>}
            <Th align="right">Value (USD)</Th>
            <Th align="right">MT</Th>
            {/* Labelled rather than holding an sr-only span: that span is absolutely
                  positioned, escapes the scrolling table, and widens the whole page. */}
            <Th align="right" className="w-24" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <TableEmpty colSpan={columns} message={`No ${copy.one}s yet`} />
          ) : (
            lines.map((line, index) => (
              <tr key={line.id} className={ROW_CLASSES}>
                <Td className="text-muted-foreground tabular-nums">{index + 1}</Td>
                <Td className="font-mono font-medium">{line.document_no}</Td>
                <Td className="whitespace-nowrap">{formatDay(line.document_date)}</Td>
                {linked && (
                  <Td className="text-muted-foreground">
                    {line.linked_document_no ? (
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Link2 className="h-3.5 w-3.5" />
                        {line.linked_document_no}
                      </span>
                    ) : (
                      '—'
                    )}
                  </Td>
                )}
                <Td numeric>{fmtMoney(line.value_usd)}</Td>
                <Td numeric className="font-medium">
                  {fmtQty(line.quantity_mts)}
                </Td>
                <Td align="right">
                  <div className="flex justify-end gap-1">
                    {canChange && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${line.document_no}`}
                        onClick={() => onEdit(line)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${line.document_no}`}
                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-500/10"
                        onClick={() => onDelete(line)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </TableCard>
  );
}

export default function LicenceDetailPage() {
  const { licenceId } = useParams<{ licenceId: string }>();
  const id = Number(licenceId);
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const { data: licence, isLoading, isError } = useLicence(id);
  const removeLicence = useDeleteLicence();

  const [editOpen, setEditOpen] = useState(false);
  const [lineDialog, setLineDialog] = useState<{
    direction: LineDirection;
    line: LicenceLine | null;
  } | null>(null);

  if (isLoading) {
    return <EmptyPanel loading message="Loading the licence…" />;
  }
  if (isError || !licence) {
    return (
      <EmptyPanel
        icon={AlertTriangle}
        message="This licence could not be opened"
        hint="It may have been deleted, or it belongs to another company."
        action={
          <Button variant="outline" onClick={() => navigate('/exim/licences')}>
            Back to the register
          </Button>
        }
      />
    );
  }

  const copy = KIND_COPY[licence.kind];
  const registerLink = `/exim/licences${licence.kind === 'DFIA' ? '?kind=DFIA' : ''}`;
  const canChange = hasPermission(licenceRight('change', licence.kind));
  const canDelete = hasPermission(licenceRight('delete', licence.kind));

  async function onDelete() {
    if (!licence) return;
    const confirmed = await confirmDialog({
      title: `Delete ${licence.number}?`,
      description: `The licence and its ${licence.lines.length} line${licence.lines.length === 1 ? '' : 's'} are removed.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await removeLicence.mutateAsync(licence.id);
      toast.success(`${licence.number} deleted`);
      navigate(registerLink);
    } catch {
      // The API client has already shown why.
    }
  }

  const legs = [firstLeg(licence.kind), secondLeg(licence.kind)];
  const balance = licence.balance_mts;

  return (
    <div className="space-y-6">
      <PageHeader
        title={<span className="font-mono">{licence.number}</span>}
        description={`${copy.title} · issued ${formatDay(licence.issue_date)}`}
        icon={FileBadge}
        accent="teal"
        backTo={registerLink}
        backLabel="Export Licences"
        meta={<LicenceStatusPill status={licence.status} />}
      >
        {canChange && (
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-1.5 h-4 w-4" />
            Edit
          </Button>
        )}
        {canDelete && (
          <Button
            variant="outline"
            className="text-rose-600 hover:text-rose-700"
            onClick={onDelete}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Delete
          </Button>
        )}
      </PageHeader>

      <StatTileRow>
        <StatTile
          label="Import validity"
          value={formatDay(licence.import_validity)}
          sub={<ValidityChip date={licence.import_validity} status={licence.status} />}
          icon={CalendarDays}
          accent="sky"
        />
        <StatTile
          label="Export validity"
          value={formatDay(licence.export_validity)}
          sub={<ValidityChip date={licence.export_validity} status={licence.status} />}
          icon={CalendarClock}
          accent="sky"
        />
        <StatTile
          label="CIF value"
          value={`₹ ${fmtMoney(licence.cif_value_inr)}`}
          sub={`$ ${fmtMoney(licence.cif_value_usd)} at ${licence.cif_exchange_rate}`}
        />
        <StatTile
          label="FOB value"
          value={`₹ ${fmtMoney(licence.fob_value_inr)}`}
          sub={`$ ${fmtMoney(licence.fob_value_usd)} at ${licence.fob_exchange_rate}`}
        />
      </StatTileRow>

      <StatTileRow>
        <StatTile
          label={copy.authorisedLabel.replace(' (MT)', '')}
          value={fmtQty(licence.authorised_qty_mts)}
          sub="MT, as issued"
        />
        <StatTile label="Imported" value={fmtQty(licence.total_import_mts)} sub="MT" />
        <StatTile label="Exported" value={fmtQty(licence.total_export_mts)} sub="MT" />
        <StatTile
          label={copy.obligationLabel.replace(' (MT)', '')}
          value={fmtQty(licence.obligation_mts)}
          sub={`MT · ${DIRECTION_COPY[firstLeg(licence.kind)].title.toLowerCase()} less 3.1%`}
          accent="indigo"
          icon={Scale}
        />
        <StatTile
          label="Balance"
          value={
            <span className={cn(balance !== null && Number(balance) < 0 && 'text-rose-600')}>
              {fmtQty(balance)}
            </span>
          }
          sub={
            balance !== null && Number(balance) < 0
              ? `MT past the ${licence.kind === 'ADVANCE' ? 'obligation' : 'entitlement'}`
              : `MT still to ${licence.kind === 'ADVANCE' ? 'export' : 'import'}`
          }
          accent="indigo"
          icon={Scale}
        />
      </StatTileRow>

      <div className="grid gap-4 xl:grid-cols-2">
        {legs.map((direction) => (
          <LegTable
            key={direction}
            licence={licence}
            direction={direction}
            onAdd={() => setLineDialog({ direction, line: null })}
            onEdit={(line) => setLineDialog({ direction, line })}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        {licence.copied_from_exim
          ? 'Brought across from EXIM'
          : `Added by ${licence.created_by_name ?? '—'}`}
        {' · '}last changed {formatDateTimeShort(licence.updated_at)}
        {licence.updated_by_name ? ` by ${licence.updated_by_name}` : ''}
      </p>

      <LicenceFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        kind={licence.kind}
        licence={licence}
      />
      {lineDialog && (
        <LicenceLineDialog
          open
          onOpenChange={(value) => !value && setLineDialog(null)}
          licence={licence}
          direction={lineDialog.direction}
          line={lineDialog.line}
        />
      )}
    </div>
  );
}
