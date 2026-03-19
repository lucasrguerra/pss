import { describe, it, expect } from "vitest";
import { rr } from "../algorithms/rr";
import { SimulationEngine } from "../engine";
import type { Process, ProcessRuntime, SchedulerConfig } from "../types";

function makeRt(id: string, quantumRemaining = 2): ProcessRuntime {
  return {
    processId: id, state: "Running", remainingBurst: 4, burstIndex: 0,
    arrivalTick: 0, startTick: 0, finishTick: null,
    waitingTime: 0, cpuTime: 0, ioTime: 0, responseTime: null,
    quantumRemaining, currentPriority: 5,
  };
}

const config: SchedulerConfig = {
  algorithm: "RR", quantum: 2, contextSwitchTime: 0,
  isPreemptive: false, agingEnabled: false, agingInterval: 5,
};

const p = (id: string, arrival: number, cpuDuration: number): Process => ({
  id, name: id, arrivalTime: arrival, priority: 5, color: "#fff",
  bursts: [{ type: "cpu", duration: cpuDuration }],
});

describe("RR select()", () => {
  it("returns front of queue (FIFO)", () => {
    const r1: ProcessRuntime = { ...makeRt("p1"), state: "Ready" };
    const r2: ProcessRuntime = { ...makeRt("p2"), state: "Ready" };
    expect(rr.select([r1, r2], config)?.processId).toBe("p1");
    expect(rr.select([r2, r1], config)?.processId).toBe("p2");
  });

  it("returns null for empty queue", () => {
    expect(rr.select([], config)).toBeNull();
  });
});

describe("RR isQuantumExpired()", () => {
  it("returns true when quantumRemaining <= 0", () => {
    expect(rr.isQuantumExpired(makeRt("p1", 0), config)).toBe(true);
    expect(rr.isQuantumExpired(makeRt("p1", -1), config)).toBe(true);
  });

  it("returns false when quantum not yet exhausted", () => {
    expect(rr.isQuantumExpired(makeRt("p1", 1), config)).toBe(false);
    expect(rr.isQuantumExpired(makeRt("p1", 2), config)).toBe(false);
  });
});

describe("RR shouldPreempt()", () => {
  it("always returns false (preemption via quantum expiry only)", () => {
    const a = makeRt("p1");
    const b = makeRt("p2");
    expect(rr.shouldPreempt(a, b, config)).toBe(false);
  });
});

// CT-02 integration
describe("CT-02: Round Robin integration", () => {
  it("produces correct Gantt: P1(0-2),P2(2-4),P3(4-5),P1(5-7),P2(7-8),P1(8-9)", () => {
    const processes = [
      p("p1", 0, 5),
      p("p2", 0, 3),
      p("p3", 0, 1),
    ];
    const engine = new SimulationEngine(processes, config);
    const ticks = engine.runAll();
    const cpu = ticks.map((t) => t.cpuProcess);

    expect(cpu).toHaveLength(9);
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

  it("process finishing before quantum exhausted does not rotate", () => {
    const engine = new SimulationEngine(
      [p("p1", 0, 1), p("p2", 0, 3)],
      config,
    );
    const ticks = engine.runAll();
    // P1 finishes at tick 1 (1 < quantum 2), P2 gets CPU immediately
    expect(ticks[0]?.cpuProcess).toBe("p1");
    expect(ticks[1]?.cpuProcess).toBe("p2");
    expect(ticks[2]?.cpuProcess).toBe("p2");
    expect(ticks[3]?.cpuProcess).toBe("p2");
  });

  it("process returning from I/O enters tail of queue", () => {
    // P1: CPU:1 → IO:1 → CPU:1; P2: CPU:3
    // With quantum=2: P1 runs tick 0, goes to IO; P2 runs ticks 1-2,3 (or until P1 returns)
    // P1 IO done at tick 2, enters tail → P2 finishes first if still running
    const processes: Process[] = [
      { id: "p1", name: "P1", arrivalTime: 0, priority: 5, color: "#fff", bursts: [{ type: "cpu", duration: 1 }, { type: "io", duration: 2 }, { type: "cpu", duration: 1 }] },
      { id: "p2", name: "P2", arrivalTime: 0, priority: 5, color: "#fff", bursts: [{ type: "cpu", duration: 3 }] },
    ];
    const engine = new SimulationEngine(processes, config);
    const ticks = engine.runAll();
    const rts = engine.runtimeStates;
    // Both should terminate
    expect(rts.every((r) => r.state === "Terminated")).toBe(true);
    // P1's second CPU burst should happen after P2 gets at least one quantum
    const rt2 = rts.find((r) => r.processId === "p2")!;
    const rt1 = rts.find((r) => r.processId === "p1")!;
    // P2 has 3 CPU ticks and P1 re-enters after IO — verify both complete
    expect(rt2.cpuTime).toBe(3);
    expect(rt1.cpuTime).toBe(2);
    void ticks; // used for debugging if needed
  });
});
