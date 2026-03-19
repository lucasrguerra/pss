import React from "react";
import type { Process, SimTick, StateLabel } from "@core/types";
import GanttCell from "./GanttCell";
import { CELL_H, CELL_W } from "./constants";
import type { TooltipData } from "./GanttTooltip";

interface GanttRowProps {
  process: Process;
  ticks: SimTick[];
  onCellMouseEnter: (data: TooltipData) => void;
  onCellMouseLeave: () => void;
}

const GanttRow = React.memo(function GanttRow({
  process,
  ticks,
  onCellMouseEnter,
  onCellMouseLeave,
}: GanttRowProps) {
  return (
    <div className="flex" style={{ height: CELL_H }}>
      {ticks.map((tick) => {
        const state: StateLabel = tick.states[process.id] ?? "New";
        // A context-switch tick is shown on the incoming (next-to-run) process
        const isCtxSwitch =
          tick.contextSwitching && tick.ctxSwitchForProcess === process.id;

        return (
          <GanttCell
            key={tick.tick}
            tick={tick}
            process={process}
            state={state}
            isCtxSwitch={isCtxSwitch}
            onMouseEnter={(e, t, p, s, ctx) =>
              onCellMouseEnter({ tick: t, process: p, state: s, isCtxSwitch: ctx, x: e.clientX, y: e.clientY })
            }
            onMouseLeave={onCellMouseLeave}
          />
        );
      })}

      {/* Empty filler so the row is always at least CELL_W wide */}
      {ticks.length === 0 && (
        <div style={{ width: CELL_W, height: CELL_H }} className="bg-slate-800/40" />
      )}
    </div>
  );
});

export default GanttRow;
