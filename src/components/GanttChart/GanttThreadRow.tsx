import React from "react";
import type { Process, SimTick, StateLabel, Thread } from "@core/types";
import { CELL_W } from "./constants";
import type { TooltipData } from "./GanttTooltip";
import { deriveThreadColor } from "../shared/threadUtils";

const THREAD_CELL_H = 20;

// ── cores de estado (mesmas do processo) ────────────────────
const STATE_CLASS: Record<StateLabel, string> = {
  New:        "bg-[var(--color-state-new)]",
  Ready:      "bg-[var(--color-state-ready)]",
  Running:    "bg-[var(--color-state-running)]",
  Waiting:    "bg-[var(--color-state-waiting)]",
  Terminated: "bg-[var(--color-state-terminated)]",
};

interface GanttThreadRowProps {
  thread: Thread;
  threadIndex: number;
  process: Process;
  ticks: SimTick[];
  onCellMouseEnter: (data: TooltipData) => void;
  onCellMouseLeave: () => void;
}

const GanttThreadRow = React.memo(function GanttThreadRow({
  thread,
  threadIndex,
  process,
  ticks,
  onCellMouseEnter,
  onCellMouseLeave,
}: GanttThreadRowProps) {
  const threadColor = deriveThreadColor(process.color, threadIndex);

  return (
    <div className="flex items-center border-b border-white/3">
      {/* Rótulo da thread (sticky) */}
      <div
        className="sticky left-0 z-20 bg-slate-900/90 border-r border-slate-700/50 px-2 flex items-center shrink-0 gap-1"
        style={{ width: 60, height: THREAD_CELL_H }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: threadColor }}
        />
        <span
          className="text-[8px] font-medium truncate"
          style={{ color: threadColor }}
        >
          {thread.name}
        </span>
      </div>

      {/* Células da thread */}
      {ticks.map((tick) => {
        const threadState: StateLabel =
          tick.threadStates?.[process.id]?.[thread.tid] ?? "New";

        const isActive = tick.cpuThreads?.[process.id] === thread.tid;
        const isKernelWait =
          tick.kernelWaitingThreads?.[process.id]?.includes(thread.tid) ?? false;

        const bg = STATE_CLASS[threadState];

        // Borda colorida para thread ativa (Running)
        const borderStyle =
          isActive && threadState === "Running"
            ? { borderLeft: `2px solid ${threadColor}` }
            : undefined;

        // Padrão diagonal para kernel wait (MANY_TO_MANY)
        const extraClass = isKernelWait
          ? "opacity-50"
          : "opacity-80 hover:opacity-100";

        return (
          <div
            key={tick.tick}
            className={`${bg} ${extraClass} shrink-0 transition-opacity cursor-default`}
            style={{ width: CELL_W, height: THREAD_CELL_H, ...borderStyle }}
            title={`${thread.name} — tick ${tick.tick}: ${threadState}${isKernelWait ? " (KernelWait)" : ""}`}
            onMouseEnter={(e) =>
              onCellMouseEnter({
                tick,
                process,
                state: threadState,
                isCtxSwitch: false,
                x: e.clientX,
                y: e.clientY,
              })
            }
            onMouseLeave={onCellMouseLeave}
          />
        );
      })}

      {ticks.length === 0 && (
        <div style={{ width: CELL_W, height: THREAD_CELL_H }} className="bg-slate-800/40" />
      )}
    </div>
  );
});

export default GanttThreadRow;
