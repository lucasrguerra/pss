import { describe, it, expect } from "vitest";
import { SimulationEngine } from "../engine";
import type { Process, SchedulerConfig } from "../types";

// ============================================================
// Helpers
// ============================================================

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

// ============================================================
// CT-01: FCFS Basic
// Input: P1(arrival=0, CPU:4), P2(arrival=1, CPU:3), P3(arrival=2, CPU:1)
// Expected Gantt: P1(0-4), P2(4-7), P3(7-8)
// P1: response=0, turnaround=4, waiting=0
// P2: response=3, turnaround=6, waiting=3
// P3: response=5, turnaround=6, waiting=5
// ============================================================

describe("CT-01: FCFS Basic", () => {
  const processes = [
    p("p1", 0, [{ type: "cpu", duration: 4 }]),
    p("p2", 1, [{ type: "cpu", duration: 3 }]),
    p("p3", 2, [{ type: "cpu", duration: 1 }]),
  ];

  it("produces correct Gantt sequence", () => {
    const engine = new SimulationEngine(processes, cfg());
    const ticks = engine.runAll();

    // ticks[i].tick should equal i
    expect(ticks.length).toBe(8);

    // P1 runs ticks 0–3
    for (let i = 0; i <= 3; i++) {
      expect(ticks[i]?.cpuProcess).toBe("p1");
    }
    // P2 runs ticks 4–6
    for (let i = 4; i <= 6; i++) {
      expect(ticks[i]?.cpuProcess).toBe("p2");
    }
    // P3 runs tick 7
    expect(ticks[7]?.cpuProcess).toBe("p3");
  });

  it("sets correct finishTick values", () => {
    const engine = new SimulationEngine(processes, cfg());
    engine.runAll();
    const rts = engine.runtimeStates;
    const rt1 = rts.find((r) => r.processId === "p1")!;
    const rt2 = rts.find((r) => r.processId === "p2")!;
    const rt3 = rts.find((r) => r.processId === "p3")!;

    expect(rt1.finishTick).toBe(4);
    expect(rt2.finishTick).toBe(7);
    expect(rt3.finishTick).toBe(8);
  });

  it("computes correct per-process metrics", () => {
    const engine = new SimulationEngine(processes, cfg());
    engine.runAll();
    const rts = engine.runtimeStates;
    const rt1 = rts.find((r) => r.processId === "p1")!;
    const rt2 = rts.find((r) => r.processId === "p2")!;
    const rt3 = rts.find((r) => r.processId === "p3")!;

    // P1: arrivalTick=0, startTick=0, finishTick=4
    expect(rt1.startTick).toBe(0);
    expect(rt1.waitingTime).toBe(0);
    // turnaround = 4 - 0 = 4; waiting = 4 - 4 - 0 = 0
    expect(rt1.finishTick! - rt1.arrivalTick).toBe(4); // turnaround

    // P2: arrivalTick=1, startTick=4, finishTick=7
    expect(rt2.startTick).toBe(4);
    expect(rt2.waitingTime).toBe(3); // waited ticks 1,2,3
    // response = 4 - 1 = 3
    expect(rt2.startTick! - rt2.arrivalTick).toBe(3);

    // P3: arrivalTick=2, startTick=7, finishTick=8
    expect(rt3.startTick).toBe(7);
    expect(rt3.waitingTime).toBe(5); // waited ticks 2,3,4,5,6
    expect(rt3.startTick! - rt3.arrivalTick).toBe(5); // response
    expect(rt3.finishTick! - rt3.arrivalTick).toBe(6); // turnaround
  });
});

// ============================================================
// CT-02: Round Robin (quantum=2)
// Input: P1,P2,P3 all arrival=0; CPU:5, CPU:3, CPU:1
// Expected: P1(0-2), P2(2-4), P3(4-5), P1(5-7), P2(7-8), P1(8-9)
// ============================================================

