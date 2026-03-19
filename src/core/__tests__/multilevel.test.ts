import { describe, it, expect } from "vitest";
import { multilevel } from "../algorithms/multilevel";
import { SimulationEngine } from "../engine";
import type { MlqQueueDef, Process, ProcessRuntime, SchedulerConfig } from "../types";

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

const DEFAULT_QUEUES: MlqQueueDef[] = [
  { priorityMin: 1, priorityMax: 3, algorithm: "RR", quantum: 2 },
  { priorityMin: 4, priorityMax: 7, algorithm: "PRIORITY_NP", quantum: 2 },
  { priorityMin: 8, priorityMax: 10, algorithm: "FCFS", quantum: 2 },
];

function makeRt(
  id: string,
  priority: number,
  arrivalTick = 0,
  quantumRemaining = 2,
): ProcessRuntime {
  return {
    processId: id,
    state: "Ready",
    remainingBurst: 4,
    burstIndex: 0,
    arrivalTick,
    startTick: null,
    finishTick: null,
    waitingTime: 0,
    cpuTime: 0,
    ioTime: 0,
    responseTime: null,
    quantumRemaining,
    currentPriority: priority,
  };
}

const cfg = (overrides: Partial<SchedulerConfig> = {}): SchedulerConfig => ({
  algorithm: "MULTILEVEL",
  quantum: 2,
  contextSwitchTime: 0,
  isPreemptive: false,
  agingEnabled: false,
  agingInterval: 5,
  mlqQueues: DEFAULT_QUEUES,
  ...overrides,
});

const p = (
  id: string,
  arrival: number,
  cpuDuration: number,
  priority = 5,
): Process => ({
  id,
  name: id,
  arrivalTime: arrival,
  priority,
  color: "#fff",
  bursts: [{ type: "cpu", duration: cpuDuration }],
});

// ----------------------------------------------------------------
// Unit: select()
// ----------------------------------------------------------------

describe("MULTILEVEL select()", () => {
  it("returns null for empty queue", () => {
    expect(multilevel.select([], cfg())).toBeNull();
  });

  it("selects from queue 0 (highest priority) when it has processes", () => {
    const q0 = makeRt("hi", 1);   // priority 1 → queue 0 (1–3)
    const q1 = makeRt("mid", 5);  // priority 5 → queue 1 (4–7)
    const q2 = makeRt("lo", 9);   // priority 9 → queue 2 (8–10)
    expect(multilevel.select([q1, q2, q0], cfg())?.processId).toBe("hi");
  });

  it("falls through to queue 1 when queue 0 is empty", () => {
    const q1a = makeRt("m1", 4, 0);
    const q1b = makeRt("m2", 7, 1);
    const q2  = makeRt("lo", 9, 0);
    // queue 0 empty — queue 1 processes present
    expect(multilevel.select([q1a, q1b, q2], cfg())?.processId).toBe("m1");
  });

  it("falls through to queue 2 (FCFS) when queues 0 and 1 are empty", () => {
    const a = makeRt("a", 10, 5);  // priority 10 → queue 2
    const b = makeRt("b", 8, 0);   // priority 8 → queue 2, earlier arrival
    expect(multilevel.select([a, b], cfg())?.processId).toBe("b");
  });

  it("queue 1 (PRIORITY_NP) selects by lowest priority number", () => {
    const low  = makeRt("lo", 7, 0);   // priority 7
    const high = makeRt("hi", 4, 0);   // priority 4 (highest in band)
    const mid  = makeRt("mid", 6, 0);  // priority 6
    expect(multilevel.select([low, mid, high], cfg())?.processId).toBe("hi");
  });

  it("queue 0 (RR) returns first in insertion order", () => {
    const a = makeRt("a", 1, 0);
    const b = makeRt("b", 2, 1);
    const c = makeRt("c", 3, 2);
    expect(multilevel.select([b, a, c], cfg())?.processId).toBe("b");
    expect(multilevel.select([c, b, a], cfg())?.processId).toBe("c");
  });
});

// ----------------------------------------------------------------
// Unit: shouldPreempt()
// ----------------------------------------------------------------

describe("MULTILEVEL shouldPreempt()", () => {
  it("preempts when candidate is in a strictly higher-priority queue", () => {
    const running   = makeRt("lo", 9);  // queue 2
    const candidate = makeRt("hi", 1);  // queue 0
    expect(multilevel.shouldPreempt(running, candidate, cfg())).toBe(true);
  });

  it("preempts across adjacent queues", () => {
    const running   = makeRt("mid", 5);  // queue 1
    const candidate = makeRt("hi", 2);   // queue 0
    expect(multilevel.shouldPreempt(running, candidate, cfg())).toBe(true);
  });

  it("does NOT preempt for same queue", () => {
    const a = makeRt("a", 1);  // queue 0
    const b = makeRt("b", 2);  // queue 0
    expect(multilevel.shouldPreempt(a, b, cfg())).toBe(false);
  });

  it("does NOT preempt when candidate is in a lower-priority queue", () => {
    const running   = makeRt("hi", 1);  // queue 0
    const candidate = makeRt("lo", 9);  // queue 2
    expect(multilevel.shouldPreempt(running, candidate, cfg())).toBe(false);
  });
});

