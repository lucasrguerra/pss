import type {
  Process,
  ProcessRuntime,
  SchedulerConfig,
  SimTick,
  StateLabel,
} from "./types";
import { algorithms } from "./algorithms/index";
import type { SchedulerAlgorithm } from "./algorithms/index";

// ============================================================
// SimulationEngine
// ============================================================

export class SimulationEngine {
  private readonly _processes: Process[];
  private readonly _config: SchedulerConfig;
  private readonly _algorithm: SchedulerAlgorithm;

  private _tick: number; // starts at -1; incremented at top of step()
  private _runtimes: Map<string, ProcessRuntime>;
  private _cpuProcess: ProcessRuntime | null;
  private _readyQueue: ProcessRuntime[]; // ordered array (FIFO for RR)
  private _ioQueue: ProcessRuntime[];
  private _contextSwitchRemaining: number;
  private _prevCpuProcessId: string | null; // track context switch detection

  constructor(processes: Process[], config: SchedulerConfig) {
    if (processes.length === 0) throw new Error("At least one process required");
    this._processes = processes;
    this._config = config;
    this._algorithm = algorithms[config.algorithm];
    this._tick = -1;
    this._cpuProcess = null;
    this._readyQueue = [];
    this._ioQueue = [];
    this._contextSwitchRemaining = 0;
    this._prevCpuProcessId = null;
    this._runtimes = new Map(processes.map((p) => [p.id, initRuntime(p, config)]));
  }

  // ----------------------------------------------------------
  // Public API
  // ----------------------------------------------------------

  /** Advance one tick; return snapshot of that tick. */
  step(): SimTick {
    if (this.isFinished) throw new Error("Simulation is already finished");

    this._tick++;

    // 1. Arrivals
    for (const p of this._processes) {
      const rt = this._runtimes.get(p.id)!;
      if (p.arrivalTime === this._tick && rt.state === "New") {
        this._transition(rt, "Ready");
        this._readyQueue.push(rt);
      }
    }

    // 2. Preemption & Quantum Check (from previous tick's state)
    if (this._cpuProcess !== null && this._readyQueue.length > 0) {
      const candidate = this._algorithm.select(this._readyQueue, this._config);
      if (
        candidate !== null &&
        this._algorithm.shouldPreempt(this._cpuProcess, candidate, this._config)
      ) {
        const cpu = this._cpuProcess;
        this._transition(cpu, "Ready");
        this._readyQueue.push(cpu);
        this._cpuProcess = null;
      }
    }

    // 3. Dispatch / Context Switch
    if (this._contextSwitchRemaining > 0) {
      // Doing context switch this tick
      // We don't dispatch.
    } else {
      if (this._cpuProcess === null && this._readyQueue.length > 0) {
        const next = this._algorithm.select(this._readyQueue, this._config);
        if (next !== null) {
          const idx = this._readyQueue.indexOf(next);
          if (idx !== -1) this._readyQueue.splice(idx, 1);

          if (
            this._config.contextSwitchTime > 0 &&
            this._prevCpuProcessId !== null &&
            this._prevCpuProcessId !== next.processId
          ) {
            this._readyQueue.unshift(next);
            this._contextSwitchRemaining = this._config.contextSwitchTime;
            this._prevCpuProcessId = next.processId;
          } else {
            if (next.startTick === null) next.startTick = this._tick;
            next.quantumRemaining = this._config.quantum;
            this._transition(next, "Running");
            this._prevCpuProcessId = next.processId;
            this._cpuProcess = next;
          }
        }
      }
    }

    // 4. Take Snapshot representing what happens DURING this tick
    const snapshot = this._snapshot();

    // 5. Passage of Time (Simulate execution for 1 tick)
    if (this._contextSwitchRemaining > 0) {
      this._contextSwitchRemaining--;
    }

    if (this._cpuProcess !== null) {
      const cpu = this._cpuProcess;
      cpu.remainingBurst--;
      cpu.cpuTime++;
      cpu.quantumRemaining--;
    }

    for (const rt of this._ioQueue) {
      rt.remainingBurst--;
      rt.ioTime++;
    }

    for (const rt of this._readyQueue) {
      rt.waitingTime++;
    }

    // 6. Aging (Priority)
    if (
      this._config.agingEnabled &&
      this._tick > 0 &&
      this._tick % this._config.agingInterval === 0
    ) {
      for (const rt of this._readyQueue) {
        rt.currentPriority = Math.max(1, rt.currentPriority - 1);
      }
    }

    // 7. Process completions / transition to next state for NEXT tick
    if (this._cpuProcess !== null) {
      const cpu = this._cpuProcess;
      if (cpu.remainingBurst === 0) {
        this._advanceBurst(cpu);
        const process = this._processes.find((p) => p.id === cpu.processId)!;
        const nextBurst = process.bursts[cpu.burstIndex];
        if (nextBurst !== undefined && nextBurst.type === "io") {
          this._transition(cpu, "Waiting");
          this._ioQueue.push(cpu);
        } else if (nextBurst !== undefined && nextBurst.type === "cpu") {
          this._transition(cpu, "Ready");
          this._readyQueue.push(cpu);
        } else {
          this._transition(cpu, "Terminated");
          cpu.finishTick = this._tick + 1;
        }
        this._cpuProcess = null;
      } else if (this._algorithm.isQuantumExpired(cpu, this._config)) {
        this._transition(cpu, "Ready");
        this._readyQueue.push(cpu);
        this._cpuProcess = null;
      }
    }

    // IO completions
    const nextIoQueue: ProcessRuntime[] = [];
    for (const rt of this._ioQueue) {
      if (rt.remainingBurst === 0) {
        this._advanceBurst(rt);
        const process = this._processes.find((p) => p.id === rt.processId)!;
        if (rt.burstIndex < process.bursts.length) {
          this._transition(rt, "Ready");
          this._readyQueue.push(rt);
        } else {
          this._transition(rt, "Terminated");
          rt.finishTick = this._tick + 1;
        }
      } else {
        nextIoQueue.push(rt);
      }
    }
    this._ioQueue = nextIoQueue;

    return snapshot;
  }

