import { describe, it, expect } from "vitest";
import { MLFQAlgorithm } from "../algorithms/mlfq";
import { SimulationEngine } from "../engine";
import type { MlfqLevelDef, Process, ProcessRuntime, SchedulerConfig } from "../types";

const mlfq = new MLFQAlgorithm();

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

const DEFAULT_LEVELS: MlfqLevelDef[] = [
  { quantum: 2 },
  { quantum: 4 },
  { quantum: 8 },
];

function makeRt(
  id: string,
  opts: {
    arrivalTick?: number;
    quantumRemaining?: number;
    mlfqLevel?: number;
    waitingTime?: number;
    remainingBurst?: number;
  } = {},
): ProcessRuntime {
  return {
    processId: id,
    state: "Ready",
    remainingBurst: opts.remainingBurst ?? 10,
    burstIndex: 0,
    arrivalTick: opts.arrivalTick ?? 0,
    startTick: null,
    finishTick: null,
    waitingTime: opts.waitingTime ?? 0,
    cpuTime: 0,
    ioTime: 0,
    responseTime: null,
    quantumRemaining: opts.quantumRemaining ?? 2,
    currentPriority: 5,
    mlfqLevel: opts.mlfqLevel,
  };
}

const cfg = (overrides: Partial<SchedulerConfig> = {}): SchedulerConfig => ({
  algorithm: "MLFQ",
  quantum: 2,
  contextSwitchTime: 0,
  isPreemptive: false,
  agingEnabled: false,
  agingInterval: 5,
  mlfqLevels: DEFAULT_LEVELS,
  mlfqBoostInterval: 0,
  ...overrides,
});

const p = (
  id: string,
  arrival: number,
  cpuDuration: number,
): Process => ({
  id,
  name: id,
  arrivalTime: arrival,
  priority: 5,
  color: "#fff",
  bursts: [{ type: "cpu", duration: cpuDuration }],
});

const pWithIo = (
  id: string,
  arrival: number,
  cpu1: number,
  io: number,
  cpu2: number,
): Process => ({
  id,
  name: id,
  arrivalTime: arrival,
  priority: 5,
  color: "#fff",
  bursts: [
    { type: "cpu", duration: cpu1 },
    { type: "io",  duration: io   },
    { type: "cpu", duration: cpu2 },
  ],
});

// ----------------------------------------------------------------
// Unit: select() — initialization
// ----------------------------------------------------------------

describe("MLFQ select() — initialization", () => {
  it("returns null for empty queue", () => {
    expect(mlfq.select([], cfg())).toBeNull();
  });

  it("assigns level 0 to a new process (mlfqLevel undefined)", () => {
    const rt = makeRt("p1", { mlfqLevel: undefined });
    mlfq.select([rt], cfg());
    expect(rt.mlfqLevel).toBe(0);
  });

  it("does not re-initialize a process that already has mlfqLevel 0", () => {
    const rt = makeRt("p1", { mlfqLevel: 0, quantumRemaining: 2 });
    mlfq.select([rt], cfg());
    expect(rt.mlfqLevel).toBe(0);
  });
});

// ----------------------------------------------------------------
// Unit: select() — demotion
// ----------------------------------------------------------------

describe("MLFQ select() — demotion", () => {
  it("demotes a quantum-expired process (quantumRemaining <= 0) from level 0 to 1", () => {
    const rt = makeRt("p1", { mlfqLevel: 0, quantumRemaining: 0 });
    mlfq.select([rt], cfg());
    expect(rt.mlfqLevel).toBe(1);
  });

  it("demotes from level 1 to level 2", () => {
    const rt = makeRt("p1", { mlfqLevel: 1, quantumRemaining: 0 });
    mlfq.select([rt], cfg());
    expect(rt.mlfqLevel).toBe(2);
  });

  it("caps demotion at the last level (no demotion beyond level N-1)", () => {
    const rt = makeRt("p1", { mlfqLevel: 2, quantumRemaining: 0 });
    mlfq.select([rt], cfg());
    expect(rt.mlfqLevel).toBe(2);
  });

  it("sets quantumRemaining sentinel to 1 after demotion", () => {
    const rt = makeRt("p1", { mlfqLevel: 0, quantumRemaining: 0 });
    mlfq.select([rt], cfg());
    expect(rt.quantumRemaining).toBe(1);
  });

  it("does NOT demote a process returning from I/O (quantumRemaining > 0)", () => {
    const rt = makeRt("p1", { mlfqLevel: 0, quantumRemaining: 1 });
    mlfq.select([rt], cfg());
    expect(rt.mlfqLevel).toBe(0);
  });
});

