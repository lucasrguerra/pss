import type { ProcessMetrics, Process } from '@core/types';
import Badge from '../shared/Badge';

interface MetricsTableProps {
  metrics: ProcessMetrics[];
  processMap: Record<string, Process>;
}

function boundVariant(type: ProcessMetrics['boundType']) {
  if (type === 'CPU Bound') return 'cpu';
  if (type === 'I/O Bound') return 'io';
  return 'balanced';
}

// Inline mini bar rendered behind the numeric value
interface MiniBarProps {
  value: number;
  max: number;
  color: string; // tailwind bg class
}

const MiniBar = ({ value, max, color }: MiniBarProps) => {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="relative flex items-center justify-end gap-1.5 min-w-13">
      <div
        className="absolute inset-y-0 right-0 rounded-sm opacity-20 transition-all duration-300"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
      <span className="relative z-10 font-mono text-xs">{value}</span>
    </div>
  );
};

const MetricsTable = ({ metrics, processMap }: MetricsTableProps) => {
  if (metrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
        No completed processes yet.
      </div>
    );
  }

  // Pre-compute maximums for proportional bars
  const maxResponse    = Math.max(...metrics.map(m => m.responseTime), 1);
  const maxTurnaround  = Math.max(...metrics.map(m => m.turnaroundTime), 1);
  const maxWaiting     = Math.max(...metrics.map(m => m.waitingTime), 1);
  const maxCpu         = Math.max(...metrics.map(m => m.cpuTime), 1);
  const maxIo          = Math.max(...metrics.map(m => m.ioTime), 1);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-slate-300 border-collapse min-w-195">
        <thead>
          <tr className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-700 sticky top-0 bg-slate-950 z-10">
            <th className="text-left px-3 py-2 font-medium">Process</th>
            <th className="text-right px-3 py-2 font-medium">Arrival</th>
            <th className="text-right px-3 py-2 font-medium">Start</th>
            <th className="text-right px-3 py-2 font-medium">Finish</th>
            <th className="text-right px-3 py-2 font-medium text-amber-400">Response</th>
            <th className="text-right px-3 py-2 font-medium text-blue-400">Turnaround</th>
            <th className="text-right px-3 py-2 font-medium text-orange-400">Waiting</th>
            <th className="text-right px-3 py-2 font-medium text-emerald-400">CPU</th>
            <th className="text-right px-3 py-2 font-medium text-cyan-400">I/O</th>
            <th className="text-right px-3 py-2 font-medium">CPU%</th>
            <th className="text-center px-3 py-2 font-medium">Bound</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m, i) => {
            const proc  = processMap[m.processId];
            const name  = proc?.name ?? m.processId;
            const color = proc?.color ?? '#94a3b8';
            return (
              <tr
                key={m.processId}
                className={`border-b border-slate-800/80 hover:bg-slate-800/50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-900/20'}`}
              >
                {/* Process name */}
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    {proc?.pid !== undefined && (
                      <span className="text-[10px] font-mono font-semibold text-slate-400 bg-slate-700 px-1.5 py-0.5 rounded shrink-0">
                        #{proc.pid}
                      </span>
                    )}
                    <span className="font-medium text-slate-200">{name}</span>
                  </div>
                </td>

                {/* Plain timestamps */}
                <td className="text-right px-3 py-2 font-mono text-slate-400">{m.arrivalTime}</td>
                <td className="text-right px-3 py-2 font-mono text-slate-400">{m.startTick}</td>
                <td className="text-right px-3 py-2 font-mono text-slate-400">{m.finishTick}</td>

                {/* Cells with inline mini-bars */}
                <td className="px-3 py-2 text-amber-300">
                  <MiniBar value={m.responseTime}   max={maxResponse}   color="#f59e0b" />
                </td>
                <td className="px-3 py-2 text-blue-300">
                  <MiniBar value={m.turnaroundTime} max={maxTurnaround} color="#60a5fa" />
                </td>
                <td className="px-3 py-2 text-orange-300">
                  <MiniBar value={m.waitingTime}    max={maxWaiting}    color="#fb923c" />
                </td>
                <td className="px-3 py-2 text-emerald-300">
                  <MiniBar value={m.cpuTime}        max={maxCpu}        color="#34d399" />
                </td>
                <td className="px-3 py-2 text-cyan-300">
                  <MiniBar value={m.ioTime}         max={maxIo}         color="#22d3ee" />
                </td>

                {/* CPU utilization with a tiny arc/bar */}
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1.5">
                    <div className="w-10 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, m.cpuUtilization)}%`,
                          background: `linear-gradient(90deg, #a78bfa, #60a5fa)`,
                        }}
                      />
                    </div>
                    <span className="font-mono text-slate-300 w-9 text-right">
                      {m.cpuUtilization.toFixed(0)}%
                    </span>
                  </div>
                </td>

                {/* Bound badge */}
                <td className="text-center px-3 py-2">
                  <Badge variant={boundVariant(m.boundType)}>{m.boundType}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default MetricsTable;
