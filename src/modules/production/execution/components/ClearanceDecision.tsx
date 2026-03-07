import { CheckCircle2, XCircle } from 'lucide-react';

import { cn } from '@/shared/utils';

interface ClearanceDecisionProps {
  decision: 'CLEARED' | 'NOT_CLEARED' | null;
  disabled?: boolean;
  onDecision: (decision: 'CLEARED' | 'NOT_CLEARED') => void;
}

export function ClearanceDecision({ decision, disabled = false, onDecision }: ClearanceDecisionProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Clearance Decision</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Cleared */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onDecision('CLEARED')}
          className={cn(
            'flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left',
            disabled && 'cursor-not-allowed opacity-50',
            decision === 'CLEARED'
              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
              : 'border-border hover:border-green-300',
          )}
        >
          <CheckCircle2
            className={cn(
              'h-6 w-6 flex-shrink-0',
              decision === 'CLEARED' ? 'text-green-600' : 'text-muted-foreground',
            )}
          />
          <div>
            <p
              className={cn(
                'font-medium',
                decision === 'CLEARED' ? 'text-green-700 dark:text-green-400' : '',
              )}
            >
              Cleared for Production
            </p>
            <p className="text-xs text-muted-foreground">
              All checks passed, line is ready
            </p>
          </div>
        </button>

        {/* Not Cleared */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onDecision('NOT_CLEARED')}
          className={cn(
            'flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left',
            disabled && 'cursor-not-allowed opacity-50',
            decision === 'NOT_CLEARED'
              ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
              : 'border-border hover:border-red-300',
          )}
        >
          <XCircle
            className={cn(
              'h-6 w-6 flex-shrink-0',
              decision === 'NOT_CLEARED' ? 'text-red-600' : 'text-muted-foreground',
            )}
          />
          <div>
            <p
              className={cn(
                'font-medium',
                decision === 'NOT_CLEARED' ? 'text-red-700 dark:text-red-400' : '',
              )}
            >
              Not Cleared
            </p>
            <p className="text-xs text-muted-foreground">
              Issues found, needs resolution
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
