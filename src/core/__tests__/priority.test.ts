import { describe, it, expect } from "vitest";
import { PriorityNonPreemptiveAlgorithm, PriorityPreemptiveAlgorithm } from "../algorithms/priority";
import { SimulationEngine } from "../engine";
import type { Process, ProcessRuntime, SchedulerConfig } from "../types";

const priorityNp = new PriorityNonPreemptiveAlgorithm();
const priorityP = new PriorityPreemptiveAlgorithm();

function makeRt(id: string, priority: number, arrivalTick = 0): ProcessRuntime {
  return {
    processId: id, state: "Ready", remainingBurst: 4, burstIndex: 0,
    arrivalTick, startTick: null, finishTick: null,
    waitingTime: 0, cpuTime: 0, ioTime: 0, responseTime: null,
    quantumRemaining: 2, currentPriority: priority,
  };
}

const cfgNp: SchedulerConfig = {
  algorithm: "PRIORITY_NP", quantum: 2, contextSwitchTime: 0,
  isPreemptive: false, agingEnabled: false, agingInterval: 5,
};

const p = (id: string, arrival: number, priority: number, cpuDuration: number): Process => ({
  id, name: id, arrivalTime: arrival, priority, color: "#fff",
  bursts: [{ type: "cpu", duration: cpuDuration }],
});

describe("PRIORITY_NP select()", () => {
  it("picks lowest priority number (highest priority)", () => {
    const r1 = makeRt("p1", 5);
    const r2 = makeRt("p2", 2);
    const r3 = makeRt("p3", 8);
    expect(priorityNp.select([r1, r2, r3])?.processId).toBe("p2");
  });

  it("tiebreaks by arrival then id", () => {
    const r1 = makeRt("p2", 3, 2);
    const r2 = makeRt("p1", 3, 5); // p1 arrives later
    expect(priorityNp.select([r1, r2])?.processId).toBe("p2");
  });

  it("shouldPreempt always false", () => {
    expect(priorityNp.shouldPreempt()).toBe(false);
  });
});

describe("PRIORITY_P shouldPreempt()", () => {
  it("preempts when candidate has higher priority (lower number)", () => {
    const current = makeRt("p1", 5);
    const candidate = makeRt("p2", 2);
    expect(priorityP.shouldPreempt(current, candidate)).toBe(true);
  });

  it("does NOT preempt on equal priority", () => {
    const current = makeRt("p1", 3);
    const candidate = makeRt("p2", 3);
    expect(priorityP.shouldPreempt(current, candidate)).toBe(false);
  });

  it("does NOT preempt when current has higher priority", () => {
    const current = makeRt("p1", 2);
    const candidate = makeRt("p2", 5);
    expect(priorityP.shouldPreempt(current, candidate)).toBe(false);
  });
});

describe("Priority NP integration", () => {
  it("selects highest-priority process regardless of arrival", () => {
    const processes = [
      p("p1", 0, 5, 3), // low priority
      p("p2", 0, 1, 3), // high priority
    ];
    const engine = new SimulationEngine(processes, cfgNp);
    const ticks = engine.runAll();
    // P2 (priority 1) should run first
    expect(ticks[0]?.cpuProcess).toBe("p2");
    expect(ticks[1]?.cpuProcess).toBe("p2");
    expect(ticks[2]?.cpuProcess).toBe("p2");
    expect(ticks[3]?.cpuProcess).toBe("p1");
  });
});

describe("Priority P + aging", () => {
  it("aging decrements currentPriority for waiting processes", () => {
    // P1 priority=1 runs first; P2 priority=10 waits
    // After agingInterval=2 ticks, P2's priority should drop
    const processes = [
      p("p1", 0, 1, 10), // runs for 10 ticks
      p("p2", 0, 10, 5), // waits, aging should help
    ];
    const engine = new SimulationEngine(processes, {
      ...cfgNp, algorithm: "PRIORITY_NP", agingEnabled: true, agingInterval: 2,
    });
    engine.step(); // tick 0
    engine.step(); // tick 1
    engine.step(); // tick 2 — aging fires (tick % 2 === 0), P2 priority 10→9
    const rts = engine.runtimeStates;
    const rt2 = rts.find((r) => r.processId === "p2")!;
    expect(rt2.currentPriority).toBe(9);
  });

  it("aging does not reduce priority below 1", () => {
    const processes = [p("p1", 0, 1, 5)];
    // Construct a runtime with priority already at 1 and test the engine handles it
    const engine = new SimulationEngine(processes, {
      ...cfgNp, agingEnabled: true, agingInterval: 1,
    });
    // Run a few ticks — priority should never go below 1
    for (let i = 0; i < 5; i++) {
      if (!engine.isFinished) engine.step();
    }
    const rt = engine.runtimeStates[0]!;
    expect(rt.currentPriority).toBeGreaterThanOrEqual(1);
  });
});

describe("Priority — metadados", () => {
  it("PriorityNonPreemptiveAlgorithm: isPreemptiveCapable=false", () => {
    expect(priorityNp.isPreemptiveCapable).toBe(false);
    expect(priorityNp.usesQuantum).toBe(false);
  });
  it("PriorityPreemptiveAlgorithm: isPreemptiveCapable=true", () => {
    expect(priorityP.isPreemptiveCapable).toBe(true);
    expect(priorityP.usesQuantum).toBe(false);
  });
});
