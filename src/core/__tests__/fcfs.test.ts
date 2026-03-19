import { describe, it, expect } from "vitest";
import { fcfs } from "../algorithms/fcfs";
import type { ProcessRuntime } from "../types";

function makeRt(id: string, arrivalTick: number): ProcessRuntime {
  return {
    processId: id, state: "Ready", remainingBurst: 4, burstIndex: 0,
    arrivalTick, startTick: null, finishTick: null,
    waitingTime: 0, cpuTime: 0, ioTime: 0, responseTime: null,
    quantumRemaining: 2, currentPriority: 5,
  };
}

const config = { algorithm: "FCFS" as const, quantum: 2, contextSwitchTime: 0, isPreemptive: false, agingEnabled: false, agingInterval: 5 };

describe("FCFS select()", () => {
  it("returns null for empty queue", () => {
    expect(fcfs.select([], config)).toBeNull();
  });

  it("returns single process", () => {
    const rt = makeRt("p1", 0);
    expect(fcfs.select([rt], config)).toBe(rt);
  });

  it("returns earliest-arriving process", () => {
    const r1 = makeRt("p1", 5);
    const r2 = makeRt("p2", 2);
    const r3 = makeRt("p3", 8);
    expect(fcfs.select([r1, r2, r3], config)?.processId).toBe("p2");
  });

  it("tiebreaks by processId lexicographic", () => {
    const r1 = makeRt("p2", 0);
    const r2 = makeRt("p1", 0);
    expect(fcfs.select([r1, r2], config)?.processId).toBe("p1");
  });
});

describe("FCFS shouldPreempt()", () => {
  it("always returns false", () => {
    const a = makeRt("p1", 0);
    const b = makeRt("p2", 0);
    expect(fcfs.shouldPreempt(a, b, config)).toBe(false);
  });
});

describe("FCFS isQuantumExpired()", () => {
  it("always returns false", () => {
    const rt = makeRt("p1", 0);
    rt.quantumRemaining = 0;
    expect(fcfs.isQuantumExpired(rt, config)).toBe(false);
  });
});
