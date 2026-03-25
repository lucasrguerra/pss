import { describe, it, expect } from "vitest";
import { SimulationEngine } from "../engine";
import type { Process, SchedulerConfig } from "../types";

const BASE_CONFIG: SchedulerConfig = {
  algorithm: "FCFS",
  quantum: 10,
  contextSwitchTime: 0,
  isPreemptive: false,
  agingEnabled: false,
  agingInterval: 5,
};

function makeThreadedProcess(
  overrides: Partial<Process> = {},
): Process {
  return {
    pid: 1,
    id: "p1",
    name: "P1",
    arrivalTime: 0,
    priority: 5,
    color: "#4FC3F7",
    bursts: [],
    threadModel: "ONE_TO_ONE",
    threadSchedulingPolicy: "FCFS",
    threads: [
      {
        tid: "t1",
        name: "T1",
        bursts: [{ type: "cpu", duration: 3 }],
      },
      {
        tid: "t2",
        name: "T2",
        bursts: [{ type: "cpu", duration: 2 }],
      },
    ],
    ...overrides,
  };
}

// ── ONE_TO_ONE ─────────────────────────────────────────────────────────────

describe("Engine — ONE_TO_ONE básico", () => {
  it("processo termina quando todas as threads terminam", () => {
    const p = makeThreadedProcess({ threadModel: "ONE_TO_ONE" });
    const engine = new SimulationEngine([p], BASE_CONFIG);
    engine.runAll();
    expect(engine.isFinished).toBe(true);
    const rt = engine.runtimeStates[0]!;
    expect(rt.state).toBe("Terminated");
    expect(rt.finishTick).not.toBeNull();
  });

  it("runtimes de threads são gerados corretamente", () => {
    const p = makeThreadedProcess({ threadModel: "ONE_TO_ONE" });
    const engine = new SimulationEngine([p], BASE_CONFIG);
    engine.runAll();
    const threadRts = engine.threadRuntimeStates;
    expect(threadRts).toHaveLength(2);
    for (const trt of threadRts) {
      expect(trt.state).toBe("Terminated");
      expect(trt.cpuTime).toBeGreaterThan(0);
    }
  });

  it("cpuTime total do processo = soma dos cpuTimes das threads", () => {
    const p = makeThreadedProcess({ threadModel: "ONE_TO_ONE" });
    const engine = new SimulationEngine([p], BASE_CONFIG);
    engine.runAll();
    const pRt = engine.runtimeStates[0]!;
    const threadTotal = engine.threadRuntimeStates.reduce(
      (sum, trt) => sum + trt.cpuTime,
      0,
    );
    expect(pRt.cpuTime).toBe(threadTotal);
  });

  it("processHasThreads retorna true para processo com threads", () => {
    const p = makeThreadedProcess();
    const engine = new SimulationEngine([p], BASE_CONFIG);
    expect(engine.processHasThreads("p1")).toBe(true);
  });

  it("processo sem threads não é afetado", () => {
    const p: Process = {
      pid: 1,
      id: "p1",
      name: "P1",
      arrivalTime: 0,
      priority: 5,
      color: "#aaa",
      bursts: [{ type: "cpu", duration: 4 }],
    };
    const engine = new SimulationEngine([p], BASE_CONFIG);
    engine.runAll();
    expect(engine.isFinished).toBe(true);
    expect(engine.processHasThreads("p1")).toBe(false);
  });

  it("ONE_TO_ONE: processo com thread em I/O pode ter outra thread rodando", () => {
    const p = makeThreadedProcess({
      threadModel: "ONE_TO_ONE",
      threadSchedulingPolicy: "FCFS",
      threads: [
        {
          tid: "t1",
          name: "T1",
          bursts: [
            { type: "cpu", duration: 2 },
            { type: "io", duration: 3 },
            { type: "cpu", duration: 1 },
          ],
        },
        {
          tid: "t2",
          name: "T2",
          bursts: [{ type: "cpu", duration: 4 }],
        },
      ],
    });
    const engine = new SimulationEngine([p], BASE_CONFIG);
    const ticks = engine.runAll();

    // O processo NÃO deve ir para Waiting enquanto T2 está ready/running
    const waitingTicks = ticks.filter(
      (tick) => tick.states["p1"] === "Waiting",
    );
    // Pode ter algum tick Waiting quando AMBAS as threads estão em I/O,
    // mas aqui T2 não tem I/O, então o processo nunca deve ficar Waiting
    expect(waitingTicks.length).toBe(0);
    expect(engine.isFinished).toBe(true);
  });

  it("ONE_TO_ONE: processo vai para Waiting apenas quando todas as threads estão em I/O", () => {
    const p = makeThreadedProcess({
      threadModel: "ONE_TO_ONE",
      threads: [
        {
          tid: "t1",
          name: "T1",
          bursts: [
            { type: "cpu", duration: 1 },
            { type: "io", duration: 3 },
            { type: "cpu", duration: 1 },
          ],
        },
        {
          tid: "t2",
          name: "T2",
          bursts: [
            { type: "cpu", duration: 1 },
            { type: "io", duration: 3 },
            { type: "cpu", duration: 1 },
          ],
        },
      ],
    });
    const engine = new SimulationEngine([p], BASE_CONFIG);
    const ticks = engine.runAll();

    // Deve haver ticks em que o processo está Waiting (ambas as threads em I/O)
    const waitingTicks = ticks.filter(
      (tick) => tick.states["p1"] === "Waiting",
    );
    expect(waitingTicks.length).toBeGreaterThan(0);
    expect(engine.isFinished).toBe(true);
  });
});

