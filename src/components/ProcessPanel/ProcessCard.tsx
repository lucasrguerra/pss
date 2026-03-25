import { Pencil, Trash2 } from 'lucide-react';
import type { Process } from '@core/types';
import IconButton from '../shared/IconButton';
import Badge from '../shared/Badge';
import { classifyBound } from '../shared/processUtils';

interface ProcessCardProps {
  process: Process;
  onEdit: (process: Process) => void;
  onRemove: (id: string) => void;
}

const MODEL_LABEL: Record<string, string> = {
  MANY_TO_ONE: 'M:1',
  ONE_TO_ONE: '1:1',
  MANY_TO_MANY: 'M:M',
};

const ProcessCard = ({ process, onEdit, onRemove }: ProcessCardProps) => {
  const hasThreads = (process.threads?.length ?? 0) > 0;

  const bound = hasThreads ? 'Balanced' : classifyBound(process.bursts);
  const totalCpu = hasThreads
    ? process.threads!.reduce(
        (sum, t) => sum + t.bursts.filter(b => b.type === 'cpu').reduce((a, b) => a + b.duration, 0),
        0,
      )
    : process.bursts.filter(b => b.type === 'cpu').reduce((a, b) => a + b.duration, 0);
  const totalIo = hasThreads
    ? process.threads!.reduce(
        (sum, t) => sum + t.bursts.filter(b => b.type === 'io').reduce((a, b) => a + b.duration, 0),
        0,
      )
    : process.bursts.filter(b => b.type === 'io').reduce((a, b) => a + b.duration, 0);

  const boundVariant = bound === 'CPU Bound' ? 'cpu' : bound === 'I/O Bound' ? 'io' : 'balanced';

  return (
    <div
      className="group relative flex items-start gap-3 rounded-lg bg-slate-800 border border-slate-700 p-3 hover:border-slate-500 transition-colors"
      data-testid={`process-card-${process.id}`}
    >
      {/* Color indicator */}
      <div
        className="mt-0.5 h-8 w-1.5 rounded-full shrink-0"
        style={{ backgroundColor: process.color }}
        aria-hidden="true"
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {process.pid !== undefined && (
            <span className="text-[11px] font-mono font-semibold text-slate-400 bg-slate-700 px-1.5 py-0.5 rounded shrink-0">
              #{process.pid}
            </span>
          )}
          <span className="font-semibold text-sm text-slate-100 truncate">{process.name}</span>
          {hasThreads ? (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
              {MODEL_LABEL[process.threadModel ?? 'ONE_TO_ONE']} · {process.threads!.length}T
            </span>
          ) : (
            <Badge variant={boundVariant}>{bound}</Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
          <span>Arrival: <span className="text-slate-300 font-medium">{process.arrivalTime}</span></span>
          <span>Priority: <span className="text-slate-300 font-medium">{process.priority}</span></span>
          <span>CPU: <span className="text-emerald-400 font-medium">{totalCpu}</span></span>
          {totalIo > 0 && (
            <span>I/O: <span className="text-cyan-400 font-medium">{totalIo}</span></span>
          )}
          {hasThreads ? (
            <span>Threads: <span className="text-slate-300 font-medium">{process.threads!.length}</span></span>
          ) : (
            <span>Bursts: <span className="text-slate-300 font-medium">{process.bursts.length}</span></span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <IconButton
          size="sm"
          variant="ghost"
          label={`Edit ${process.name}`}
          onClick={() => onEdit(process)}
        >
          <Pencil size={13} />
        </IconButton>
        <IconButton
          size="sm"
          variant="ghost"
          label={`Remove ${process.name}`}
          onClick={() => onRemove(process.id)}
          className="hover:text-red-400 hover:bg-red-900/20"
        >
          <Trash2 size={13} />
        </IconButton>
      </div>
    </div>
  );
};

export default ProcessCard;
