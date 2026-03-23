import { describe, it, expect } from "vitest";
import { PriorityRoundRobinAlgorithm } from "../algorithms/priority_rr";
import { SimulationEngine } from "../engine";
import type { Process, ProcessRuntime, SchedulerConfig } from "../types";

const priorityRr = new PriorityRoundRobinAlgorithm();

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function makeRt(
  id: string,
  priority: number,
  quantumRemaining = 2,
): ProcessRuntime {
  return {
    processId: id,
    state: "Ready",
    remainingBurst: 4,
    burstIndex: 0,
    arrivalTick: 0,
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

const cfg = (quantum = 2): SchedulerConfig => ({
  algorithm: "PRIORITY_RR",
  quantum,
  contextSwitchTime: 0,
  isPreemptive: true,
  agingEnabled: false,
  agingInterval: 5,
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

describe("PRIORITY_RR select()", () => {
  it("returns null for empty queue", () => {
    expect(priorityRr.select([])).toBeNull();
  });

  it("picks the process with the lowest priority number (highest priority)", () => {
    const high = makeRt("high", 1);
    const low = makeRt("low", 5);
    expect(priorityRr.select([low, high])?.processId).toBe("high");
    expect(priorityRr.select([high, low])?.processId).toBe("high");
  });

  it("picks the FIRST in insertion order when priorities are equal (FIFO = RR)", () => {
    const a = makeRt("a", 3);
    const b = makeRt("b", 3);
    const c = makeRt("c", 3);
    expect(priorityRr.select([a, b, c])?.processId).toBe("a");
    expect(priorityRr.select([b, c, a])?.processId).toBe("b");
  });

  it("ignores lower-priority processes when a higher-priority one is present", () => {
    const critical = makeRt("critical", 1);
    const normal1 = makeRt("n1", 5);
    const normal2 = makeRt("n2", 5);
    expect(
      priorityRr.select([normal1, normal2, critical])?.processId,
    ).toBe("critical");
  });
});

// ----------------------------------------------------------------
// Unit: shouldPreempt()
// ----------------------------------------------------------------

describe("PRIORITY_RR shouldPreempt()", () => {
  it("preempts when candidate has strictly higher priority", () => {
    const running = makeRt("current", 5);
    const higher = makeRt("higher", 1);
    expect(priorityRr.shouldPreempt(running, higher)).toBe(true);
  });

  it("does NOT preempt for same priority (quantum handles rotation)", () => {
    const a = makeRt("a", 3);
    const b = makeRt("b", 3);
    expect(priorityRr.shouldPreempt(a, b)).toBe(false);
  });

  it("does NOT preempt when candidate has lower priority", () => {
    const running = makeRt("current", 1);
    const lower = makeRt("lower", 5);
    expect(priorityRr.shouldPreempt(running, lower)).toBe(false);
  });
});

// ----------------------------------------------------------------
// Unit: isQuantumExpired()
// ----------------------------------------------------------------

describe("PRIORITY_RR isQuantumExpired()", () => {
  it("returns true when quantumRemaining <= 0", () => {
    expect(priorityRr.isQuantumExpired(makeRt("p", 5, 0))).toBe(true);
    expect(priorityRr.isQuantumExpired(makeRt("p", 5, -1))).toBe(true);
  });

  it("returns false when quantum is not exhausted", () => {
    expect(priorityRr.isQuantumExpired(makeRt("p", 5, 1))).toBe(false);
    expect(priorityRr.isQuantumExpired(makeRt("p", 5, 2))).toBe(false);
  });
});

// ----------------------------------------------------------------
// Integration: Round-robin within the same priority band
// ----------------------------------------------------------------

describe("PRIORITY_RR integration — RR within same priority", () => {
  it("two equal-priority processes rotate via quantum (CT-PRIORITY_RR-01)", () => {
    // P1 and P2 both priority=2, CPU:4 each, quantum=2
    // Expected Gantt: P1(0-2), P2(2-4), P1(4-6), P2(6-8)
    const processes = [p("p1", 0, 4, 2), p("p2", 0, 4, 2)];
    const engine = new SimulationEngine(processes, cfg(2));
    const ticks = engine.runAll();
    const cpu = ticks.map((t) => t.cpuProcess);

    expect(cpu).toHaveLength(8);
    expect(cpu[0]).toBe("p1");
    expect(cpu[1]).toBe("p1");
    expect(cpu[2]).toBe("p2");
    expect(cpu[3]).toBe("p2");
    expect(cpu[4]).toBe("p1");
    expect(cpu[5]).toBe("p1");
    expect(cpu[6]).toBe("p2");
    expect(cpu[7]).toBe("p2");
  });

  it("three equal-priority processes rotate in arrival order", () => {
    // P1(CPU:2), P2(CPU:2), P3(CPU:2), quantum=2 — each finishes in first quantum
    const processes = [p("p1", 0, 2, 3), p("p2", 0, 2, 3), p("p3", 0, 2, 3)];
    const engine = new SimulationEngine(processes, cfg(2));
    const ticks = engine.runAll();
    const cpu = ticks.map((t) => t.cpuProcess);

    expect(cpu).toHaveLength(6);
    expect(cpu[0]).toBe("p1");
    expect(cpu[1]).toBe("p1");
    expect(cpu[2]).toBe("p2");
    expect(cpu[3]).toBe("p2");
    expect(cpu[4]).toBe("p3");
    expect(cpu[5]).toBe("p3");
  });
});

// ----------------------------------------------------------------
// Integration: Priority preemption
// ----------------------------------------------------------------

describe("PRIORITY_RR integration — priority preemption", () => {
  it("high-priority process arriving mid-run immediately preempts (CT-PRIORITY_RR-02)", () => {
    // P1: priority=3, arrival=0, CPU:6 (large quantum so it won't expire)
    // P2: priority=1, arrival=2, CPU:2
    // Expected: P1(0-1), P2 preempts at tick 2, P2(2-3), P1 resumes(4-7)
    const processes = [p("p1", 0, 6, 3), p("p2", 2, 2, 1)];
    const engine = new SimulationEngine(processes, cfg(10));
    const ticks = engine.runAll();
    const cpu = ticks.map((t) => t.cpuProcess);

    // P1 runs ticks 0, 1; P2 preempts at tick 2; P1 resumes after P2 finishes
    expect(cpu[0]).toBe("p1");
    expect(cpu[1]).toBe("p1");
    expect(cpu[2]).toBe("p2"); // preempted here
    expect(cpu[3]).toBe("p2");
    // After P2 terminates, P1 resumes
    expect(cpu[4]).toBe("p1");
    expect(cpu[5]).toBe("p1");
    expect(cpu[6]).toBe("p1");
    expect(cpu[7]).toBe("p1");
    expect(cpu).toHaveLength(8);
  });

  it("lower-priority process cannot preempt a higher-priority running process", () => {
    const processes = [p("p1", 0, 4, 1), p("p2", 1, 4, 5)];
    const engine = new SimulationEngine(processes, cfg(10));
    const ticks = engine.runAll();
    const cpu = ticks.map((t) => t.cpuProcess);

    // P1 (priority=1) runs entirely first; P2 waits
    expect(cpu.slice(0, 4).every((id) => id === "p1")).toBe(true);
    expect(cpu.slice(4).every((id) => id === "p2")).toBe(true);
  });
});

// ----------------------------------------------------------------
// Integration: Combined — preemption + RR (preset scenario)
// ----------------------------------------------------------------

describe("PRIORITY_RR integration — combined preemption + RR", () => {
  it("preset scenario: P1 & P2 (prio=2) RR, P3 (prio=1) preempts at arrival", () => {
    // P1: prio=2, arrival=0, CPU:4
    // P2: prio=2, arrival=0, CPU:4
    // P3: prio=1, arrival=4, CPU:2 — arrives just as P2's first quantum ends
    // quantum=2
    // Expected Gantt: P1(0-2), P2(2-4), P3(4-6), P1(6-8), P2(8-10)
    const processes = [p("p1", 0, 4, 2), p("p2", 0, 4, 2), p("p3", 4, 2, 1)];
    const engine = new SimulationEngine(processes, cfg(2));
    const ticks = engine.runAll();
    const cpu = ticks.map((t) => t.cpuProcess);

    expect(cpu[0]).toBe("p1");
    expect(cpu[1]).toBe("p1");
    expect(cpu[2]).toBe("p2");
    expect(cpu[3]).toBe("p2");
    expect(cpu[4]).toBe("p3"); // P3 preempts (or takes CPU when it's free)
    expect(cpu[5]).toBe("p3");
    expect(cpu[6]).toBe("p1");
    expect(cpu[7]).toBe("p1");
    expect(cpu[8]).toBe("p2");
    expect(cpu[9]).toBe("p2");
    expect(cpu).toHaveLength(10);
  });

  it("all processes terminate correctly", () => {
    const processes = [p("p1", 0, 4, 2), p("p2", 0, 4, 2), p("p3", 4, 2, 1)];
    const engine = new SimulationEngine(processes, cfg(2));
    engine.runAll();
    const rts = engine.runtimeStates;
    expect(rts.every((rt) => rt.state === "Terminated")).toBe(true);
    expect(rts.find((r) => r.processId === "p1")!.cpuTime).toBe(4);
    expect(rts.find((r) => r.processId === "p2")!.cpuTime).toBe(4);
    expect(rts.find((r) => r.processId === "p3")!.cpuTime).toBe(2);
  });
});

describe("PriorityRoundRobinAlgorithm — metadados", () => {
  it("expõe propriedades educacionais corretas", () => {
    expect(priorityRr.name).toContain("Priority Round Robin");
    expect(priorityRr.isPreemptiveCapable).toBe(true);
    expect(priorityRr.usesQuantum).toBe(true);
  });
});
