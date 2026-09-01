/** One KPI tile of a scan-progress header (e.g. "Expected Boxes" / "Scanned Qty"). */
export function ScanMetricTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      {hint ? <p className="text-xs font-medium text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
