import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { type ComponentProps, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/shared/components/ui';

import { buildSheetGrid } from '../../utils/sheetLayout';
import SheetView from './SheetView';

type SheetViewportProps = Omit<ComponentProps<typeof SheetView>, 'grid' | 'scale'>;

const ZOOM_STEP = 1.25;

/**
 * A sheet on screen, zoomed to fit the width by default.
 *
 * QA's sheets are drawn for a tiny print scale (fonts of 60-72 pt at 10%), so
 * the natural size is thousands of pixels wide; fitting the width shows the
 * whole form as it prints, and the zoom buttons get closer for typing.
 */
export default function SheetViewport(props: SheetViewportProps) {
  const { layout, fields } = props;
  const grid = useMemo(() => buildSheetGrid(layout, fields), [layout, fields]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  /** null = fit to width. */
  const [zoom, setZoom] = useState<number | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;
    const measure = () => setAvailableWidth(element.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const fitScale = availableWidth > 0 && grid.width > 0 ? (availableWidth - 2) / grid.width : 0.2;
  const scale = zoom ?? fitScale;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-1">
        <span className="mr-1 text-xs tabular-nums text-muted-foreground">
          {Math.round(scale * 100)}%
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Zoom out"
          onClick={() => setZoom(Math.max(0.05, scale / ZOOM_STEP))}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={zoom === null ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setZoom(null)}
        >
          <Maximize2 className="mr-1 h-4 w-4" />
          Fit
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Zoom in"
          onClick={() => setZoom(Math.min(2, scale * ZOOM_STEP))}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>
      <div ref={containerRef} className="overflow-auto rounded-md border bg-white">
        <SheetView {...props} grid={grid} scale={scale} />
      </div>
    </div>
  );
}
