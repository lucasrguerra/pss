import type { Process, ThreadMetrics } from "@core/types";
import { deriveThreadColor } from "../shared/threadUtils";

interface ThreadMetricsTableProps {
  metrics: ThreadMetrics[];
  processMap: Record<string, Process>;
}

const MiniBar = ({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) => {
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

const ThreadMetricsTable = ({ metrics, processMap }: ThreadMetricsTableProps) => {
  if (metrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
        No completed threads yet.
      </div>
    );
  }

  const maxResponse   = Math.max(...metrics.map((m) => m.responseTime), 1);
  const maxTurnaround = Math.max(...metrics.map((m) => m.turnaroundTime), 1);
  const maxWaiting    = Math.max(...metrics.map((m) => m.waitingTime), 1);
  const maxCpu        = Math.max(...metrics.map((m) => m.cpuTime), 1);
  const maxIo         = Math.max(...metrics.map((m) => m.ioTime), 1);

  // Agrupa por processo para mostrar o índice de thread e cor correta
  const threadIndexByProcess: Record<string, number> = {};

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-slate-300 border-collapse min-w-195">
        <thead>
          <tr className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-700 sticky top-0 bg-slate-950 z-10">
            <th className="text-left px-3 py-2 font-medium">Thread</th>
            <th className="text-left px-3 py-2 font-medium">Process</th>
            <th className="text-right px-3 py-2 font-medium">Arrival</th>
            <th className="text-right px-3 py-2 font-medium">Start</th>
            <th className="text-right px-3 py-2 font-medium">Finish</th>
            <th className="text-right px-3 py-2 font-medium text-amber-400">Response</th>
            <th className="text-right px-3 py-2 font-medium text-blue-400">Turnaround</th>
            <th className="text-right px-3 py-2 font-medium text-orange-400">Waiting</th>
            <th className="text-right px-3 py-2 font-medium text-emerald-400">CPU</th>
            <th className="text-right px-3 py-2 font-medium text-cyan-400">I/O</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m, i) => {
            const proc = processMap[m.processId];
            const procColor = proc?.color ?? "#94a3b8";

            // Obtém o índice da thread dentro do processo para cor
            if (threadIndexByProcess[m.processId] === undefined) {
              threadIndexByProcess[m.processId] = 0;
            }
            const threadIdx = threadIndexByProcess[m.processId]!;
            threadIndexByProcess[m.processId] = threadIdx + 1;

            const threadColor = deriveThreadColor(procColor, threadIdx);

            return (
              <tr
                key={`${m.processId}-${m.threadId}`}
                className={`border-b border-slate-800/80 hover:bg-slate-800/50 transition-colors ${
                  i % 2 === 0 ? "" : "bg-slate-900/20"
                }`}
              >
                {/* Thread name */}
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: threadColor }}
                    />
                    <span className="font-medium text-slate-200">{m.threadName}</span>
                  </div>
                </td>

                {/* Process name */}
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-block w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: procColor }}
                    />
                    <span className="text-slate-400 text-[10px]">
                      {proc?.name ?? m.processId}
                    </span>
                  </div>
                </td>

                <td className="text-right px-3 py-2 font-mono text-slate-400">{m.arrivalTime}</td>
                <td className="text-right px-3 py-2 font-mono text-slate-400">{m.startTick}</td>
                <td className="text-right px-3 py-2 font-mono text-slate-400">{m.finishTick}</td>

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
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ThreadMetricsTable;
