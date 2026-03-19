/**
 * Integration Tests — Process Scheduler Simulator
 *
 * These tests validate end-to-end simulation correctness: processes go through
 * the full lifecycle (New → Ready → Running → Waiting → Terminated), metrics
 * are consistent, and each algorithm produces the expected scheduling behavior.
 *
 * Test IDs follow the spec (CT-05 onward, CT-01..CT-04 are in engine.test.ts).
 */

import { describe, it, expect } from "vitest";
import { SimulationEngine } from "../engine";
import { computeProcessMetrics, computeGlobalMetrics } from "../metrics";
import { presets } from "../presets";
import type { Process, SchedulerConfig } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const cfg = (overrides: Partial<SchedulerConfig> = {}): SchedulerConfig => ({
  algorithm: "FCFS",
  quantum: 2,
  contextSwitchTime: 0,
  isPreemptive: false,
  agingEnabled: false,
  agingInterval: 5,
  ...overrides,
});

const p = (
  id: string,
  arrivalTime: number,
  bursts: { type: "cpu" | "io"; duration: number }[],
  priority = 5,
): Process => ({
  id,
  name: id.toUpperCase(),
  arrivalTime,
  priority,
  color: "#fff",
  bursts,
});

/** Runs the engine and returns per-process metrics keyed by processId */
function runAndGetMetrics(processes: Process[], config: SchedulerConfig) {
  const engine = new SimulationEngine(processes, config);
  engine.runAll();
  const rts = engine.runtimeStates;
  const metricsMap = Object.fromEntries(
    rts.map((rt) => [rt.processId, computeProcessMetrics(rt)]),
  );
  const globalMetrics = computeGlobalMetrics(
    Object.values(metricsMap),
    engine.currentTick + 1,
  );
  return { engine, metricsMap, globalMetrics };
}

// ─── CT-05: Convoy Effect (FCFS) ──────────────────────────────────────────────

describe("CT-05: FCFS Convoy Effect", () => {
  /**
   * Large process P1 arrives first and blocks short processes P2, P3, P4.
   * P1: arrival=0, CPU:12
   * P2: arrival=1, CPU:2
   * P3: arrival=2, CPU:1
   * P4: arrival=3, CPU:3
   *
   * Expected Gantt: P1(0-11), P2(12-13), P3(14), P4(15-17)
   */
  const processes = [
    p("p1", 0, [{ type: "cpu", duration: 12 }]),
    p("p2", 1, [{ type: "cpu", duration: 2 }]),
    p("p3", 2, [{ type: "cpu", duration: 1 }]),
    p("p4", 3, [{ type: "cpu", duration: 3 }]),
  ];

  it("P1 (long process) runs uninterrupted for 12 ticks", () => {
    const engine = new SimulationEngine(processes, cfg({ algorithm: "FCFS" }));
    const ticks = engine.runAll();
    for (let i = 0; i <= 11; i++) {
      expect(ticks[i]?.cpuProcess).toBe("p1");
    }
  });

  it("short processes execute in arrival order after P1 finishes", () => {
    const engine = new SimulationEngine(processes, cfg({ algorithm: "FCFS" }));
    const ticks = engine.runAll();
    expect(ticks[12]?.cpuProcess).toBe("p2");
    expect(ticks[13]?.cpuProcess).toBe("p2");
    expect(ticks[14]?.cpuProcess).toBe("p3");
    expect(ticks[15]?.cpuProcess).toBe("p4");
  });

  it("P2, P3, P4 suffer high waiting times (convoy effect)", () => {
    const { metricsMap } = runAndGetMetrics(processes, cfg({ algorithm: "FCFS" }));
    // P2: waited ticks 1-11 = 11 ticks
    expect(metricsMap["p2"]!.waitingTime).toBe(11);
    // P3: waited ticks 2-13 = 12 ticks
    expect(metricsMap["p3"]!.waitingTime).toBe(12);
    // P4: waited ticks 3-14 = 12 ticks
    expect(metricsMap["p4"]!.waitingTime).toBe(12);
  });

  it("SJF-NP dramatically reduces average waiting time for the same input", () => {
    const { globalMetrics: fcfsGlobal } = runAndGetMetrics(processes, cfg({ algorithm: "FCFS" }));
    const { globalMetrics: sjfGlobal } = runAndGetMetrics(processes, cfg({ algorithm: "SJF_NP" }));

    // SJF should yield much lower average waiting time than FCFS (convoy effect)
    expect(sjfGlobal.avgWaitingTime).toBeLessThan(fcfsGlobal.avgWaitingTime);
  });
});

