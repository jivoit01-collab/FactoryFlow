import { Badge } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { WorkPermitStatus } from '../types';
import { getWorkPermitStatusClass, getWorkPermitStatusLabel } from './statusLabels';

export function WorkPermitStatusBadge({ status }: { status: WorkPermitStatus }) {
  return (
    <Badge variant="outline" className={cn('whitespace-nowrap', getWorkPermitStatusClass(status))}>
      {getWorkPermitStatusLabel(status)}
    </Badge>
  );
}
