import { useProcessStore } from '../../store/processStore';
import type { SchedulingAlgorithm } from '@core/types';

// Algorithms that require a quantum parameter
const QUANTUM_ALGORITHMS = new Set<SchedulingAlgorithm>(['RR', 'MULTILEVEL']);

// Algorithms where aging (anti-starvation) is applicable
const AGING_ALGORITHMS = new Set<SchedulingAlgorithm>(['PRIORITY_NP', 'PRIORITY_P']);

// Algorithms that are preemptive by definition (used for read-only info only)
const PREEMPTIVE_BY_DESIGN = new Set<SchedulingAlgorithm>(['SJF_P', 'RR', 'PRIORITY_P', 'MULTILEVEL']);

const inputCls = 'w-full rounded-md bg-slate-700 border border-slate-600 text-slate-200 text-sm px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500';
const labelCls = 'block text-xs text-slate-400 mb-1';

const ToggleRow = ({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <div className="flex items-center justify-between">
    <label htmlFor={id} className="text-xs text-slate-300 cursor-pointer">{label}</label>
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        checked ? 'bg-blue-600' : 'bg-slate-600'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-4' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

const SchedulerConfig = () => {
  const config = useProcessStore(s => s.config);
  const setConfig = useProcessStore(s => s.setConfig);

  const algo = config.algorithm;
  const showQuantum = QUANTUM_ALGORITHMS.has(algo);
  const showAging = AGING_ALGORITHMS.has(algo);
  const isPreemptive = PREEMPTIVE_BY_DESIGN.has(algo);

  return (
    <div className="space-y-3" data-testid="scheduler-config">

      {/* Read-only preemptive indicator */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">Tipo de escalonamento</span>
        <span
          className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${
            isPreemptive
              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              : 'bg-slate-700 text-slate-400 border-slate-600'
          }`}
          data-testid="preemptive-badge"
        >
          {isPreemptive ? 'Preemptivo' : 'Não-preemptivo'}
        </span>
      </div>

      {/* Context Switch */}
      <div>
        <label htmlFor="ctx-switch" className={labelCls}>
          Context Switch (0–10 ticks)
        </label>
        <input
          id="ctx-switch"
          type="number"
          min={0}
          max={10}
          value={config.contextSwitchTime}
          onChange={e => setConfig({ contextSwitchTime: Math.min(10, Math.max(0, Number(e.target.value))) })}
          className={inputCls}
          aria-label="Tempo de context switch"
        />
      </div>

      {/* Quantum — RR and MULTILEVEL */}
      {showQuantum && (
        <div data-testid="quantum-field">
          <label htmlFor="quantum" className={labelCls}>
            Quantum (ticks)
          </label>
          <input
            id="quantum"
            type="number"
            min={1}
            value={config.quantum}
            onChange={e => setConfig({ quantum: Math.max(1, Number(e.target.value)) })}
            className={inputCls}
            aria-label="Quantum do Round Robin"
          />
        </div>
      )}

      {/* Aging — Priority only */}
      {showAging && (
        <div className="space-y-2 pt-0.5">
          <ToggleRow
            id="aging-toggle"
            label="Aging (anti-starvation)"
            checked={config.agingEnabled}
            onChange={v => setConfig({ agingEnabled: v })}
          />
          {config.agingEnabled && (
            <div data-testid="aging-interval-field">
              <label htmlFor="aging-interval" className={labelCls}>
                Intervalo de Aging (ticks)
              </label>
              <input
                id="aging-interval"
                type="number"
                min={1}
                value={config.agingInterval}
                onChange={e => setConfig({ agingInterval: Math.max(1, Number(e.target.value)) })}
                className={inputCls}
                aria-label="Intervalo de aging"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SchedulerConfig;
