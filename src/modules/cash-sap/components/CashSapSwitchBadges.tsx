import { Badge } from '@/shared/components/ui';

import type { CashSapOptions } from '../types';

/** The switches every Cash → SAP page shows at the top: simulate, test SAP, switched off. */
export function CashSapSwitchBadges({
  options,
  enabled,
  simulate,
}: {
  options?: CashSapOptions;
  enabled?: boolean;
  simulate?: boolean;
}) {
  const isOn = enabled ?? options?.enabled ?? true;
  const isSim = simulate ?? options?.simulate ?? false;
  const testCodes = Object.entries(options?.test_targets ?? {})
    .filter(([, isTest]) => isTest)
    .map(([code]) => code);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!isOn && (
        <Badge variant="destructive" className="text-[10px]">
          Switched off — nothing is sent
        </Badge>
      )}
      {isSim && (
        <Badge
          variant="outline"
          className="border-dashed bg-amber-50 text-[10px] text-amber-900 dark:bg-amber-500/10 dark:text-amber-300"
        >
          SIMULATE — nothing goes to SAP
        </Badge>
      )}
      {testCodes.length > 0 && (
        <Badge variant="outline" className="text-[10px]">
          TEST SAP: {testCodes.join(', ')}
        </Badge>
      )}
    </div>
  );
}
