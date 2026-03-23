import { useCallback, useRef, useState } from "react";
import { useSimulationStore } from "@store/simulationStore";
import { useProcessStore } from "@store/processStore";
import { useGanttScroll } from "@hooks/useGanttScroll";
import GanttRow from "./GanttRow";
import GanttLegend from "./GanttLegend";
import GanttTooltip, { type TooltipData } from "./GanttTooltip";
import { CELL_H, CELL_W } from "./constants";

// ── GanttChart ────────────────────────────────────────────────
const GanttChart = () => {
  const ticks = useSimulationStore((s) => s.ticks);
  const status = useSimulationStore((s) => s.status);
  const processes = useProcessStore((s) => s.processes);

  // Scrollable container ref for auto-scroll
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentTickIndex = ticks.length - 1;
  useGanttScroll(scrollRef, currentTickIndex, status === "running");

  // Tooltip state
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  // Empty state
  if (ticks.length === 0) {
    return (
      <div className="border-b border-slate-800 flex items-center justify-center text-slate-600 bg-slate-900/50 text-sm select-none"
           style={{ minHeight: 80 }}>
        Start the simulation to see the Gantt chart
      </div>
    );
  }

  // ── ruler (tick numbers) ──────────────────────────────────
  const tickNumbers = ticks.map((t) => t.tick);
  const totalWidth = ticks.length * CELL_W;

  return (
    <div className="border-b border-slate-800 bg-slate-950 flex flex-col">

      {/* ── scrollable grid + cursor ── */}
      <div
        ref={scrollRef}
        className="overflow-x-auto overflow-y-hidden gantt-scrollbar relative"
      >
        <div style={{ width: totalWidth, position: "relative" }}>

          {/* Tick ruler */}
          <div className="flex sticky top-0 z-10 bg-slate-950 border-b border-slate-800">
            {/* Spacer for sticky process labels column */}
            <div className="sticky left-0 z-20 bg-slate-950 border-r border-slate-700 shrink-0" style={{ width: 48, height: 16 }} />
            
            {tickNumbers.map((t) => (
              <div
                key={t}
                className="shrink-0 text-center text-[9px] text-slate-500 font-mono select-none"
                style={{ width: CELL_W, height: 16, lineHeight: "16px" }}
              >
                {t % 5 === 0 ? t : ""}
              </div>
            ))}
          </div>

          {/* Process rows */}
          <div className="relative">
            {processes.map((process) => (
              <div key={process.id} className="flex items-center border-b border-white/5 last:border-b-0">
                {/* Process label (sticky on the left) */}
                <div 
                  className="sticky left-0 z-20 bg-slate-900 border-r border-slate-700 px-2 flex items-center shrink-0" 
                  style={{ width: 48, height: CELL_H }}
                >
                  <span className="text-[10px] font-bold truncate" style={{ color: process.color }}>
                    {process.name}
                  </span>
                </div>

                <GanttRow
                  process={process}
                  ticks={ticks}
                  onCellMouseEnter={setTooltip}
                  onCellMouseLeave={handleMouseLeave}
                />
              </div>
            ))}

            {/* Current-tick cursor line */}
            {currentTickIndex >= 0 && (
              <div
                className="gantt-cursor absolute top-0 bottom-0 w-px bg-white/20 pointer-events-none"
                style={{ left: 48 + currentTickIndex * CELL_W + CELL_W / 2 }}
              />
            )}
          </div>

        </div>
      </div>

      {/* ── process name labels (sticky left, overlay) ── */}
      {/* Rendered OUTSIDE the scrollable div so they stay fixed on the left */}
      {/* We achieve this with a separate absolute-positioned column */}

      {/* ── legend ── */}
      <GanttLegend />

      {/* ── tooltip ── */}
      {tooltip && <GanttTooltip data={tooltip} />}
    </div>
  );
};

export default GanttChart;
