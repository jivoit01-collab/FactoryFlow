import { useMemo } from 'react';

import { useConditionTypes } from '../api';

interface RuleSummaryProps {
  conditionType: string;
  params: Record<string, unknown>;
}

export function RuleSummary({ conditionType, params }: RuleSummaryProps) {
  const { data: conditionTypes } = useConditionTypes();

  const summary = useMemo(() => {
    if (!conditionTypes) return null;
    const ct = conditionTypes.find((c) => c.key === conditionType);
    if (!ct) return null;

    const parts: string[] = [ct.label];

    for (const paramSchema of ct.params_schema) {
      const val = params[paramSchema.name];
      if (val === undefined || val === null || val === '') continue;

      if (paramSchema.type === 'boolean') {
        if (val) {
          parts.push(`${paramSchema.label}: Yes`);
        }
      } else if (paramSchema.type === 'enum_multi' && Array.isArray(val)) {
        if (val.length > 0) {
          parts.push(`${paramSchema.label}: ${(val as string[]).join(', ')}`);
        }
      } else {
        parts.push(`${paramSchema.label}: ${String(val)}`);
      }
    }

    return parts.join(' — ');
  }, [conditionTypes, conditionType, params]);

  if (!summary) {
    return <span className="text-xs italic text-muted-foreground">No summary available</span>;
  }

  return <span className="text-xs text-muted-foreground">{summary}</span>;
}
