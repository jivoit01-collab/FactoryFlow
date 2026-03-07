import { CheckCircle2, Circle, Lock } from 'lucide-react';

import { cn } from '@/shared/utils';
import { Button } from '@/shared/components/ui';

import type { WasteLog } from '../types';

interface ApprovalStep {
  label: string;
  signedBy: string;
  signedAt: string | null;
  isSigned: boolean;
  isPending: boolean;
  isLocked: boolean;
  role: 'engineer' | 'am' | 'store' | 'hod';
}

interface WasteApprovalTimelineProps {
  wasteLog: WasteLog;
  onApprove?: (role: 'engineer' | 'am' | 'store' | 'hod') => void;
}

export function WasteApprovalTimeline({ wasteLog, onApprove }: WasteApprovalTimelineProps) {
  const steps: ApprovalStep[] = [
    {
      label: 'Engineer Sign',
      signedBy: wasteLog.engineer_sign,
      signedAt: wasteLog.engineer_signed_at,
      isSigned: !!wasteLog.engineer_signed_by,
      isPending: !wasteLog.engineer_signed_by,
      isLocked: false,
      role: 'engineer',
    },
    {
      label: 'AM Sign',
      signedBy: wasteLog.am_sign,
      signedAt: wasteLog.am_signed_at,
      isSigned: !!wasteLog.am_signed_by,
      isPending: !!wasteLog.engineer_signed_by && !wasteLog.am_signed_by,
      isLocked: !wasteLog.engineer_signed_by,
      role: 'am',
    },
    {
      label: 'Store Sign',
      signedBy: wasteLog.store_sign,
      signedAt: wasteLog.store_signed_at,
      isSigned: !!wasteLog.store_signed_by,
      isPending: !!wasteLog.am_signed_by && !wasteLog.store_signed_by,
      isLocked: !wasteLog.am_signed_by,
      role: 'store',
    },
    {
      label: 'HOD Sign',
      signedBy: wasteLog.hod_sign,
      signedAt: wasteLog.hod_signed_at,
      isSigned: !!wasteLog.hod_signed_by,
      isPending: !!wasteLog.store_signed_by && !wasteLog.hod_signed_by,
      isLocked: !wasteLog.store_signed_by,
      role: 'hod',
    },
  ];

  return (
    <div className="space-y-0">
      {steps.map((step, idx) => (
        <div key={step.role} className="flex gap-3">
          {/* Vertical line + dot */}
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full border-2',
                step.isSigned && 'border-green-500 bg-green-50 dark:bg-green-900/30',
                step.isPending && 'border-amber-500 bg-amber-50 dark:bg-amber-900/30',
                step.isLocked && 'border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800',
              )}
            >
              {step.isSigned && <CheckCircle2 className="h-4 w-4 text-green-600" />}
              {step.isPending && <Circle className="h-4 w-4 text-amber-500" />}
              {step.isLocked && <Lock className="h-3.5 w-3.5 text-gray-400" />}
            </div>
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  'w-0.5 flex-1 min-h-[24px]',
                  step.isSigned ? 'bg-green-300 dark:bg-green-700' : 'bg-gray-200 dark:bg-gray-700',
                )}
              />
            )}
          </div>

          {/* Content */}
          <div className="pb-4 pt-0.5 flex-1">
            <p className={cn('text-sm font-medium', step.isLocked && 'text-muted-foreground')}>
              {step.label}
            </p>
            {step.isSigned && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {step.signedBy}
                {step.signedAt && (
                  <span className="ml-1">
                    — {new Date(step.signedAt).toLocaleString()}
                  </span>
                )}
              </p>
            )}
            {step.isPending && onApprove && (
              <Button
                size="sm"
                className="mt-1.5 h-7 text-xs"
                onClick={() => onApprove(step.role)}
              >
                Approve
              </Button>
            )}
            {step.isLocked && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Awaiting previous approval
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
