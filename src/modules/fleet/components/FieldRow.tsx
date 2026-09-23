import type { ReactNode } from 'react';

import { Label } from '@/shared/components/ui';
import { cn } from '@/shared/utils';

/**
 * One labelled box, with its error under it and an optional hint beside the
 * label — the shape every field on this module's four forms takes.
 */
export function FieldRow({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  /** Small grey text to the right of the label, e.g. "Last: 42,180 km". */
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={htmlFor}>
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

/** The red panel above a form when the server rejected the whole thing. */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{message}</div>
  );
}
