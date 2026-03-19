import { useState, useEffect } from 'react';
import { Plus, Minus, Check, X } from 'lucide-react';
import type { Process, BurstSegment } from '@core/types';
import { useProcessStore } from '../../store/processStore';
import IconButton from '../shared/IconButton';
import { generateId, nextColor } from '../shared/processUtils';

interface ProcessFormProps {
  /** If provided, the form edits this process; otherwise creates a new one. */
  editingProcess?: Process | null;
  onClose: () => void;
}

const DEFAULT_BURSTS: BurstSegment[] = [{ type: 'cpu', duration: 4 }];

const ProcessForm = ({ editingProcess, onClose }: ProcessFormProps) => {
  const addProcess = useProcessStore(s => s.addProcess);
  const updateProcess = useProcessStore(s => s.updateProcess);

  const isEditing = !!editingProcess;

  const [name, setName] = useState('');
  const [arrivalTime, setArrivalTime] = useState(0);
  const [priority, setPriority] = useState(5);
  const [color, setColor] = useState(nextColor);
  const [bursts, setBursts] = useState<BurstSegment[]>(DEFAULT_BURSTS);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (editingProcess) {
      setName(editingProcess.name);
      setArrivalTime(editingProcess.arrivalTime);
      setPriority(editingProcess.priority);
      setColor(editingProcess.color);
      setBursts([...editingProcess.bursts.map(b => ({ ...b }))]);
    } else {
      setName('');
      setArrivalTime(0);
      setPriority(5);
      setColor(nextColor());
      setBursts([{ type: 'cpu', duration: 4 }]);
    }
    setErrors([]);
  }, [editingProcess]);

  // ---- Burst helpers ----

  const updateBurstDuration = (index: number, value: number) => {
    setBursts(prev => prev.map((b, i) => i === index ? { ...b, duration: Math.max(1, value) } : b));
  };

  const addBurst = () => {
    // enforce alternating cpu/io pattern
    const lastType = bursts[bursts.length - 1]?.type ?? 'io';
    const nextType: BurstSegment['type'] = lastType === 'cpu' ? 'io' : 'cpu';
    setBursts(prev => [...prev, { type: nextType, duration: 2 }]);
  };

  const removeBurst = (index: number) => {
    if (bursts.length <= 1) return;
    setBursts(prev => {
      const next = prev.filter((_, i) => i !== index);
      // Safe-guard: ensure it still starts (and ends) with cpu
      return next;
    });
  };

  // ---- Validation ----

  const validate = (): boolean => {
    const errs: string[] = [];
    if (!name.trim()) errs.push('Nome é obrigatório');
    if (name.trim().length > 8) errs.push('Nome deve ter no máximo 8 caracteres');
    if (arrivalTime < 0) errs.push('Arrival Time deve ser ≥ 0');
    if (priority < 1 || priority > 10) errs.push('Priority deve estar entre 1 e 10');
    if (bursts.length === 0) errs.push('Deve haver ao menos 1 burst CPU');
    if (bursts[0]?.type !== 'cpu') errs.push('O primeiro burst deve ser CPU');
    if (bursts.at(-1)?.type !== 'cpu') errs.push('O último burst deve ser CPU');
    bursts.forEach((b, i) => {
      if (b.duration < 1) errs.push(`Burst ${i + 1}: duração deve ser ≥ 1`);
      if (i > 0 && bursts[i - 1].type === b.type) errs.push(`Bursts ${i} e ${i + 1} não podem ser do mesmo tipo (alternar CPU/IO)`);
    });
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (isEditing && editingProcess) {
      updateProcess(editingProcess.id, { name: name.trim(), arrivalTime, priority, color, bursts });
    } else {
      const p: Process = {
        id: generateId(),
        name: name.trim(),
        arrivalTime,
        priority,
        color,
        bursts,
      };
      addProcess(p);
    }
    onClose();
  };

  const inputCls = 'w-full rounded-md bg-slate-700 border border-slate-600 text-slate-200 text-sm px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500';
  const labelCls = 'block text-xs text-slate-400 mb-1';

  return (
    <div className="bg-slate-800/60 rounded-xl border border-slate-600 shadow-xl p-4 space-y-4" data-testid="process-form">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">
          {isEditing ? 'Editar Processo' : 'Novo Processo'}
        </h3>
        <IconButton size="sm" variant="ghost" label="Fechar" onClick={onClose}>
          <X size={14} />
        </IconButton>
      </div>

      {/* Basic fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 flex gap-3">
          {/* Name */}
          <div className="flex-1">
            <label className={labelCls} htmlFor="pf-name">Nome</label>
            <input
              id="pf-name"
              type="text"
              maxLength={8}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="P1"
              className={inputCls}
              aria-label="Nome do processo"
            />
          </div>
          {/* Color */}
          <div>
            <label className={labelCls} htmlFor="pf-color">Cor</label>
            <input
              id="pf-color"
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="h-[34px] w-12 rounded-md border border-slate-600 bg-slate-700 cursor-pointer"
              aria-label="Cor do processo"
            />
          </div>
        </div>

        {/* Arrival */}
        <div>
          <label className={labelCls} htmlFor="pf-arrival">Arrival Time</label>
          <input
            id="pf-arrival"
            type="number"
            min={0}
            value={arrivalTime}
            onChange={e => setArrivalTime(Number(e.target.value))}
            className={inputCls}
            aria-label="Tempo de chegada"
          />
        </div>

        {/* Priority */}
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
            aria-label="Prioridade do processo"
          />
        </div>
      </div>

      {/* Bursts editor */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-slate-400 font-medium">Bursts (CPU → I/O → CPU…)</label>
          <IconButton size="sm" variant="ghost" label="Adicionar burst" onClick={addBurst}>
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
                aria-label={`Duração do burst ${idx + 1}`}
              />
              <span className="text-[10px] text-slate-500">ticks</span>
              <IconButton
                size="sm"
                variant="ghost"
                label={`Remover burst ${idx + 1}`}
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
          aria-label={isEditing ? 'Salvar processo' : 'Criar processo'}
        >
          <Check size={15} />
          {isEditing ? 'Salvar' : 'Criar'}
        </button>
        <button
          onClick={onClose}
          className="px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
          aria-label="Cancelar"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default ProcessForm;
