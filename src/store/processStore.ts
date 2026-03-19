import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MlqQueueDef, Process, SchedulerConfig } from "@core/types";

// ============================================================
// Defaults
// ============================================================

const DEFAULT_MLQ_QUEUES: MlqQueueDef[] = [
  { priorityMin: 1, priorityMax: 3, algorithm: "RR", quantum: 2 },
  { priorityMin: 4, priorityMax: 7, algorithm: "PRIORITY_NP", quantum: 2 },
  { priorityMin: 8, priorityMax: 10, algorithm: "FCFS", quantum: 2 },
];

const DEFAULT_CONFIG: SchedulerConfig = {
  algorithm: "FCFS",
  quantum: 2,
  contextSwitchTime: 0,
  isPreemptive: false,
  agingEnabled: false,
  agingInterval: 5,
  mlqQueues: DEFAULT_MLQ_QUEUES,
};

// ============================================================
// Store
// ============================================================

interface ProcessStore {
  processes: Process[];
  config: SchedulerConfig;
  _nextPid: number;

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
      _nextPid: 1,

      addProcess: (p) =>
        set((s) => ({
          processes: [...s.processes, { ...p, pid: s._nextPid }],
          _nextPid: s._nextPid + 1,
        })),

      updateProcess: (id, updates) =>
        set((s) => ({
          processes: s.processes.map((p) =>
            p.id === id ? { ...p, ...updates } : p,
          ),
        })),

      removeProcess: (id) =>
        set((s) => ({ processes: s.processes.filter((p) => p.id !== id) })),

      clearProcesses: () => set({ processes: [], _nextPid: 1 }),

      setConfig: (updates) =>
        set((s) => ({ config: { ...s.config, ...updates } })),

      loadPreset: (processes, config) =>
        set({
          processes,
          config,
          _nextPid: processes.reduce((max, p) => Math.max(max, p.pid ?? 0), 0) + 1,
        }),
    }),
    { name: "pss:session" },
  ),
);
