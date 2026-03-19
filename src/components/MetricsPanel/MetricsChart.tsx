import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { ProcessMetrics, Process } from '@core/types';

interface MetricsChartProps {
  metrics: ProcessMetrics[];
  processMap: Record<string, Process>;
}

const MetricsChart = ({ metrics, processMap }: MetricsChartProps) => {
  if (metrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        Nenhum dado disponível.
      </div>
    );
  }

  const data = metrics.map((m) => ({
    name: processMap[m.processId]?.name ?? m.processId,
    'Waiting Time': m.waitingTime,
    'CPU Time': m.cpuTime,
    'I/O Time': m.ioTime,
  }));

  return (
    <div className="p-4">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: '#475569' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            label={{
              value: 'ticks',
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              style: { fill: '#64748b', fontSize: 10 },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#e2e8f0',
            }}
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px', paddingTop: '8px', color: '#94a3b8' }}
          />
          <Bar dataKey="Waiting Time" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
          <Bar dataKey="CPU Time" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
          <Bar dataKey="I/O Time" stackId="a" fill="#06b6d4" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-center text-[10px] text-slate-500 mt-1">
        Barras empilhadas = Turnaround Time (Waiting + CPU + I/O)
      </p>
    </div>
  );
};

export default MetricsChart;