// ─── CT-06: SJF Non-Preemptive ordering ───────────────────────────────────────

describe("CT-06: SJF Non-Preemptive ordering", () => {
  /**
   * All processes arrive at tick 0. SJF picks shortest first.
   * P1: CPU:5, P2: CPU:2, P3: CPU:1, P4: CPU:3
   * Expected order: P3(CPU:1) → P2(CPU:2) → P4(CPU:3) → P1(CPU:5)
   * Gantt: P3(0-0), P2(1-2), P4(3-5), P1(6-10)
   */
  const processes = [
    p("p1", 0, [{ type: "cpu", duration: 5 }]),
    p("p2", 0, [{ type: "cpu", duration: 2 }]),
    p("p3", 0, [{ type: "cpu", duration: 1 }]),
    p("p4", 0, [{ type: "cpu", duration: 3 }]),
  ];

  it("selects processes in ascending burst duration order", () => {
    const engine = new SimulationEngine(processes, cfg({ algorithm: "SJF_NP" }));
    const ticks = engine.runAll();

    // P3 (CPU:1) first
    expect(ticks[0]?.cpuProcess).toBe("p3");
    // P2 (CPU:2) second
    expect(ticks[1]?.cpuProcess).toBe("p2");
    expect(ticks[2]?.cpuProcess).toBe("p2");
    // P4 (CPU:3) third
    expect(ticks[3]?.cpuProcess).toBe("p4");
    expect(ticks[4]?.cpuProcess).toBe("p4");
    expect(ticks[5]?.cpuProcess).toBe("p4");
    // P1 (CPU:5) last
    expect(ticks[6]?.cpuProcess).toBe("p1");
  });

  it("P3 has zero waiting time (runs first)", () => {
    const { metricsMap } = runAndGetMetrics(processes, cfg({ algorithm: "SJF_NP" }));
    expect(metricsMap["p3"]!.waitingTime).toBe(0);
    expect(metricsMap["p3"]!.responseTime).toBe(0);
  });

  it("produces optimal average waiting time (SJF is optimal for non-preemptive)", () => {
    const { globalMetrics } = runAndGetMetrics(processes, cfg({ algorithm: "SJF_NP" }));
    // Avg waiting: (0 + 1 + 3 + 6) / 4 = 10/4 = 2.5
    expect(globalMetrics.avgWaitingTime).toBeCloseTo(2.5, 5);
  });
});

// ─── CT-07: Priority NP Starvation ───────────────────────────────────────────