describe("CT-02: Round Robin (quantum=2)", () => {
  const processes = [
    p("p1", 0, [{ type: "cpu", duration: 5 }]),
    p("p2", 0, [{ type: "cpu", duration: 3 }]),
    p("p3", 0, [{ type: "cpu", duration: 1 }]),
  ];

  it("produces correct Gantt sequence", () => {
    const engine = new SimulationEngine(processes, cfg({ algorithm: "RR", quantum: 2 }));
    const ticks = engine.runAll();

    expect(ticks.length).toBe(9);

    const cpu = ticks.map((t) => t.cpuProcess);
    expect(cpu[0]).toBe("p1");
    expect(cpu[1]).toBe("p1");
    expect(cpu[2]).toBe("p2");
    expect(cpu[3]).toBe("p2");
    expect(cpu[4]).toBe("p3");
    expect(cpu[5]).toBe("p1");
    expect(cpu[6]).toBe("p1");
    expect(cpu[7]).toBe("p2");
    expect(cpu[8]).toBe("p1");
  });

  it("computes waiting times", () => {
    const engine = new SimulationEngine(processes, cfg({ algorithm: "RR", quantum: 2 }));
    engine.runAll();
    const rts = engine.runtimeStates;
    const rt1 = rts.find((r) => r.processId === "p1")!;
    const rt2 = rts.find((r) => r.processId === "p2")!;
    const rt3 = rts.find((r) => r.processId === "p3")!;

    // P1: turnaround=9, cpuTime=5, ioTime=0 → waiting=4
    expect(rt1.waitingTime).toBe(4);
    // P2: finishTick=8, arrival=0 → turnaround=8; cpuTime=3 → waiting=5
    expect(rt2.waitingTime).toBe(5);
    // P3: finishTick=5, arrival=0 → turnaround=5; cpuTime=1 → waiting=4
    expect(rt3.waitingTime).toBe(4);
  });
});

// ============================================================
// CT-04: SRTF Preemption
// P1(arrival=0, CPU:8), P2(arrival=1, CPU:4)
// P1 runs tick 0, P2 preempts at tick 1 (P2 remaining=4 < P1 remaining=7)
// P2 finishes tick 5 (runs ticks 1-4), P1 resumes ticks 5-11, finishes tick 12
// ============================================================

describe("CT-04: SRTF Preemption", () => {
  const processes = [
    p("p1", 0, [{ type: "cpu", duration: 8 }]),
    p("p2", 1, [{ type: "cpu", duration: 4 }]),
  ];

  it("P2 preempts P1 at tick 1", () => {
    const engine = new SimulationEngine(processes, cfg({ algorithm: "SJF_P", isPreemptive: true }));
    const ticks = engine.runAll();

    expect(ticks[0]?.cpuProcess).toBe("p1"); // tick 0: P1 running
    expect(ticks[1]?.cpuProcess).toBe("p2"); // tick 1: P2 preempts
    expect(ticks[2]?.cpuProcess).toBe("p2");
    expect(ticks[3]?.cpuProcess).toBe("p2");
    expect(ticks[4]?.cpuProcess).toBe("p2"); // tick 4: P2 last tick
  });

  it("P2 finishes at tick 5 and P1 resumes", () => {
    const engine = new SimulationEngine(processes, cfg({ algorithm: "SJF_P", isPreemptive: true }));
    const ticks = engine.runAll();
    const rts = engine.runtimeStates;
    const rt2 = rts.find((r) => r.processId === "p2")!;
    const rt1 = rts.find((r) => r.processId === "p1")!;

    expect(rt2.finishTick).toBe(5);
    expect(rt1.finishTick).toBe(12);
    // P1 resumes at tick 5
    expect(ticks[5]?.cpuProcess).toBe("p1");
  });
});

// ============================================================
// SimulationEngine — ciclo de vida
// Tests: isFinished, step() guard, runAll vs step equivalence
// ============================================================

describe("SimulationEngine — ciclo de vida", () => {
  it("isFinished returns false mid-run, true after runAll", () => {
    const engine = new SimulationEngine(
      [p("p1", 0, [{ type: "cpu", duration: 3 }])],
      cfg(),
    );
    expect(engine.isFinished).toBe(false);
    engine.step();
    expect(engine.isFinished).toBe(false);
    engine.runAll();
    expect(engine.isFinished).toBe(true);
  });

  it("step() after isFinished throws", () => {
    const engine = new SimulationEngine(
      [p("p1", 0, [{ type: "cpu", duration: 1 }])],
      cfg(),
    );
    engine.runAll();
    expect(() => engine.step()).toThrow();
  });

  it("runAll() and repeated step() produce same tick sequence", () => {
    const procs = [
      p("p1", 0, [{ type: "cpu", duration: 3 }]),
      p("p2", 1, [{ type: "cpu", duration: 2 }]),
    ];
    const e1 = new SimulationEngine(procs, cfg());
    const e2 = new SimulationEngine(procs, cfg());

    const fromRunAll = e1.runAll();
    const fromStep: ReturnType<typeof e2.step>[] = [];
    while (!e2.isFinished) fromStep.push(e2.step());

    expect(fromRunAll).toEqual(fromStep);
  });
});

