import { useCallback, useRef, useState } from "react";
import { useSimulationStore } from "@store/simulationStore";
import { useProcessStore } from "@store/processStore";
import { useGanttScroll } from "@hooks/useGanttScroll";
import GanttRow from "./GanttRow";
import GanttThreadRow from "./GanttThreadRow";
import GanttLegend from "./GanttLegend";
import GanttTooltip, { type TooltipData } from "./GanttTooltip";
import { CELL_H, CELL_W } from "./constants";

// ── GanttChart ────────────────────────────────────────────────
const GanttChart = () => {
  const ticks = useSimulationStore((s) => s.ticks);
  const status = useSimulationStore((s) => s.status);
  const processes = useProcessStore((s) => s.processes);

  const scrollRef = useRef<HTMLDivElement>(null);
  const currentTickIndex = ticks.length - 1;
  useGanttScroll(scrollRef, currentTickIndex, status === "running");

  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  if (ticks.length === 0) {
    return (
      <div
        className="border-b border-slate-800 flex items-center justify-center text-slate-600 bg-slate-900/50 text-sm select-none"
        style={{ minHeight: 80 }}
      >
        Start the simulation to see the Gantt chart
      </div>
    );
  }

  const tickNumbers = ticks.map((t) => t.tick);
  const totalWidth = ticks.length * CELL_W;

  return (
    <div className="border-b border-slate-800 bg-slate-950 flex flex-col">
      <div
        ref={scrollRef}
        className="overflow-x-auto overflow-y-hidden gantt-scrollbar relative"
      >
        <div style={{ width: totalWidth, position: "relative" }}>

          {/* Tick ruler */}
          <div className="flex sticky top-0 z-10 bg-slate-950 border-b border-slate-800">
            <div
              className="sticky left-0 z-20 bg-slate-950 border-r border-slate-700 shrink-0"
              style={{ width: 48, height: 16 }}
            />
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

          {/* Process rows (+ thread sub-rows) */}
          <div className="relative">
            {processes.map((process) => {
              const hasThreads = (process.threads?.length ?? 0) > 0;

              return (
                <div key={process.id}>
                  {/* ── Linha do processo ─────────────────────────── */}
                  <div
                    className={`flex items-center border-b border-white/5 ${hasThreads ? 'border-b-0' : ''}`}
                  >
                    <div
                      className="sticky left-0 z-20 bg-slate-900 border-r border-slate-700 px-2 flex items-center shrink-0"
                      style={{ width: 48, height: CELL_H }}
                    >
                      <span
                        className="text-[10px] font-bold truncate"
                        style={{ color: process.color }}
                      >
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

                  {/* ── Sub-linhas de threads ─────────────────────── */}
                  {hasThreads &&
                    process.threads!.map((thread, threadIdx) => (
                      <GanttThreadRow
                        key={thread.tid}
                        thread={thread}
                        threadIndex={threadIdx}
                        process={process}
                        ticks={ticks}
                        onCellMouseEnter={setTooltip}
                        onCellMouseLeave={handleMouseLeave}
                      />
                    ))}

                  {/* Separador após o bloco de threads */}
                  {hasThreads && (
                    <div className="border-b border-white/5" />
                  )}
                </div>
              );
            })}

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

      <GanttLegend />
      {tooltip && <GanttTooltip data={tooltip} />}
    </div>
  );
};

export default GanttChart;
