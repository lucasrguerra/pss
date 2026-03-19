import { useState } from 'react';
import { Download, BarChart2, Table, Globe } from 'lucide-react';
import { computeProcessMetrics, computeGlobalMetrics } from '@core/metrics';
import { useSimulationStore } from '../../store/simulationStore';
import { useProcessStore } from '../../store/processStore';
import { useExport } from '../../hooks/useExport';
import MetricsTable from './MetricsTable';
import GlobalMetrics from './GlobalMetrics';
import MetricsChart from './MetricsChart';

type Tab = 'table' | 'global' | 'chart';

const TAB_CONFIG: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'table', label: 'Por Processo', icon: <Table size={13} /> },
  { id: 'global', label: 'Global', icon: <Globe size={13} /> },
  { id: 'chart', label: 'Gráfico', icon: <BarChart2 size={13} /> },
];

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
        Execute a simulação para ver as métricas.
      </div>
    );
  }

  // Derive metrics from engine runtime state
  const runtimes = engine?.runtimeStates ?? [];
  const completedRuntimes = runtimes.filter(rt => rt.finishTick !== null);
  const processMetrics = completedRuntimes.map(rt => computeProcessMetrics(rt));
  const globalMetrics = computeGlobalMetrics(processMetrics, ticks.length);
  const processMap = Object.fromEntries(processes.map(p => [p.id, p]));

  const canExportCSV = status === 'finished' && processMetrics.length > 0;

  return (
    <div className="border-t border-slate-700 bg-slate-950 flex flex-col shrink-0" style={{ height: '280px' }}>
      {/* Panel header with tabs + export button */}
      <div className="flex items-center px-3 border-b border-slate-700 shrink-0 h-10 gap-1">
        {TAB_CONFIG.map(tab => (
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
          </button>
        ))}

        <div className="ml-auto">
          <button
            onClick={() => exportCSV(processMetrics, processMap)}
            disabled={!canExportCSV}
            title={!canExportCSV ? 'Disponível ao concluir a simulação' : 'Exportar métricas como CSV'}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded-md hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Exportar métricas CSV"
          >
            <Download size={12} />
            CSV
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'table' && (
          <MetricsTable metrics={processMetrics} processMap={processMap} />
        )}
        {activeTab === 'global' && (
          <GlobalMetrics metrics={globalMetrics} />
        )}
        {activeTab === 'chart' && (
          <MetricsChart metrics={processMetrics} processMap={processMap} />
        )}
      </div>
    </div>
  );
};

export default MetricsPanel;
