import { describe, it, expect } from "vitest";
import { ThreadScheduler } from "../thread-scheduler";
import type { ThreadRuntime } from "../types";

function makeThread(
  threadId: string,
  arrivalTick = 0,
  priority = 5,
  quantumRemaining = 2,
): ThreadRuntime {
  return {
    threadId,
    processId: "p1",
    state: "Ready",
    remainingBurst: 4,
    burstIndex: 0,
    arrivalTick,
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

describe("ThreadScheduler — política FCFS", () => {
  const sched = new ThreadScheduler("FCFS", 2);

  it("retorna null para fila vazia", () => {
    expect(sched.select([])).toBeNull();
  });

  it("seleciona thread com menor arrivalTick", () => {
    const t1 = makeThread("t1", 5);
    const t2 = makeThread("t2", 2);
    const t3 = makeThread("t3", 8);
    expect(sched.select([t1, t2, t3])?.threadId).toBe("t2");
  });

  it("desempate lexicográfico por threadId", () => {
    const ta = makeThread("ta", 0);
    const tb = makeThread("tb", 0);
    expect(sched.select([tb, ta])?.threadId).toBe("ta");
  });

  it("isQuantumExpired sempre false em FCFS", () => {
    const t = makeThread("t1");
    t.quantumRemaining = -1;
    expect(sched.isQuantumExpired(t)).toBe(false);
  });

  it("shouldPreemptThread sempre false em FCFS", () => {
    const curr = makeThread("curr", 0, 5);
    const cand = makeThread("cand", 0, 1);
    expect(sched.shouldPreemptThread(curr, cand)).toBe(false);
  });
});

describe("ThreadScheduler — política RR", () => {
  const sched = new ThreadScheduler("RR", 3);

  it("seleciona primeira da fila", () => {
    const t1 = makeThread("t1");
    const t2 = makeThread("t2");
    expect(sched.select([t1, t2])?.threadId).toBe("t1");
  });

  it("isQuantumExpired true quando quantumRemaining ≤ 0", () => {
    const t = makeThread("t1");
    t.quantumRemaining = 0;
    expect(sched.isQuantumExpired(t)).toBe(true);
    t.quantumRemaining = -1;
    expect(sched.isQuantumExpired(t)).toBe(true);
  });

  it("isQuantumExpired false quando quantum ainda disponível", () => {
    const t = makeThread("t1");
    t.quantumRemaining = 1;
    expect(sched.isQuantumExpired(t)).toBe(false);
  });

  it("quantum correto", () => {
    expect(sched.quantum).toBe(3);
  });
});

describe("ThreadScheduler — política PRIORITY", () => {
  const sched = new ThreadScheduler("PRIORITY", 2);

  it("seleciona thread com menor currentPriority (maior prioridade)", () => {
    const t1 = makeThread("t1", 0, 5);
    const t2 = makeThread("t2", 0, 1);
    const t3 = makeThread("t3", 0, 3);
    expect(sched.select([t1, t2, t3])?.threadId).toBe("t2");
  });

  it("desempate por arrivalTick quando prioridades iguais", () => {
    const t1 = makeThread("t1", 3, 2);
    const t2 = makeThread("t2", 1, 2);
    expect(sched.select([t1, t2])?.threadId).toBe("t2");
  });

  it("shouldPreemptThread true quando candidata tem prioridade maior", () => {
    const curr = makeThread("curr", 0, 5);
    const cand = makeThread("cand", 0, 2);
    expect(sched.shouldPreemptThread(curr, cand)).toBe(true);
  });

  it("shouldPreemptThread false quando prioridade igual", () => {
    const curr = makeThread("curr", 0, 3);
    const cand = makeThread("cand", 0, 3);
    expect(sched.shouldPreemptThread(curr, cand)).toBe(false);
  });

  it("shouldPreemptThread false quando candidata tem prioridade menor", () => {
    const curr = makeThread("curr", 0, 2);
    const cand = makeThread("cand", 0, 5);
    expect(sched.shouldPreemptThread(curr, cand)).toBe(false);
  });

  it("isQuantumExpired sempre false em PRIORITY", () => {
    const t = makeThread("t1");
    t.quantumRemaining = -5;
    expect(sched.isQuantumExpired(t)).toBe(false);
  });
});