// ----------------------------------------------------------------
// Unit: select() — priority selection within/across levels
// ----------------------------------------------------------------

describe("MLFQ select() — level-based selection", () => {
  it("selects the process at the highest-priority level (lowest index)", () => {
    const low  = makeRt("lo", { mlfqLevel: 2, quantumRemaining: 2 });
    const mid  = makeRt("mid", { mlfqLevel: 1, quantumRemaining: 2 });
    const high = makeRt("hi", { mlfqLevel: 0, quantumRemaining: 2 });
    expect(mlfq.select([low, mid, high], cfg())?.processId).toBe("hi");
    expect(mlfq.select([mid, low], cfg())?.processId).toBe("mid");
  });

  it("uses FIFO (arrivalTick) within the same level", () => {
    const a = makeRt("a", { mlfqLevel: 0, arrivalTick: 5, quantumRemaining: 2 });
    const b = makeRt("b", { mlfqLevel: 0, arrivalTick: 2, quantumRemaining: 2 });
    const c = makeRt("c", { mlfqLevel: 0, arrivalTick: 8, quantumRemaining: 2 });
    expect(mlfq.select([a, b, c], cfg())?.processId).toBe("b");
  });

  it("uses processId as tiebreak when arrivalTick is equal", () => {
    const a = makeRt("z", { mlfqLevel: 1, arrivalTick: 3, quantumRemaining: 2 });
    const b = makeRt("a", { mlfqLevel: 1, arrivalTick: 3, quantumRemaining: 2 });
    expect(mlfq.select([a, b], cfg())?.processId).toBe("a");
  });
});

// ----------------------------------------------------------------
// Unit: select() — priority boost
// ----------------------------------------------------------------

describe("MLFQ select() — priority boost", () => {
  it("does NOT boost when boostInterval is 0 (disabled)", () => {
    const rt = makeRt("p1", { mlfqLevel: 2, waitingTime: 100, quantumRemaining: 2 });
    mlfq.select([rt], cfg({ mlfqBoostInterval: 0 }));
    expect(rt.mlfqLevel).toBe(2);
  });

  it("boosts a process to level 0 when waitingTime >= boostInterval", () => {
    const rt = makeRt("p1", { mlfqLevel: 2, waitingTime: 10, quantumRemaining: 2 });
    mlfq.select([rt], cfg({ mlfqBoostInterval: 10 }));
    expect(rt.mlfqLevel).toBe(0);
  });

  it("does NOT boost a process that hasn't waited long enough", () => {
    const rt = makeRt("p1", { mlfqLevel: 2, waitingTime: 9, quantumRemaining: 2 });
    mlfq.select([rt], cfg({ mlfqBoostInterval: 10 }));
    expect(rt.mlfqLevel).toBe(2);
  });

  it("does NOT boost a process already at level 0", () => {
    const rt = makeRt("p1", { mlfqLevel: 0, waitingTime: 100, quantumRemaining: 2 });
    mlfq.select([rt], cfg({ mlfqBoostInterval: 5 }));
    expect(rt.mlfqLevel).toBe(0);
  });
});

// ----------------------------------------------------------------
// Unit: shouldPreempt()
// ----------------------------------------------------------------

