import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Process, SchedulerConfig } from "@core/types";

// ============================================================
// Defaults
// ============================================================

const DEFAULT_CONFIG: SchedulerConfig = {
  algorithm: "FCFS",
  quantum: 2,
  contextSwitchTime: 0,
  isPreemptive: false,
  agingEnabled: false,
  agingInterval: 5,
};

// ============================================================
// Store
// ============================================================

interface ProcessStore {
  processes: Process[];
  config: SchedulerConfig;

  addProcess: (p: Process) => void;
  updateProcess: (id: string, updates: Partial<Process>) => void;
  removeProcess: (id: string) => void;
  clearProcesses: () => void;
  setConfig: (updates: Partial<SchedulerConfig>) => void;
  loadPreset: (processes: Process[], config: SchedulerConfig) => void;
}

export const useProcessStore = create<ProcessStore>()(
  persist(
    (set) => ({
      processes: [],
      config: DEFAULT_CONFIG,

      addProcess: (p) =>
        set((s) => ({ processes: [...s.processes, p] })),

      updateProcess: (id, updates) =>
        set((s) => ({
          processes: s.processes.map((p) =>
            p.id === id ? { ...p, ...updates } : p,
          ),
        })),

      removeProcess: (id) =>
        set((s) => ({ processes: s.processes.filter((p) => p.id !== id) })),

      clearProcesses: () => set({ processes: [] }),

      setConfig: (updates) =>
        set((s) => ({ config: { ...s.config, ...updates } })),

      loadPreset: (processes, config) => set({ processes, config }),
    }),
    { name: "pss:session" },
  ),
);
