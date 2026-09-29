/**
 * One oil lot: EXIM's view sheet, as a page of its own so it can be linked to.
 *
 * What the lot is and where it stands, the way it has come (the journey), the
 * lot it was split from and the lots split from it, and every change made to
 * it. A lot that has closed — removed, used up by a dispatch, or merged into
 * the lot collecting arrivals at a refinery — still opens here, for its
 * history, but can no longer be moved or corrected.
 */
import {
  AlertTriangle,
  ArrowRightLeft,
  CalendarClock,
  CalendarDays,
  Droplets,
  GitFork,
  History,
  IndianRupee,
  Pencil,
  Scale,
  Trash2,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { EXIM_PERMISSIONS } from '@/config/permissions/exim.permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import {
  confirmDialog,
  EmptyPanel,
  PageHeader,
  ROW_CLASSES,
  StatTile,
  StatTileRow,
  StatusPill,
  TABLE_CLASSES,
  TableCard,
  TableEmpty,
  Td,
  Th,
  THEAD_CLASSES,
} from '@/shared/components';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui';
import { cn, formatDateTimeShort, formatDay } from '@/shared/utils';

import { useDeleteLot, useLot } from '../../api';
import { LOT_STATUS_LABEL, LotStatusPill, PAYMENT_STATUSES, PaymentMark } from '../../components';
import {
  ChangeLines,
  ContractChip,
  ContractPeriod,
  LotLink,
  MapLink,
  OilName,
} from '../../components/lots/LotBits';
import {
  ARRIVED_STATUSES,
  contractDays,
  dayCountdown,
  fmtRate,
  fmtRupeesShort,
  statusDates,
} from '../../components/lots/lotFormat';
import { LotFormDialog } from '../../components/lots/LotFormDialog';
import { LotJourney } from '../../components/lots/LotJourney';
import { LotStatusDialog } from '../../components/lots/LotStatusDialog';
import type { LotBrief, LotDetail } from '../../types';
import { daysUntil, fmtKg, fmtLitres, fmtMoney } from '../../utils';

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm">{children || '—'}</dd>
    </div>
  );
}

/** The tile for when: arrived, due, or — for a contract — when it ends. */
function WhenTile({ lot }: { lot: LotDetail }) {
  if (lot.arrival_date) {
    return (
      <StatTile
        label="Arrived"
        value={formatDay(lot.arrival_date)}
        sub={lot.eta ? `ETA was ${formatDay(lot.eta)}` : undefined}
        icon={CalendarDays}
        accent="emerald"
      />
    );
  }
  if (lot.status === 'IN_CONTRACT' && lot.contract_end) {
    const { periodDays } = contractDays(lot.contract_start, lot.contract_end);
    return (
      <StatTile
        label="Contract ends"
        value={formatDay(lot.contract_end)}
        sub={
          <span className="inline-flex items-center gap-1.5">
            <ContractChip end={lot.contract_end} />
            {periodDays !== null && periodDays >= 0 && <span>of {periodDays} days</span>}
          </span>
        }
        icon={CalendarClock}
        accent="amber"
      />
    );
  }
  const days = daysUntil(lot.eta);
  return (
    <StatTile
      label="ETA"
      value={formatDay(lot.eta)}
      sub={days === null ? 'not given' : dayCountdown(days)}
      icon={CalendarClock}
      accent="sky"
    />
  );
}

function SplitRow({ brief, relation }: { brief: LotBrief; relation?: string }) {
  return (
    <tr className={ROW_CLASSES}>
      <Td>
        <LotLink id={brief.id} />
      </Td>
      <Td>
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <LotStatusPill status={brief.status} />
          {brief.deleted && <StatusPill tone="neutral">Closed</StatusPill>}
        </span>
      </Td>
      <Td numeric className="whitespace-nowrap">
        {fmtKg(brief.quantity)}
      </Td>
      <Td className="whitespace-nowrap font-mono">{brief.vehicle_number || '—'}</Td>
      {relation !== undefined && <Td className="text-muted-foreground">{relation}</Td>}
    </tr>
  );
}