// ----------------------------------------------------------------
// Unit: isQuantumExpired()
// ----------------------------------------------------------------

describe("MULTILEVEL isQuantumExpired()", () => {
  it("returns true for a RR queue process with quantumRemaining <= 0", () => {
    const rt = makeRt("hi", 1, 0, 0);  // queue 0 → RR
    expect(multilevel.isQuantumExpired(rt, cfg())).toBe(true);
  });

  it("returns false for a RR queue process with quantum remaining", () => {
    const rt = makeRt("hi", 2, 0, 1);  // queue 0 → RR, still has quantum
    expect(multilevel.isQuantumExpired(rt, cfg())).toBe(false);
  });

  it("returns false for a FCFS queue process even if quantumRemaining is 0", () => {
    const rt = makeRt("lo", 9, 0, 0);  // queue 2 → FCFS
    expect(multilevel.isQuantumExpired(rt, cfg())).toBe(false);
  });

  it("returns false for a PRIORITY_NP queue process", () => {
    const rt = makeRt("mid", 5, 0, 0);  // queue 1 → PRIORITY_NP
    expect(multilevel.isQuantumExpired(rt, cfg())).toBe(false);
  });
});

// ----------------------------------------------------------------
// Integration
// ----------------------------------------------------------------

describe("MULTILEVEL integration — strict queue ordering", () => {
  it("queue 0 processes run before queue 1 and queue 2 (CT-MLQ-01)", () => {
    // P1: priority=1 (queue 0), CPU:3
    // P2: priority=5 (queue 1), CPU:3
    // P3: priority=9 (queue 2), CPU:3
    // All arrive at 0. Queue 0 runs first, then queue 1, then queue 2.
    const processes = [p("p2", 0, 3, 5), p("p3", 0, 3, 9), p("p1", 0, 3, 1)];
    const engine = new SimulationEngine(processes, cfg());
    const ticks = engine.runAll();
    const cpu = ticks.map((t) => t.cpuProcess);

    expect(cpu.slice(0, 3).every((id) => id === "p1")).toBe(true);
    expect(cpu.slice(3, 6).every((id) => id === "p2")).toBe(true);
    expect(cpu.slice(6, 9).every((id) => id === "p3")).toBe(true);
    expect(cpu).toHaveLength(9);
  });

  it("queue 0 RR rotates with quantum=2 (CT-MLQ-02)", () => {
    // P1 and P2 both in queue 0 (priority 1), CPU:4 each, quantum=2
    const processes = [p("p1", 0, 4, 1), p("p2", 0, 4, 1)];
    const engine = new SimulationEngine(processes, cfg());
    const ticks = engine.runAll();
    const cpu = ticks.map((t) => t.cpuProcess);

    expect(cpu[0]).toBe("p1");
    expect(cpu[1]).toBe("p1");
    expect(cpu[2]).toBe("p2");
    expect(cpu[3]).toBe("p2");
    expect(cpu[4]).toBe("p1");
    expect(cpu[5]).toBe("p1");
    expect(cpu[6]).toBe("p2");
    expect(cpu[7]).toBe("p2");
    expect(cpu).toHaveLength(8);
  });

  it("high-priority queue process preempts lower-queue running process (CT-MLQ-03)", () => {
    // P1: priority=9 (queue 2), arrives at 0, CPU:6
    // P2: priority=1 (queue 0), arrives at 2, CPU:3
    // P1 runs ticks 0–1, P2 preempts at tick 2
    const processes = [p("p1", 0, 6, 9), p("p2", 2, 3, 1)];
    const engine = new SimulationEngine(processes, cfg());
    const ticks = engine.runAll();
    const cpu = ticks.map((t) => t.cpuProcess);

    expect(cpu[0]).toBe("p1");
    expect(cpu[1]).toBe("p1");
    expect(cpu[2]).toBe("p2");
    expect(cpu[3]).toBe("p2");
    expect(cpu[4]).toBe("p2");
    // P1 resumes after P2 terminates
    expect(cpu[5]).toBe("p1");
    expect(cpu).toHaveLength(9);
  });

  it("all processes terminate correctly", () => {
    const processes = [p("p1", 0, 3, 1), p("p2", 0, 3, 5), p("p3", 0, 3, 9)];
    const engine = new SimulationEngine(processes, cfg());
    engine.runAll();
    const rts = engine.runtimeStates;
    expect(rts.every((rt) => rt.state === "Terminated")).toBe(true);
    expect(rts.find((r) => r.processId === "p1")!.cpuTime).toBe(3);
    expect(rts.find((r) => r.processId === "p2")!.cpuTime).toBe(3);
    expect(rts.find((r) => r.processId === "p3")!.cpuTime).toBe(3);
  });
});