describe("CT-07: Priority NP — P5 starves until all high-priority processes finish", () => {
  /**
   * P1-P4 have priority 1 (highest). P5 has priority 10 (lowest).
   * P5 arrives first but never gets CPU until all P1-P4 finish.
   */
  const processes = [
    p("p1", 0, [{ type: "cpu", duration: 3 }], 1),
    p("p2", 1, [{ type: "cpu", duration: 3 }], 1),
    p("p3", 2, [{ type: "cpu", duration: 3 }], 1),
    p("p4", 3, [{ type: "cpu", duration: 3 }], 1),
    p("p5", 0, [{ type: "cpu", duration: 5 }], 10),
  ];

  it("P5 does not run while any high-priority process is in the ready queue", () => {
    const engine = new SimulationEngine(processes, cfg({ algorithm: "PRIORITY_NP" }));
    const ticks = engine.runAll();
    // Ticks 0-11: only P1-P4 should be on CPU
    for (let i = 0; i <= 11; i++) {
      expect(ticks[i]?.cpuProcess).not.toBe("p5");
    }
  });

  it("P5 starts running only after all high-priority processes finish", () => {
    const engine = new SimulationEngine(processes, cfg({ algorithm: "PRIORITY_NP" }));
    const ticks = engine.runAll();
    // P4 finishes at tick 12 (runs 9-11); P5 starts at 12
    expect(ticks[12]?.cpuProcess).toBe("p5");
  });

  it("P5 has the highest waiting time", () => {
    const { metricsMap } = runAndGetMetrics(processes, cfg({ algorithm: "PRIORITY_NP" }));
    const p5Waiting = metricsMap["p5"]!.waitingTime;
    // P5 waited from tick 0 until tick 12 → waiting = 12
    expect(p5Waiting).toBe(12);
    // P5 has more waiting time than all others combined
    const others = ["p1", "p2", "p3", "p4"].map((id) => metricsMap[id]!.waitingTime);
    expect(p5Waiting).toBeGreaterThan(Math.max(...others));
  });
});

// ─── CT-08: Aging prevents starvation ────────────────────────────────────────

describe("CT-08: Priority Preemptive with aging — P5 eventually runs earlier", () => {
  /**
   * Same scenario as CT-07 but with aging enabled (agingInterval=3).
   * P5 should have a lower waiting time than in CT-07 because aging
   * eventually promotes it to run before all high-priority processes finish.
   */
  const processes = [
    p("p1", 0, [{ type: "cpu", duration: 3 }], 1),
    p("p2", 1, [{ type: "cpu", duration: 3 }], 1),
    p("p3", 2, [{ type: "cpu", duration: 3 }], 1),
    p("p4", 3, [{ type: "cpu", duration: 3 }], 1),
    p("p5", 0, [{ type: "cpu", duration: 5 }], 10),
  ];

  const agingConfig = cfg({
    algorithm: "PRIORITY_P",
    isPreemptive: true,
    agingEnabled: true,
    agingInterval: 3,
  });

  const noAgingConfig = cfg({ algorithm: "PRIORITY_NP" });

  it("all processes eventually terminate with aging enabled", () => {
    const engine = new SimulationEngine(processes, agingConfig);
    engine.runAll();
    expect(engine.isFinished).toBe(true);
    const rts = engine.runtimeStates;
    for (const rt of rts) {
      expect(rt.state).toBe("Terminated");
    }
  });

  it("P5 waiting time with aging is less than or equal to without aging", () => {
    const { metricsMap: withAging } = runAndGetMetrics(processes, agingConfig);
    const { metricsMap: withoutAging } = runAndGetMetrics(processes, noAgingConfig);
    expect(withAging["p5"]!.waitingTime).toBeLessThanOrEqual(withoutAging["p5"]!.waitingTime);
  });
});

// ─── CT-09: Multiple I/O Cycles ──────────────────────────────────────────────