export default function LotDetailPage() {
  const { lotId } = useParams<{ lotId: string }>();
  const id = Number(lotId);
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const { data: lot, isLoading, isError } = useLot(id);
  const remove = useDeleteLot();

  const [editOpen, setEditOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  if (isLoading) return <EmptyPanel loading message="Loading the lot…" />;
  if (isError || !lot) {
    return (
      <EmptyPanel
        icon={AlertTriangle}
        message="This lot could not be opened"
        hint="It may belong to another company, or the link is wrong."
        action={
          <Button variant="outline" onClick={() => navigate('/exim/lots')}>
            Back to the lots
          </Button>
        }
      />
    );
  }

  const live = !lot.deleted;
  const canChange = live && hasPermission(EXIM_PERMISSIONS.LOT_CHANGE);
  const canDelete = live && hasPermission(EXIM_PERMISSIONS.LOT_DELETE);
  const canSeeLog = hasPermission(EXIM_PERMISSIONS.CHANGE_LOG_VIEW);
  const dates = statusDates(lot.history);

  async function onDelete() {
    if (!lot) return;
    const confirmed = await confirmDialog({
      title: `Remove lot #${lot.id}?`,
      description: `${fmtKg(lot.quantity)} kg of ${lot.item_name} leaves every list. Its history stays.`,
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await remove.mutateAsync(lot.id);
      toast.success(`Lot #${lot.id} removed`);
      navigate('/exim/lots');
    } catch {
      // The API client has already shown why.
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={<span className="font-mono">Lot #{lot.id}</span>}
        description={`${lot.item_name} (${lot.item_code}) from ${lot.vendor_name || lot.vendor_code}`}
        icon={Droplets}
        accent="teal"
        backTo="/exim/lots"
        backLabel="Oil Lots"
        meta={
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <LotStatusPill status={lot.status} />
            <PaymentMark status={lot.status} payment={lot.payment_status} />
            {lot.is_accumulator && <StatusPill tone="info">Collects refinery arrivals</StatusPill>}
            {!live && <StatusPill tone="neutral">Closed</StatusPill>}
          </span>
        }
      >
        {canChange && (
          <Button onClick={() => setMoveOpen(true)}>
            <ArrowRightLeft className="mr-1.5 h-4 w-4" />
            Change status
          </Button>
        )}
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
            Remove
          </Button>
        )}
      </PageHeader>

      {!live && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            This lot is closed: it was removed, used up by a dispatch, or joined the lot collecting
            arrivals at a refinery. It stays for its history and can no longer be moved.
            {lot.children.length > 0 && ' The lots split from it are listed below.'}
          </p>
        </div>
      )}

      <StatTileRow>
        <StatTile
          label="Quantity"
          value={`${fmtKg(lot.quantity)} kg`}
          sub={`${fmtLitres(lot.quantity_litres)} litres`}
          icon={Scale}
          accent="indigo"
        />
        <StatTile
          label="Rate"
          value={`₹ ${fmtRate(lot.rate)}`}
          sub={
            lot.rate_per_litre ? `per kg · ₹ ${fmtRate(lot.rate_per_litre)} per litre` : 'per kg'
          }
          icon={IndianRupee}
          accent="emerald"
        />
        <StatTile
          label="Value"
          value={fmtRupeesShort(lot.total)}
          sub={`₹ ${fmtMoney(lot.total)}`}
          icon={IndianRupee}
          accent="emerald"
        />
        <WhenTile lot={lot} />
      </StatTileRow>

      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Journey</CardTitle>
          <CardDescription>From contract to tank, as far as this lot has come.</CardDescription>
        </CardHeader>
        <CardContent>
          <LotJourney status={lot.status} dates={dates} />
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <Fact label="Oil">
              <OilName name={lot.item_name} code={lot.item_code} color={lot.item_color} />
            </Fact>
            <Fact label="Vendor">
              <span className="block">{lot.vendor_name || '—'}</span>
              <span className="block font-mono text-xs text-muted-foreground">
                {lot.vendor_code}
              </span>
            </Fact>
            <Fact label="Status">{LOT_STATUS_LABEL[lot.status]}</Fact>
            <Fact label="Vehicle">
              {lot.vehicle_number && <span className="font-mono">{lot.vehicle_number}</span>}
            </Fact>
            <Fact label="Transporter">{lot.transporter}</Fact>
            <Fact label="Location">
              {lot.location && (
                <span className="inline-flex items-center gap-1">
                  {lot.location}
                  <MapLink location={lot.location} />
                </span>
              )}
            </Fact>
            <Fact label="ETA">{lot.eta && formatDay(lot.eta)}</Fact>
            <Fact label="Arrival date">
              {lot.arrival_date
                ? formatDay(lot.arrival_date)
                : ARRIVED_STATUSES.includes(lot.status)
                  ? 'Not recorded'
                  : ''}
            </Fact>
            {PAYMENT_STATUSES.includes(lot.status) && (
              <Fact label="Payment">{lot.payment_status === 'PAID' ? 'Paid' : 'Unpaid'}</Fact>
            )}
            {(lot.job_work || lot.status === 'AT_REFINERY') && (
              <Fact label="Job work at">{lot.job_work}</Fact>
            )}
            {(lot.bilty_number || lot.grpo_number || ARRIVED_STATUSES.includes(lot.status)) && (
              <>
                <Fact label="Bilty number">{lot.bilty_number}</Fact>
                <Fact label="GRPO number">{lot.grpo_number}</Fact>
              </>
            )}
            {(lot.contract_start || lot.contract_end) && (
              <Fact label="Contract">
                {formatDay(lot.contract_start)} to {formatDay(lot.contract_end)}
              </Fact>
            )}
            <Fact label="Entered">
              {formatDateTimeShort(lot.created_at)}
              {lot.created_by_name ? ` by ${lot.created_by_name}` : ''}
            </Fact>
            <Fact label="Last changed">{formatDateTimeShort(lot.updated_at)}</Fact>
          </dl>
          {lot.status === 'IN_CONTRACT' && (lot.contract_start || lot.contract_end) && (
            <div className="mt-5 max-w-md">
              <ContractPeriod start={lot.contract_start} end={lot.contract_end} />
            </div>
          )}
        </CardContent>
      </Card>

      {(lot.parent_summary || lot.children.length > 0) && (
        <TableCard
          summary={
            <span className="inline-flex items-center gap-2">
              <GitFork className="h-4 w-4" />
              <span className="font-semibold text-foreground">Splits</span>
              {lot.parent_summary && ` · from lot #${lot.parent_summary.id}`}
              {lot.children.length > 0 &&
                ` · ${lot.children.length} lot${lot.children.length === 1 ? '' : 's'} split from this one`}
            </span>
          }
        >
          <table className={TABLE_CLASSES}>
            <thead className={THEAD_CLASSES}>
              <tr>
                <Th>Lot</Th>
                <Th>Status</Th>
                <Th align="right">Quantity (kg)</Th>
                <Th>Vehicle</Th>
                <Th>How</Th>
              </tr>
            </thead>
            <tbody>
              {lot.parent_summary && (
                <SplitRow brief={lot.parent_summary} relation="Where this lot came from" />
              )}
              {lot.children.map((child) => (
                <SplitRow key={child.id} brief={child} relation="Came from this lot" />
              ))}
            </tbody>
          </table>
        </TableCard>
      )}

      <TableCard
        summary={
          <span className="inline-flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="font-semibold text-foreground">History</span>
            {` · ${lot.history.length} change${lot.history.length === 1 ? '' : 's'}`}
          </span>
        }
        actions={
          canSeeLog && (
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/exim/lot-changes?lot=${lot.id}`}>Open in the change log</Link>
            </Button>
          )
        }
      >
        <table className={TABLE_CLASSES}>
          <thead className={THEAD_CLASSES}>
            <tr>
              <Th>When</Th>
              <Th>By</Th>
              <Th>What</Th>
            </tr>
          </thead>
          <tbody>
            {lot.history.length === 0 ? (
              <TableEmpty colSpan={3} message="Nothing recorded yet" />
            ) : (
              lot.history.map((change) => (
                <tr key={change.id} className={cn(ROW_CLASSES, 'align-top')}>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {formatDateTimeShort(change.timestamp)}
                  </Td>
                  <Td className="whitespace-nowrap">{change.changed_by_name ?? '—'}</Td>
                  <Td className="min-w-72">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <StatusPill tone={change.action === 'CREATE' ? 'done' : 'info'}>
                        {change.action === 'CREATE' ? 'Entered' : 'Changed'}
                      </StatusPill>
                      {change.note && (
                        <span className="inline-block text-sm text-muted-foreground first-letter:uppercase">
                          {change.note}
                        </span>
                      )}
                    </div>
                    <ChangeLines change={change} />
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableCard>

      <LotFormDialog open={editOpen} onOpenChange={setEditOpen} lot={lot} />
      {moveOpen && (
        <LotStatusDialog
          open
          onOpenChange={(value) => !value && setMoveOpen(false)}
          lot={lot}
          onMoved={(result, kind) => {
            // An arrival closes this lot into the refinery's: follow it there.
            if (kind === 'arrive' && result.id !== lot.id) navigate(`/exim/lots/${result.id}`);
          }}
        />
      )}
    </div>
  );
}
