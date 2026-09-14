import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

import { type AccentKey,ACCENTS } from '@/shared/components/dashboard';
import { Card } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

interface ReturnsPanelProps {
  title: string;
  /** One line under the title. Say what the panel counts, not what it looks like. */
  subtitle?: string;
  icon: LucideIcon;
  accent: AccentKey;
  /** Sits on the right of the header — a legend, a count, a unit note. */
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * The frame every panel on this board wears.
 *
 * One component rather than repeated markup so the six panels cannot drift out of
 * step, and so the hover treatment is defined once: a pale wash that deepens, a
 * coloured shadow, and a 2px lift. All three are on `transition-all`, and all
 * three are decoration — nothing on this board is revealed only on hover, which
 * would put it out of reach of a touch screen on the returns desk.
 */
export function ReturnsPanel({
  title,
  subtitle,
  icon: Icon,
  accent,
  aside,
  className,
  children,
}: ReturnsPanelProps) {
  const tone = ACCENTS[accent];

  return (
    <Card
      className={cn(
        'group overflow-hidden border-border/60 bg-gradient-to-br to-transparent',
        tone.wash,
        'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg',
        tone.glow,
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 px-5 py-4">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110',
              tone.iconBg,
            )}
          >
            <Icon className={cn('h-[18px] w-[18px]', tone.icon)} />
          </span>
          <div>
            <h3 className="text-sm font-semibold leading-tight">{title}</h3>
            {subtitle && (
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        {aside}
      </header>
      <div className="px-5 py-4">{children}</div>
    </Card>
  );
}
