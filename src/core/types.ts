// ============================================================
// Core types — Process Scheduler Simulator
// ============================================================

export type SchedulingAlgorithm =
  | "FCFS"
  | "SJF_NP"
  | "SJF_P"
  | "RR"
  | "PRIORITY_NP"
  | "PRIORITY_P"
  | "PRIORITY_RR"
  | "MULTILEVEL"
  | "HRRN";

// --------------- Static process definition ------------------

export interface BurstSegment {
  type: "cpu" | "io";
  duration: number; // must be ≥ 1
}

export interface Process {
  pid?: number; // auto-incremented sequential integer (1, 2, 3…); set by store
  id: string;
  name: string;
  arrivalTime: number; // tick of arrival (≥ 0)
  priority: number; // 1 (highest) – 10 (lowest); default 5
  color: string; // HEX color for Gantt display
  bursts: BurstSegment[]; // must start (and end) with a CPU burst
}

// --------------- Scheduler configuration --------------------

export interface MlqQueueDef {
  priorityMin: number; // inclusive lower bound
  priorityMax: number; // inclusive upper bound
  algorithm: "FCFS" | "RR" | "PRIORITY_NP";
  quantum: number; // used only when algorithm === "RR"
}

export interface SchedulerConfig {
  algorithm: SchedulingAlgorithm;
  quantum: number; // for RR (default 2)
  contextSwitchTime: number; // overhead between processes (default 0)
  isPreemptive: boolean; // applicable to SJF and Priority
  agingEnabled: boolean; // prevent starvation in Priority scheduling
  agingInterval: number; // ticks in Ready before priority-- (min 1)
  mlqQueues?: MlqQueueDef[]; // queue definitions for MULTILEVEL algorithm
}

// --------------- Runtime state ------------------------------

export type StateLabel =
  | "New" // before arrivalTime
  | "Ready" // in ready queue, waiting for CPU
  | "Running" // executing CPU burst
  | "Waiting" // executing I/O burst
  | "Terminated"; // finished all bursts

export interface ProcessRuntime {
  // ---- spec fields ----
  processId: string;
  state: StateLabel;
  remainingBurst: number; // ticks left in current burst
  burstIndex: number; // index into Process.bursts
  arrivalTick: number; // tick when process first entered Ready
  startTick: number | null; // tick of first Running state
  finishTick: number | null; // tick when process Terminated
  waitingTime: number; // accumulated ticks in Ready
  cpuTime: number; // accumulated ticks in Running
  ioTime: number; // accumulated ticks in Waiting
  responseTime: number | null; // startTick - arrivalTick (set once)
  // ---- engine-internal fields ----
  quantumRemaining: number; // remaining quantum for RR; reset on dispatch
  currentPriority: number; // mutable via aging; starts = Process.priority
}

// --------------- Tick snapshot ------------------------------

export interface SimTick {
  tick: number;
  cpuProcess: string | null; // processId running on CPU (null if idle)
  ioProcesses: string[]; // processIds in I/O
  readyQueue: string[]; // processIds in ready queue (in queue order)
  states: Record<string, StateLabel>; // all processId → state
  contextSwitching: boolean; // true during context-switch overhead
  ctxSwitchForProcess: string | null; // incoming processId during ctx-switch overhead (null otherwise)
}

// --------------- Metrics ------------------------------------

export interface ProcessMetrics {
  processId: string;
  arrivalTime: number;
  startTick: number;
  finishTick: number;
  responseTime: number;
  turnaroundTime: number;
  waitingTime: number;
  cpuTime: number;
  ioTime: number;
  cpuUtilization: number; // cpuTime / turnaroundTime * 100
  boundType: "CPU Bound" | "I/O Bound" | "Balanced";
}

export interface GlobalMetrics {
  avgResponseTime: number;
  avgTurnaroundTime: number;
  avgWaitingTime: number;
  cpuThroughput: number; // processes completed / total ticks
  cpuUtilization: number; // Σ cpuTime / totalTicks * 100
  totalSimulationTime: number;
}
