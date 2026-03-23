import type { SchedulingAlgorithm } from '@core/types';
import { useProcessStore } from '../../store/processStore';

const ALGORITHM_OPTIONS: { value: SchedulingAlgorithm; label: string; disabled?: boolean }[] = [
  { value: 'FCFS',        label: 'FCFS — First Come First Served' },
  { value: 'SJF_NP',     label: 'SJF — Shortest Job First (NP)' },
  { value: 'SJF_P',      label: 'SRTF — Shortest Remaining Time (P)' },
  { value: 'RR',         label: 'RR — Round Robin' },
  { value: 'PRIORITY_NP',label: 'Priority (Non-preemptive)' },
  { value: 'PRIORITY_P', label: 'Priority (Preemptive)' },
  { value: 'PRIORITY_RR',label: 'Priority Round Robin (real-time)' },
  { value: 'HRRN',       label: 'HRRN — Highest Response Ratio Next' },
  { value: 'MULTILEVEL', label: 'Multilevel Queue (MLQ)' },
];

const AlgorithmSelector = () => {
  const algorithm = useProcessStore(s => s.config.algorithm);
  const setConfig = useProcessStore(s => s.setConfig);

  return (
    <div>
      <label
        htmlFor="algorithm-select"
        className="block text-xs text-slate-400 mb-1"
      >
        Algorithm
      </label>
      <select
        id="algorithm-select"
        value={algorithm}
        onChange={e => setConfig({ algorithm: e.target.value as SchedulingAlgorithm })}
        className="w-full rounded-md bg-slate-700 border border-slate-600 text-slate-200 text-sm px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
        aria-label="Select scheduling algorithm"
      >
        {ALGORITHM_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default AlgorithmSelector;
