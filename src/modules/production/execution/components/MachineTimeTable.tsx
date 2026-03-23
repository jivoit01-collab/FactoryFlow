import type { Machine, MachineBreakdown, ProductionSegment } from '../types';

interface MachineRuntimeData {
  machine: Machine;
  totalRunningMinutes: number;
  totalBreakdownMinutes: number;
  breakdownCount: number;
}

interface MachineTimeTableProps {
  machines: Machine[];
  segments: ProductionSegment[];
  breakdowns: MachineBreakdown[];
}

export function MachineTimeTable({ machines, segments, breakdowns }: MachineTimeTableProps) {
  // Calculate total running time from all segments
  let totalRunning = 0;
  for (const seg of segments) {
    if (seg.end_time) {
      totalRunning += Math.floor(
        (new Date(seg.end_time).getTime() - new Date(seg.start_time).getTime()) / 60_000
      );
    } else if (seg.is_active) {
      totalRunning += Math.floor(
        (Date.now() - new Date(seg.start_time).getTime()) / 60_000
      );
    }
  }

  // Build per-machine data
  const machineData: MachineRuntimeData[] = machines.map((machine) => {
    const machineBreakdowns = breakdowns.filter((b) => b.machine === machine.id);
    let totalBd = 0;
    for (const bd of machineBreakdowns) {
      if (bd.end_time) {
        totalBd += bd.breakdown_minutes;
      } else if (bd.is_active) {
        totalBd += Math.floor((Date.now() - new Date(bd.start_time).getTime()) / 60_000);
      }
    }
    return {
      machine,
      totalRunningMinutes: totalRunning,
      totalBreakdownMinutes: totalBd,
      breakdownCount: machineBreakdowns.length,
    };
  });

  return (
    <div>
      <div className="mb-4">
        <h3 className="font-semibold">Machine Runtime</h3>
        <p className="text-xs text-muted-foreground mt-1">Computed from production timeline</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-2 font-medium">Machine</th>
              <th className="text-left p-2 font-medium">Type</th>
              <th className="text-right p-2 font-medium">Running (min)</th>
              <th className="text-right p-2 font-medium">Breakdown (min)</th>
              <th className="text-right p-2 font-medium">Breakdowns</th>
            </tr>
          </thead>
          <tbody>
            {machineData.map((d) => (
              <tr key={d.machine.id} className="border-b hover:bg-muted/30">
                <td className="p-2 font-medium">{d.machine.name}</td>
                <td className="p-2 text-muted-foreground">{d.machine.machine_type}</td>
                <td className="p-2 text-right">{d.totalRunningMinutes}</td>
                <td className="p-2 text-right text-red-600">{d.totalBreakdownMinutes || '-'}</td>
                <td className="p-2 text-right">{d.breakdownCount || '-'}</td>
              </tr>
            ))}
            {machines.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No machines assigned to this run</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