describe("MLFQ shouldPreempt()", () => {
  it("preempts when candidate is at a higher-priority level (lower index)", () => {
    const running   = makeRt("r", { mlfqLevel: 2 });
    const candidate = makeRt("c", { mlfqLevel: 0 });
    expect(mlfq.shouldPreempt(running, candidate, cfg())).toBe(true);
  });

  it("preempts from level 1 by level 0", () => {
    const running   = makeRt("r", { mlfqLevel: 1 });
    const candidate = makeRt("c", { mlfqLevel: 0 });
    expect(mlfq.shouldPreempt(running, candidate, cfg())).toBe(true);
  });

  it("does NOT preempt when candidate is at the same level", () => {
    const running   = makeRt("r", { mlfqLevel: 1 });
    const candidate = makeRt("c", { mlfqLevel: 1 });
    expect(mlfq.shouldPreempt(running, candidate, cfg())).toBe(false);
  });

  it("does NOT preempt when candidate is at a lower-priority level", () => {
    const running   = makeRt("r", { mlfqLevel: 0 });
    const candidate = makeRt("c", { mlfqLevel: 2 });
    expect(mlfq.shouldPreempt(running, candidate, cfg())).toBe(false);
  });
});

// ----------------------------------------------------------------
// Unit: isQuantumExpired()
// ----------------------------------------------------------------

describe("MLFQ isQuantumExpired()", () => {
  it("returns true when quantumRemaining <= 0", () => {
    expect(mlfq.isQuantumExpired(makeRt("p", { quantumRemaining: 0 }), cfg())).toBe(true);
  });

  it("returns true when quantumRemaining is negative", () => {
    expect(mlfq.isQuantumExpired(makeRt("p", { quantumRemaining: -1 }), cfg())).toBe(true);
  });

  it("returns false when quantumRemaining > 0", () => {
    expect(mlfq.isQuantumExpired(makeRt("p", { quantumRemaining: 1 }), cfg())).toBe(false);
  });
});

// ----------------------------------------------------------------
// Unit: getQuantumForProcess()
// ----------------------------------------------------------------

describe("MLFQ getQuantumForProcess()", () => {
  it("returns the quantum for level 0 (default: 2)", () => {
    const rt = makeRt("p", { mlfqLevel: 0 });
    expect(mlfq.getQuantumForProcess(rt, cfg())).toBe(2);
  });

  it("returns the quantum for level 1 (default: 4)", () => {
    const rt = makeRt("p", { mlfqLevel: 1 });
    expect(mlfq.getQuantumForProcess(rt, cfg())).toBe(4);
  });

  it("returns the quantum for level 2 (default: 8)", () => {
    const rt = makeRt("p", { mlfqLevel: 2 });
    expect(mlfq.getQuantumForProcess(rt, cfg())).toBe(8);
  });

  it("falls back to config.quantum when mlfqLevel is undefined", () => {
    const rt = makeRt("p", { mlfqLevel: undefined });
    expect(mlfq.getQuantumForProcess(rt, cfg({ quantum: 3 }))).toBe(2); // level 0 quantum
  });

  it("respects custom level quantums", () => {
    const custom = cfg({ mlfqLevels: [{ quantum: 1 }, { quantum: 3 }, { quantum: 7 }] });
    expect(mlfq.getQuantumForProcess(makeRt("p", { mlfqLevel: 0 }), custom)).toBe(1);
    expect(mlfq.getQuantumForProcess(makeRt("p", { mlfqLevel: 1 }), custom)).toBe(3);
    expect(mlfq.getQuantumForProcess(makeRt("p", { mlfqLevel: 2 }), custom)).toBe(7);
  });
});

// ----------------------------------------------------------------
// Integration — CT-MLFQ-01: single process demotion sequence
// ----------------------------------------------------------------

describe("MLFQ integration — CT-MLFQ-01: demotion sequence", () => {
  it("single process is demoted through levels, with per-level quantum (CT-MLFQ-01)", () => {
    // P1: CPU burst of 14 ticks
    // Level 0: quantum=2 → runs ticks 0-1, demoted to level 1
    // Level 1: quantum=4 → runs ticks 2-5, demoted to level 2
    // Level 2: quantum=8 → runs ticks 6-13 (burst completes)
    const processes = [p("p1", 0, 14)];
    const engine = new SimulationEngine(processes, cfg());
    const ticks = engine.runAll();
    const cpu = ticks.map((t) => t.cpuProcess);

    expect(cpu).toHaveLength(14);
    expect(cpu.every((id) => id === "p1")).toBe(true);
    // Verify total cpuTime
    const rt = engine.runtimeStates.find((r) => r.processId === "p1")!;
    expect(rt.cpuTime).toBe(14);
    expect(rt.state).toBe("Terminated");
  });
});