describe("CT-09: Process with multiple CPU/I/O cycles", () => {
  /**
   * P1 alternates: CPU:2 → IO:3 → CPU:1 → IO:2 → CPU:3
   * This validates state machine across multiple burst transitions.
   */
  const processes = [
    p("p1", 0, [
      { type: "cpu", duration: 2 },
      { type: "io", duration: 3 },
      { type: "cpu", duration: 1 },
      { type: "io", duration: 2 },
      { type: "cpu", duration: 3 },
    ]),
  ];

  it("traverses all states in correct order", () => {
    const engine = new SimulationEngine(processes, cfg());
    const ticks = engine.runAll();
    const states = ticks.map((t) => t.states["p1"]);

    expect(states[0]).toBe("Running");  // CPU:2 ticks 0-1
    expect(states[1]).toBe("Running");
    expect(states[2]).toBe("Waiting");  // IO:3 ticks 2-4
    expect(states[3]).toBe("Waiting");
    expect(states[4]).toBe("Waiting");
    expect(states[5]).toBe("Running");  // CPU:1 tick 5
    expect(states[6]).toBe("Waiting");  // IO:2 ticks 6-7
    expect(states[7]).toBe("Waiting");
    expect(states[8]).toBe("Running");  // CPU:3 ticks 8-10
    expect(states[9]).toBe("Running");
    expect(states[10]).toBe("Running");
  });

  it("finishes at the correct tick", () => {
    const engine = new SimulationEngine(processes, cfg());
    engine.runAll();
    const rt = engine.runtimeStates[0]!;
    // Total duration: 2+3+1+2+3 = 11 ticks → finishTick = 11
    expect(rt.finishTick).toBe(11);
  });

  it("accumulates correct cpu and io times", () => {
    const engine = new SimulationEngine(processes, cfg());
    engine.runAll();
    const rt = engine.runtimeStates[0]!;
    expect(rt.cpuTime).toBe(6);  // 2+1+3
    expect(rt.ioTime).toBe(5);   // 3+2
  });

  it("metrics: turnaround = cpuTime + ioTime + waitingTime", () => {
    const { metricsMap } = runAndGetMetrics(processes, cfg());
    const m = metricsMap["p1"]!;
    // For a single process, waiting time should be 0 (never in Ready queue)
    expect(m.waitingTime).toBe(0);
    expect(m.turnaroundTime).toBe(m.cpuTime + m.ioTime + m.waitingTime);
  });
});

// ─── CT-10: Simultaneous arrivals — tie-breaking ──────────────────────────────

describe("CT-10: Simultaneous arrivals — tie-breaking by ID", () => {
  /**
   * All 4 processes arrive at tick 0 with equal priority and burst duration.
   * FCFS tie-break: by processId lexicographic order → p1, p2, p3, p4.
   */
  const processes = [
    p("p4", 0, [{ type: "cpu", duration: 2 }]),
    p("p2", 0, [{ type: "cpu", duration: 2 }]),
    p("p1", 0, [{ type: "cpu", duration: 2 }]),
    p("p3", 0, [{ type: "cpu", duration: 2 }]),
  ];

  it("executes processes in lexicographic ID order on tie", () => {
    const engine = new SimulationEngine(processes, cfg({ algorithm: "FCFS" }));
    const ticks = engine.runAll();

    expect(ticks[0]?.cpuProcess).toBe("p1");
    expect(ticks[1]?.cpuProcess).toBe("p1");
    expect(ticks[2]?.cpuProcess).toBe("p2");
    expect(ticks[3]?.cpuProcess).toBe("p2");
    expect(ticks[4]?.cpuProcess).toBe("p3");
    expect(ticks[5]?.cpuProcess).toBe("p3");
    expect(ticks[6]?.cpuProcess).toBe("p4");
    expect(ticks[7]?.cpuProcess).toBe("p4");
  });

  it("first process (p1) has response time 0 and zero waiting time", () => {
    const { metricsMap } = runAndGetMetrics(processes, cfg({ algorithm: "FCFS" }));
    expect(metricsMap["p1"]!.responseTime).toBe(0);
    expect(metricsMap["p1"]!.waitingTime).toBe(0);
  });
});

// ─── CT-11: CPU idle gap between arrivals ─────────────────────────────────────

describe("CT-11: CPU idle gap between process batches", () => {
  /**
   * P1 finishes early; CPU becomes idle until P2 arrives later.
   * P1: arrival=0, CPU:2
   * P2: arrival=6, CPU:2
   * Gap: ticks 2-5 (CPU idle for 4 ticks)
   */
  const processes = [
    p("p1", 0, [{ type: "cpu", duration: 2 }]),
    p("p2", 6, [{ type: "cpu", duration: 2 }]),
  ];

  it("CPU is idle during the gap (no cpuProcess)", () => {
    const engine = new SimulationEngine(processes, cfg());
    const ticks = engine.runAll();
    // ticks 2,3,4,5: CPU should be idle
    for (let i = 2; i <= 5; i++) {
      expect(ticks[i]?.cpuProcess).toBeNull();
    }
  });

  it("P2 starts immediately on arrival", () => {
    const engine = new SimulationEngine(processes, cfg());
    const ticks = engine.runAll();
    expect(ticks[6]?.cpuProcess).toBe("p2");
  });

  it("P2 has zero waiting time (no competition)", () => {
    const { metricsMap } = runAndGetMetrics(processes, cfg());
    expect(metricsMap["p2"]!.waitingTime).toBe(0);
    expect(metricsMap["p2"]!.responseTime).toBe(0);
  });

  it("global CPU utilization reflects idle period", () => {
    const { globalMetrics } = runAndGetMetrics(processes, cfg());
    // Total CPU used: 4 ticks out of 8 ticks = 50%
    expect(globalMetrics.cpuUtilization).toBeCloseTo(50, 5);
  });
});

