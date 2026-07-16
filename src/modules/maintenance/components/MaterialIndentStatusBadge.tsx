import { Badge } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

import type { MaterialIndentStatus } from '../types';
import { getMaterialIndentStatusClass, getMaterialIndentStatusLabel } from './statusLabels';

export function MaterialIndentStatusBadge({ status }: { status: MaterialIndentStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn('whitespace-nowrap', getMaterialIndentStatusClass(status))}
    >
      {getMaterialIndentStatusLabel(status)}
    </Badge>
  );
}