// ── MANY_TO_ONE ────────────────────────────────────────────────────────────

describe("Engine — MANY_TO_ONE", () => {
  it("processo vai para Waiting quando qualquer thread está em I/O", () => {
    const p = makeThreadedProcess({
      threadModel: "MANY_TO_ONE",
      threadSchedulingPolicy: "FCFS",
      threads: [
        {
          tid: "t1",
          name: "T1",
          bursts: [
            { type: "cpu", duration: 2 },
            { type: "io", duration: 3 },
            { type: "cpu", duration: 1 },
          ],
        },
        {
          tid: "t2",
          name: "T2",
          // Esta thread ficaria pronta enquanto T1 está em I/O,
          // mas em MANY_TO_ONE o processo bloqueia inteiro
          bursts: [{ type: "cpu", duration: 3 }],
        },
      ],
    });
    const engine = new SimulationEngine([p], BASE_CONFIG);
    const ticks = engine.runAll();

    // Deve haver ticks em Waiting (T1 em I/O bloqueia o processo)
    const waitingTicks = ticks.filter(
      (tick) => tick.states["p1"] === "Waiting",
    );
    expect(waitingTicks.length).toBeGreaterThan(0);
    expect(engine.isFinished).toBe(true);
  });

  it("processo termina quando todas as threads terminam", () => {
    const p = makeThreadedProcess({ threadModel: "MANY_TO_ONE" });
    const engine = new SimulationEngine([p], BASE_CONFIG);
    engine.runAll();
    expect(engine.isFinished).toBe(true);
    expect(engine.runtimeStates[0]!.state).toBe("Terminated");
    const allTerminated = engine.threadRuntimeStates.every(
      (trt) => trt.state === "Terminated",
    );
    expect(allTerminated).toBe(true);
  });

  it("MANY_TO_ONE tem mais ticks em Waiting que ONE_TO_ONE para mesmo workload", () => {
    const threads = [
      {
        tid: "t1",
        name: "T1",
        bursts: [
          { type: "cpu" as const, duration: 2 },
          { type: "io" as const, duration: 4 },
          { type: "cpu" as const, duration: 1 },
        ],
      },
      {
        tid: "t2",
        name: "T2",
        bursts: [{ type: "cpu" as const, duration: 3 }],
      },
    ];

    const m2o = makeThreadedProcess({ threadModel: "MANY_TO_ONE", threads });
    const o2o = makeThreadedProcess({ threadModel: "ONE_TO_ONE", threads });

    const engine1 = new SimulationEngine([m2o], BASE_CONFIG);
    const ticks1 = engine1.runAll();

    const engine2 = new SimulationEngine([o2o], BASE_CONFIG);
    const ticks2 = engine2.runAll();

    const waitingM2O = ticks1.filter(
      (t) => t.states["p1"] === "Waiting",
    ).length;
    const waitingO2O = ticks2.filter(
      (t) => t.states["p1"] === "Waiting",
    ).length;

    // MANY_TO_ONE bloqueia o processo durante I/O da T1 mesmo com T2 pronta
    expect(waitingM2O).toBeGreaterThanOrEqual(waitingO2O);
  });
});

// ── MANY_TO_MANY ───────────────────────────────────────────────────────────

describe("Engine — MANY_TO_MANY", () => {
  it("respeita limite de kernel threads (M=2 para 3 user threads)", () => {
    const p: Process = {
      pid: 1,
      id: "p1",
      name: "App",
      arrivalTime: 0,
      priority: 5,
      color: "#CE93D8",
      bursts: [],
      threadModel: "MANY_TO_MANY",
      kernelThreadCount: 2,
      threadSchedulingPolicy: "FCFS",
      threads: [
        { tid: "t1", name: "T1", bursts: [{ type: "cpu", duration: 4 }] },
        { tid: "t2", name: "T2", bursts: [{ type: "cpu", duration: 3 }] },
        { tid: "t3", name: "T3", bursts: [{ type: "cpu", duration: 2 }] },
      ],
    };

    const engine = new SimulationEngine([p], BASE_CONFIG);
    const ticks = engine.runAll();

    expect(engine.isFinished).toBe(true);
    // Todos os threads devem ter terminado
    const allTerminated = engine.threadRuntimeStates.every(
      (trt) => trt.state === "Terminated",
    );
    expect(allTerminated).toBe(true);
    // Deve haver kernel wait info em algum tick
    const hasKernelWait = ticks.some(
      (tick) =>
        tick.kernelWaitingThreads !== undefined &&
        Object.keys(tick.kernelWaitingThreads).length > 0,
    );
    expect(hasKernelWait).toBe(true);
  });

  it("termina corretamente com M=N (todos têm kernel thread)", () => {
    const p: Process = {
      pid: 1,
      id: "p1",
      name: "App",
      arrivalTime: 0,
      priority: 5,
      color: "#CE93D8",
      bursts: [],
      threadModel: "MANY_TO_MANY",
      kernelThreadCount: 3, // igual ao número de threads
      threadSchedulingPolicy: "FCFS",
      threads: [
        { tid: "t1", name: "T1", bursts: [{ type: "cpu", duration: 2 }] },
        { tid: "t2", name: "T2", bursts: [{ type: "cpu", duration: 3 }] },
        { tid: "t3", name: "T3", bursts: [{ type: "cpu", duration: 1 }] },
      ],
    };

    const engine = new SimulationEngine([p], BASE_CONFIG);
    engine.runAll();
    expect(engine.isFinished).toBe(true);
  });
});

