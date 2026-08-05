export type MovementStatus = 'recent' | 'slow-moving' | 'non-moving';

export function getMovementStatus(days: number): MovementStatus {
  if (days > 45) return 'non-moving';
  if (days >= 30) return 'slow-moving';
  return 'recent';
}

export function rowAgeClasses(days: number): string {
  switch (getMovementStatus(days)) {
    case 'non-moving':
      return 'bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50';
    case 'slow-moving':
      return 'bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-950/20 dark:hover:bg-yellow-950/40';
    case 'recent':
    default:
      return 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40';
  }
}
