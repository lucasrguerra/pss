import { useEffect, useRef } from "react";
import { useSimulationStore } from "../store/simulationStore";
import { useUiStore } from "../store/uiStore";

/**
 * Drives the simulation animation loop using requestAnimationFrame.
 * Call once at the app root. Returns nothing — side-effect only.
 *
 * Tick interval = 1000 / speed (ms).
 * The loop is active only while status === "running".
 */
export function useSimulation(): void {
  const status = useSimulationStore((s) => s.status);
  const stepOnce = useSimulationStore((s) => s.stepOnce);
  const speed = useUiStore((s) => s.speed);

  const rafRef = useRef<number | undefined>(undefined);
  const lastTickTime = useRef<number>(0);

  useEffect(() => {
    if (status !== "running") {
      if (rafRef.current !== undefined) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
      }
      return;
    }

    const interval = 1000 / speed;

    const loop = (timestamp: number) => {
      if (timestamp - lastTickTime.current >= interval) {
        lastTickTime.current = timestamp;
        stepOnce();
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    // Reset timing so the first tick fires immediately after play
    lastTickTime.current = 0;
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== undefined) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
      }
    };
  }, [status, speed, stepOnce]);
}
