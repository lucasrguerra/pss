import { useState } from 'react';
import { Download, BarChart2, Table, Globe, Layers } from 'lucide-react';
import { computeProcessMetrics, computeGlobalMetrics, computeThreadMetrics } from '@core/metrics';
import { useSimulationStore } from '../../store/simulationStore';
import { useProcessStore } from '../../store/processStore';
import { useExport } from '../../hooks/useExport';
import MetricsTable from './MetricsTable';
import GlobalMetrics from './GlobalMetrics';
import MetricsChart from './MetricsChart';
import ThreadMetricsTable from './ThreadMetricsTable';
import ThreadMetricsChart from './ThreadMetricsChart';

type Tab = 'table' | 'global' | 'charts' | 'threads' | 'thread-charts';

const MetricsPanel = () => {
  const [activeTab, setActiveTab] = useState<Tab>('table');

  const engine = useSimulationStore(s => s.engine);
  const ticks = useSimulationStore(s => s.ticks);
  const status = useSimulationStore(s => s.status);
  const processes = useProcessStore(s => s.processes);

  const { exportCSV } = useExport();

  const hasData = ticks.length > 0;

  if (!hasData) {
    return (
      <div className="border-t border-slate-700 bg-slate-950 flex items-center justify-center h-32 text-slate-600 text-sm shrink-0">
        Run the simulation to see metrics.
      </div>
    );
  }

  // ── Métricas de processos ──────────────────────────────────────────────
  const runtimes = engine?.runtimeStates ?? [];
  const completedRuntimes = runtimes.filter(rt => rt.finishTick !== null);
  const processMetrics = completedRuntimes.map(rt => computeProcessMetrics(rt));
  const globalMetrics = computeGlobalMetrics(processMetrics, ticks.length);
  const processMap = Object.fromEntries(processes.map(p => [p.id, p]));

  // ── Métricas de threads ────────────────────────────────────────────────
  const threadRuntimes = engine?.threadRuntimeStates ?? [];
  const completedThreadRts = threadRuntimes.filter(trt => trt.finishTick !== null);
  const threadMetrics = completedThreadRts.map(trt => {
    const process = processMap[trt.processId];
    const thread = process?.threads?.find(t => t.tid === trt.threadId);
    if (!process || !thread) return null;
    return computeThreadMetrics(trt, thread, process);
  }).filter(Boolean) as ReturnType<typeof computeThreadMetrics>[];

  const hasThreads = processes.some(p => (p.threads?.length ?? 0) > 0);

  const canExportCSV = status === 'finished' && processMetrics.length > 0;

  const TAB_CONFIG: { id: Tab; label: string; icon: React.ReactNode; show: boolean }[] = [
    { id: 'table',         label: 'Per Process',   icon: <Table     size={13} />, show: true },
    { id: 'global',        label: 'Global',        icon: <Globe     size={13} />, show: true },
    { id: 'charts',        label: 'Process Charts',        icon: <BarChart2 size={13} />, show: true },
    { id: 'threads',       label: 'Threads',       icon: <Layers    size={13} />, show: hasThreads },
    { id: 'thread-charts', label: 'Thread Charts', icon: <BarChart2 size={13} />, show: hasThreads },
  ];

  return (
    <div className="border-t border-slate-700 bg-slate-950 flex flex-col">
      {/* Panel header with tabs + export button */}
      <div className="flex items-center px-3 border-b border-slate-700 shrink-0 h-10 gap-1">
        {TAB_CONFIG.filter(t => t.show).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-slate-700 text-slate-100 font-medium'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            aria-pressed={activeTab === tab.id}
          >
            {tab.icon}
            {tab.label}
            {tab.id === 'threads' && threadMetrics.length > 0 && (
              <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1 rounded">
                {threadMetrics.length}
              </span>
            )}
          </button>
        ))}

        <div className="ml-auto">
          <button
            onClick={() => exportCSV(processMetrics, processMap, hasThreads ? threadMetrics : undefined)}
            disabled={!canExportCSV}
            title={!canExportCSV ? 'Available when simulation completes' : 'Export metrics as CSV'}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded-md hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Export metrics as CSV"
          >
            <Download size={12} />
            CSV
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'table' && (
          <MetricsTable metrics={processMetrics} processMap={processMap} />
        )}
        {activeTab === 'global' && (
          <GlobalMetrics metrics={globalMetrics} />
        )}
        {activeTab === 'charts' && (
          <MetricsChart metrics={processMetrics} processMap={processMap} />
        )}
        {activeTab === 'threads' && (
          <ThreadMetricsTable metrics={threadMetrics} processMap={processMap} />
        )}
        {activeTab === 'thread-charts' && (
          <ThreadMetricsChart metrics={threadMetrics} processMap={processMap} />
        )}
      </div>
    </div>
  );
};

export default MetricsPanel;
