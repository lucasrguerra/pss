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

const MetricsTable = ({ metrics, processMap }: MetricsTableProps) => {
  if (metrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
        Nenhum processo concluído ainda.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-slate-300 border-collapse min-w-[700px]">
        <thead>
          <tr className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-700">
            <th className="text-left px-3 py-2 font-medium">Processo</th>
            <th className="text-right px-3 py-2 font-medium">Arrival</th>
            <th className="text-right px-3 py-2 font-medium">Start</th>
            <th className="text-right px-3 py-2 font-medium">Finish</th>
            <th className="text-right px-3 py-2 font-medium">Response</th>
            <th className="text-right px-3 py-2 font-medium">Turnaround</th>
            <th className="text-right px-3 py-2 font-medium">Waiting</th>
            <th className="text-right px-3 py-2 font-medium">CPU Time</th>
            <th className="text-right px-3 py-2 font-medium">I/O Time</th>
            <th className="text-right px-3 py-2 font-medium">CPU%</th>
            <th className="text-center px-3 py-2 font-medium">Bound</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m, i) => {
            const proc = processMap[m.processId];
            const name = proc?.name ?? m.processId;
            const color = proc?.color ?? '#94a3b8';
            return (
              <tr
                key={m.processId}
                className={`border-b border-slate-800 hover:bg-slate-800/60 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-900/30'}`}
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-medium text-slate-200">{name}</span>
                  </div>
                </td>
                <td className="text-right px-3 py-2 font-mono">{m.arrivalTime}</td>
                <td className="text-right px-3 py-2 font-mono">{m.startTick}</td>
                <td className="text-right px-3 py-2 font-mono">{m.finishTick}</td>
                <td className="text-right px-3 py-2 font-mono text-amber-300">{m.responseTime}</td>
                <td className="text-right px-3 py-2 font-mono text-blue-300">{m.turnaroundTime}</td>
                <td className="text-right px-3 py-2 font-mono text-orange-300">{m.waitingTime}</td>
                <td className="text-right px-3 py-2 font-mono text-emerald-300">{m.cpuTime}</td>
                <td className="text-right px-3 py-2 font-mono text-cyan-300">{m.ioTime}</td>
                <td className="text-right px-3 py-2 font-mono">{m.cpuUtilization.toFixed(1)}%</td>
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