// ─── CT-12: Round Robin with quantum=1 ───────────────────────────────────────

describe("CT-12: Round Robin quantum=1 — strict rotation", () => {
  /**
   * P1(CPU:3), P2(CPU:2), P3(CPU:1) all arrive at tick 0, quantum=1.
   * Each tick a different process runs in round-robin order.
   * Expected: P1(0), P2(1), P3(2), P1(3), P2(4), P1(5)
   */
  const processes = [
    p("p1", 0, [{ type: "cpu", duration: 3 }]),
    p("p2", 0, [{ type: "cpu", duration: 2 }]),
    p("p3", 0, [{ type: "cpu", duration: 1 }]),
  ];

  it("rotates one tick per process", () => {
    const engine = new SimulationEngine(processes, cfg({ algorithm: "RR", quantum: 1 }));
    const ticks = engine.runAll();

    expect(ticks[0]?.cpuProcess).toBe("p1");
    expect(ticks[1]?.cpuProcess).toBe("p2");
    expect(ticks[2]?.cpuProcess).toBe("p3");
    expect(ticks[3]?.cpuProcess).toBe("p1");
    expect(ticks[4]?.cpuProcess).toBe("p2");
    expect(ticks[5]?.cpuProcess).toBe("p1");
  });

  it("all processes finish at expected ticks", () => {
    const engine = new SimulationEngine(processes, cfg({ algorithm: "RR", quantum: 1 }));
    engine.runAll();
    const rts = engine.runtimeStates;
    const rt1 = rts.find((r) => r.processId === "p1")!;
    const rt2 = rts.find((r) => r.processId === "p2")!;
    const rt3 = rts.find((r) => r.processId === "p3")!;

    expect(rt3.finishTick).toBe(3);  // P3 finishes after 1 run at tick 2
    expect(rt2.finishTick).toBe(5);  // P2 finishes after 2 runs
    expect(rt1.finishTick).toBe(6);  // P1 finishes after 3 runs
  });
});

// ─── CT-13: Context switch overhead ──────────────────────────────────────────

describe("CT-13: Context switch overhead with multiple algorithms", () => {
  /**
   * Each process switch incurs 1 idle tick (contextSwitchTime=1).
   * Tests that context switch overhead is correctly accounted for
   * in multiple algorithm contexts.
   */
  const processes = [
    p("p1", 0, [{ type: "cpu", duration: 2 }]),
    p("p2", 0, [{ type: "cpu", duration: 2 }]),
    p("p3", 0, [{ type: "cpu", duration: 2 }]),
  ];

  it("FCFS: inserts 2 context switch ticks for 3 processes", () => {
    const engine = new SimulationEngine(
      processes,
      cfg({ algorithm: "FCFS", contextSwitchTime: 1 }),
    );
    const ticks = engine.runAll();

    // P1: 0-1, ctx: 2, P2: 3-4, ctx: 5, P3: 6-7
    expect(ticks[2]?.contextSwitching).toBe(true);
    expect(ticks[2]?.cpuProcess).toBeNull();
    expect(ticks[5]?.contextSwitching).toBe(true);
    expect(ticks[5]?.cpuProcess).toBeNull();
    expect(ticks.length).toBe(8);
  });

  it("total simulation time is longer with context switch", () => {
    const withCtx = new SimulationEngine(processes, cfg({ algorithm: "FCFS", contextSwitchTime: 1 }));
    const withoutCtx = new SimulationEngine(processes, cfg({ algorithm: "FCFS", contextSwitchTime: 0 }));
    withCtx.runAll();
    withoutCtx.runAll();

    // With 2 context switches of 1 tick each: +2 ticks total
    expect(withCtx.currentTick).toBe(withoutCtx.currentTick + 2);
  });

  it("context switch ticks are not counted as cpu time for any process", () => {
    const engine = new SimulationEngine(
      processes,
      cfg({ algorithm: "FCFS", contextSwitchTime: 1 }),
    );
    engine.runAll();
    const totalCpuTime = engine.runtimeStates.reduce((s, rt) => s + rt.cpuTime, 0);
    // 3 processes × 2 cpu ticks each = 6
    expect(totalCpuTime).toBe(6);
  });
});

