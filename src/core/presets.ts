import type { Process, SchedulerConfig } from "./types";

export interface Preset {
  name: string;
  description: string;
  processes: Process[];
  config: SchedulerConfig;
}

const defaultConfig = (
  overrides: Partial<SchedulerConfig> = {},
): SchedulerConfig => ({
  algorithm: "FCFS",
  quantum: 2,
  contextSwitchTime: 0,
  isPreemptive: false,
  agingEnabled: false,
  agingInterval: 5,
  ...overrides,
});

export const presets: Preset[] = [
  {
    name: "classic_fcfs",
    description: "4 simple processes, no I/O — demonstrates FCFS order",
    processes: [
      { id: "p1", name: "P1", arrivalTime: 0, priority: 5, color: "#4FC3F7", bursts: [{ type: "cpu", duration: 5 }] },
      { id: "p2", name: "P2", arrivalTime: 1, priority: 5, color: "#81C784", bursts: [{ type: "cpu", duration: 3 }] },
      { id: "p3", name: "P3", arrivalTime: 2, priority: 5, color: "#FFB74D", bursts: [{ type: "cpu", duration: 1 }] },
      { id: "p4", name: "P4", arrivalTime: 3, priority: 5, color: "#F06292", bursts: [{ type: "cpu", duration: 7 }] },
    ],
    config: defaultConfig({ algorithm: "FCFS" }),
  },
  {
    name: "rr_demo",
    description: "5 processes with quantum 3 — Round Robin rotation",
    processes: [
      { id: "p1", name: "P1", arrivalTime: 0, priority: 5, color: "#4FC3F7", bursts: [{ type: "cpu", duration: 6 }] },
      { id: "p2", name: "P2", arrivalTime: 0, priority: 5, color: "#81C784", bursts: [{ type: "cpu", duration: 4 }] },
      { id: "p3", name: "P3", arrivalTime: 1, priority: 5, color: "#FFB74D", bursts: [{ type: "cpu", duration: 5 }] },
      { id: "p4", name: "P4", arrivalTime: 2, priority: 5, color: "#F06292", bursts: [{ type: "cpu", duration: 2 }] },
      { id: "p5", name: "P5", arrivalTime: 3, priority: 5, color: "#CE93D8", bursts: [{ type: "cpu", duration: 3 }] },
    ],
    config: defaultConfig({ algorithm: "RR", quantum: 3 }),
  },
  {
    name: "starvation",
    description: "High-priority processes starve P5 — demonstrates Priority NP starvation",
    processes: [
      { id: "p1", name: "P1", arrivalTime: 0, priority: 1, color: "#4FC3F7", bursts: [{ type: "cpu", duration: 3 }] },
      { id: "p2", name: "P2", arrivalTime: 1, priority: 1, color: "#81C784", bursts: [{ type: "cpu", duration: 3 }] },
      { id: "p3", name: "P3", arrivalTime: 2, priority: 1, color: "#FFB74D", bursts: [{ type: "cpu", duration: 3 }] },
      { id: "p4", name: "P4", arrivalTime: 3, priority: 1, color: "#F06292", bursts: [{ type: "cpu", duration: 3 }] },
      { id: "p5", name: "P5", arrivalTime: 0, priority: 10, color: "#CE93D8", bursts: [{ type: "cpu", duration: 5 }] },
    ],
    config: defaultConfig({ algorithm: "PRIORITY_NP" }),
  },
  {
    name: "aging_fix",
    description: "Same starvation scenario fixed with aging",
    processes: [
      { id: "p1", name: "P1", arrivalTime: 0, priority: 1, color: "#4FC3F7", bursts: [{ type: "cpu", duration: 3 }] },
      { id: "p2", name: "P2", arrivalTime: 1, priority: 1, color: "#81C784", bursts: [{ type: "cpu", duration: 3 }] },
      { id: "p3", name: "P3", arrivalTime: 2, priority: 1, color: "#FFB74D", bursts: [{ type: "cpu", duration: 3 }] },
      { id: "p4", name: "P4", arrivalTime: 3, priority: 1, color: "#F06292", bursts: [{ type: "cpu", duration: 3 }] },
      { id: "p5", name: "P5", arrivalTime: 0, priority: 10, color: "#CE93D8", bursts: [{ type: "cpu", duration: 5 }] },
    ],
    config: defaultConfig({ algorithm: "PRIORITY_P", isPreemptive: true, agingEnabled: true, agingInterval: 3 }),
  },
  {
    name: "priority_rr_demo",
    description: "Priority RR: P3 (priority 1) preempts mid-run; P1 & P2 (priority 2) share CPU via RR",
    processes: [
      { id: "p1", name: "P1", arrivalTime: 0, priority: 2, color: "#4FC3F7", bursts: [{ type: "cpu", duration: 4 }] },
      { id: "p2", name: "P2", arrivalTime: 0, priority: 2, color: "#81C784", bursts: [{ type: "cpu", duration: 4 }] },
      { id: "p3", name: "P3", arrivalTime: 4, priority: 1, color: "#F06292", bursts: [{ type: "cpu", duration: 2 }] },
    ],
    config: defaultConfig({ algorithm: "PRIORITY_RR", quantum: 2 }),
  },
  {
    name: "io_heavy",
    description: "Mixed CPU-bound and I/O-bound processes",
    processes: [
      { id: "p1", name: "P1", arrivalTime: 0, priority: 5, color: "#4FC3F7", bursts: [{ type: "cpu", duration: 6 }, { type: "io", duration: 1 }, { type: "cpu", duration: 2 }] },
      { id: "p2", name: "P2", arrivalTime: 0, priority: 5, color: "#81C784", bursts: [{ type: "cpu", duration: 1 }, { type: "io", duration: 8 }, { type: "cpu", duration: 1 }] },
      { id: "p3", name: "P3", arrivalTime: 2, priority: 5, color: "#FFB74D", bursts: [{ type: "cpu", duration: 4 }, { type: "io", duration: 2 }, { type: "cpu", duration: 4 }] },
    ],
    config: defaultConfig({ algorithm: "SJF_P", isPreemptive: true }),
  },
  {
    name: "convoy_effect",
    description: "One long process blocks shorter ones — FCFS convoy vs SJF comparison",
    processes: [
      { id: "p1", name: "P1", arrivalTime: 0, priority: 5, color: "#EF5350", bursts: [{ type: "cpu", duration: 12 }] },
      { id: "p2", name: "P2", arrivalTime: 1, priority: 5, color: "#81C784", bursts: [{ type: "cpu", duration: 2 }] },
      { id: "p3", name: "P3", arrivalTime: 2, priority: 5, color: "#FFB74D", bursts: [{ type: "cpu", duration: 1 }] },
      { id: "p4", name: "P4", arrivalTime: 3, priority: 5, color: "#CE93D8", bursts: [{ type: "cpu", duration: 3 }] },
    ],
    config: defaultConfig({ algorithm: "FCFS" }),
  },
  {
    name: "context_switch_demo",
    description: "3 processos FCFS com 2 ticks de overhead — veja as células vermelhas de Context Switch",
    processes: [
      { id: "p1", name: "P1", arrivalTime: 0, priority: 5, color: "#4FC3F7", bursts: [{ type: "cpu", duration: 3 }] },
      { id: "p2", name: "P2", arrivalTime: 0, priority: 5, color: "#81C784", bursts: [{ type: "cpu", duration: 3 }] },
      { id: "p3", name: "P3", arrivalTime: 0, priority: 5, color: "#FFB74D", bursts: [{ type: "cpu", duration: 3 }] },
    ],
    config: defaultConfig({ algorithm: "FCFS", contextSwitchTime: 2 }),
  },
  {
    name: "multilevel_demo",
    description: "Priority RR with 3 priority tiers — demonstrates multilevel scheduling",
    processes: [
      { id: "p1", name: "P1", arrivalTime: 0, priority: 1, color: "#EF5350", bursts: [{ type: "cpu", duration: 4 }] },
      { id: "p2", name: "P2", arrivalTime: 0, priority: 1, color: "#FF8A65", bursts: [{ type: "cpu", duration: 3 }] },
      { id: "p3", name: "P3", arrivalTime: 2, priority: 2, color: "#81C784", bursts: [{ type: "cpu", duration: 5 }] },
      { id: "p4", name: "P4", arrivalTime: 2, priority: 2, color: "#4FC3F7", bursts: [{ type: "cpu", duration: 2 }] },
      { id: "p5", name: "P5", arrivalTime: 4, priority: 3, color: "#CE93D8", bursts: [{ type: "cpu", duration: 6 }] },
    ],
    config: defaultConfig({ algorithm: "PRIORITY_RR", quantum: 2 }),
  },
];
