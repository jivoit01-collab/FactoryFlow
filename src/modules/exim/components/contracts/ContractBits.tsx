/**
 * The small pieces the domestic contract screens share: a contract's stage,
 * its delivery terms, how much of it has come in, the link to its PO, and one
 * labelled fact.
 */
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { StatusPill } from '@/shared/components/page';
import { cn } from '@/shared/utils';

import type { ContractStage, ContractTerms } from '../../types';
import { fmtMoney, fmtQty } from '../../utils';
import { contractPath, gateStatus, receivedShare, STAGE_LABEL, STAGE_TONE } from './contractFormat';

export function ContractStagePill({ stage }: { stage: ContractStage }) {
  return (
    <StatusPill tone={STAGE_TONE[stage]} dot>
      {STAGE_LABEL[stage]}
    </StatusPill>
  );
}

export function GateStatusPill({ status }: { status: string }) {
  const { label, tone } = gateStatus(status);
  return <StatusPill tone={tone}>{label}</StatusPill>;
}

/** The PO number, opening its page; the register's address rides along for Back. */
export function PoLink({ poNumber }: { poNumber: string }) {
  const location = useLocation();
  return (
    <Link
      to={contractPath(poNumber)}
      state={{ back: location.search }}
      className="font-mono font-medium text-primary hover:underline"
      onClick={(event) => event.stopPropagation()}
    >
      {poNumber}
    </Link>
  );
}

/** FOR, EXW with its freight, or a plain "Terms not set". */
export function TermsCell({ terms }: { terms: ContractTerms }) {
  if (terms.delivery_terms === 'FOR') {
    return (
      <span className="block">
        <StatusPill tone="info">FOR</StatusPill>
        <span className="mt-0.5 block whitespace-nowrap text-xs text-muted-foreground">
          supplier delivers
        </span>
      </span>
    );
  }
  if (terms.delivery_terms === 'EXW') {
    const freight = terms.freight_per_mt ?? 0;
    return (
      <span className="block">
        <StatusPill tone="progress">EXW</StatusPill>
        <span
          className={cn(
            'mt-0.5 block whitespace-nowrap text-xs',
            freight > 0 ? 'text-muted-foreground' : 'text-amber-700 dark:text-amber-400',
          )}
        >
          {freight > 0 ? `₹ ${fmtMoney(freight)}/MT freight` : 'no freight entered'}
        </span>
      </span>
    );
  }
  return (
    <span className="whitespace-nowrap text-sm text-amber-700 dark:text-amber-400">
      Terms not set
    </span>
  );
}

/**
 * What has come in: the received figure, and a bar of the contract with the
 * received part solid and the part at the gate lighter beside it.
 */
export function ReceivedProgress({
  received,
  atGate,
  quantity,
  trucks,
}: {
  received: number;
  atGate: number;
  quantity: number;
  trucks: number;
}) {
  const share = receivedShare(received, quantity);
  const inWidth = Math.min(100, share * 100);
  const gateWidth = Math.min(100 - inWidth, receivedShare(atGate, quantity) * 100);
  return (
    <span className="block min-w-28">
      <span className="block whitespace-nowrap font-medium">{fmtQty(received)}</span>
      <span
        className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${Math.round(share * 100)}% received`}
      >
        <span
          className="block h-full bg-emerald-500 dark:bg-emerald-400"
          style={{ width: `${inWidth}%` }}
        />
        <span className="block h-full bg-amber-400/70" style={{ width: `${gateWidth}%` }} />
      </span>
      <span className="mt-0.5 block whitespace-nowrap text-xs text-muted-foreground">
        {Math.round(share * 100)}% · {trucks} truck{trucks === 1 ? '' : 's'}
      </span>
    </span>
  );
}

/** One labelled figure in a card's facts. */
export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm">{children || '—'}</dd>
    </div>
  );
}