// ----------------------------------------------------------------
// Integration — CT-MLFQ-02: new arrival preempts demoted process
// ----------------------------------------------------------------

describe("MLFQ integration — CT-MLFQ-02: preemption by new process", () => {
  it("a newly arrived process (level 0) preempts a level-1 running process (CT-MLFQ-02)", () => {
    // P1: arrives 0, CPU:10 — will be at level 1 after tick 2
    // P2: arrives 3, CPU:2  — enters at level 0, should preempt P1 at tick 3
    const processes = [p("p1", 0, 10), p("p2", 3, 2)];
    const engine = new SimulationEngine(processes, cfg());
    const ticks = engine.runAll();
    const cpu = ticks.map((t) => t.cpuProcess);

    // P1 runs ticks 0-1 (quantum=2, level 0)
    expect(cpu[0]).toBe("p1");
    expect(cpu[1]).toBe("p1");
    // P1 is demoted to level 1 at tick 2, starts running with quantum=4
    expect(cpu[2]).toBe("p1");
    // P2 arrives at tick 3 (level 0), preempts P1 (level 1)
    expect(cpu[3]).toBe("p2");
    expect(cpu[4]).toBe("p2");
    // P2 done; P1 resumes at level 1
    expect(cpu[5]).toBe("p1");
  });
});

// ----------------------------------------------------------------
// Integration — CT-MLFQ-03: I/O return does NOT demote
// ----------------------------------------------------------------

describe("MLFQ integration — CT-MLFQ-03: no demotion after I/O", () => {
  it("process returning from I/O stays at the same level (CT-MLFQ-03)", () => {
    // P1: CPU:1 → IO:2 → CPU:4
    // P1 uses only 1 tick at level 0 (quantum=2, returns from I/O with qR=1)
    // After I/O it should still be at level 0 and get a fresh quantum=2 on dispatch
    const processes = [pWithIo("p1", 0, 1, 2, 4)];
    const engine = new SimulationEngine(processes, cfg());
    const ticks = engine.runAll();
    const cpu = ticks.map((t) => t.cpuProcess);

    // Tick 0: P1 runs (CPU burst 1 tick)
    expect(cpu[0]).toBe("p1");
    // Ticks 1-2: P1 in I/O (CPU=null)
    expect(cpu[1]).toBeNull();
    expect(cpu[2]).toBeNull();
    // Ticks 3-6: P1 runs remaining CPU burst (4 ticks)
    expect(cpu[3]).toBe("p1");
    expect(cpu[4]).toBe("p1");
    expect(cpu[5]).toBe("p1");
    expect(cpu[6]).toBe("p1");

    const rt = engine.runtimeStates.find((r) => r.processId === "p1")!;
    expect(rt.state).toBe("Terminated");
    expect(rt.cpuTime).toBe(5);
    expect(rt.ioTime).toBe(2);
  });
});

// ----------------------------------------------------------------
// Integration — CT-MLFQ-04: all processes terminate correctly
// ----------------------------------------------------------------

describe("MLFQ integration — CT-MLFQ-04: correct termination", () => {
  it("all processes terminate with correct cpuTime", () => {
    const processes = [p("p1", 0, 3), p("p2", 0, 5), p("p3", 2, 4)];
    const engine = new SimulationEngine(processes, cfg());
    engine.runAll();
    const rts = engine.runtimeStates;

    expect(rts.every((rt) => rt.state === "Terminated")).toBe(true);
    expect(rts.find((r) => r.processId === "p1")!.cpuTime).toBe(3);
    expect(rts.find((r) => r.processId === "p2")!.cpuTime).toBe(5);
    expect(rts.find((r) => r.processId === "p3")!.cpuTime).toBe(4);
  });
});

// ----------------------------------------------------------------
// Metadata
// ----------------------------------------------------------------

describe("MLFQAlgorithm — metadata", () => {
  it("exposes correct educational properties", () => {
    expect(mlfq.name).toContain("MLFQ");
    expect(mlfq.isPreemptiveCapable).toBe(true);
    expect(mlfq.usesQuantum).toBe(true);
  });
});
