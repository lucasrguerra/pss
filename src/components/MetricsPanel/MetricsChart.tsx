import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from 'recharts';
import type { ProcessMetrics, Process } from '@core/types';

interface MetricsChartProps {
  metrics: ProcessMetrics[];
  processMap: Record<string, Process>;
}

const TOOLTIP_STYLE = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '8px',
  fontSize: '11px',
  color: '#e2e8f0',
  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
};

const MetricsChart = ({ metrics, processMap }: MetricsChartProps) => {
  if (metrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        Nenhum dado disponível.
      </div>
    );
  }

  const getName = (id: string) => processMap[id]?.name ?? id;
  const getColor = (id: string) => processMap[id]?.color ?? '#94a3b8';

  // ── Stacked bar data ──────────────────────────────────────────
  const barData = metrics.map((m) => ({
    name: getName(m.processId),
    'Waiting': m.waitingTime,
    'CPU': m.cpuTime,
    'I/O': m.ioTime,
    _color: getColor(m.processId),
  }));

  // ── Radar chart data (normalized 0-100 per dimension) ─────────
  // Each "subject" is a process, each series is a dimension.
  // We invert "Response" and "Waiting" so higher = better.
  const maxT  = Math.max(...metrics.map(m => m.turnaroundTime), 1);
  const maxR  = Math.max(...metrics.map(m => m.responseTime), 1);
  const maxW  = Math.max(...metrics.map(m => m.waitingTime), 1);
  const maxCpu = Math.max(...metrics.map(m => m.cpuTime), 1);
  const maxIo  = Math.max(...metrics.map(m => m.ioTime), 1);

  const radarDimensions = [
    'Turnaround', 'Response', 'Waiting', 'CPU Time', 'I/O Time',
  ] as const;

  // Radar: rows = dimensions, column per process → Recharts RadarChart needs
  // one row per "subject" (dimension), with one field per process.
  const radarData = radarDimensions.map(dim => {
    const row: Record<string, string | number> = { dimension: dim };
    metrics.forEach(m => {
      const key = getName(m.processId);
      switch (dim) {
        case 'Turnaround': row[key] = (m.turnaroundTime / maxT) * 100; break;
        case 'Response':   row[key] = (m.responseTime  / maxR)  * 100; break;
        case 'Waiting':    row[key] = (m.waitingTime   / maxW)  * 100; break;
        case 'CPU Time':   row[key] = (m.cpuTime       / maxCpu)* 100; break;
        case 'I/O Time':   row[key] = (m.ioTime        / maxIo) * 100; break;
      }
    });
    return row;
  });

  const showRadar = metrics.length >= 2;

  return (
    <div className={`p-3 flex gap-3 ${showRadar ? 'flex-row' : 'flex-col'}`}>
      {/* ── Radar chart ───────────────────────────────────────── */}
      {showRadar && (
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-medium text-center">
            Perfil Comparativo (normalizado)
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData} margin={{ top: 8, right: 20, bottom: 8, left: 20 }}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
              />
              {metrics.map((m) => (
                <Radar
                  key={m.processId}
                  name={getName(m.processId)}
                  dataKey={getName(m.processId)}
                  stroke={getColor(m.processId)}
                  fill={getColor(m.processId)}
                  fillOpacity={0.15}
                  strokeWidth={2}
                  dot={{ r: 3, fill: getColor(m.processId) }}
                />
              ))}
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value) => [typeof value === 'number' ? `${value.toFixed(1)}%` : '-', '']}
              />
              <Legend
                wrapperStyle={{ fontSize: '10px', paddingTop: '4px', color: '#94a3b8' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Stacked bar chart ─────────────────────────────────── */}
      <div className={showRadar ? 'flex-1 min-w-0' : 'w-full'}>
        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-medium text-center">
          Breakdown por Processo (ticks)
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData} margin={{ top: 8, right: 12, left: -8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              label={{
                value: 'ticks',
                angle: -90,
                position: 'insideLeft',
                offset: 14,
                style: { fill: '#475569', fontSize: 9 },
              }}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            />
            <Legend
              wrapperStyle={{ fontSize: '10px', paddingTop: '4px', color: '#94a3b8' }}
            />
            <Bar dataKey="Waiting" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
            <Bar dataKey="CPU"     stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
            <Bar dataKey="I/O"     stackId="a" fill="#06b6d4" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-center text-[9px] text-slate-600 mt-0.5">
          Waiting + CPU + I/O = Turnaround
        </p>
      </div>
    </div>
  );
};

export default MetricsChart;
