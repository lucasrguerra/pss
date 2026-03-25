import { useState, useEffect } from 'react';
import { Plus, Minus, Check, X } from 'lucide-react';
import type { BurstSegment, IntraProcessPolicy, Process, Thread, ThreadModel } from '@core/types';
import { useProcessStore } from '../../store/processStore';
import IconButton from '../shared/IconButton';
import { generateId, nextColor } from '../shared/processUtils';
import ThreadEditor from './ThreadEditor';

interface ProcessFormProps {
  editingProcess?: Process | null;
  onClose: () => void;
}

type FormTab = 'bursts' | 'threads';

const DEFAULT_BURSTS: BurstSegment[] = [{ type: 'cpu', duration: 4 }];

const ProcessForm = ({ editingProcess, onClose }: ProcessFormProps) => {
  const addProcess = useProcessStore(s => s.addProcess);
  const updateProcess = useProcessStore(s => s.updateProcess);

  const isEditing = !!editingProcess;

  // ── Campos base ─────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [arrivalTime, setArrivalTime] = useState(0);
  const [priority, setPriority] = useState(5);
  const [color, setColor] = useState(nextColor);
  const [bursts, setBursts] = useState<BurstSegment[]>(DEFAULT_BURSTS);
  const [errors, setErrors] = useState<string[]>([]);
  const [, setActiveTab] = useState<FormTab>('bursts');

  // ── Campos de threads ────────────────────────────────────────────────────
  const [hasThreads, setHasThreads] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadModel, setThreadModel] = useState<ThreadModel>('ONE_TO_ONE');
  const [threadPolicy, setThreadPolicy] = useState<IntraProcessPolicy>('FCFS');
  const [threadQuantum, setThreadQuantum] = useState(2);
  const [kernelThreadCount, setKernelThreadCount] = useState(2);

  useEffect(() => {
    if (editingProcess) {
      setName(editingProcess.name);
      setArrivalTime(editingProcess.arrivalTime);
      setPriority(editingProcess.priority);
      setColor(editingProcess.color);
      setBursts([...editingProcess.bursts.map((b: BurstSegment) => ({ ...b }))]);

      const hasT = (editingProcess.threads?.length ?? 0) > 0;
      setHasThreads(hasT);
      setThreads(editingProcess.threads ? [...editingProcess.threads] : []);
      setThreadModel(editingProcess.threadModel ?? 'ONE_TO_ONE');
      setThreadPolicy(editingProcess.threadSchedulingPolicy ?? 'FCFS');
      setThreadQuantum(editingProcess.threadQuantum ?? 2);
      setKernelThreadCount(editingProcess.kernelThreadCount ?? 2);
      setActiveTab(hasT ? 'threads' : 'bursts');
    } else {
      setName('');
      setArrivalTime(0);
      setPriority(5);
      setColor(nextColor());
      setBursts([{ type: 'cpu', duration: 4 }]);
      setHasThreads(false);
      setThreads([]);
      setThreadModel('ONE_TO_ONE');
      setThreadPolicy('FCFS');
      setThreadQuantum(2);
      setKernelThreadCount(2);
      setActiveTab('bursts');
    }
    setErrors([]);
  }, [editingProcess]);

  // ── Helpers de bursts ───────────────────────────────────────────────────
  const updateBurstDuration = (index: number, value: number) => {
    setBursts(prev => prev.map((b, i) => i === index ? { ...b, duration: Math.max(1, value) } : b));
  };

  const addBurst = () => {
    const lastType = bursts[bursts.length - 1]?.type ?? 'io';
    const nextType: BurstSegment['type'] = lastType === 'cpu' ? 'io' : 'cpu';
    setBursts(prev => [...prev, { type: nextType, duration: 2 }]);
  };

  const removeBurst = (index: number) => {
    if (bursts.length <= 1) return;
    setBursts(prev => prev.filter((_, i) => i !== index));
  };

  const toggleThreads = (enabled: boolean) => {
    setHasThreads(enabled);
    if (enabled && threads.length === 0) {
      setThreads([
        { tid: `t_${generateId()}`, name: 'T1', priority: 5, bursts: [{ type: 'cpu', duration: 3 }] },
        { tid: `t_${generateId()}`, name: 'T2', priority: 5, bursts: [{ type: 'cpu', duration: 2 }] },
      ]);
    }
    setActiveTab(enabled ? 'threads' : 'bursts');
  };

  // ── Validação ───────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: string[] = [];
    if (!name.trim()) errs.push('Name is required');
    if (name.trim().length > 8) errs.push('Name must be at most 8 characters');
    if (arrivalTime < 0) errs.push('Arrival Time must be ≥ 0');
    if (priority < 1 || priority > 10) errs.push('Priority must be between 1 and 10');

    if (hasThreads) {
      if (threads.length === 0) errs.push('At least one thread is required');
      threads.forEach((t, ti) => {
        if (!t.name.trim()) errs.push(`Thread ${ti + 1}: name is required`);
        if (t.bursts.length === 0) errs.push(`Thread ${ti + 1}: at least 1 burst required`);
        if (t.bursts[0]?.type !== 'cpu') errs.push(`Thread ${ti + 1}: first burst must be CPU`);
        if (t.bursts.at(-1)?.type !== 'cpu') errs.push(`Thread ${ti + 1}: last burst must be CPU`);
        t.bursts.forEach((b, bi) => {
          if (b.duration < 1) errs.push(`Thread ${ti + 1}, burst ${bi + 1}: duration must be ≥ 1`);
          if (bi > 0 && t.bursts[bi - 1]?.type === b.type)
            errs.push(`Thread ${ti + 1}: bursts must alternate CPU/IO`);
        });
      });
      if (threadModel === 'MANY_TO_MANY' && kernelThreadCount > threads.length) {
        errs.push(`Kernel threads (${kernelThreadCount}) cannot exceed user threads (${threads.length})`);
      }
    } else {
      if (bursts.length === 0) errs.push('There must be at least 1 CPU burst');
      if (bursts[0]?.type !== 'cpu') errs.push('The first burst must be CPU');
      if (bursts.at(-1)?.type !== 'cpu') errs.push('The last burst must be CPU');
      bursts.forEach((b, i) => {
        if (b.duration < 1) errs.push(`Burst ${i + 1}: duration must be ≥ 1`);
        if (i > 0 && bursts[i - 1]?.type === b.type)
          errs.push(`Bursts ${i} and ${i + 1} cannot be the same type`);
      });
    }

    setErrors(errs);
    return errs.length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const processData: Partial<Process> = {
      name: name.trim(),
      arrivalTime,
      priority,
      color,
      bursts: hasThreads ? [] : bursts,
      ...(hasThreads
        ? {
            threads,
            threadModel,
            threadSchedulingPolicy: threadPolicy,
            threadQuantum,
            kernelThreadCount:
              threadModel === 'MANY_TO_MANY'
                ? kernelThreadCount
                : undefined,
          }
        : {
            threads: undefined,
            threadModel: undefined,
            threadSchedulingPolicy: undefined,
            threadQuantum: undefined,
            kernelThreadCount: undefined,
          }),
    };

    if (isEditing && editingProcess) {
      updateProcess(editingProcess.id, processData);
    } else {
      addProcess({
        id: generateId(),
        name: name.trim(),
        arrivalTime,
        priority,
        color,
        bursts: hasThreads ? [] : bursts,
        ...(hasThreads
          ? {
              threads,
              threadModel,
              threadSchedulingPolicy: threadPolicy,
              threadQuantum,
              kernelThreadCount:
                threadModel === 'MANY_TO_MANY' ? kernelThreadCount : undefined,
            }
          : {}),
      });
    }
    onClose();
  };

  const inputCls = 'w-full rounded-md bg-slate-700 border border-slate-600 text-slate-200 text-sm px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500';
  const labelCls = 'block text-xs text-slate-400 mb-1';

  return (
    <div className="bg-slate-800/60 rounded-xl border border-slate-600 shadow-xl p-4 space-y-4" data-testid="process-form">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">
          {isEditing ? 'Edit Process' : 'New Process'}
        </h3>
        <IconButton size="sm" variant="ghost" label="Close" onClick={onClose}>
          <X size={14} />
        </IconButton>
      </div>

      {/* Basic fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 flex gap-3">
          <div className="flex-1">
            <label className={labelCls} htmlFor="pf-name">Name</label>
            <input
              id="pf-name"
              type="text"
              maxLength={8}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="P1"
              className={inputCls}
              aria-label="Process name"
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="pf-color">Color</label>
            <input
              id="pf-color"
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="h-8.5 w-12 rounded-md border border-slate-600 bg-slate-700 cursor-pointer"
              aria-label="Process color"
            />
          </div>
        </div>

        <div>
          <label className={labelCls} htmlFor="pf-arrival">Arrival Time</label>
          <input
            id="pf-arrival"
            type="number"
            min={0}
            value={arrivalTime}
            onChange={e => setArrivalTime(Number(e.target.value))}
            className={inputCls}
            aria-label="Arrival time"
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="pf-priority">Priority (1–10)</label>
          <input
            id="pf-priority"
            type="number"
            min={1}
            max={10}
            value={priority}
            onChange={e => setPriority(Number(e.target.value))}
            className={inputCls}
            aria-label="Process priority"
          />
        </div>
      </div>

      {/* Toggle threads */}
      <div className="flex items-center justify-between border-t border-slate-700 pt-3">
        <div>
          <span className="text-xs text-slate-300 font-medium">Use Threads</span>
          <p className="text-[10px] text-slate-500">Substitui bursts por threads com execução própria</p>
        </div>
        <button
          role="switch"
          aria-checked={hasThreads}
          onClick={() => toggleThreads(!hasThreads)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            hasThreads ? 'bg-blue-600' : 'bg-slate-600'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200 ${
              hasThreads ? 'translate-x-4' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Tabs: Bursts / Threads */}
      {!hasThreads ? (
        /* ── Editor de bursts (original) ─────────────────────────── */
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-slate-400 font-medium">Bursts (CPU → I/O → CPU…)</label>
            <IconButton size="sm" variant="ghost" label="Add burst" onClick={addBurst}>
              <Plus size={13} />
            </IconButton>
          </div>
          <div className="space-y-1.5" data-testid="burst-list">
            {bursts.map((burst, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md border ${
                  burst.type === 'cpu'
                    ? 'border-emerald-700/50 bg-emerald-900/20'
                    : 'border-cyan-700/50 bg-cyan-900/20'
                }`}
              >
                <span className={`text-[10px] font-bold uppercase w-7 tracking-wider ${burst.type === 'cpu' ? 'text-emerald-400' : 'text-cyan-400'}`}>
                  {burst.type}
                </span>
                <input
                  type="number"
                  min={1}
                  value={burst.duration}
                  onChange={e => updateBurstDuration(idx, Number(e.target.value))}
                  className="w-full rounded bg-slate-700/60 border border-slate-600/50 text-slate-200 text-xs px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  aria-label={`Burst ${idx + 1} duration`}
                />
                <span className="text-[10px] text-slate-500">ticks</span>
                <IconButton
                  size="sm"
                  variant="ghost"
                  label={`Remove burst ${idx + 1}`}
                  onClick={() => removeBurst(idx)}
                  disabled={bursts.length <= 1}
                  className="hover:text-red-400"
                >
                  <Minus size={12} />
                </IconButton>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ── Editor de threads ────────────────────────────────────── */
        <ThreadEditor
          threads={threads}
          threadModel={threadModel}
          threadSchedulingPolicy={threadPolicy}
          threadQuantum={threadQuantum}
          kernelThreadCount={kernelThreadCount}
          processColor={color}
          onChange={setThreads}
          onModelChange={setThreadModel}
          onPolicyChange={setThreadPolicy}
          onQuantumChange={setThreadQuantum}
          onKernelCountChange={setKernelThreadCount}
        />
      )}

      {/* Validation errors */}
      {errors.length > 0 && (
        <ul className="space-y-0.5" role="alert" aria-live="polite">
          {errors.map((e, i) => (
            <li key={i} className="text-[11px] text-red-400">{e}</li>
          ))}
        </ul>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSubmit}
          className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-1.5 rounded-lg transition-colors"
          aria-label={isEditing ? 'Save process' : 'Create process'}
        >
          <Check size={15} />
          {isEditing ? 'Save' : 'Create'}
        </button>
        <button
          onClick={onClose}
          className="px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
          aria-label="Cancel"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ProcessForm;
