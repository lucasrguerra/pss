import { useEffect, type RefObject } from "react";
import { CELL_W } from "../components/GanttChart/constants";

/**
 * Smoothly scrolls `containerRef` so the current tick stays horizontally
 * centred in the viewport.  Only triggers when the simulation is actively
 * running (to avoid stealing the user's manual scroll while paused).
 */
export function useGanttScroll(
  containerRef: RefObject<HTMLDivElement | null>,
  currentTickIndex: number,
  isRunning: boolean,
) {
  useEffect(() => {
    if (!isRunning) return;
    const el = containerRef.current;
    if (!el) return;

    const targetLeft = currentTickIndex * CELL_W - el.clientWidth / 2 + CELL_W / 2;
    el.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
  }, [containerRef, currentTickIndex, isRunning]);
}
