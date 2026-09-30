/**
 * One domestic purchase order: its terms, and for each oil on it every truck
 * SAP has received (costed, as EXIM's DC sheet did) and every truck the gate
 * has booked that SAP has not received yet.
 *
 * Landed cost, per truck: the supplier's bill, plus freight on the tonnes
 * weighed in (EXW only), plus brokerage on the tonnes billed, over the tonnes
 * weighed in. The supplier bears the transit shortage past 0.25% of what was
 * loaded, at the contract rate; like the sheet, the landed cost does not take
 * that deduction off.
 */
import {
  AlertTriangle,
  Droplets,
  FileText,
  Hourglass,
  IndianRupee,
  PackageCheck,
  Pencil,
  RefreshCw,
  Scale,
  Truck,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

import { EXIM_PERMISSIONS } from '@/config/permissions/exim.permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import {
  EmptyPanel,
  PageHeader,
  PageSection,
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
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui';
import { cn, formatDateTimeShort, formatDay, getErrorMessage } from '@/shared/utils';

import { useContract } from '../../api';
import { ContractStagePill, Fact, GateStatusPill } from '../../components/contracts/ContractBits';
import {
  landedOf,
  receivedShare,
  registerPathFrom,
  TERMS_LABEL,
  TERMS_MEANING,
  tonnesPer,
  unitLabel,
} from '../../components/contracts/contractFormat';
import { ContractTermsDialog } from '../../components/contracts/ContractTermsDialog';
import type { ContractTerms, GateLoad, OilContract, ReceivedLoad } from '../../types';
import { fmtKg, fmtMoney, fmtQty } from '../../utils';

const RECEIVED_COLUMNS = 16;

function plural(n: number, one: string, many = `${one}s`) {
  return `${n.toLocaleString('en-IN')} ${n === 1 ? one : many}`;
}

/** A shortage, or — for a truck that came in heavier than it left — the gain, in green. */
function ShortageCell({ value }: { value: number | null }) {
  if (value === null)
    return (
      <Td numeric className="text-muted-foreground">
        —
      </Td>
    );
  if (value < 0) {
    return (
      <Td
        numeric
        className="whitespace-nowrap font-medium text-emerald-700 dark:text-emerald-400"
        title="Came in heavier than it was billed"
      >
        +{fmtQty(-value)} gained
      </Td>
    );
  }
  return (
    <Td
      numeric
      className={cn(
        'whitespace-nowrap',
        value > 0 && 'font-medium text-rose-600 dark:text-rose-400',
      )}
    >
      {fmtQty(value)}
    </Td>
  );
}

// --- the terms card -------------------------------------------------------------

function TermsCard({
  terms,
  canChange,
  onEdit,
}: {
  terms: ContractTerms;
  canChange: boolean;
  onEdit: () => void;
}) {
  const kind = terms.delivery_terms;
  const freight =
    kind === 'FOR'
      ? 'None: the supplier pays the truck'
      : terms.freight_per_mt
        ? `₹ ${fmtMoney(terms.freight_per_mt)} per MT weighed in`
        : kind === 'EXW'
          ? 'Not entered'
          : '';
  const brokerage = terms.brokerage_per_mt
    ? `₹ ${fmtMoney(terms.brokerage_per_mt)} per MT billed`
    : kind
      ? 'None'
      : '';

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0 pb-4">
        <div className="space-y-1.5">
          <CardTitle className="text-base">Delivery terms</CardTitle>
          <CardDescription>
            Who brings the oil in, and what that adds to the supplier&apos;s bill. SAP does not hold
            these; they are kept here, one set per PO.
          </CardDescription>
        </div>
        {canChange && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit terms
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="Delivery terms">
            <span
              className={cn('block font-medium', !kind && 'text-amber-700 dark:text-amber-400')}
            >
              {TERMS_LABEL[kind]}
            </span>
            <span className="block text-xs text-muted-foreground">{TERMS_MEANING[kind]}</span>
          </Fact>
          <Fact label="Freight">
            <span
              className={cn(
                kind === 'EXW' && !terms.freight_per_mt && 'text-amber-700 dark:text-amber-400',
              )}
            >
              {freight}
            </span>
          </Fact>
          <Fact label="Brokerage">{brokerage}</Fact>
          <Fact label="Note">{terms.note}</Fact>
        </dl>
        {!kind && (
          <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Terms not set: every landed cost on this page is the supplier&apos;s bill alone, and
              leaves out freight{terms.brokerage_per_mt ? '' : ' and brokerage'}.
              {canChange ? ' Edit terms to add them.' : ''}
            </span>
          </p>
        )}
        {kind === 'EXW' && !terms.freight_per_mt && (
          <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              We pay the truck on this PO, but no freight is entered, so the landed cost leaves it
              out.
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// --- one oil on the PO ----------------------------------------------------------

function ReceivedTable({ line }: { line: OilContract }) {
  const loads: ReceivedLoad[] = line.loads ?? [];
  const unit = unitLabel(line.unit);
  const landed = landedOf(line);
  const sum = (pick: (load: ReceivedLoad) => number) =>
    loads.reduce((total, load) => total + pick(load), 0);

  return (
    <TableCard
      summary={
        <span className="inline-flex flex-wrap items-center gap-x-2">
          <PackageCheck className="h-4 w-4" />
          <span className="font-semibold text-foreground">Received</span>
          <span>
            · {plural(loads.length, 'truck')} on SAP GRPOs · {fmtQty(line.received)} {unit}
          </span>
        </span>
      }
    >
      <table className={TABLE_CLASSES}>
        <thead className={THEAD_CLASSES}>
          <tr>
            <Th>GRPO</Th>
            <Th>Supplier invoice</Th>
            <Th>Vehicle</Th>
            <Th>Transporter</Th>
            <Th>Bilty</Th>
            <Th>Gate entry</Th>
            <Th align="right">Loaded ({unit})</Th>
            <Th align="right">Unloaded ({unit})</Th>
            <Th align="right">Short ({unit})</Th>
            <Th align="right">Allowed ({unit})</Th>
            <Th align="right">Deduction (₹)</Th>
            <Th align="right">Bill (₹)</Th>
            <Th align="right">Freight (₹)</Th>
            <Th align="right">Brokerage (₹)</Th>
            <Th align="right">Landed (₹/{landed.per})</Th>
            <Th align="right">Landed (₹/L)</Th>
          </tr>
        </thead>
        <tbody>
          {loads.length === 0 ? (
            <TableEmpty
              colSpan={RECEIVED_COLUMNS}
              icon={PackageCheck}
              message="No truck received yet"
              hint="A truck shows here once its GRPO is posted in SAP."
            />
          ) : (
            loads.map((load) => {
              const perTruck = landedOf({ ...load, unit: line.unit });
              return (
                <tr key={`${load.grpo_number}-${load.invoice_no}`} className={ROW_CLASSES}>
                  <Td>
                    <span className="block whitespace-nowrap font-mono font-medium">
                      {load.grpo_number}
                    </span>
                    <span className="block whitespace-nowrap text-xs text-muted-foreground">
                      {formatDay(load.grpo_date)}
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap">{load.invoice_no || '—'}</Td>
                  <Td className="whitespace-nowrap font-mono">{load.vehicle_number || '—'}</Td>
                  <Td className="min-w-40">{load.transporter || '—'}</Td>
                  <Td className="whitespace-nowrap">{load.bilty_number || '—'}</Td>
                  <Td>
                    {load.gate_entry ? (
                      <>
                        <span className="block whitespace-nowrap font-mono">{load.gate_entry}</span>
                        <span className="block whitespace-nowrap text-xs text-muted-foreground">
                          {formatDateTimeShort(load.gate_date)}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground" title="Not booked at this gate">
                        —
                      </span>
                    )}
                  </Td>
                  <Td numeric>{fmtQty(load.loaded)}</Td>
                  <Td numeric>{fmtQty(load.unloaded)}</Td>
                  <ShortageCell value={load.shortage} />
                  <Td numeric>{fmtQty(load.allowed)}</Td>
                  <Td
                    numeric
                    className={cn(
                      'whitespace-nowrap',
                      load.deduction_amount > 0
                        ? 'bg-rose-50 font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
                        : 'text-muted-foreground',
                    )}
                  >
                    {fmtMoney(load.deduction_amount)}
                  </Td>
                  <Td numeric className="whitespace-nowrap">
                    {fmtMoney(load.basic)}
                  </Td>
                  <Td numeric className="whitespace-nowrap">
                    {fmtMoney(load.freight)}
                  </Td>
                  <Td numeric className="whitespace-nowrap">
                    {fmtMoney(load.brokerage)}
                  </Td>
                  <Td numeric className="whitespace-nowrap font-medium">
                    {fmtMoney(perTruck.value)}
                  </Td>
                  <Td numeric className="whitespace-nowrap">
                    {fmtMoney(load.landed_per_litre)}
                  </Td>
                </tr>
              );
            })
          )}
        </tbody>
        {loads.length > 0 && (
          <tfoot className="border-t bg-muted/40 font-semibold">
            <tr>
              <Td colSpan={6}>Total</Td>
              <Td numeric>{fmtQty(sum((l) => l.loaded))}</Td>
              <Td numeric>{fmtQty(sum((l) => l.unloaded))}</Td>
              <ShortageCell value={sum((l) => l.shortage)} />
              <Td numeric>{fmtQty(sum((l) => l.allowed))}</Td>
              <Td
                numeric
                className={cn(
                  'whitespace-nowrap',
                  line.deduction_amount > 0 && 'text-rose-700 dark:text-rose-300',
                )}
              >
                {fmtMoney(line.deduction_amount)}
              </Td>
              <Td numeric className="whitespace-nowrap">
                {fmtMoney(sum((l) => l.basic))}
              </Td>
              <Td numeric className="whitespace-nowrap">
                {fmtMoney(sum((l) => l.freight))}
              </Td>
              <Td numeric className="whitespace-nowrap">
                {fmtMoney(sum((l) => l.brokerage))}
              </Td>
              <Td numeric className="whitespace-nowrap">
                {fmtMoney(landed.value)}
              </Td>
              <Td numeric className="whitespace-nowrap">
                {fmtMoney(line.landed_per_litre)}
              </Td>
            </tr>
          </tfoot>
        )}
      </table>
    </TableCard>
  );
}

/** Tonnes on a gate entry's bill, when its unit is a weight. */
function billedTonnes(load: GateLoad, contractUnit: string): number | null {
  if (load.billed === null) return null;
  const per = tonnesPer(load.billed_unit || contractUnit);
  return per === null ? null : load.billed * per;
}

function AtGateTable({ line }: { line: OilContract }) {
  const loads: GateLoad[] = line.at_gate_loads ?? [];
  if (loads.length === 0) return null;
  const inTonnes = tonnesPer(line.unit) !== null;

  return (
    <TableCard
      summary={
        <span className="inline-flex flex-wrap items-center gap-x-2">
          <Truck className="h-4 w-4" />
          <span className="font-semibold text-foreground">At the gate</span>
          <span>
            · {plural(loads.length, 'truck')} booked, not received in SAP yet ·{' '}
            {fmtQty(line.at_gate)} {unitLabel(line.unit)} billed
          </span>
        </span>
      }
    >
      <table className={TABLE_CLASSES}>
        <thead className={THEAD_CLASSES}>
          <tr>
            <Th>Gate entry</Th>
            <Th>Status</Th>
            <Th>Vehicle</Th>
            <Th>Transporter</Th>
            <Th>Supplier invoice</Th>
            <Th align="right">Billed</Th>
            <Th align="right">Weighed{inTonnes ? ' (MT)' : ' (kg)'}</Th>
            <Th align="right">Short so far (MT)</Th>
          </tr>
        </thead>
        <tbody>
          {loads.map((load) => {
            const billed = billedTonnes(load, line.unit);
            const weighedMt = load.weighed_kg !== null ? load.weighed_kg / 1000 : null;
            const short = billed !== null && weighedMt !== null ? billed - weighedMt : null;
            return (
              <tr key={load.entry_no} className={ROW_CLASSES}>
                <Td>
                  <span className="block whitespace-nowrap font-mono font-medium">
                    {load.entry_no}
                  </span>
                  <span className="block whitespace-nowrap text-xs text-muted-foreground">
                    {formatDateTimeShort(load.entry_time)}
                  </span>
                </Td>
                <Td>
                  <GateStatusPill status={load.status} />
                </Td>
                <Td className="whitespace-nowrap font-mono">{load.vehicle_number || '—'}</Td>
                <Td className="min-w-40">{load.transporter || '—'}</Td>
                <Td className="whitespace-nowrap">{load.invoice_no || '—'}</Td>
                <Td numeric className="whitespace-nowrap">
                  {load.billed !== null
                    ? `${fmtQty(load.billed)} ${unitLabel(load.billed_unit || line.unit)}`
                    : '—'}
                </Td>
                <Td numeric className="whitespace-nowrap">
                  {load.weighed_kg !== null ? (
                    inTonnes ? (
                      fmtQty(weighedMt)
                    ) : (
                      fmtKg(load.weighed_kg)
                    )
                  ) : (
                    <span className="text-muted-foreground">
                      {load.gross_kg !== null ? 'Not weighed empty yet' : 'Not weighed yet'}
                    </span>
                  )}
                </Td>
                <ShortageCell value={short} />
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableCard>
  );
}

function ContractLine({ line }: { line: OilContract }) {
  const unit = unitLabel(line.unit);
  const landed = landedOf(line);
  const share = receivedShare(line.received, line.quantity);
  const short = line.loaded - line.received;

  return (
    <PageSection
      icon={Droplets}
      title={
        <span className="inline-flex flex-wrap items-center gap-2">
          {line.item_name || line.item_code}
          <ContractStagePill stage={line.stage} />
        </span>
      }
      description={
        <>
          <span className="font-mono">{line.item_code}</span> · {fmtQty(line.quantity)} {unit} @ ₹{' '}
          {fmtMoney(line.rate)} per {unit} · ₹ {fmtMoney(line.value)}
          {line.closed ? ' · closed in SAP' : ''}
        </>
      }
    >
      <StatTileRow>
        <StatTile
          label="Received"
          value={fmtQty(line.received)}
          sub={`${unit} · ${Math.round(share * 100)}% · ${plural(line.trucks_received, 'truck')}`}
          icon={PackageCheck}
          accent="emerald"
        />
        <StatTile
          label="Loaded"
          value={fmtQty(line.loaded)}
          sub={
            line.trucks_received
              ? short > 0
                ? `${unit} billed · ${fmtQty(short)} short`
                : `${unit} billed · nothing short`
              : `${unit} billed`
          }
          icon={Scale}
          accent="indigo"
        />
        <StatTile
          label="Shortage deduction"
          value={`₹ ${fmtMoney(line.deduction_amount)}`}
          sub="past the 0.25% allowance"
          icon={AlertTriangle}
          accent={line.deduction_amount > 0 ? 'rose' : 'slate'}
        />
        <StatTile
          label="At the gate"
          value={fmtQty(line.at_gate)}
          sub={`${unit} · ${plural(line.trucks_at_gate, 'truck')} not in SAP yet`}
          icon={Truck}
          accent="amber"
        />
        <StatTile
          label="To come"
          value={fmtQty(line.to_come)}
          sub={`${unit} open, not at the gate`}
          icon={Hourglass}
          accent="sky"
        />
        <StatTile
          label="Landed cost"
          value={landed.value !== null ? `₹ ${fmtMoney(landed.value)}` : '—'}
          sub={
            landed.value === null
              ? 'once a truck is received'
              : line.landed_per_litre !== null
                ? `per ${landed.per} · ₹ ${fmtMoney(line.landed_per_litre)} per litre`
                : `per ${landed.per}`
          }
          icon={IndianRupee}
          accent="violet"
        />
      </StatTileRow>

      <ReceivedTable line={line} />
      <AtGateTable line={line} />
    </PageSection>
  );
}

// --- the page -------------------------------------------------------------------

export default function DomesticContractPage() {
  const { poNumber = '' } = useParams<{ poNumber: string }>();
  const location = useLocation();
  const back = registerPathFrom(location.state);
  const canChange = usePermission().hasPermission(EXIM_PERMISSIONS.CONTRACT_CHANGE);
  const { data: po, isLoading, isError, error, isFetching, refetch } = useContract(poNumber);
  const [termsOpen, setTermsOpen] = useState(false);

  if (isLoading) return <EmptyPanel loading message={`Reading PO ${poNumber} from SAP…`} />;
  if (isError || !po) {
    return (
      <EmptyPanel
        icon={AlertTriangle}
        message={`PO ${poNumber} could not be opened`}
        hint={getErrorMessage(error, 'It may not be an oil purchase order, or the link is wrong.')}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
              <RefreshCw className={cn('mr-1.5 h-4 w-4', isFetching && 'animate-spin')} />
              Try again
            </Button>
            <Button variant="outline" asChild>
              <Link to={back}>Back to the contracts</Link>
            </Button>
          </div>
        }
      />
    );
  }

  const several = po.lines.length > 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title={<span className="font-mono">PO {po.po_number}</span>}
        description={`${po.vendor_name || po.vendor_code}${po.vendor_name ? ` (${po.vendor_code})` : ''} · PO dated ${formatDay(po.po_date)}`}
        icon={FileText}
        accent="teal"
        backTo={back}
        backLabel="Domestic Contracts"
        meta={
          several ? (
            <span className="text-sm text-muted-foreground">{po.lines.length} oils</span>
          ) : (
            po.lines[0] && <ContractStagePill stage={po.lines[0].stage} />
          )
        }
      >
        <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCw className={cn('mr-1.5 h-4 w-4', isFetching && 'animate-spin')} />
          Refresh
        </Button>
      </PageHeader>

      <TermsCard terms={po.terms} canChange={canChange} onEdit={() => setTermsOpen(true)} />

      {po.lines.length === 0 ? (
        <EmptyPanel icon={Droplets} message="SAP lists no oil on this PO" />
      ) : (
        po.lines.map((line) => (
          <ContractLine key={`${line.po_number}-${line.item_code}`} line={line} />
        ))
      )}

      {canChange && (
        <ContractTermsDialog
          open={termsOpen}
          onOpenChange={setTermsOpen}
          poNumber={po.po_number}
          terms={po.terms}
        />
      )}
    </div>
  );
}
