import {
  SkipBack, StepForward, Play, Pause, RotateCcw
} from 'lucide-react';
import { useProcessStore } from '../../store/processStore';
import { useSimulationStore, type SimStatus } from '../../store/simulationStore';
import { useUiStore, SPEED_OPTIONS } from '../../store/uiStore';
import IconButton from '../shared/IconButton';

const SPEED_LABELS: Record<number, string> = {
  0.25: '0.25×',
  0.5: '0.5×',
  1: '1×',
  2: '2×',
  4: '4×',
};

const statusLabel: Record<SimStatus, string> = {
  idle: 'Pronto',
  paused: 'Pausado',
  running: 'Executando',
  finished: 'Concluído',
};

const statusDotClass: Record<SimStatus, string> = {
  idle: 'bg-slate-500',
  paused: 'bg-amber-400',
  running: 'bg-emerald-400 animate-pulse',
  finished: 'bg-blue-400',
};

const ControlBar = () => {
  const processes = useProcessStore(s => s.processes);
  const config = useProcessStore(s => s.config);

  const status = useSimulationStore(s => s.status);
  const ticks = useSimulationStore(s => s.ticks);
  const { init, stepOnce, play, pause, reset } = useSimulationStore();

  const speed = useUiStore(s => s.speed);
  const setSpeed = useUiStore(s => s.setSpeed);

  const currentTick = ticks.length;
  const isIdle = status === 'idle';
  const isRunning = status === 'running';
  const isFinished = status === 'finished';
  const canPlay = (status === 'paused' || status === 'idle') && !isFinished && processes.length > 0;

  const handlePlay = () => {
    if (isIdle) {
      init(processes, config);
    }
    play();
  };

  const handleStep = () => {
    if (isIdle) {
      init(processes, config);
    }
    stepOnce();
  };

  const handleReset = () => {
    if (isIdle) return;
    reset();
  };

  return (
    <div
      className="h-16 flex items-center px-5 gap-3 bg-slate-800 border-b border-slate-700 shadow-sm"
      role="toolbar"
      aria-label="Controles da simulação"
    >
      {/* Left group: simulation controls */}
      <div className="flex items-center gap-1.5">
        {/* Reset */}
        <IconButton
          label="Reset"
          variant="ghost"
          onClick={handleReset}
          disabled={isIdle}
          data-testid="btn-reset"
        >
          <RotateCcw size={16} />
        </IconButton>

        {/* Step */}
        <IconButton
          label="Avançar 1 tick (Step)"
          variant="default"
          onClick={handleStep}
          disabled={isFinished || processes.length === 0 || isRunning}
          data-testid="btn-step"
        >
          <StepForward size={18} />
        </IconButton>

        {/* Play / Pause */}
        {isRunning ? (
          <IconButton
            label="Pausar simulação"
            variant="primary"
            onClick={pause}
            data-testid="btn-pause"
          >
            <Pause size={18} />
          </IconButton>
        ) : (
          <IconButton
            label="Iniciar / Retomar simulação"
            variant="primary"
            onClick={handlePlay}
            disabled={!canPlay && !isRunning}
            data-testid="btn-play"
          >
            <Play size={18} />
          </IconButton>
        )}
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-slate-700 mx-1" aria-hidden="true" />

      {/* Tick display */}
      <div
        className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-900 border border-slate-700"
        aria-live="polite"
        aria-label={`Tick atual: ${currentTick}`}
      >
        <span className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">Tick</span>
        <span
          className="font-mono font-bold text-blue-300 text-sm min-w-[3ch] text-right"
          data-testid="tick-display"
        >
          {String(currentTick).padStart(4, '0')}
        </span>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${statusDotClass[status]}`} aria-hidden="true" />
        <span className="text-xs text-slate-400">{statusLabel[status]}</span>
      </div>

      {/* Right group: speed selector */}
      <div className="ml-auto flex items-center gap-2">
        <SkipBack size={14} className="text-slate-500" aria-hidden="true" />
        <label htmlFor="speed-select" className="text-xs text-slate-400 sr-only">
          Velocidade
        </label>
        <select
          id="speed-select"
          value={speed}
          onChange={e => setSpeed(Number(e.target.value))}
          className="rounded-md bg-slate-700 border border-slate-600 text-slate-200 text-xs px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          aria-label="Velocidade de simulação"
          data-testid="speed-select"
        >
          {SPEED_OPTIONS.map(s => (
            <option key={s} value={s}>{SPEED_LABELS[s]}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default ControlBar;
