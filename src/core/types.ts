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
  | "HRRN"
  | "MLFQ";

// --------------- Thread types --------------------------------

/**
 * Modelo de mapeamento threads de usuário → threads de kernel.
 *
 * MANY_TO_ONE  — N threads de usuário para 1 kernel thread (green threads).
 *                Uma thread em I/O bloqueia todo o processo.
 * ONE_TO_ONE   — 1 thread de usuário para 1 kernel thread (pthreads/POSIX).
 *                Threads bloqueiam independentemente.
 * MANY_TO_MANY — N threads de usuário para M kernel threads (M ≤ N).
 *                Slots de kernel são liberados durante I/O e reatribuídos.
 */
export type ThreadModel =
  | "MANY_TO_ONE"
  | "ONE_TO_ONE"
  | "MANY_TO_MANY";

/** Política de escalonamento intra-processo (entre threads da mesma processo). */
export type IntraProcessPolicy = "FCFS" | "RR" | "PRIORITY";

/** Definição estática de uma thread dentro de um processo. */
export interface Thread {
  tid: string;         // identificador único dentro do processo
  name: string;
  bursts: BurstSegment[];  // sequência própria de bursts CPU/IO
  priority?: number;       // 1 (mais alta) – 10 (mais baixa); default 5
}

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
  bursts: BurstSegment[]; // must start (and end) with a CPU burst; ignored when threads defined
  // ── Thread fields (optional — backward compatible) ──────
  threads?: Thread[];                        // se definido, bursts acima são ignorados
  threadModel?: ThreadModel;                 // default ONE_TO_ONE quando threads definidas
  threadSchedulingPolicy?: IntraProcessPolicy; // política intra-processo; default FCFS
  threadQuantum?: number;                    // quantum para política RR intra-processo; default 2
  kernelThreadCount?: number;                // apenas MANY_TO_MANY: M ≤ threads.length; default ceil(N/2)
}

// --------------- Scheduler configuration --------------------

export interface MlqQueueDef {
  priorityMin: number; // inclusive lower bound
  priorityMax: number; // inclusive upper bound
  algorithm: "FCFS" | "RR" | "PRIORITY_NP";
  quantum: number; // used only when algorithm === "RR"
}

export interface MlfqLevelDef {
  quantum: number; // time slice for this level (ticks, >= 1)
}

export interface SchedulerConfig {
  algorithm: SchedulingAlgorithm;
  quantum: number; // for RR (default 2)
  contextSwitchTime: number; // overhead between processes (default 0)
  isPreemptive: boolean; // applicable to SJF and Priority
  agingEnabled: boolean; // prevent starvation in Priority scheduling
  agingInterval: number; // ticks in Ready before priority-- (min 1)
  mlqQueues?: MlqQueueDef[]; // queue definitions for MULTILEVEL algorithm
  mlfqLevels?: MlfqLevelDef[]; // level definitions for MLFQ algorithm
  mlfqBoostInterval?: number; // ticks in Ready before boost to level 0; 0 = disabled
}

// --------------- Runtime state ------------------------------

export type StateLabel =
  | "New"        // before arrivalTime
  | "Ready"      // in ready queue, waiting for CPU
  | "Running"    // executing CPU burst
  | "Waiting"    // executing I/O burst
  | "Terminated"; // finished all bursts

/**
 * Estado de runtime de uma thread individual.
 * Espelha ProcessRuntime mas no nível de thread.
 */
export interface ThreadRuntime {
  threadId: string;
  processId: string;
  state: StateLabel;
  remainingBurst: number;
  burstIndex: number;
  arrivalTick: number;       // mesmo que o processo pai
  startTick: number | null;  // primeiro tick em Running
  finishTick: number | null;
  waitingTime: number;
  cpuTime: number;
  ioTime: number;
  responseTime: number | null;
  quantumRemaining: number;  // quantum intra-processo (para política RR)
  currentPriority: number;
  kernelWaiting?: boolean;   // MANY_TO_MANY: aguardando slot de kernel thread
}

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
  mlfqLevel?: number; // current MLFQ level (0 = highest); undefined for non-MLFQ runs
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
  // ── Thread state (only present when at least one process has threads) ──
  threadStates?: Record<string, Record<string, StateLabel>>; // processId → threadId → state
  cpuThreads?: Record<string, string | null>;   // processId → threadId ativo (null se nenhum)
  kernelWaitingThreads?: Record<string, string[]>; // MANY_TO_MANY: threadIds em espera de slot
}

// --------------- Metrics ------------------------------------

/** Métricas por thread individual (calculadas após terminação). */
export interface ThreadMetrics {
  threadId: string;
  processId: string;
  threadName: string;
  processName?: string;
  arrivalTime: number;
  startTick: number;
  finishTick: number;
  responseTime: number;
  turnaroundTime: number;
  waitingTime: number;
  cpuTime: number;
  ioTime: number;
}

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
