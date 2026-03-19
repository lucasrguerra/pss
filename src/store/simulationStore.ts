import { create } from "zustand";
import { SimulationEngine } from "@core/engine";
import type { Process, SchedulerConfig, SimTick } from "@core/types";

// ============================================================
// Types
// ============================================================

export type SimStatus = "idle" | "running" | "paused" | "finished";

interface SimulationStore {
  status: SimStatus;
  ticks: SimTick[];
  // Mutable engine instance — reactivity comes from ticks[] and status, not engine itself
  engine: SimulationEngine | null;
  // Saved so reset() can recreate the engine without coupling to processStore
  _processes: Process[];
  _config: SchedulerConfig | null;

  init: (processes: Process[], config: SchedulerConfig) => void;
  stepOnce: () => void;
  play: () => void;
  pause: () => void;
  reset: () => void;
}

// ============================================================
// Store
// ============================================================

export const useSimulationStore = create<SimulationStore>()((set, get) => ({
  status: "idle",
  ticks: [],
  engine: null,
  _processes: [],
  _config: null,

  init: (processes, config) => {
    const engine = new SimulationEngine(processes, config);
    set({
      engine,
      ticks: [],
      status: "paused",
      _processes: processes,
      _config: config,
    });
  },

  stepOnce: () => {
    const { engine, ticks, status } = get();
    if (!engine || engine.isFinished || status === "finished") return;
    const tick = engine.step();
    set({
      ticks: [...ticks, tick],
      status: engine.isFinished ? "finished" : status,
    });
  },

  play: () => set({ status: "running" }),

  pause: () => set({ status: "paused" }),

  reset: () => {
    const { _processes, _config } = get();
    if (_processes.length === 0 || _config === null) return;
    const engine = new SimulationEngine(_processes, _config);
    // Return to "idle" so the next Play/Step re-runs init() with the
    // current processStore config (picks up algorithm changes, etc.)
    set({ engine, ticks: [], status: "idle" });
  },
}));
