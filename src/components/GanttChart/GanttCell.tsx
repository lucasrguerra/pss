import React from "react";
import type { Process, SimTick, StateLabel } from "@core/types";
import { CELL_H, CELL_W } from "./constants";

// ── colour map ──────────────────────────────────────────────
const STATE_CLASS: Record<StateLabel, string> = {
  New: "bg-[var(--color-state-new)]",
  Ready: "bg-[var(--color-state-ready)]",
  Running: "bg-[var(--color-state-running)]",
  Waiting: "bg-[var(--color-state-waiting)]",
  Terminated: "bg-[var(--color-state-terminated)]",
};

// ── props ────────────────────────────────────────────────────
interface GanttCellProps {
  tick: SimTick;
  process: Process;
  state: StateLabel;
  isCtxSwitch: boolean;
  onMouseEnter: (e: React.MouseEvent, tick: SimTick, process: Process, state: StateLabel, isCtxSwitch: boolean) => void;
  onMouseLeave: () => void;
}

// ── component ───────────────────────────────────────────────
const GanttCell = React.memo(function GanttCell({
  tick,
  process,
  state,
  isCtxSwitch,
  onMouseEnter,
  onMouseLeave,
}: GanttCellProps) {
  const bg = isCtxSwitch
    ? "bg-[var(--color-state-ctx)]"
    : STATE_CLASS[state];

  // Running cells get a coloured left border using the process colour
  const borderStyle =
    !isCtxSwitch && state === "Running"
      ? { borderLeft: `3px solid ${process.color}` }
      : undefined;

  return (
    <div
      className={`${bg} shrink-0 opacity-90 hover:opacity-100 transition-opacity cursor-default`}
      style={{ width: CELL_W, height: CELL_H, ...borderStyle }}
      onMouseEnter={(e) => onMouseEnter(e, tick, process, state, isCtxSwitch)}
      onMouseLeave={onMouseLeave}
    />
  );
});

export default GanttCell;
