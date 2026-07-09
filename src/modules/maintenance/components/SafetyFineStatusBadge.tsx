import { Badge } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { SafetyFineStatus } from '../types';
import { getSafetyFineStatusClass, getSafetyFineStatusLabel } from './statusLabels';

export function SafetyFineStatusBadge({ status }: { status: SafetyFineStatus }) {
  return (
    <Badge variant="outline" className={cn('whitespace-nowrap', getSafetyFineStatusClass(status))}>
      {getSafetyFineStatusLabel(status)}
    </Badge>
  );
}
