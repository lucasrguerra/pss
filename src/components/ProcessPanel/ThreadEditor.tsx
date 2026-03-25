import { useState } from 'react';
import { Plus, Minus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import type { BurstSegment, IntraProcessPolicy, Thread, ThreadModel } from '@core/types';
import { generateId } from '../shared/processUtils';
import { deriveThreadColor } from '../shared/threadUtils';
import IconButton from '../shared/IconButton';

interface ThreadEditorProps {
  threads: Thread[];
  threadModel: ThreadModel;
  threadSchedulingPolicy: IntraProcessPolicy;
  threadQuantum: number;
  kernelThreadCount: number;
  processColor: string;
  onChange: (threads: Thread[]) => void;
  onModelChange: (model: ThreadModel) => void;
  onPolicyChange: (policy: IntraProcessPolicy) => void;
  onQuantumChange: (q: number) => void;
  onKernelCountChange: (k: number) => void;
}

const MODEL_OPTIONS: { value: ThreadModel; label: string; desc: string }[] = [
  {
    value: 'MANY_TO_ONE',
    label: 'Many-to-One',
    desc: 'N threads → 1 kernel. I/O bloqueia todo o processo (green threads).',
  },
  {
    value: 'ONE_TO_ONE',
    label: 'One-to-One',
    desc: 'N threads → N kernel threads. Bloqueios são independentes (pthreads).',
  },
  {
    value: 'MANY_TO_MANY',
    label: 'Many-to-Many',
    desc: 'N threads → M kernel threads (M ≤ N). Slots liberados em I/O.',
  },
];

const POLICY_OPTIONS: { value: IntraProcessPolicy; label: string }[] = [
  { value: 'FCFS', label: 'FCFS' },
  { value: 'RR', label: 'Round Robin' },
  { value: 'PRIORITY', label: 'Priority' },
];

const inputCls = 'w-full rounded-md bg-slate-700 border border-slate-600 text-slate-200 text-xs px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500';
const labelCls = 'block text-[10px] text-slate-400 mb-0.5';

// ── Burst editor interna de cada thread ───────────────────────────────────
const ThreadBurstEditor = ({
  bursts,
  onChange,
}: {
  bursts: BurstSegment[];
  onChange: (b: BurstSegment[]) => void;
}) => {
  const addBurst = () => {
    const lastType = bursts[bursts.length - 1]?.type ?? 'io';
    const nextType: BurstSegment['type'] = lastType === 'cpu' ? 'io' : 'cpu';
    onChange([...bursts, { type: nextType, duration: 2 }]);
  };

  const removeBurst = (idx: number) => {
    if (bursts.length <= 1) return;
    onChange(bursts.filter((_, i) => i !== idx));
  };

  const updateDuration = (idx: number, val: number) => {
    onChange(bursts.map((b, i) => (i === idx ? { ...b, duration: Math.max(1, val) } : b)));
  };

  return (
    <div className="space-y-1 mt-1.5">
      {bursts.map((b, idx) => (
        <div
          key={idx}
          className={`flex items-center gap-1.5 px-2 py-1 rounded border ${
            b.type === 'cpu'
              ? 'border-emerald-700/40 bg-emerald-900/15'
              : 'border-cyan-700/40 bg-cyan-900/15'
          }`}
        >
          <span className={`text-[9px] font-bold uppercase w-6 tracking-wide shrink-0 ${b.type === 'cpu' ? 'text-emerald-400' : 'text-cyan-400'}`}>
            {b.type}
          </span>
          <input
            type="number"
            min={1}
            value={b.duration}
            onChange={e => updateDuration(idx, Number(e.target.value))}
            className="w-14 rounded bg-slate-700/60 border border-slate-600/50 text-slate-200 text-[10px] px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-[9px] text-slate-500">ticks</span>
          <IconButton
            size="sm"
            variant="ghost"
            label="Remove burst"
            onClick={() => removeBurst(idx)}
            disabled={bursts.length <= 1}
            className="ml-auto hover:text-red-400"
          >
            <Minus size={10} />
          </IconButton>
        </div>
      ))}
      <button
        onClick={addBurst}
        className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
      >
        <Plus size={10} /> burst
      </button>
    </div>
  );
};

// ── Card de thread individual ─────────────────────────────────────────────
const ThreadCard = ({
  thread,
  index,
  processColor,
  onUpdate,
  onRemove,
  canRemove,
}: {
  thread: Thread;
  index: number;
  processColor: string;
  onUpdate: (t: Thread) => void;
  onRemove: () => void;
  canRemove: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  const color = deriveThreadColor(processColor, index);

  return (
    <div className="rounded-md border border-slate-600 bg-slate-800/50 overflow-hidden">
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <input
          type="text"
          maxLength={8}
          value={thread.name}
          onChange={e => onUpdate({ ...thread, name: e.target.value })}
          className="flex-1 bg-transparent text-slate-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1"
          aria-label={`Thread ${index + 1} name`}
        />
        <span className="text-[9px] text-slate-500 font-mono shrink-0">T{index + 1}</span>

        {/* Priority */}
        <input
          type="number"
          min={1}
          max={10}
          title="Priority (1=high, 10=low)"
          value={thread.priority ?? 5}
          onChange={e => onUpdate({ ...thread, priority: Math.min(10, Math.max(1, Number(e.target.value))) })}
          className="w-10 rounded bg-slate-700 border border-slate-600 text-slate-200 text-[10px] px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-center"
          aria-label={`Thread ${index + 1} priority`}
        />

        <button
          onClick={() => setExpanded(v => !v)}
          className="text-slate-500 hover:text-slate-300 transition-colors"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        <IconButton
          size="sm"
          variant="ghost"
          label="Remove thread"
          onClick={onRemove}
          disabled={!canRemove}
          className="hover:text-red-400"
        >
          <Trash2 size={11} />
        </IconButton>
      </div>

      {expanded && (
        <div className="px-2.5 pb-2 border-t border-slate-700/50">
          <ThreadBurstEditor
            bursts={thread.bursts}
            onChange={bursts => onUpdate({ ...thread, bursts })}
          />
        </div>
      )}
    </div>
  );
};

// ── ThreadEditor principal ────────────────────────────────────────────────
const ThreadEditor = ({
  threads,
  threadModel,
  threadSchedulingPolicy,
  threadQuantum,
  kernelThreadCount,
  processColor,
  onChange,
  onModelChange,
  onPolicyChange,
  onQuantumChange,
  onKernelCountChange,
}: ThreadEditorProps) => {
  const addThread = () => {
    const newThread: Thread = {
      tid: `t_${generateId()}`,
      name: `T${threads.length + 1}`,
      priority: 5,
      bursts: [{ type: 'cpu', duration: 3 }],
    };
    onChange([...threads, newThread]);
  };

  const updateThread = (idx: number, updated: Thread) => {
    onChange(threads.map((t, i) => (i === idx ? updated : t)));
  };

  const removeThread = (idx: number) => {
    onChange(threads.filter((_, i) => i !== idx));
  };

  const selectedModel = MODEL_OPTIONS.find(m => m.value === threadModel);

  return (
    <div className="space-y-3">
      {/* Modelo de threads */}
      <div>
        <label className={labelCls}>Thread Model</label>
        <select
          value={threadModel}
          onChange={e => onModelChange(e.target.value as ThreadModel)}
          className="w-full rounded-md bg-slate-700 border border-slate-600 text-slate-200 text-xs px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          aria-label="Thread model"
        >
          {MODEL_OPTIONS.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        {selectedModel && (
          <p className="text-[10px] text-slate-500 mt-1">{selectedModel.desc}</p>
        )}
      </div>

      {/* Kernel thread count — apenas MANY_TO_MANY */}
      {threadModel === 'MANY_TO_MANY' && (
        <div>
          <label className={labelCls}>
            Kernel Threads (M ≤ {threads.length || '?'})
          </label>
          <input
            type="number"
            min={1}
            max={Math.max(1, threads.length)}
            value={kernelThreadCount}
            onChange={e =>
              onKernelCountChange(Math.min(threads.length || 1, Math.max(1, Number(e.target.value))))
            }
            className={inputCls}
            aria-label="Kernel thread count"
          />
        </div>
      )}

      {/* Política intra-processo */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>Intra-process Policy</label>
          <select
            value={threadSchedulingPolicy}
            onChange={e => onPolicyChange(e.target.value as IntraProcessPolicy)}
            className="w-full rounded-md bg-slate-700 border border-slate-600 text-slate-200 text-xs px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            aria-label="Thread scheduling policy"
          >
            {POLICY_OPTIONS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        {threadSchedulingPolicy === 'RR' && (
          <div>
            <label className={labelCls}>Thread Quantum</label>
            <input
              type="number"
              min={1}
              value={threadQuantum}
              onChange={e => onQuantumChange(Math.max(1, Number(e.target.value)))}
              className={inputCls}
              aria-label="Thread quantum"
            />
          </div>
        )}
      </div>

      {/* Lista de threads */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10px] text-slate-400 font-medium">
            Threads ({threads.length})
          </label>
          <button
            onClick={addThread}
            disabled={threads.length >= 8}
            className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
            aria-label="Add thread"
          >
            <Plus size={11} /> Thread
          </button>
        </div>

        <div className="space-y-1.5">
          {threads.map((thread, idx) => (
            <ThreadCard
              key={thread.tid}
              thread={thread}
              index={idx}
              processColor={processColor}
              onUpdate={updated => updateThread(idx, updated)}
              onRemove={() => removeThread(idx)}
              canRemove={threads.length > 1}
            />
          ))}
        </div>

        {threads.length === 0 && (
          <div className="text-center py-4 text-[10px] text-slate-500">
            Nenhuma thread. Clique em "+ Thread" para adicionar.
          </div>
        )}
      </div>
    </div>
  );
};

export default ThreadEditor;
