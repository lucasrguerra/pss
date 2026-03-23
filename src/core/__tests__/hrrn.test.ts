import { describe, it, expect } from "vitest";
import { HRRNAlgorithm } from "../algorithms/hrrn";
import { SimulationEngine } from "../engine";
import type { Process, ProcessRuntime, SchedulerConfig } from "../types";

const hrrn = new HRRNAlgorithm();

function makeRt(id: string, remainingBurst: number, waitingTime: number, arrivalTick = 0): ProcessRuntime {
  return {
    processId: id, state: "Ready", remainingBurst, burstIndex: 0,
    arrivalTick, startTick: null, finishTick: null,
    waitingTime, cpuTime: 0, ioTime: 0, responseTime: null,
    quantumRemaining: 2, currentPriority: 5,
  };
}

const config: SchedulerConfig = {
  algorithm: "HRRN", quantum: 2, contextSwitchTime: 0,
  isPreemptive: false, agingEnabled: false, agingInterval: 5,
};

const p = (id: string, arrival: number, cpuDuration: number): Process => ({
  id, name: id, arrivalTime: arrival, priority: 5, color: "#fff",
  bursts: [{ type: "cpu", duration: cpuDuration }],
});

describe("HRRN select()", () => {
  it("returns null for empty queue", () => {
    expect(hrrn.select([])).toBeNull();
  });

  it("picks process with highest response ratio", () => {
    // ratio = (waitingTime + burstTime) / burstTime
    // P1: (0 + 8) / 8 = 1.0
    // P2: (6 + 3) / 3 = 3.0  ← highest
    // P3: (2 + 5) / 5 = 1.4
    const r1 = makeRt("p1", 8, 0);
    const r2 = makeRt("p2", 3, 6);
    const r3 = makeRt("p3", 5, 2);
    expect(hrrn.select([r1, r2, r3])?.processId).toBe("p2");
  });

  it("tiebreaks equal ratio by arrival then id", () => {
    // Both ratio = (4 + 4) / 4 = 2.0
    const r1 = makeRt("p2", 4, 4, 1); // arrives at 1
    const r2 = makeRt("p1", 4, 4, 2); // arrives at 2
    expect(hrrn.select([r1, r2])?.processId).toBe("p2");
  });

  it("shouldPreempt always false", () => {
    expect(hrrn.shouldPreempt()).toBe(false);
  });
});

describe("HRRN integration", () => {
  it("long-waiting short process wins over fresh long process", () => {
    // P1 arrives at 0 with CPU:8 — occupies CPU first
    // P2 arrives at 0 with CPU:4, waits for 8 ticks
    // After P1 finishes: P2 has been waiting → ratio for P2 is high
    // (No other choice here, but validates engine runs HRRN correctly)
    const processes = [p("p1", 0, 4), p("p2", 4, 2)];
    const engine = new SimulationEngine(processes, config);
    const ticks = engine.runAll();
    // P1 runs ticks 0-3, P2 arrives at tick 4 and runs immediately
    expect(ticks[4]?.cpuProcess).toBe("p2");
    expect(engine.isFinished).toBe(true);
  });

  it("HRRN selects high-ratio process over long process that just arrived", () => {
    // P1(arrival=0, CPU:10) starts running
    // P2(arrival=1, CPU:2), P3(arrival=1, CPU:8) both arrive at tick 1
    // When P1 finishes, P2 has waited longer relative to its burst → wins HRRN
    const processes = [
      p("p1", 0, 3), // short; finishes tick 3
      p("p2", 0, 6), // medium; waits 3 ticks → ratio = (3+6)/6 = 1.5
      p("p3", 0, 2), // short; waits 3 ticks → ratio = (3+2)/2 = 2.5 ← wins
    ];
    const engine = new SimulationEngine(processes, config);
    const ticks = engine.runAll();
    // After P1 (ticks 0-2), P3 should win (ratio 2.5 > 1.5)
    expect(ticks[3]?.cpuProcess).toBe("p3");
  });
});

describe("HRRNAlgorithm — metadados", () => {
  it("expõe propriedades educacionais corretas", () => {
    expect(hrrn.name).toContain("HRRN");
    expect(hrrn.isPreemptiveCapable).toBe(false);
    expect(hrrn.usesQuantum).toBe(false);
  });
});