// ── Snapshot de threads ────────────────────────────────────────────────────

describe("Engine — snapshot com threads", () => {
  it("threadStates presentes no snapshot quando processo tem threads", () => {
    const p = makeThreadedProcess({ threadModel: "ONE_TO_ONE" });
    const engine = new SimulationEngine([p], BASE_CONFIG);
    const tick = engine.step();
    expect(tick.threadStates).toBeDefined();
    expect(tick.threadStates!["p1"]).toBeDefined();
    expect(Object.keys(tick.threadStates!["p1"]!)).toContain("t1");
  });

  it("cpuThreads indica thread ativa no processo", () => {
    const p = makeThreadedProcess({ threadModel: "ONE_TO_ONE" });
    const engine = new SimulationEngine([p], BASE_CONFIG);
    engine.step(); // tick 0 — despacha processo e thread
    const tick = engine.step(); // tick 1 — thread em execução
    expect(tick.cpuThreads).toBeDefined();
    expect(tick.cpuThreads!["p1"]).not.toBeNull();
  });
});

// ── Múltiplos processos com e sem threads ─────────────────────────────────

describe("Engine — mix de processos com e sem threads", () => {
  it("processa corretamente processos com e sem threads simultaneamente", () => {
    const pThreaded: Process = {
      pid: 1,
      id: "p1",
      name: "Threaded",
      arrivalTime: 0,
      priority: 5,
      color: "#4FC3F7",
      bursts: [],
      threadModel: "ONE_TO_ONE",
      threads: [
        { tid: "t1", name: "T1", bursts: [{ type: "cpu", duration: 3 }] },
      ],
    };

    const pSimple: Process = {
      pid: 2,
      id: "p2",
      name: "Simple",
      arrivalTime: 0,
      priority: 5,
      color: "#81C784",
      bursts: [{ type: "cpu", duration: 4 }],
    };

    const engine = new SimulationEngine([pThreaded, pSimple], BASE_CONFIG);
    engine.runAll();

    expect(engine.isFinished).toBe(true);
    const rts = engine.runtimeStates;
    expect(rts.every((rt) => rt.state === "Terminated")).toBe(true);
  });
});

// ── Política intra-processo RR ─────────────────────────────────────────────

describe("Engine — RR intra-processo", () => {
  it("rotaciona threads dentro do processo com quantum 2", () => {
    const p = makeThreadedProcess({
      threadModel: "ONE_TO_ONE",
      threadSchedulingPolicy: "RR",
      threadQuantum: 2,
      threads: [
        { tid: "t1", name: "T1", bursts: [{ type: "cpu", duration: 6 }] },
        { tid: "t2", name: "T2", bursts: [{ type: "cpu", duration: 4 }] },
      ],
    });

    const engine = new SimulationEngine([p], BASE_CONFIG);
    const ticks = engine.runAll();

    // Verifica que ambas as threads ficaram ativas em ticks diferentes
    const t1Active = ticks.filter(
      (tick) => tick.cpuThreads?.["p1"] === "t1",
    ).length;
    const t2Active = ticks.filter(
      (tick) => tick.cpuThreads?.["p1"] === "t2",
    ).length;

    expect(t1Active).toBeGreaterThan(0);
    expect(t2Active).toBeGreaterThan(0);
    expect(engine.isFinished).toBe(true);
  });
});

// ── Política intra-processo PRIORITY ──────────────────────────────────────

describe("Engine — Priority intra-processo", () => {
  it("thread de maior prioridade roda primeiro (menor número = maior prio)", () => {
    const p = makeThreadedProcess({
      threadModel: "ONE_TO_ONE",
      threadSchedulingPolicy: "PRIORITY",
      threads: [
        {
          tid: "t1",
          name: "Low",
          priority: 8,
          bursts: [{ type: "cpu", duration: 3 }],
        },
        {
          tid: "t2",
          name: "High",
          priority: 1,
          bursts: [{ type: "cpu", duration: 2 }],
        },
      ],
    });

    const engine = new SimulationEngine([p], BASE_CONFIG);
    const firstTick = engine.step();

    // t2 (prioridade 1) deve ser selecionada primeiro
    expect(firstTick.cpuThreads?.["p1"]).toBe("t2");
  });
});
