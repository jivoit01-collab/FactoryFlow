import type { ExpenseClaimStatus } from '@/modules/accounts/api';
import { Badge } from '@/shared/components/ui';

import { EXPENSE_STATUS_LABEL, EXPENSE_STATUS_TONE } from './expenseStatus';

export function ExpenseStatusBadge({ status }: { status: ExpenseClaimStatus }) {
  return (
    <Badge
      variant="outline"
      className={`whitespace-nowrap text-[10px] ${EXPENSE_STATUS_TONE[status]}`}
    >
      {EXPENSE_STATUS_LABEL[status]}
    </Badge>
  );
}