// ============================================================
// SimulationEngine — chegada de processos
// Tests: late arrivals, idle ticks while waiting for process
// ============================================================

describe("SimulationEngine — chegada de processos", () => {
  it("process arriving after simulation starts is correctly scheduled", () => {
    const engine = new SimulationEngine(
      [
        p("p1", 0, [{ type: "cpu", duration: 3 }]),
        p("p2", 5, [{ type: "cpu", duration: 2 }]),
      ],
      cfg(),
    );
    const ticks = engine.runAll();
    // P1 finishes at tick 3; CPU idle 3,4; P2 arrives at 5
    expect(ticks[4]?.cpuProcess).toBeNull(); // tick 4: idle
    expect(ticks[5]?.cpuProcess).toBe("p2");
  });
});

// ============================================================
// SimulationEngine — troca de contexto
// Tests: idle ticks during switch, ctxSwitchForProcess across overhead
// ============================================================

describe("SimulationEngine — troca de contexto", () => {
  it("context switch inserts idle ticks between processes", () => {
    const engine = new SimulationEngine(
      [
        p("p1", 0, [{ type: "cpu", duration: 2 }]),
        p("p2", 0, [{ type: "cpu", duration: 2 }]),
      ],
      cfg({ algorithm: "FCFS", contextSwitchTime: 1 }),
    );
    const ticks = engine.runAll();
    // P1 runs ticks 0-1, context switch tick 2, P2 runs ticks 3-4
    expect(ticks[0]?.cpuProcess).toBe("p1");
    expect(ticks[1]?.cpuProcess).toBe("p1");
    expect(ticks[2]?.contextSwitching).toBe(true);
    expect(ticks[2]?.cpuProcess).toBeNull();
    expect(ticks[2]?.ctxSwitchForProcess).toBe("p2");
    expect(ticks[3]?.cpuProcess).toBe("p2");
  });

  it("ctxSwitchForProcess identifies incoming process across all overhead ticks", () => {
    const engine = new SimulationEngine(
      [
        p("p1", 0, [{ type: "cpu", duration: 2 }]),
        p("p2", 0, [{ type: "cpu", duration: 2 }]),
      ],
      cfg({ algorithm: "FCFS", contextSwitchTime: 2 }),
    );
    const ticks = engine.runAll();
    // P1 runs ticks 0-1, ctx-switch ticks 2-3, P2 runs ticks 4-5
    expect(ticks[2]?.contextSwitching).toBe(true);
    expect(ticks[2]?.ctxSwitchForProcess).toBe("p2");
    expect(ticks[3]?.contextSwitching).toBe(true);
    expect(ticks[3]?.ctxSwitchForProcess).toBe("p2");
    expect(ticks[4]?.contextSwitching).toBe(false);
    expect(ticks[4]?.ctxSwitchForProcess).toBeNull();
  });
});

// ============================================================
// SimulationEngine — I/O
// Tests: Waiting state, IO burst transitions
// ============================================================

describe("SimulationEngine — I/O", () => {
  it("process with I/O: transitions through Waiting state", () => {
    const engine = new SimulationEngine(
      [p("p1", 0, [{ type: "cpu", duration: 2 }, { type: "io", duration: 2 }, { type: "cpu", duration: 1 }])],
      cfg(),
    );
    const ticks = engine.runAll();
    const states = ticks.map((t) => t.states["p1"]);
    // Running for 2, Waiting for 2, Running for 1
    expect(states[0]).toBe("Running");
    expect(states[1]).toBe("Running");
    expect(states[2]).toBe("Waiting");
    expect(states[3]).toBe("Waiting");
    expect(states[4]).toBe("Running");
  });
});
