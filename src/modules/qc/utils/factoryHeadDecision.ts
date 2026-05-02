export const FACTORY_HEAD_DECISIONS = {
  ACCEPT_QC_OVERRIDE: 'ACCEPT_QC_OVERRIDE',
  RETURN_TO_VENDOR: 'RETURN_TO_VENDOR',
  HOLD_FOR_REVIEW: 'HOLD_FOR_REVIEW',
  SEND_FOR_RECHECK: 'SEND_FOR_RECHECK',
  SCRAP: 'SCRAP',
} as const;

export type FactoryHeadDecision =
  (typeof FACTORY_HEAD_DECISIONS)[keyof typeof FACTORY_HEAD_DECISIONS];

export interface FactoryHeadDecisionRecord {
  inspectionId: number;
  decision: FactoryHeadDecision;
  remarks?: string;
  savedAt?: string;
}

export const FACTORY_HEAD_DECISION_LABELS: Record<FactoryHeadDecision, string> = {
  ACCEPT_QC_OVERRIDE: 'Accept QC Override',
  RETURN_TO_VENDOR: 'Return to Vendor',
  HOLD_FOR_REVIEW: 'Hold for Review',
  SEND_FOR_RECHECK: 'Send for Recheck',
  SCRAP: 'Scrap',
};

export const FACTORY_HEAD_DECISION_OPTIONS = Object.values(FACTORY_HEAD_DECISIONS).map(
  (value) => ({
    value,
    label: FACTORY_HEAD_DECISION_LABELS[value],
  }),
);

const LEGACY_DECISION_MAP: Record<string, FactoryHeadDecision> = {
  'Accept QC Override': FACTORY_HEAD_DECISIONS.ACCEPT_QC_OVERRIDE,
  'Return to Vendor': FACTORY_HEAD_DECISIONS.RETURN_TO_VENDOR,
  'Hold for Review': FACTORY_HEAD_DECISIONS.HOLD_FOR_REVIEW,
  'Send for Recheck': FACTORY_HEAD_DECISIONS.SEND_FOR_RECHECK,
  Scrap: FACTORY_HEAD_DECISIONS.SCRAP,
};

export function getFactoryHeadDecisionStorageKey(inspectionId: number): string {
  return `qc.factory-head-decision.${inspectionId}`;
}

export function normalizeFactoryHeadDecision(value?: string): FactoryHeadDecision {
  if (!value) return FACTORY_HEAD_DECISIONS.ACCEPT_QC_OVERRIDE;

  if (Object.values(FACTORY_HEAD_DECISIONS).includes(value as FactoryHeadDecision)) {
    return value as FactoryHeadDecision;
  }

  return LEGACY_DECISION_MAP[value] || FACTORY_HEAD_DECISIONS.ACCEPT_QC_OVERRIDE;
}

export function readFactoryHeadDecision(
  inspectionId?: number | null,
): FactoryHeadDecisionRecord | null {
  if (!inspectionId || typeof window === 'undefined') return null;

  const draft = window.localStorage.getItem(getFactoryHeadDecisionStorageKey(inspectionId));
  if (!draft) return null;

  try {
    const parsed = JSON.parse(draft) as Partial<FactoryHeadDecisionRecord> & {
      decision?: string;
    };

    return {
      inspectionId,
      decision: normalizeFactoryHeadDecision(parsed.decision),
      remarks: parsed.remarks || '',
      savedAt: parsed.savedAt || '',
    };
  } catch {
    return null;
  }
}

export function writeFactoryHeadDecision(record: FactoryHeadDecisionRecord): void {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(
    getFactoryHeadDecisionStorageKey(record.inspectionId),
    JSON.stringify(record),
  );
}

export function isAcceptedQcOverride(record?: FactoryHeadDecisionRecord | null): boolean {
  return record?.decision === FACTORY_HEAD_DECISIONS.ACCEPT_QC_OVERRIDE;
}

export function isReturnToVendor(record?: FactoryHeadDecisionRecord | null): boolean {
  return record?.decision === FACTORY_HEAD_DECISIONS.RETURN_TO_VENDOR;
}
