import { FlaskConical, Home } from 'lucide-react';

import { Button } from '@/shared/components/ui';
import type { InspectionDecision } from '../types';

interface QCSuccessScreenProps {
  type: 'chemist' | 'manager';
  decision: InspectionDecision;
  onNavigateToDashboard: () => void;
  onNavigateToHome: () => void;
}

const DECISION_LABELS: Record<InspectionDecision, string> = {
  APPROVED: 'Approved',
  HOLD: 'Held',
  REJECTED: 'Rejected',
};

export function QCSuccessScreen({
  type,
  decision,
  onNavigateToDashboard,
  onNavigateToHome,
}: QCSuccessScreenProps) {
  const actorLabel = type === 'chemist' ? 'QC Chemist' : 'QC Manager';
  const decisionLabel = DECISION_LABELS[decision];
  const subtitle =
    type === 'chemist'
      ? 'Inspection has been forwarded to QC Manager'
      : 'Quality control inspection is now complete';

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      {/* Animated Checkmark */}
      <div className="relative mb-8">
        <svg className="h-32 w-32 text-green-500" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="animate-draw-circle"
            style={{ strokeDasharray: 283, strokeDashoffset: 283 }}
          />
          <path
            d="M30 50 L45 65 L70 35"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-draw-check"
            style={{ strokeDasharray: 60, strokeDashoffset: 60 }}
          />
        </svg>
      </div>

      <h1 className="mb-2 text-3xl font-bold text-foreground opacity-0 animate-fade-in-delay-1">
        {decisionLabel} by {actorLabel}
      </h1>
      <p className="mb-12 text-muted-foreground opacity-0 animate-fade-in-delay-2">
        {subtitle}
      </p>

      <div className="flex flex-col gap-4 sm:flex-row opacity-0 animate-fade-in-delay-3">
        <Button size="lg" onClick={onNavigateToDashboard} className="min-w-[200px]">
          <FlaskConical className="mr-2 h-5 w-5" />
          QC Dashboard
        </Button>
        <Button size="lg" variant="outline" onClick={onNavigateToHome} className="min-w-[200px]">
          <Home className="mr-2 h-5 w-5" />
          Home
        </Button>
      </div>
    </div>
  );
}
