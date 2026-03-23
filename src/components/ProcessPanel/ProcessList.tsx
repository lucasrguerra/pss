import { Plus, Shuffle, Trash2 } from 'lucide-react';
import type { Process } from '@core/types';
import { useProcessStore } from '../../store/processStore';
import ProcessCard from './ProcessCard';
import IconButton from '../shared/IconButton';
import { generateId, nextColor } from '../shared/processUtils';

interface ProcessListProps {
  onEditProcess: (process: Process) => void;
  onAddNew: () => void;
}

const MAX_PROCESSES = 16;

/** Generates a random process for quick testing */
function makeRandomProcess(index: number): Process {
  const cpuDur = Math.floor(Math.random() * 6) + 1;
  const ioDur = Math.floor(Math.random() * 5) + 1;
  const hasBothBursts = Math.random() > 0.4;
  return {
    id: generateId(),
    name: `P${index}`,
    arrivalTime: Math.floor(Math.random() * 8),
    priority: Math.floor(Math.random() * 10) + 1,
    color: nextColor(),
    bursts: hasBothBursts
      ? [{ type: 'cpu', duration: cpuDur }, { type: 'io', duration: ioDur }, { type: 'cpu', duration: Math.floor(Math.random() * 4) + 1 }]
      : [{ type: 'cpu', duration: cpuDur }],
  };
}

const ProcessList = ({ onEditProcess, onAddNew }: ProcessListProps) => {
  const processes = useProcessStore(s => s.processes);
  const removeProcess = useProcessStore(s => s.removeProcess);
  const clearProcesses = useProcessStore(s => s.clearProcesses);
  const addProcess = useProcessStore(s => s.addProcess);

  const canAdd = processes.length < MAX_PROCESSES;

  const handleRandomize = () => {
    const p = makeRandomProcess(processes.length + 1);
    addProcess(p);
  };

  return (
    <div data-testid="process-list">
      {/* List header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400">
          {processes.length}/{MAX_PROCESSES} processes
        </span>
        <div className="flex gap-1">
          <IconButton
            size="sm"
            variant="ghost"
            label="Generate random process"
            onClick={handleRandomize}
            disabled={!canAdd}
          >
            <Shuffle size={13} />
          </IconButton>
          <IconButton
            size="sm"
            variant="ghost"
            label="Clear all processes"
            onClick={clearProcesses}
            disabled={processes.length === 0}
            className="hover:text-red-400 hover:bg-red-900/20"
          >
            <Trash2 size={13} />
          </IconButton>
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5 scrollbar-hide">
        {processes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 text-slate-500 text-sm py-8 border border-dashed border-slate-700 rounded-lg">
            <span>No processes added</span>
            <span className="text-xs">Click + to create</span>
          </div>
        ) : (
          processes.map(p => (
            <ProcessCard
              key={p.id}
              process={p}
              onEdit={onEditProcess}
              onRemove={removeProcess}
            />
          ))
        )}
      </div>

      {/* Add button */}
      {canAdd && (
        <button
          onClick={onAddNew}
          aria-label="Add new process"
          className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-slate-600 text-slate-500 hover:border-blue-500 hover:text-blue-400 text-xs transition-colors"
        >
          <Plus size={14} />
          Add Process
        </button>
      )}
    </div>
  );
};

export default ProcessList;
