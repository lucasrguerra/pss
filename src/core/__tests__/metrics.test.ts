import { describe, it, expect } from "vitest";
import { computeProcessMetrics, computeGlobalMetrics, classifyBound } from "../metrics";
import { SimulationEngine } from "../engine";
import type { Process, SchedulerConfig } from "../types";

const cfg = (overrides: Partial<SchedulerConfig> = {}): SchedulerConfig => ({
  algorithm: "FCFS",
  quantum: 2,
  contextSwitchTime: 0,
  isPreemptive: false,
  agingEnabled: false,
  agingInterval: 5,
  ...overrides,
});

const p = (id: string, arrivalTime: number, bursts: { type: "cpu" | "io"; duration: number }[]): Process => ({
  id, name: id, arrivalTime, priority: 5, color: "#fff", bursts,
});

// ============================================================
// CT-03: Bound classification (static, on declared bursts)
// P1: CPU:8, IO:1, CPU:1 → cpuRatio = 9/10 = 90% → CPU Bound
// P2: CPU:1, IO:8, CPU:1 → cpuRatio = 2/10 = 20% → I/O Bound
// P3: CPU:4, IO:2, CPU:4 → cpuRatio = 8/10 = 80% → CPU Bound
// ============================================================

describe("CT-03: classifyBound", () => {
  it("P1 (CPU:8,IO:1,CPU:1) → CPU Bound", () => {
    expect(classifyBound([{ type: "cpu", duration: 8 }, { type: "io", duration: 1 }, { type: "cpu", duration: 1 }]))
      .toBe("CPU Bound");
  });

  it("P2 (CPU:1,IO:8,CPU:1) → I/O Bound", () => {
    expect(classifyBound([{ type: "cpu", duration: 1 }, { type: "io", duration: 8 }, { type: "cpu", duration: 1 }]))
      .toBe("I/O Bound");
  });

  it("P3 (CPU:4,IO:2,CPU:4) → CPU Bound", () => {
    expect(classifyBound([{ type: "cpu", duration: 4 }, { type: "io", duration: 2 }, { type: "cpu", duration: 4 }]))
      .toBe("CPU Bound");
  });

  it("balanced process (CPU:5,IO:5) → Balanced", () => {
    expect(classifyBound([{ type: "cpu", duration: 5 }, { type: "io", duration: 5 }]))
      .toBe("Balanced");
  });

  it("CPU-only process → CPU Bound", () => {
    expect(classifyBound([{ type: "cpu", duration: 10 }])).toBe("CPU Bound");
  });
});

// ============================================================
// computeProcessMetrics
// ============================================================

describe("computeProcessMetrics", () => {
  it("throws for non-terminated process", () => {
    const engine = new SimulationEngine(
      [p("p1", 0, [{ type: "cpu", duration: 5 }])],
      cfg(),
    );
    engine.step(); // tick 0, not finished
    const rt = engine.runtimeStates[0]!;
    expect(() => computeProcessMetrics(rt)).toThrow();
  });

  it("CT-01 P1: response=0, turnaround=4, waiting=0, cpuTime=4", () => {
    const processes = [
      p("p1", 0, [{ type: "cpu", duration: 4 }]),
      p("p2", 1, [{ type: "cpu", duration: 3 }]),
      p("p3", 2, [{ type: "cpu", duration: 1 }]),
    ];
    const engine = new SimulationEngine(processes, cfg());
    engine.runAll();
    const rt1 = engine.runtimeStates.find((r) => r.processId === "p1")!;
    const m = computeProcessMetrics(rt1);

    expect(m.responseTime).toBe(0);
    expect(m.turnaroundTime).toBe(4);
    expect(m.waitingTime).toBe(0);
    expect(m.cpuTime).toBe(4);
    expect(m.ioTime).toBe(0);
    expect(m.boundType).toBe("CPU Bound");
  });

  it("CT-01 P2: response=3, turnaround=6, waiting=3", () => {
    const processes = [
      p("p1", 0, [{ type: "cpu", duration: 4 }]),
      p("p2", 1, [{ type: "cpu", duration: 3 }]),
      p("p3", 2, [{ type: "cpu", duration: 1 }]),
    ];
    const engine = new SimulationEngine(processes, cfg());
    engine.runAll();
    const rt2 = engine.runtimeStates.find((r) => r.processId === "p2")!;
    const m = computeProcessMetrics(rt2);

    expect(m.responseTime).toBe(3);
    expect(m.turnaroundTime).toBe(6);
    expect(m.waitingTime).toBe(3);
  });

  it("process with I/O: correct ioTime, boundType", () => {
    const engine = new SimulationEngine(
      [p("p1", 0, [{ type: "cpu", duration: 2 }, { type: "io", duration: 8 }, { type: "cpu", duration: 2 }])],
      cfg(),
    );
    engine.runAll();
    const rt = engine.runtimeStates[0]!;
    const m = computeProcessMetrics(rt);
    expect(m.cpuTime).toBe(4);
    expect(m.ioTime).toBe(8);
    expect(m.boundType).toBe("I/O Bound");
  });

  it("cpuUtilization: CPU-only → 100%", () => {
    const engine = new SimulationEngine(
      [p("p1", 0, [{ type: "cpu", duration: 4 }])],
      cfg(),
    );
    engine.runAll();
    const rt = engine.runtimeStates[0]!;
    const m = computeProcessMetrics(rt);
    expect(m.cpuUtilization).toBe(100);
  });
});

// ============================================================
// computeGlobalMetrics
// ============================================================

describe("computeGlobalMetrics", () => {
  it("CT-01 global metrics", () => {
    const processes = [
      p("p1", 0, [{ type: "cpu", duration: 4 }]),
      p("p2", 1, [{ type: "cpu", duration: 3 }]),
      p("p3", 2, [{ type: "cpu", duration: 1 }]),
    ];
    const engine = new SimulationEngine(processes, cfg());
    engine.runAll();
    const rts = engine.runtimeStates;
    const pMetrics = rts.map(computeProcessMetrics);
    const g = computeGlobalMetrics(pMetrics, engine.currentTick + 1);

    // Avg response: (0 + 3 + 5) / 3 = 8/3 ≈ 2.667
    expect(g.avgResponseTime).toBeCloseTo(8 / 3, 5);
    // Avg turnaround: (4 + 6 + 6) / 3 = 16/3 ≈ 5.333
    expect(g.avgTurnaroundTime).toBeCloseTo(16 / 3, 5);
    // Avg waiting: (0 + 3 + 5) / 3 = 8/3 ≈ 2.667
    expect(g.avgWaitingTime).toBeCloseTo(8 / 3, 5);
    // Throughput: 3 processes / 8 ticks = 0.375
    expect(g.cpuThroughput).toBeCloseTo(3 / 8, 5);
    // CPU utilization: (4+3+1)/8 * 100 = 100%
    expect(g.cpuUtilization).toBeCloseTo(100, 5);
    expect(g.totalSimulationTime).toBe(8);
  });

  it("handles empty metrics array", () => {
    const g = computeGlobalMetrics([], 0);
    expect(g.avgResponseTime).toBe(0);
    expect(g.cpuUtilization).toBe(0);
  });
});
