import type { GlobalMetrics as GlobalMetricsType } from '@core/types';

interface GlobalMetricsProps {
  metrics: GlobalMetricsType;
}

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}

const MetricCard = ({ label, value, sub, accent = 'text-blue-300' }: MetricCardProps) => (
  <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 flex flex-col gap-1">
    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{label}</span>
    <span className={`text-xl font-bold font-mono ${accent}`}>{value}</span>
    {sub && <span className="text-[10px] text-slate-500">{sub}</span>}
  </div>
);

const GlobalMetrics = ({ metrics }: GlobalMetricsProps) => {
  const {
    avgResponseTime,
    avgTurnaroundTime,
    avgWaitingTime,
    cpuThroughput,
    cpuUtilization,
    totalSimulationTime,
  } = metrics;

  const utilizationPct = Math.min(100, cpuUtilization);

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricCard
          label="Avg Response Time"
          value={avgResponseTime.toFixed(2)}
          sub="unidades de tempo"
          accent="text-amber-300"
        />
        <MetricCard
          label="Avg Turnaround Time"
          value={avgTurnaroundTime.toFixed(2)}
          sub="unidades de tempo"
          accent="text-blue-300"
        />
        <MetricCard
          label="Avg Waiting Time"
          value={avgWaitingTime.toFixed(2)}
          sub="unidades de tempo"
          accent="text-orange-300"
        />
        <MetricCard
          label="CPU Throughput"
          value={cpuThroughput.toFixed(3)}
          sub="processos / u.t."
          accent="text-emerald-300"
        />
        <MetricCard
          label="Total Simulation Time"
          value={String(totalSimulationTime)}
          sub="ticks"
          accent="text-slate-200"
        />
        {/* CPU Utilization card with progress bar */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">CPU Utilization</span>
          <span className="text-xl font-bold font-mono text-violet-300">{utilizationPct.toFixed(1)}%</span>
          <div className="mt-1 h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${utilizationPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalMetrics;
