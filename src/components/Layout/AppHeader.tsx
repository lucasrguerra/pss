import { useState, useRef } from 'react';
import { ChevronDown, Download, Upload, BookOpen } from 'lucide-react';
import { presets } from '@core/presets';
import { useProcessStore } from '../../store/processStore';
import { useSimulationStore } from '../../store/simulationStore';

const AppHeader = () => {
  const [presetsOpen, setPresetsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPreset = useProcessStore(s => s.loadPreset);
  const processes = useProcessStore(s => s.processes);
  const config = useProcessStore(s => s.config);
  const simStatus = useSimulationStore(s => s.status);

  const handleLoadPreset = (index: number) => {
    const p = presets[index];
    if (!p) return;
    loadPreset(p.processes, p.config);
    setPresetsOpen(false);
  };

  const handleExportJSON = () => {
    const data = JSON.stringify({ processes, config }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pss-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (parsed.processes && parsed.config) {
          loadPreset(parsed.processes, parsed.config);
        }
      } catch {
        // Silently ignore malformed JSON
      }
    };
    reader.readAsText(file);
    // Reset so the same file can be imported again
    e.target.value = '';
  };

  const isSimulationActive = simStatus !== 'idle';

  return (
    <header className="h-12 flex items-center px-5 gap-4 bg-slate-900 border-b border-slate-700/60 shrink-0 z-30">
      {/* Title */}
      <h1 className="text-sm font-semibold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent whitespace-nowrap">
        Process Scheduler Simulator
      </h1>

      <div className="flex-1" />

      {/* Presets dropdown */}
      <div className="relative">
        <button
          onClick={() => setPresetsOpen(o => !o)}
          className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-md hover:bg-slate-700 transition-colors"
          aria-label="Carregar cenário pré-definido"
        >
          <BookOpen size={13} />
          Presets
          <ChevronDown size={12} className={`transition-transform ${presetsOpen ? 'rotate-180' : ''}`} />
        </button>

        {presetsOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setPresetsOpen(false)}
            />
            {/* Dropdown */}
            <div className="absolute right-0 top-full mt-1 w-72 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-700 text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                Cenários pré-definidos
              </div>
              {presets.map((preset, i) => (
                <button
                  key={preset.name}
                  onClick={() => handleLoadPreset(i)}
                  className="w-full text-left px-3 py-2.5 hover:bg-slate-700 transition-colors group"
                >
                  <div className="text-xs font-medium text-slate-200 group-hover:text-white">
                    {preset.name}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    {preset.description}
                  </div>
                  <div className="text-[10px] text-blue-400 mt-0.5">
                    {preset.config.algorithm}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Import JSON */}
      <label
        htmlFor="import-json"
        title={isSimulationActive ? 'Reinicie a simulação antes de importar' : 'Importar configuração JSON'}
        className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md transition-colors cursor-pointer ${
          isSimulationActive
            ? 'text-slate-600 cursor-not-allowed'
            : 'text-slate-300 hover:text-white hover:bg-slate-700'
        }`}
        aria-label="Importar configuração JSON"
      >
        <Upload size={13} />
        Importar
      </label>
      <input
        id="import-json"
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="sr-only"
        onChange={handleImportJSON}
        disabled={isSimulationActive}
        aria-label="Selecionar arquivo JSON para importar"
      />

      {/* Export JSON */}
      <button
        onClick={handleExportJSON}
        disabled={processes.length === 0}
        title={processes.length === 0 ? 'Adicione processos antes de exportar' : 'Exportar configuração como JSON'}
        className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-md hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Exportar configuração JSON"
      >
        <Download size={13} />
        Exportar
      </button>
    </header>
  );
};

export default AppHeader;
