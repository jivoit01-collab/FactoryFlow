import {
  ArrowRightLeft,
  Package,
  PackageCheck,
  Printer,
  ScanLine,
} from 'lucide-react';

import type { BarcodeActivityEvent, BarcodeActivityKind } from '../types';

export const ACTIVITY_ICONS: Record<
  BarcodeActivityKind,
  { icon: typeof Package; color: string }
> = {
  LABEL_PRINT: { icon: Printer, color: 'text-blue-600 bg-blue-50' },
  PALLET_MOVEMENT: { icon: Package, color: 'text-purple-600 bg-purple-50' },
  DISPATCH_SCAN: { icon: ScanLine, color: 'text-green-600 bg-green-50' },
  BST_SCAN: { icon: ArrowRightLeft, color: 'text-cyan-700 bg-cyan-50' },
  BST_RECEIVE: { icon: PackageCheck, color: 'text-emerald-600 bg-emerald-50' },
};

export const ACTIVITY_KIND_LABELS: Record<BarcodeActivityKind, string> = {
  LABEL_PRINT: 'Label print',
  PALLET_MOVEMENT: 'Pallet movement',
  DISPATCH_SCAN: 'Dispatch scan',
  BST_SCAN: 'BST scan',
  BST_RECEIVE: 'BST receive',
};

export function activityTimeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function ActivityRow({
  event,
  showFullDate = false,
}: {
  event: BarcodeActivityEvent;
  showFullDate?: boolean;
}) {
  const { icon: Icon, color } = ACTIVITY_ICONS[event.kind] ?? {
    icon: Package,
    color: 'text-muted-foreground bg-muted',
  };
  const rejected = event.title.toLowerCase().includes('reject');

  return (
    <div className="flex items-center gap-3 p-2 bg-muted/50 rounded">
      <div className={`p-1.5 rounded-md shrink-0 ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${rejected ? 'text-red-600' : ''}`}>{event.title}</p>
        <p className="text-xs text-muted-foreground truncate">{event.detail}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs text-muted-foreground">
          {showFullDate ? new Date(event.at).toLocaleString() : activityTimeAgo(event.at)}
        </p>
        {event.user && (
          <p className="text-xs text-muted-foreground truncate max-w-[10rem]">{event.user}</p>
        )}
      </div>
    </div>
  );
}
