import { describe, it, expect } from "vitest";
import { FCFSAlgorithm } from "../algorithms/fcfs";
import type { ProcessRuntime } from "../types";

const fcfs = new FCFSAlgorithm();

function makeRt(id: string, arrivalTick: number): ProcessRuntime {
  return {
    processId: id, state: "Ready", remainingBurst: 4, burstIndex: 0,
    arrivalTick, startTick: null, finishTick: null,
    waitingTime: 0, cpuTime: 0, ioTime: 0, responseTime: null,
    quantumRemaining: 2, currentPriority: 5,
  };
}

describe("FCFS select()", () => {
  it("returns null for empty queue", () => {
    expect(fcfs.select([])).toBeNull();
  });

  it("returns single process", () => {
    const rt = makeRt("p1", 0);
    expect(fcfs.select([rt])).toBe(rt);
  });

  it("returns earliest-arriving process", () => {
    const r1 = makeRt("p1", 5);
    const r2 = makeRt("p2", 2);
    const r3 = makeRt("p3", 8);
    expect(fcfs.select([r1, r2, r3])?.processId).toBe("p2");
  });

  it("tiebreaks by processId lexicographic", () => {
    const r1 = makeRt("p2", 0);
    const r2 = makeRt("p1", 0);
    expect(fcfs.select([r1, r2])?.processId).toBe("p1");
  });
});

describe("FCFS shouldPreempt()", () => {
  it("always returns false", () => {
    expect(fcfs.shouldPreempt()).toBe(false);
  });
});

describe("FCFS isQuantumExpired()", () => {
  it("always returns false", () => {
    const rt = makeRt("p1", 0);
    rt.quantumRemaining = 0;
    expect(fcfs.isQuantumExpired()).toBe(false);
  });
});

describe("FCFSAlgorithm — metadados", () => {
  it("expõe propriedades educacionais corretas", () => {
    expect(fcfs.name).toContain("First Come");
    expect(fcfs.isPreemptiveCapable).toBe(false);
    expect(fcfs.usesQuantum).toBe(false);
  });
});