// ─── CT-14: HRRN fairness — waited process wins over fresh arrivals ───────────

describe("CT-14: HRRN — long wait compensates for longer burst", () => {
  /**
   * P1(CPU:1) runs first (only one ready at tick 0).
   * When P1 finishes at tick 1, P2(CPU:6, waited=1) and P3(CPU:2, waited=0) are both ready.
   *
   * HRRN ratios at tick 1:
   *   P2: (1 + 6) / 6 = 1.167
   *   P3: (0 + 2) / 2 = 1.0
   *
   * P2 wins because it has been waiting.
   */
  const processes = [
    p("p1", 0, [{ type: "cpu", duration: 1 }]),
    p("p2", 0, [{ type: "cpu", duration: 6 }]),
    p("p3", 1, [{ type: "cpu", duration: 2 }]),
  ];

  it("P2 wins over fresh P3 due to higher response ratio", () => {
    const engine = new SimulationEngine(processes, cfg({ algorithm: "HRRN" }));
    const ticks = engine.runAll();
    // tick 1: P2 starts (ratio 1.167 > P3 ratio 1.0)
    expect(ticks[1]?.cpuProcess).toBe("p2");
  });

  it("P3 runs only after P2 finishes", () => {
    const engine = new SimulationEngine(processes, cfg({ algorithm: "HRRN" }));
    const ticks = engine.runAll();
    // P2 runs ticks 1-6; P3 starts at tick 7
    expect(ticks[7]?.cpuProcess).toBe("p3");
  });
});

// ─── CT-15: SRTF — preemption on arrival with complex I/O ────────────────────

describe("CT-15: SRTF preemption with I/O processes", () => {
  /**
   * P1(CPU:5,IO:2,CPU:2) starts at 0.
   * P2(CPU:2) arrives at tick 2 — preempts P1 (remaining=3 > 2).
   * While P2 runs, P1 goes to ready queue.
   * P2 finishes at tick 4; P1 resumes its CPU burst.
   */
  const processes = [
    p("p1", 0, [{ type: "cpu", duration: 5 }, { type: "io", duration: 2 }, { type: "cpu", duration: 2 }]),
    p("p2", 2, [{ type: "cpu", duration: 2 }]),
  ];

  it("P2 preempts P1 at tick 2", () => {
    const engine = new SimulationEngine(
      processes,
      cfg({ algorithm: "SJF_P", isPreemptive: true }),
    );
    const ticks = engine.runAll();
    expect(ticks[0]?.cpuProcess).toBe("p1");
    expect(ticks[1]?.cpuProcess).toBe("p1");
    expect(ticks[2]?.cpuProcess).toBe("p2"); // preemption here
    expect(ticks[3]?.cpuProcess).toBe("p2");
  });

  it("P1 eventually completes all burst phases and terminates", () => {
    const engine = new SimulationEngine(
      processes,
      cfg({ algorithm: "SJF_P", isPreemptive: true }),
    );
    engine.runAll();
    expect(engine.isFinished).toBe(true);
    const p1rt = engine.runtimeStates.find((r) => r.processId === "p1")!;
    expect(p1rt.state).toBe("Terminated");
    expect(p1rt.ioTime).toBe(2);
  });
});

