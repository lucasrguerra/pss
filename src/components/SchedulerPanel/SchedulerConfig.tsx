import { Plus, Trash2 } from 'lucide-react';
import { useProcessStore } from '../../store/processStore';
import type { MlqQueueDef, SchedulingAlgorithm } from '@core/types';

// Algorithms that require a global quantum parameter
const QUANTUM_ALGORITHMS = new Set<SchedulingAlgorithm>(['RR', 'PRIORITY_RR']);

// Algorithms where aging (anti-starvation) is applicable
const AGING_ALGORITHMS = new Set<SchedulingAlgorithm>(['PRIORITY_NP', 'PRIORITY_P', 'PRIORITY_RR']);

// Algorithms that are preemptive by definition (used for read-only info only)
const PREEMPTIVE_BY_DESIGN = new Set<SchedulingAlgorithm>(['SJF_P', 'RR', 'PRIORITY_P', 'PRIORITY_RR', 'MULTILEVEL']);

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

const MLQ_ALGO_OPTIONS: MlqQueueDef['algorithm'][] = ['RR', 'PRIORITY_NP', 'FCFS'];

const MlqQueuesConfig = ({
  queues,
  onChange,
}: {
  queues: MlqQueueDef[];
  onChange: (queues: MlqQueueDef[]) => void;
}) => {
  const update = (idx: number, patch: Partial<MlqQueueDef>) => {
    onChange(queues.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const addQueue = () => {
    if (queues.length >= 5) return;
    onChange([...queues, { priorityMin: 1, priorityMax: 10, algorithm: 'FCFS', quantum: 2 }]);
  };

  const removeQueue = (idx: number) => {
    if (queues.length <= 1) return;
    onChange(queues.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2 pt-1" data-testid="mlq-queues-config">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium">Filas MLQ (prioridade decrescente)</span>
        <button
          onClick={addQueue}
          disabled={queues.length >= 5}
          className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
          aria-label="Adicionar fila"
        >
          <Plus size={11} /> Fila
        </button>
      </div>
      {queues.map((q, idx) => (
        <div
          key={idx}
          className="rounded-md border border-slate-600 bg-slate-800/60 p-2 space-y-1.5"
          data-testid={`mlq-queue-${idx}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
              Fila {idx} {idx === 0 ? '(mais alta)' : idx === queues.length - 1 ? '(mais baixa)' : ''}
            </span>
            <button
              onClick={() => removeQueue(idx)}
              disabled={queues.length <= 1}
              className="text-slate-500 hover:text-red-400 disabled:text-slate-700 disabled:cursor-not-allowed transition-colors"
              aria-label={`Remover fila ${idx}`}
            >
              <Trash2 size={11} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">Prio. mín</label>
              <input
                type="number" min={1} max={10}
                value={q.priorityMin}
                onChange={e => update(idx, { priorityMin: Math.min(10, Math.max(1, Number(e.target.value))) })}
                className="w-full rounded bg-slate-700 border border-slate-600 text-slate-200 text-xs px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                aria-label={`Fila ${idx}: prioridade mínima`}
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">Prio. máx</label>
              <input
                type="number" min={1} max={10}
                value={q.priorityMax}
                onChange={e => update(idx, { priorityMax: Math.min(10, Math.max(1, Number(e.target.value))) })}
                className="w-full rounded bg-slate-700 border border-slate-600 text-slate-200 text-xs px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                aria-label={`Fila ${idx}: prioridade máxima`}
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-0.5">Algoritmo</label>
            <select
              value={q.algorithm}
              onChange={e => update(idx, { algorithm: e.target.value as MlqQueueDef['algorithm'] })}
              className="w-full rounded bg-slate-700 border border-slate-600 text-slate-200 text-xs px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              aria-label={`Fila ${idx}: algoritmo`}
            >
              {MLQ_ALGO_OPTIONS.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          {q.algorithm === 'RR' && (
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">Quantum</label>
              <input
                type="number" min={1}
                value={q.quantum}
                onChange={e => update(idx, { quantum: Math.max(1, Number(e.target.value)) })}
                className="w-full rounded bg-slate-700 border border-slate-600 text-slate-200 text-xs px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                aria-label={`Fila ${idx}: quantum`}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

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

      {/* MLQ Queue Configuration */}
      {algo === 'MULTILEVEL' && (
        <MlqQueuesConfig
          queues={config.mlqQueues ?? []}
          onChange={queues => setConfig({ mlqQueues: queues })}
        />
      )}
    </div>
  );
};

export default SchedulerConfig;
