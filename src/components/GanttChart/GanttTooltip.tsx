import type { Process, SimTick, StateLabel } from "@core/types";

// ── colour labels ────────────────────────────────────────────
const STATE_LABEL: Record<StateLabel, string> = {
  New: "New",
  Ready: "Ready",
  Running: "Running",
  Waiting: "Waiting (I/O)",
  Terminated: "Terminated",
};

const STATE_BADGE: Record<StateLabel, string> = {
  New: "bg-[var(--color-state-new)] text-white",
  Ready: "bg-[var(--color-state-ready)] text-slate-900",
  Running: "bg-[var(--color-state-running)] text-slate-900",
  Waiting: "bg-[var(--color-state-waiting)] text-slate-900",
  Terminated: "bg-[var(--color-state-terminated)] text-slate-900",
};

// ── types ────────────────────────────────────────────────────
export interface TooltipData {
  tick: SimTick;
  process: Process;
  state: StateLabel;
  isCtxSwitch: boolean;
  x: number;
  y: number;
}

interface GanttTooltipProps {
  data: TooltipData;
}

// ── component ────────────────────────────────────────────────
const GanttTooltip = ({ data }: GanttTooltipProps) => {
  const { tick, process, state, isCtxSwitch, x, y } = data;

  // Keep the tooltip fully inside the viewport
  const left = Math.min(x + 12, window.innerWidth - 220);
  const top = Math.min(y + 12, window.innerHeight - 140);

  return (
    <div
      className="fixed z-50 pointer-events-none bg-slate-800 border border-slate-600 rounded-lg shadow-2xl px-3 py-2.5 text-xs text-slate-100 w-52"
      style={{ left, top }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm" style={{ color: process.color }}>
          {process.name}
        </span>
        <span className="text-slate-400 font-mono">tick {tick.tick}</span>
      </div>

      {/* State badge */}
      <div className="mb-1.5">
        {isCtxSwitch ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-state-ctx text-white font-medium">
            ⚠ Context Switch
          </span>
        ) : (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${STATE_BADGE[state]}`}
          >
            {STATE_LABEL[state]}
          </span>
        )}
      </div>

      {/* Queue context */}
      {tick.readyQueue.length > 0 && (
        <p className="text-slate-400 text-[10px] mt-1">
          Ready queue: {tick.readyQueue.length} process{tick.readyQueue.length !== 1 ? "es" : ""}
        </p>
      )}
    </div>
  );
};

export default GanttTooltip;
