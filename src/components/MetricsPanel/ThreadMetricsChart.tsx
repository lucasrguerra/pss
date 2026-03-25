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
import type { ThreadMetrics, Process } from '@core/types';
import { deriveThreadColor } from '../shared/threadUtils';

interface ThreadMetricsChartProps {
  metrics: ThreadMetrics[];
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

const ChartBox = ({ height, children }: { height: number; children: React.ReactNode }) => (
  <div style={{ width: '100%', height, overflow: 'hidden', flexShrink: 0 }}>
    <ResponsiveContainer width="100%" height="100%">
      {children as React.ReactElement}
    </ResponsiveContainer>
  </div>
);

const ThreadMetricsChart = ({ metrics, processMap }: ThreadMetricsChartProps) => {
  if (metrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        No data available.
      </div>
    );
  }

  // Pre-compute thread colors in order of appearance
  const threadIndexByProcess: Record<string, number> = {};
  const threadColors: Record<string, string> = {};
  metrics.forEach(m => {
    if (threadIndexByProcess[m.processId] === undefined) {
      threadIndexByProcess[m.processId] = 0;
    }
    const idx = threadIndexByProcess[m.processId]!;
    const procColor = processMap[m.processId]?.color ?? '#94a3b8';
    threadColors[`${m.processId}-${m.threadId}`] = deriveThreadColor(procColor, idx);
    threadIndexByProcess[m.processId] = idx + 1;
  });

  const getThreadLabel = (m: ThreadMetrics) => {
    const procName = processMap[m.processId]?.name ?? m.processId;
    return `${procName}/${m.threadName}`;
  };

  const getThreadColor = (m: ThreadMetrics) =>
    threadColors[`${m.processId}-${m.threadId}`] ?? '#94a3b8';

  // ── Radar tooltip ──────────────────────────────────────────────
  const labelToMetric = Object.fromEntries(metrics.map(m => [getThreadLabel(m), m]));

  const radarTooltipContent = ({ active, payload, label }: { active?: boolean; payload?: readonly any[]; label?: string | number }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ ...TOOLTIP_STYLE, padding: '8px 12px' }}>
        <p style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 4 }}>
          {label}
        </p>
        {payload.map((entry: any) => {
          const m = labelToMetric[entry.name];
          return (
            <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px', marginBottom: 2 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: entry.color, flexShrink: 0, display: 'inline-block' }} />
              <span style={{ color: '#cbd5e1' }}>{m ? getThreadLabel(m) : entry.name}</span>
              <span style={{ marginLeft: 'auto', paddingLeft: 12, fontFamily: 'monospace', color: '#e2e8f0' }}>
                {typeof entry.value === 'number' ? `${entry.value.toFixed(1)}%` : '-'}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // ── Stacked bar data ──────────────────────────────────────────
  const barData = metrics.map(m => ({
    name: getThreadLabel(m),
    'Waiting': m.waitingTime,
    'CPU': m.cpuTime,
    'I/O': m.ioTime,
  }));

  // ── Radar chart data (normalized 0-100 per dimension) ─────────
  const maxT   = Math.max(...metrics.map(m => m.turnaroundTime), 1);
  const maxR   = Math.max(...metrics.map(m => m.responseTime), 1);
  const maxW   = Math.max(...metrics.map(m => m.waitingTime), 1);
  const maxCpu = Math.max(...metrics.map(m => m.cpuTime), 1);
  const maxIo  = Math.max(...metrics.map(m => m.ioTime), 1);

  const radarDimensions = ['Turnaround', 'Response', 'Waiting', 'CPU Time', 'I/O Time'] as const;

  const radarData = radarDimensions.map(dim => {
    const row: Record<string, string | number> = { dimension: dim };
    metrics.forEach(m => {
      const key = getThreadLabel(m);
      switch (dim) {
        case 'Turnaround': row[key] = (m.turnaroundTime / maxT)   * 100; break;
        case 'Response':   row[key] = (m.responseTime   / maxR)   * 100; break;
        case 'Waiting':    row[key] = (m.waitingTime    / maxW)   * 100; break;
        case 'CPU Time':   row[key] = (m.cpuTime        / maxCpu) * 100; break;
        case 'I/O Time':   row[key] = (m.ioTime         / maxIo)  * 100; break;
      }
    });
    return row;
  });

  const showRadar = metrics.length >= 2;

  return (
    <div className="p-3 flex flex-col gap-6">
      {/* ── Radar chart ───────────────────────────────────────── */}
      {showRadar && (
        <div className="w-full">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-medium text-center">
            Comparative Profile (normalized)
          </p>
          <ChartBox height={360}>
            <RadarChart data={radarData} margin={{ top: 8, right: 20, bottom: 8, left: 20 }}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
              />
              {metrics.map(m => (
                <Radar
                  key={`${m.processId}-${m.threadId}`}
                  name={getThreadLabel(m)}
                  dataKey={getThreadLabel(m)}
                  stroke={getThreadColor(m)}
                  fill={getThreadColor(m)}
                  fillOpacity={0.15}
                  strokeWidth={2}
                  dot={{ r: 3, fill: getThreadColor(m) }}
                />
              ))}
              <Tooltip content={radarTooltipContent} />
              <Legend
                wrapperStyle={{ fontSize: '10px', paddingTop: '4px', color: '#94a3b8' }}
              />
            </RadarChart>
          </ChartBox>
        </div>
      )}

      {/* ── Stacked bar chart ─────────────────────────────────── */}
      <div className="w-full">
        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-medium text-center">
          Breakdown per Thread (ticks)
        </p>
        <ChartBox height={360}>
          <BarChart data={barData} margin={{ top: 8, right: 12, left: -8, bottom: 48 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={false}
              angle={-35}
              textAnchor="end"
              interval={0}
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
        </ChartBox>
        <p className="text-center text-[9px] text-slate-600 mt-0.5">
          Waiting + CPU + I/O = Turnaround
        </p>
      </div>
    </div>
  );
};

export default ThreadMetricsChart;