// ─── CT-16: Metrics invariant across all algorithms ──────────────────────────

describe("CT-16: Metrics invariant — turnaround = cpuTime + ioTime + waitingTime", () => {
  /**
   * For any completed process:
   *   turnaround = cpuTime + ioTime + waitingTime
   *
   * This invariant must hold for every algorithm.
   */
  const processes = [
    p("p1", 0, [{ type: "cpu", duration: 4 }, { type: "io", duration: 2 }, { type: "cpu", duration: 2 }]),
    p("p2", 1, [{ type: "cpu", duration: 3 }]),
    p("p3", 2, [{ type: "cpu", duration: 1 }, { type: "io", duration: 3 }, { type: "cpu", duration: 2 }]),
  ];

  const algorithms: SchedulerConfig["algorithm"][] = [
    "FCFS", "SJF_NP", "SJF_P", "RR", "PRIORITY_NP", "PRIORITY_P", "HRRN",
  ];

  for (const algorithm of algorithms) {
    it(`holds for ${algorithm}`, () => {
      const isPreemptive = algorithm === "SJF_P" || algorithm === "PRIORITY_P";
      const { metricsMap } = runAndGetMetrics(
        processes,
        cfg({ algorithm, isPreemptive, quantum: 2 }),
      );
      for (const [id, m] of Object.entries(metricsMap)) {
        expect(m.turnaroundTime, `${algorithm}: ${id} turnaround invariant`).toBeCloseTo(
          m.cpuTime + m.ioTime + m.waitingTime,
          5,
        );
      }
    });
  }
});

// ─── CT-17: All processes always terminate ────────────────────────────────────

describe("CT-17: All processes eventually terminate (no infinite loops)", () => {
  /**
   * For every supported algorithm, a simulation must terminate.
   * This validates the engine has no deadlocks or infinite scheduling loops.
   */
  const processes = [
    p("p1", 0, [{ type: "cpu", duration: 3 }, { type: "io", duration: 2 }, { type: "cpu", duration: 2 }]),
    p("p2", 0, [{ type: "cpu", duration: 5 }]),
    p("p3", 2, [{ type: "cpu", duration: 1 }]),
    p("p4", 3, [{ type: "cpu", duration: 4 }, { type: "io", duration: 1 }, { type: "cpu", duration: 1 }]),
  ];

  const algorithmsWithConfig: [string, SchedulerConfig][] = [
    ["FCFS", cfg({ algorithm: "FCFS" })],
    ["SJF_NP", cfg({ algorithm: "SJF_NP" })],
    ["SJF_P", cfg({ algorithm: "SJF_P", isPreemptive: true })],
    ["RR q=2", cfg({ algorithm: "RR", quantum: 2 })],
    ["RR q=1", cfg({ algorithm: "RR", quantum: 1 })],
    ["PRIORITY_NP", cfg({ algorithm: "PRIORITY_NP" })],
    ["PRIORITY_P", cfg({ algorithm: "PRIORITY_P", isPreemptive: true })],
    ["PRIORITY_P+aging", cfg({ algorithm: "PRIORITY_P", isPreemptive: true, agingEnabled: true, agingInterval: 3 })],
    ["HRRN", cfg({ algorithm: "HRRN" })],
  ];

  for (const [name, config] of algorithmsWithConfig) {
    it(`${name}: all processes reach Terminated state`, () => {
      const engine = new SimulationEngine(processes, config);
      engine.runAll();
      expect(engine.isFinished).toBe(true);
      for (const rt of engine.runtimeStates) {
        expect(rt.state, `${name}: process ${rt.processId} should be Terminated`).toBe("Terminated");
      }
    });
  }
});

// ─── CT-18: Preset validation ─────────────────────────────────────────────────

