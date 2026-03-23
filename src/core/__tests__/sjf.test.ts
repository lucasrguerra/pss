import { describe, it, expect } from "vitest";
import { SJFNonPreemptiveAlgorithm, SRTFAlgorithm } from "../algorithms/sjf";
import { SimulationEngine } from "../engine";
import type { Process, ProcessRuntime, SchedulerConfig } from "../types";

const sjfNp = new SJFNonPreemptiveAlgorithm();
const srtf = new SRTFAlgorithm();



function makeRt(id: string, remainingBurst: number, arrivalTick = 0): ProcessRuntime {
  return {
    processId: id, state: "Ready", remainingBurst, burstIndex: 0,
    arrivalTick, startTick: null, finishTick: null,
    waitingTime: 0, cpuTime: 0, ioTime: 0, responseTime: null,
    quantumRemaining: 2, currentPriority: 5,
  };
}

const config: SchedulerConfig = {
  algorithm: "SJF_NP", quantum: 2, contextSwitchTime: 0,
  isPreemptive: false, agingEnabled: false, agingInterval: 5,
};

const p = (id: string, arrival: number, bursts: { type: "cpu" | "io"; duration: number }[]): Process => ({
  id, name: id, arrivalTime: arrival, priority: 5, color: "#fff", bursts,
});

describe("SJF_NP select()", () => {
  it("returns null for empty queue", () => {
    expect(sjfNp.select([])).toBeNull();
  });

  it("picks shortest remaining burst", () => {
    const r1 = makeRt("p1", 8);
    const r2 = makeRt("p2", 3);
    const r3 = makeRt("p3", 5);
    expect(sjfNp.select([r1, r2, r3])?.processId).toBe("p2");
  });

  it("tiebreaks equal burst by arrival then id", () => {
    const r1 = makeRt("p2", 4, 1);
    const r2 = makeRt("p1", 4, 2);
    // p2 arrives earlier
    expect(sjfNp.select([r1, r2])?.processId).toBe("p2");
  });

  it("shouldPreempt always false", () => {
    expect(sjfNp.shouldPreempt()).toBe(false);
  });
});

describe("SRTF shouldPreempt()", () => {
  it("preempts when candidate has strictly smaller burst", () => {
    const current = makeRt("p1", 7);
    const candidate = makeRt("p2", 4);
    expect(srtf.shouldPreempt(current, candidate)).toBe(true);
  });

  it("does NOT preempt on equal remaining burst", () => {
    const current = makeRt("p1", 4);
    const candidate = makeRt("p2", 4);
    expect(srtf.shouldPreempt(current, candidate)).toBe(false);
  });

  it("does NOT preempt when current has smaller burst", () => {
    const current = makeRt("p1", 3);
    const candidate = makeRt("p2", 6);
    expect(srtf.shouldPreempt(current, candidate)).toBe(false);
  });
});

// CT-04 integration via engine
describe("CT-04: SRTF Preemption (integration)", () => {
  it("P2 preempts P1 at tick 1, finishes tick 5, P1 finishes tick 12", () => {
    const processes = [
      p("p1", 0, [{ type: "cpu", duration: 8 }]),
      p("p2", 1, [{ type: "cpu", duration: 4 }]),
    ];
    const engine = new SimulationEngine(processes, {
      ...config, algorithm: "SJF_P",
    });
    const ticks = engine.runAll();
    const rts = engine.runtimeStates;

    expect(ticks[0]?.cpuProcess).toBe("p1");
    expect(ticks[1]?.cpuProcess).toBe("p2");
    expect(ticks[2]?.cpuProcess).toBe("p2");
    expect(ticks[3]?.cpuProcess).toBe("p2");
    expect(ticks[4]?.cpuProcess).toBe("p2");

    const rt2 = rts.find((r) => r.processId === "p2")!;
    const rt1 = rts.find((r) => r.processId === "p1")!;
    expect(rt2.finishTick).toBe(5);
    expect(rt1.finishTick).toBe(12);
  });
});

describe("SJF/SRTF — metadados", () => {
  it("SJFNonPreemptiveAlgorithm: isPreemptiveCapable=false, usesQuantum=false", () => {
    expect(sjfNp.isPreemptiveCapable).toBe(false);
    expect(sjfNp.usesQuantum).toBe(false);
    expect(sjfNp.name).toContain("Shortest Job First");
  });
  it("SRTFAlgorithm: isPreemptiveCapable=true, usesQuantum=false", () => {
    expect(srtf.isPreemptiveCapable).toBe(true);
    expect(srtf.usesQuantum).toBe(false);
    expect(srtf.name).toContain("SRTF");
  });
});
