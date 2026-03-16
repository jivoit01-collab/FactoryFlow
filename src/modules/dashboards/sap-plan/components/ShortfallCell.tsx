interface ShortfallCellProps {
  value: number;
  uom?: string;
}

export function ShortfallCell({ value, uom }: ShortfallCellProps) {
  if (value <= 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span className="font-semibold text-red-600">
      {value.toLocaleString()}
      {uom && <span className="ml-1 text-xs font-normal">{uom}</span>}
    </span>
  );
}