describe("CT-18: All presets complete successfully", () => {
  /**
   * Each preset must run to completion with all processes terminated,
   * and produce valid (non-negative) metrics.
   */
  for (const preset of presets) {
    it(`preset "${preset.name}" terminates and yields valid metrics`, () => {
      const engine = new SimulationEngine(preset.processes, preset.config);
      engine.runAll();

      expect(engine.isFinished).toBe(true);

      for (const rt of engine.runtimeStates) {
        expect(rt.state).toBe("Terminated");
        expect(rt.finishTick).not.toBeNull();
        expect(rt.startTick).not.toBeNull();

        const m = computeProcessMetrics(rt);
        expect(m.turnaroundTime).toBeGreaterThan(0);
        expect(m.waitingTime).toBeGreaterThanOrEqual(0);
        expect(m.responseTime).toBeGreaterThanOrEqual(0);
        expect(m.cpuTime).toBeGreaterThan(0);
        expect(m.ioTime).toBeGreaterThanOrEqual(0);
        // Invariant: turnaround = cpuTime + ioTime + waitingTime
        expect(m.turnaroundTime).toBeCloseTo(m.cpuTime + m.ioTime + m.waitingTime, 5);
      }
    });
  }
});

// ─── CT-19: RR with I/O — quantum resets correctly after I/O return ───────────

describe("CT-19: RR with I/O — process returning from I/O gets fresh quantum", () => {
  /**
   * P1(CPU:4, IO:2, CPU:2) with quantum=2.
   * P2(CPU:6) with quantum=2.
   *
   * P1 uses 2 CPU ticks (quantum exhausted) → goes to ready.
   * P2 uses 2 ticks → goes to ready.
   * P1 uses last 2 CPU ticks → goes to I/O.
   * While P1 does I/O, P2 runs.
   * P1 returns from I/O and gets a fresh quantum for its final 2 CPU ticks.
   */
  const processes = [
    p("p1", 0, [{ type: "cpu", duration: 4 }, { type: "io", duration: 2 }, { type: "cpu", duration: 2 }]),
    p("p2", 0, [{ type: "cpu", duration: 6 }]),
  ];

  it("P1 and P2 both terminate", () => {
    const engine = new SimulationEngine(processes, cfg({ algorithm: "RR", quantum: 2 }));
    engine.runAll();
    expect(engine.isFinished).toBe(true);
    for (const rt of engine.runtimeStates) {
      expect(rt.state).toBe("Terminated");
    }
  });

  it("P1 accumulates correct cpu and io times", () => {
    const engine = new SimulationEngine(processes, cfg({ algorithm: "RR", quantum: 2 }));
    engine.runAll();
    const p1rt = engine.runtimeStates.find((r) => r.processId === "p1")!;
    expect(p1rt.cpuTime).toBe(6); // 4 + 2
    expect(p1rt.ioTime).toBe(2);
  });

  it("metrics invariant holds for both processes", () => {
    const { metricsMap } = runAndGetMetrics(processes, cfg({ algorithm: "RR", quantum: 2 }));
    for (const m of Object.values(metricsMap)) {
      expect(m.turnaroundTime).toBeCloseTo(m.cpuTime + m.ioTime + m.waitingTime, 5);
    }
  });
});

// ─── CT-20: Single process — no competition edge case ────────────────────────

describe("CT-20: Single process — baseline edge case", () => {
  /**
   * With only one process, there is no scheduling decision to make.
   * The process should run uninterrupted and have zero waiting time,
   * regardless of algorithm.
   */
  const process = p("p1", 0, [
    { type: "cpu", duration: 3 },
    { type: "io", duration: 2 },
    { type: "cpu", duration: 2 },
  ]);

  const algorithms: SchedulerConfig["algorithm"][] = ["FCFS", "SJF_NP", "RR", "PRIORITY_NP", "HRRN"];

  for (const algorithm of algorithms) {
    it(`${algorithm}: single process has zero waiting time`, () => {
      const { metricsMap } = runAndGetMetrics([process], cfg({ algorithm, quantum: 2 }));
      expect(metricsMap["p1"]!.waitingTime).toBe(0);
      expect(metricsMap["p1"]!.responseTime).toBe(0);
    });
  }
});