  /** Run to completion; return all tick snapshots. */
  runAll(): SimTick[] {
    const results: SimTick[] = [];
    while (!this.isFinished) {
      results.push(this.step());
      if (results.length > 10_000) {
        throw new Error("Simulation exceeded 10,000 ticks — check for infinite loop");
      }
    }
    return results;
  }

  get isFinished(): boolean {
    for (const rt of this._runtimes.values()) {
      if (rt.state !== "Terminated") return false;
    }
    return true;
  }

  get currentTick(): number {
    return this._tick;
  }

  get runtimeStates(): ProcessRuntime[] {
    return Array.from(this._runtimes.values());
  }

  // ----------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------

  private _transition(rt: ProcessRuntime, state: StateLabel): void {
    rt.state = state;
  }

  private _advanceBurst(rt: ProcessRuntime): void {
    rt.burstIndex++;
    const process = this._processes.find((p) => p.id === rt.processId)!;
    const nextBurst = process.bursts[rt.burstIndex];
    rt.remainingBurst = nextBurst !== undefined ? nextBurst.duration : 0;
  }

  private _snapshot(): SimTick {
    const states: Record<string, StateLabel> = {};
    for (const [id, rt] of this._runtimes) {
      states[id] = rt.state;
    }
    const contextSwitching = this._contextSwitchRemaining > 0;
    return {
      tick: this._tick,
      cpuProcess: contextSwitching ? null : (this._cpuProcess?.processId ?? null),
      ioProcesses: this._ioQueue.map((rt) => rt.processId),
      readyQueue: this._readyQueue.map((rt) => rt.processId),
      states,
      contextSwitching,
      ctxSwitchForProcess: contextSwitching
        ? (this._readyQueue[0]?.processId ?? null)
        : null,
    };
  }
}

// ============================================================
// Helper: initialise a ProcessRuntime from a Process
// ============================================================

function initRuntime(p: Process, config: SchedulerConfig): ProcessRuntime {
  const firstBurst = p.bursts[0];
  if (firstBurst === undefined || firstBurst.type !== "cpu") {
    throw new Error(`Process ${p.id}: first burst must be a CPU burst`);
  }
  return {
    processId: p.id,
    state: "New",
    remainingBurst: firstBurst.duration,
    burstIndex: 0,
    arrivalTick: p.arrivalTime,
    startTick: null,
    finishTick: null,
    waitingTime: 0,
    cpuTime: 0,
    ioTime: 0,
    responseTime: null,
    quantumRemaining: config.quantum,
    currentPriority: p.priority,
  };
}
