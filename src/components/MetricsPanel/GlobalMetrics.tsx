import {
  Clock,
  Timer,
  Hourglass,
  Cpu,
  Zap,
  Activity,
} from 'lucide-react';
import type { GlobalMetrics as GlobalMetricsType } from '@core/types';

interface GlobalMetricsProps {
  metrics: GlobalMetricsType;
}

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  accentColor: string;   // hex or CSS color for the bar fill
  accentClass: string;   // tailwind text class for the value
  icon: React.ReactNode;
  barPct?: number;       // 0–100; undefined = no bar
}

const MetricCard = ({
  label,
  value,
  sub,
  accentColor,
  accentClass,
  icon,
  barPct,
}: MetricCardProps) => (
  <div className="bg-slate-800/70 border border-slate-700/80 rounded-xl px-4 py-3 flex flex-col gap-1.5 hover:border-slate-600 transition-colors">
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{label}</span>
      <span className="text-slate-500">{icon}</span>
    </div>
    <span className={`text-2xl font-bold font-mono leading-none ${accentClass}`}>{value}</span>
    {sub && <span className="text-[10px] text-slate-500">{sub}</span>}
    {barPct !== undefined && (
      <div className="mt-1 h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, barPct)}%`, backgroundColor: accentColor }}
        />
      </div>
    )}
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
  // Bars for time metrics are proportional to the total simulation time
  const toPct = (v: number) =>
    totalSimulationTime > 0 ? Math.min(100, (v / totalSimulationTime) * 100) : 0;

  return (
    <div className="p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricCard
          label="Avg Response Time"
          value={avgResponseTime.toFixed(2)}
          sub="unidades de tempo"
          accentColor="#f59e0b"
          accentClass="text-amber-300"
          icon={<Clock size={13} />}
          barPct={toPct(avgResponseTime)}
        />
        <MetricCard
          label="Avg Turnaround Time"
          value={avgTurnaroundTime.toFixed(2)}
          sub="unidades de tempo"
          accentColor="#60a5fa"
          accentClass="text-blue-300"
          icon={<Timer size={13} />}
          barPct={toPct(avgTurnaroundTime)}
        />
        <MetricCard
          label="Avg Waiting Time"
          value={avgWaitingTime.toFixed(2)}
          sub="unidades de tempo"
          accentColor="#fb923c"
          accentClass="text-orange-300"
          icon={<Hourglass size={13} />}
          barPct={toPct(avgWaitingTime)}
        />
        <MetricCard
          label="CPU Throughput"
          value={cpuThroughput.toFixed(3)}
          sub="processos / u.t."
          accentColor="#34d399"
          accentClass="text-emerald-300"
          icon={<Zap size={13} />}
        />
        <MetricCard
          label="Total Simulation Time"
          value={String(totalSimulationTime)}
          sub="ticks"
          accentColor="#94a3b8"
          accentClass="text-slate-200"
          icon={<Activity size={13} />}
        />

        {/* CPU Utilization — gradient bar */}
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-xl px-4 py-3 flex flex-col gap-1.5 hover:border-slate-600 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">CPU Utilization</span>
            <span className="text-slate-500"><Cpu size={13} /></span>
          </div>
          <span className="text-2xl font-bold font-mono leading-none text-violet-300">
            {utilizationPct.toFixed(1)}%
          </span>
          <span className="text-[10px] text-slate-500">do tempo total em CPU</span>
          <div className="mt-1 h-2 w-full bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${utilizationPct}%`,
                background: `linear-gradient(90deg, #f59e0b ${0}%, #34d399 ${100}%)`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalMetrics;
