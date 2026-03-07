import { cn } from '@/shared/utils';

import { CHECKLIST_FREQUENCY_LABELS } from '../constants';
import type { ChecklistFrequency } from '../types';

const FREQUENCIES: ChecklistFrequency[] = ['DAILY', 'WEEKLY', 'MONTHLY'];

interface FrequencyTabsProps {
  active: ChecklistFrequency;
  onChange: (frequency: ChecklistFrequency) => void;
}

export function FrequencyTabs({ active, onChange }: FrequencyTabsProps) {
  return (
    <div className="flex items-center border-b">
      {FREQUENCIES.map((freq) => (
        <button
          key={freq}
          type="button"
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
            active === freq
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30',
          )}
          onClick={() => onChange(freq)}
        >
          {CHECKLIST_FREQUENCY_LABELS[freq]}
        </button>
      ))}
    </div>
  );
}
